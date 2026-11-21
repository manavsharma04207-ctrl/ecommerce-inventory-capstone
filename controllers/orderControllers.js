const Cart = require('../models/Cart');
const Product = require('../models/Product');
const Order = require('../models/Order');
const { storeEvents } = require('../events/storeEvents');

exports.placeOrder = async (req, res, next) => {
  const deductedItems = [];
  try {
    const { shippingAddress } = req.body;
    const cart = await Cart.findOne({ customer: req.user.id }).populate('items.product');

    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ success: false, message: 'Cart is empty' });
    }

    const orderItems = [];
    let totalAmount = 0;
    const sellerIds = new Set();

    // Atomically decrement stock for each cart item
    for (const item of cart.items) {
      const prod = item.product;
      if (!prod) {
        throw Object.assign(new Error('One or more products no longer exist'), { statusCode: 400 });
      }

      const updatedProduct = await Product.findOneAndUpdate(
        { _id: prod._id, stock: { $gte: item.quantity } },
        { $inc: { stock: -item.quantity } },
        { new: true }
      );

      if (!updatedProduct) {
        throw Object.assign(
          new Error(`Insufficient stock for '${prod.name}' (Available: ${prod.stock})`),
          { statusCode: 400 }
        );
      }

      deductedItems.push({ productId: prod._id, quantity: item.quantity });

      // Trigger low-stock event if threshold crossed
      if (updatedProduct.stock <= updatedProduct.reorderLevel) {
        storeEvents.emit('stock:low', updatedProduct);
      }

      orderItems.push({
        product: prod._id,
        seller: prod.seller,
        name: prod.name,
        priceSnapshot: prod.price,
        quantity: item.quantity,
      });

      totalAmount += prod.price * item.quantity;
      sellerIds.add(prod.seller.toString());
    }

    const order = await Order.create({
      customer: req.user.id,
      items: orderItems,
      totalAmount,
      shippingAddress,
      paymentMethod: 'SIMULATED_PAYMENT',
      paymentStatus: 'SIMULATED_PAID',
    });

    // Clear customer cart
    cart.items = [];
    await cart.save();

    storeEvents.emit('order:placed', { order, sellerIds: Array.from(sellerIds) });

    res.status(201).json({
      success: true,
      message: 'Order placed successfully (Simulated Payment)',
      order,
    });
  } catch (err) {
    // Rollback any stock already deducted if a subsequent item failed
    for (const d of deductedItems) {
      await Product.findByIdAndUpdate(d.productId, { $inc: { stock: d.quantity } });
    }
    next(err);
  }
};

exports.getMyOrders = async (req, res, next) => {
  try {
    const orders = await Order.find({ customer: req.user.id }).sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: orders.length, orders });
  } catch (err) {
    next(err);
  }
};

exports.updateOrderStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const validTransitions = {
      PLACED: ['PROCESSING', 'CANCELLED'],
      PROCESSING: ['SHIPPED', 'CANCELLED'],
      SHIPPED: ['DELIVERED'],
      DELIVERED: [],
      CANCELLED: [],
    };

    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    // Customers can only cancel their own PLACED/PROCESSING orders
    if (req.user.role === 'customer') {
      if (order.customer.toString() !== req.user.id || status !== 'CANCELLED') {
        return res.status(403).json({ success: false, message: 'Forbidden: Customers can only cancel own orders' });
      }
    }

    if (!validTransitions[order.status].includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status transition from ${order.status} to ${status}`,
      });
    }

    // Restore stock if cancelled
    if (status === 'CANCELLED') {
      for (const item of order.items) {
        await Product.findByIdAndUpdate(item.product, { $inc: { stock: item.quantity } });
      }
      order.paymentStatus = 'REFUNDED';
    }

    order.status = status;
    await order.save();

    storeEvents.emit('order:statusUpdated', order);

    res.status(200).json({ success: true, message: 'Order status updated', order });
  } catch (err) {
    next(err);
  }
};
const Cart = require('../models/Cart');
const Product = require('../models/Product');

exports.getCart = async (req, res, next) => {
  try {
    const cart = await Cart.findOne({ customer: req.user.id }).populate('items.product', 'name price stock sku');
    if (!cart) {
      return res.status(200).json({ success: true, items: [], totalAmount: 0 });
    }

    const totalAmount = cart.items.reduce(
      (sum, item) => sum + (item.product ? item.product.price * item.quantity : 0),
      0
    );

    res.status(200).json({ success: true, items: cart.items, totalAmount });
  } catch (err) {
    next(err);
  }
};

exports.addToCart = async (req, res, next) => {
  try {
    const { productId, quantity = 1 } = req.body;
    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
    if (product.stock < quantity) {
      return res.status(400).json({ success: false, message: `Only ${product.stock} units available in stock` });
    }

    let cart = await Cart.findOne({ customer: req.user.id });
    if (!cart) {
      cart = new Cart({ customer: req.user.id, items: [] });
    }

    const existingIndex = cart.items.findIndex((i) => i.product.toString() === productId);
    if (existingIndex > -1) {
      const newQty = cart.items[existingIndex].quantity + Number(quantity);
      if (product.stock < newQty) {
        return res.status(400).json({ success: false, message: `Exceeds available stock (${product.stock})` });
      }
      cart.items[existingIndex].quantity = newQty;
    } else {
      cart.items.push({ product: productId, quantity: Number(quantity) });
    }

    await cart.save();
    res.status(200).json({ success: true, message: 'Cart updated', cart });
  } catch (err) {
    next(err);
  }
};

exports.removeFromCart = async (req, res, next) => {
  try {
    const cart = await Cart.findOne({ customer: req.user.id });
    if (!cart) return res.status(404).json({ success: false, message: 'Cart not found' });

    cart.items = cart.items.filter((i) => i.product.toString() !== req.params.productId);
    await cart.save();
    res.status(200).json({ success: true, message: 'Item removed from cart', cart });
  } catch (err) {
    next(err);
  }
};
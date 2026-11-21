const EventEmitter = require('events');

class StoreEmitter extends EventEmitter {}
const storeEvents = new StoreEmitter();

const registerEventListeners = (io) => {
  storeEvents.on('order:placed', ({ order, sellerIds }) => {
    console.log(`[event] Order placed: ${order._id} | Total: ${order.totalAmount}`);
    // Notify customer room
    io.to(`user_${order.customer}`).emit('orderCreated', {
      message: 'Your order has been placed (Simulated Payment Confirmed)',
      orderId: order._id,
      status: order.status,
      totalAmount: order.totalAmount,
    });
    // Notify each seller whose items were ordered
    sellerIds.forEach((sellerId) => {
      io.to(`user_${sellerId}`).emit('newOrderAlert', {
        message: 'New customer order received',
        orderId: order._id,
      });
    });
  });

  storeEvents.on('order:statusUpdated', (order) => {
    console.log(`[event] Order ${order._id} status -> ${order.status}`);
    io.to(`user_${order.customer}`).emit('orderStatusChanged', {
      orderId: order._id,
      status: order.status,
    });
  });

  storeEvents.on('stock:low', (product) => {
    console.log(`[event] LOW STOCK ALERT: ${product.name} (${product.sku}) - Qty: ${product.stock}`);
    io.to(`user_${product.seller}`).emit('lowStockAlert', {
      productId: product._id,
      name: product.name,
      sku: product.sku,
      stock: product.stock,
      reorderLevel: product.reorderLevel,
    });
    io.to('role_admin').emit('lowStockAlert', {
      productId: product._id,
      name: product.name,
      sku: product.sku,
      stock: product.stock,
      reorderLevel: product.reorderLevel,
    });
  });
};

module.exports = { storeEvents, registerEventListeners };
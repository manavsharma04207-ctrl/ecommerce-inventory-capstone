const Product = require('../models/Product');
const Order = require('../models/Order');

// Aggregation 1: Category-wise Inventory Valuation & Low-Stock Summary
exports.getInventoryReport = async (req, res, next) => {
  try {
    const categorySummary = await Product.aggregate([
      {
        $lookup: {
          from: 'categories',
          localField: 'category',
          foreignField: '_id',
          as: 'categoryInfo',
        },
      },
      { $unwind: '$categoryInfo' },
      {
        $group: {
          _id: '$categoryInfo.name',
          totalProducts: { $sum: 1 },
          totalUnitsInStock: { $sum: '$stock' },
          totalInventoryValue: { $sum: { $multiply: ['$price', '$stock'] } },
          avgUnitPrice: { $avg: '$price' },
          lowStockCount: {
            $sum: { $cond: [{ $lte: ['$stock', '$reorderLevel'] }, 1, 0] },
          },
        },
      },
      { $sort: { totalInventoryValue: -1 } },
    ]);

    res.status(200).json({ success: true, categories: categorySummary.length, categorySummary });
  } catch (err) {
    next(err);
  }
};

// Aggregation 2: Sales & Best-Selling Products Report (Excluding Cancelled Orders)
exports.getSalesReport = async (req, res, next) => {
  try {
    const bestSellers = await Order.aggregate([
      { $match: { status: { $ne: 'CANCELLED' } } },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.product',
          productName: { $first: '$items.name' },
          totalUnitsSold: { $sum: '$items.quantity' },
          totalRevenue: { $sum: { $multiply: ['$items.priceSnapshot', '$items.quantity'] } },
          orderCount: { $sum: 1 },
        },
      },
      { $sort: { totalRevenue: -1 } },
      { $limit: 10 },
    ]);

    res.status(200).json({ success: true, bestSellers });
  } catch (err) {
    next(err);
  }
};
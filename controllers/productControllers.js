const Product = require('../models/Product');
const { storeEvents } = require('../events/storeEvents');

exports.createProduct = async (req, res, next) => {
  try {
    const product = await Product.create({
      ...req.body,
      seller: req.user.id,
    });
    res.status(201).json({ success: true, product });
  } catch (err) {
    next(err);
  }
};

exports.getProducts = async (req, res, next) => {
  try {
    const { category, search, minPrice, maxPrice, sortBy = 'createdAt', order = 'desc', page = 1, limit = 10 } = req.query;
    const filter = {};

    if (category) filter.category = category;
    if (search) filter.name = { $regex: search, $options: 'i' };
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = Number(minPrice);
      if (maxPrice) filter.price.$lte = Number(maxPrice);
    }

    const skip = (Number(page) - 1) * Number(limit);
    const total = await Product.countDocuments(filter);
    const products = await Product.find(filter)
      .populate('category', 'name')
      .populate('seller', 'name email')
      .sort({ [sortBy]: order === 'asc' ? 1 : -1 })
      .skip(skip)
      .limit(Number(limit));

    res.status(200).json({
      success: true,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / Number(limit)) || 1,
      products,
    });
  } catch (err) {
    next(err);
  }
};

exports.getProductById = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id).populate('category', 'name').populate('seller', 'name');
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
    res.status(200).json({ success: true, product });
  } catch (err) {
    next(err);
  }
};

exports.updateProduct = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });

    // Sellers can only modify their own products; admins can modify any
    if (req.user.role === 'seller' && product.seller.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Forbidden: You do not own this product' });
    }

    Object.assign(product, req.body);
    await product.save();

    if (product.stock <= product.reorderLevel) {
      storeEvents.emit('stock:low', product);
    }

    res.status(200).json({ success: true, product });
  } catch (err) {
    next(err);
  }
};

exports.deleteProduct = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });

    if (req.user.role === 'seller' && product.seller.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Forbidden: You do not own this product' });
    }

    await product.deleteOne();
    res.status(200).json({ success: true, message: 'Product deleted', id: req.params.id });
  } catch (err) {
    next(err);
  }
};
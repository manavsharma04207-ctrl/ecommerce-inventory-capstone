require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const User = require('./models/User');
const Category = require('./models/category');
const Product = require('./models/Product');

const seedData = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  await Promise.all([User.deleteMany(), Category.deleteMany(), Product.deleteMany()]);

  const password = await bcrypt.hash('Pass@123', 10);
  const [admin, seller, customer] = await User.create([
    { name: 'Admin User', email: 'admin@store.com', password, role: 'admin' },
    { name: 'Tech Seller', email: 'seller@store.com', password, role: 'seller' },
    { name: 'Rohan Customer', email: 'customer@store.com', password, role: 'customer' },
  ]);

  const [electronics, furniture] = await Category.create([
    { name: 'Electronics', description: 'Gadgets and accessories' },
    { name: 'Furniture', description: 'Office and study furniture' },
  ]);

  await Product.create([
    {
      name: 'Wireless Mechanical Keyboard',
      sku: 'ELEC-KB-101',
      price: 3499,
      stock: 15,
      reorderLevel: 5,
      category: electronics._id,
      seller: seller._id,
    },
    {
      name: 'Ergonomic Study Chair',
      sku: 'FURN-CH-202',
      price: 6999,
      stock: 4,
      reorderLevel: 5,
      category: furniture._id,
      seller: seller._id,
    },
  ]);

  console.log('[seed] Database seeded with Admin, Seller, Customer, Categories & Products');
  process.exit(0);
};

seedData();
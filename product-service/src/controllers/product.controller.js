const Product = require('../models/product.model');

exports.getAll = async (req, res) => {
  const products = await Product.find();
  res.json(products);
};

exports.create = async (req, res) => {
  const product = new Product(req.body);
  await product.save();
  res.status(201).json(product);
};

// product-service/src/controllers/product.controller.js
const Product = require('../models/product.model');
const { productSchema, updateProductSchema } = require('../validators/product.validator');
const { publishProductEvent } = require('../utils/rabbitmq');

exports.getAll = async (req, res) => {
  try {
    const products = await Product.find();
    res.json(products);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.create = async (req, res) => {
  try {
    const { error, value } = productSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    const product = new Product(value);
    await product.save();

    // Publish domain event to topic exchange
    await publishProductEvent('product.created', {
      id: product._id.toString(),
      name: product.name,
      price: product.price,
      inStock: product.inStock,
    });

    res.status(201).json(product);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const { error, value } = updateProductSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    const product = await Product.findByIdAndUpdate(req.params.id, value, { new: true });

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    await publishProductEvent('product.updated', {
      id: product._id.toString(),
      name: product.name,
      price: product.price,
      inStock: product.inStock,
    });

    res.json(product);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });
    res.json(product);
  } catch (err) {
    // CastError for invalid ObjectId lands here as well
    res.status(500).json({ message: err.message });
  }
};

exports.delete = async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });

    await publishProductEvent('product.deleted', { id: product._id.toString() });

    res.json({ message: 'Product deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

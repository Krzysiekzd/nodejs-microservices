const Product = require('../models/product.model');
const { productSchema, updateProductSchema } = require('../validators/product.validator');
const { publishToQueue } = require('../utils/rabbitmq');

exports.getAll = async (req, res) => {
  const products = await Product.find();
  res.json(products);
};

exports.create = async (req, res) => {
  try {
    const { error, value } = productSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    const product = new Product(value);
    await product.save();

    await publishToQueue('product_created', {
      id: product._id,
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
    if (error) return res.status(400).json({ message: error.details[0].message });

    const product = await Product.findByIdAndUpdate(req.params.id, value, { new: true });

    if (!product) return res.status(404).json({ message: 'Product not found' });

    await publishToQueue('product_updated', {
      id: product._id,
      name: product.name,
      price: product.price,
      inStock: product.inStock,
    });

    res.json(product);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
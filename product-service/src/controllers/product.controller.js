const Product = require('../models/product.model');
const { productSchema } = require('../validators/product.validator');
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

    // ✅ Publish event to RabbitMQ
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

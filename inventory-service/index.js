import express from 'express';
import dotenv from 'dotenv';
import { connectDB } from './src/db.js';
import { startConsumer } from './src/queue/consumer.js';
import { Product } from './src/models/product.js';
import { z } from 'zod';

dotenv.config();
const app = express();

const productSchema = z.object({
  _id: z.string(),
  name: z.string(),
  price: z.number().min(0),
  stock: z.number().int().min(0),
});

app.use(express.json());

app.get('/', (req, res) => {
  res.send('🛒 Inventory Service is running');
});

app.post('/products', async (req, res) => {
  const result = productSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: result.error.errors });
  }

  const product = new Product(result.data);
  await product.save();
  res.json(product);
});

app.get('/products/:id/stock', async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) {
    return res.status(404).json({ message: 'Product not found' });
  }
  res.json({
    productId: product._id,
    stock: product.stock,
  });
});

app.patch('/products/:id/replenish', async (req, res) => {
  const quantity = Number(req.body.quantity);

  if (!Number.isInteger(quantity) || quantity <= 0) {
    return res.status(400).json({ message: 'Quantity must be a positive integer' });
  }

  const product = await Product.findById(req.params.id);
  if (!product) {
    return res.status(404).json({ message: 'Product not found' });
  }

  product.stock += quantity;
  await product.save();

  res.json({
    message: 'Stock replenished',
    productId: product._id,
    newStock: product.stock,
  });
});

const PORT = process.env.PORT || 3004;

app.listen(PORT, async () => {
  console.log(`🚀 Inventory service running on port ${PORT}`);
  await connectDB();
  await startConsumer();
});

import express from "express";
import dotenv from "dotenv";
import { connectDB } from "./src/db.js";
import { startConsumer } from "./src/queue/consumer.js";
import { Product } from "./src/models/product.js";
import { z } from "zod";

dotenv.config();
const app = express();
app.use(express.json());

const productSchema = z.object({
  _id: z.string(),
  name: z.string(),
  price: z.number().min(0),
  stock: z.number().int().min(0),
});

app.use(express.json());

// Health check
app.get("/", (req, res) => {
  res.send("🛒 Inventory Service is running");
});

app.post("/products", async (req, res) => {
  const { _id, name, price, stock } = req.body;
  if (!_id || !name || typeof price !== "number" || typeof stock !== "number") {
    return res.status(400).json({ message: "Invalid product data" });
  }
  const product = new Product({ _id, name, price, stock });
  await product.save();
  res.status(201).json(product);
});

app.get("/products/:id/stock", async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) return res.status(404).json({ message: "Product not found" });
  res.json({ productId: product._id, stock: product.stock });
});

app.patch("/products/:id/replenish", async (req, res) => {
  const { quantity } = req.body;
  if (!Number.isInteger(quantity) || quantity <= 0) {
    return res
      .status(400)
      .json({ message: "Quantity must be a positive integer" });
  }
  const product = await Product.findById(req.params.id);
  if (!product) return res.status(404).json({ message: "Product not found" });
  product.stock += quantity;
  await product.save();
  res.json({
    message: "Stock replenished",
    productId: product._id,
    newStock: product.stock,
  });
});

const port = Number(process.env.PORT) || 3000;
app.listen(port, "0.0.0.0", async () => {
  console.log(`🚀 Inventory service running on port ${port}`);
  await connectDB();
  await startConsumer();
});

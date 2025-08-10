// inventory-service/src/models/product.js
import mongoose from 'mongoose';

const ProductSchema = new mongoose.Schema(
  {
    // We mirror the product-service id as string
    _id: { type: String, required: true },
    name: { type: String, required: true },
    price: { type: Number, required: true },
    stock: { type: Number, required: true, default: 0 },
  },
  { versionKey: false }
);

// Collection defaults to 'products'
export const Product = mongoose.model('Product', ProductSchema);

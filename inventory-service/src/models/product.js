import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
  _id: String,
  name: String,
  price: Number,
  stock: Number,
});

export const Product = mongoose.model('Product', productSchema);

require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const productRoutes = require('./src/routes/product.routes');

const app = express();
app.use(express.json());

// Routes
app.use('/products', productRoutes);

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('MongoDB connected');
    app.listen(3000, () => console.log('Product Service running on port 3000'));
  })
  .catch(err => console.error('MongoDB connection error:', err));

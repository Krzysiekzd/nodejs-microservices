require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const productRoutes = require('./src/routes/product.routes');
const { connectRabbitMQ } = require('./src/utils/rabbitmq');

const app = express();
app.use(express.json());

app.use('/products', productRoutes);

mongoose.connect(process.env.MONGODB_URL)
  .then(async () => {
    await connectRabbitMQ();
    app.listen(process.env.PORT, () => console.log(`Product Service running on port ${process.env.PORT}`));
  })
  .catch(err => console.error('MongoDB connection error:', err));

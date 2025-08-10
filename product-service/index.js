// product-service/index.js
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const productRoutes = require('./src/routes/product.routes');
const { connectRabbitMQ } = require('./src/utils/rabbitmq');

const MONGO_URL = process.env.MONGODB_URL || 'mongodb://mongodb:27017/product-db';
const PORT = Number(process.env.PORT) || 3000;

const app = express();
app.use(express.json());

// Routes
app.use('/products', productRoutes);

// Simple health endpoint
app.get('/health', (_req, res) => {
  const mongoState = mongoose.connection.readyState; // 0=disconnected, 1=connected, 2=connecting, 3=disconnecting
  res.json({
    status: 'ok',
    mongo: mongoState,
    time: new Date().toISOString(),
  });
});

async function start() {
  try {
    // Connect Mongo first (required for the service to function)
    await mongoose.connect(MONGO_URL);
    console.log('✅ Connected to MongoDB');

    // Start HTTP server
    const server = app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Product service running on port ${PORT}`);
    });

    // Lazy-init RabbitMQ (do not block server start)
    connectRabbitMQ().catch((err) => {
      console.error('❌ RabbitMQ init failed:', err?.message || err);
    });

    // Graceful shutdown
    const shutdown = async (signal) => {
      try {
        console.log(`🛑 Received ${signal}, shutting down...`);
        await mongoose.connection.close();
        server.close(() => {
          console.log('✅ HTTP server closed');
          process.exit(0);
        });
        // Force-exit if server doesn't close within timeout
        setTimeout(() => process.exit(0), 5000).unref();
      } catch (e) {
        console.error('❌ Error during shutdown:', e?.message || e);
        process.exit(1);
      }
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
  } catch (err) {
    console.error('❌ Failed to start product-service:', err?.message || err);
    process.exit(1);
  }
}

start();

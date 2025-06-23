import express from 'express';
import dotenv from 'dotenv';
import { startConsumer } from './src/queue/consumer.js';

dotenv.config();
const app = express();

app.get('/', (req, res) => {
  res.send('🔔 Notification service running');
});

app.listen(process.env.PORT, async () => {
  console.log(`🚀 Notification service running on port ${process.env.PORT}`);
  await startConsumer();
});

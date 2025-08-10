import express from "express";
import dotenv from "dotenv";
import { startConsumer } from "./src/queue/consumer.js";

dotenv.config();
const app = express();

app.get("/", (req, res) => {
  res.send("🔔 Notification service running");
});

const port = Number(process.env.PORT) || 3000;

app.listen(port, "0.0.0.0", async () => {
  console.log(`🚀 Notification service running on port ${port}`);
  await startConsumer();
});

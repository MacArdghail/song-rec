require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const { MongoClient } = require("mongodb");

const app = express();

// Middleware
app.use(cors());
app.use(helmet());
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 500 }));

// MongoDB
let cachedClient = null;

const mongoConnect = async () => {
  if (cachedClient) return cachedClient;
  const mongoUri = process.env.MONGODB_URI;
  const client = await MongoClient.connect(mongoUri);
  cachedClient = client;
  return client;
};

// Test db connection route
app.get("/test-db", async (req, res) => {
  try {
    const client = await mongoConnect();
    const db = client.db("songrec");
    const doc = await db.collection("test").findOne();

    if (!doc?.["testMessage"]) {
      return res.status(404).json({ message: "testMessage not found" });
    }

    res.status(200).json({ testMessage: doc["testMessage"] });
  } catch (error) {
    console.error("Error in /test-db:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    timestamp: new Date().toISOString(),
  });
});

// Shutdown
process.on("SIGINT", async () => {
  if (cachedClient) await cachedClient.close();
  console.log("MongoDB connection closed. Exiting...");
  process.exit(0);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

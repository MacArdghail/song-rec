const { MongoClient } = require("mongodb");
let cachedClient = null;

exports.mongoConnect = async () => {
  const mongoUri = process.env.MONGODB_URI;

  if (!mongoUri) {
    throw new Error("MONGODB_URI is not defined in environment variables");
  }

  if (cachedClient) {
    return cachedClient;
  }

  try {
    const client = new MongoClient(mongoUri);

    await client.connect();
    cachedClient = client;
    return client;
  } catch (err) {
    console.error("MongoDB connection failed", err);
    throw err;
  }
};

process.on("SIGINT", () => {
  if (cachedClient) {
    cachedClient
      .close()
      .then(() => {
        console.log("MongoDB connection closed");
        process.exit(0);
      })
      .catch((err) => {
        console.error("Error closing MongoDB connection", err);
        process.exit(1);
      });
  } else {
    process.exit(0);
  }
});

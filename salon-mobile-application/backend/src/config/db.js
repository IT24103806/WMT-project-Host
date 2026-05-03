const mongoose = require("mongoose");
const dotenv = require("dotenv");

dotenv.config();

const connectDatabase = async () => {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    throw new Error("MONGODB_URI is not set in environment variables");
  }

  await mongoose.connect(mongoUri, {
    serverSelectionTimeoutMS: 5000
  });
  // eslint-disable-next-line no-console
  console.log("MongoDB connected");
};

module.exports = connectDatabase;

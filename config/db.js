// Handles the connection to MongoDB Atlas.
const mongoose = require("mongoose");

async function connectDB() {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    console.error(
      "Missing MONGODB_URI. Create a .env file (see .env.example) with your MongoDB Atlas connection string."
    );
    process.exit(1);
  }

  try {
    await mongoose.connect(uri);
    console.log("Connected to MongoDB");
  } catch (err) {
    console.error("Failed to connect to MongoDB:", err.message);
    process.exit(1);
  }
}

module.exports = connectDB;

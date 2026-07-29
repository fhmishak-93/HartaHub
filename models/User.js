const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  passwordHash: { type: String, required: true },
  phone: { type: String, trim: true },
  // "pro" agents get unlimited listings/requirements and full contact
  // details on matches. Upgrades are granted manually for now (see
  // README "Manually upgrading an agent to Pro") - no payment gateway
  // is wired up yet.
  plan: { type: String, enum: ["free", "pro"], default: "free" },
  proExpiresAt: { type: Date }, // optional - set this if you sell fixed terms
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("User", userSchema);

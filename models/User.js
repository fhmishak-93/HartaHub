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
  // "pro" = 10 listings + 10 requirements, full contact details on matches.
  // "premium" = unlimited listings/requirements, photo upload, full contact.
  // Upgrades are granted manually for now (see README "Manually upgrading
  // an agent") - no payment gateway is wired up yet.
  plan: { type: String, enum: ["free", "pro", "premium"], default: "free" },
  planExpiresAt: { type: Date }, // optional - set this if you sell fixed terms
  // Registered Estate Negotiator number. Agents enter this at signup;
  // the site owner manually verifies it and flips renVerified to show
  // a gold tick next to their name (see README).
  renNumber: { type: String, trim: true },
  renVerified: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("User", userSchema);

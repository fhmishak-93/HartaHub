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
  // "premium" = unlimited listings/requirements, photo upload, full contact,
  // priority match ranking (see utils/matching.js PREMIUM_PRIORITY_BONUS).
  // Upgraded via bcl.my payment links (see routes/billing.js) - 30 days per
  // payment, renewed by paying again before planExpiresAt lapses.
  plan: { type: String, enum: ["free", "pro", "premium"], default: "free" },
  planExpiresAt: { type: Date }, // optional - set this if you sell fixed terms
  // The last bcl.my order_number that successfully upgraded this account -
  // makes applying an upgrade idempotent (a webhook can retry, and the
  // success-redirect page can also trigger a verify for the same order).
  lastBillingOrderNumber: { type: String },
  // Set when a checkout is started (see routes/billing.js) - bcl.my's real
  // order_number limit turned out to be 26 characters (their docs claim 64),
  // too short to encode a Mongo _id + plan + timestamp directly, so the
  // order number is just a short random token and the pending plan is
  // looked up here instead of being parsed back out of it.
  pendingBillingOrderNumber: { type: String },
  pendingBillingPlan: { type: String, enum: ["pro", "premium"] },
  // Registered Estate Negotiator number. Agents enter this at signup;
  // the site owner manually verifies it and flips renVerified to show
  // a gold tick next to their name (see README).
  renNumber: { type: String, trim: true },
  renVerified: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("User", userSchema);

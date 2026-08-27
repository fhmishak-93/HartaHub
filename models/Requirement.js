const mongoose = require("mongoose");
const {
  MALAYSIAN_STATES,
  PROPERTY_TYPES,
  TENURE_PREFERENCE_OPTIONS,
  BUMI_LOT_PREFERENCE_OPTIONS,
} = require("../utils/constants");

const requirementSchema = new mongoose.Schema({
  agent: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  clientLabel: { type: String, required: true, trim: true }, // e.g. "Mr. Tan - buyer"
  propertyType: { type: String, required: true, enum: PROPERTY_TYPES },
  state: { type: String, required: true, enum: MALAYSIAN_STATES },
  // Required - carries real weight (30%) in the match percentage, so a
  // blank area would make that whole slice of the score meaningless.
  area: { type: String, required: true, trim: true },
  budgetMin: { type: Number, required: true, min: 0 },
  budgetMax: { type: Number, required: true, min: 0 },
  bedrooms: { type: Number, min: 0 }, // minimum bedrooms wanted
  // Optional buyer preferences - "Any" (the default) never counts against
  // the match score. bumiLotPreference carries 10% weight in the match
  // percentage (see utils/matching.js); tenurePreference is informational
  // only for now - captured for the agent's own reference, not yet scored.
  tenurePreference: { type: String, enum: TENURE_PREFERENCE_OPTIONS, default: "Any" },
  bumiLotPreference: { type: String, enum: BUMI_LOT_PREFERENCE_OPTIONS, default: "Any" },
  // Loan eligibility check - a buyer whose financing has been pre-checked is
  // a more serious lead, so this earns a small match-score bonus (see
  // utils/matching.js) and shows as a green "Loan Checked" badge.
  loanChecked: { type: Boolean, default: false },
  loanAmount: { type: Number, min: 0 }, // eligible loan amount, only meaningful when loanChecked is true
  notes: { type: String, trim: true },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Requirement", requirementSchema);

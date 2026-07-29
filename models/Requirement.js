const mongoose = require("mongoose");
const { MALAYSIAN_STATES, PROPERTY_TYPES } = require("../utils/constants");

const requirementSchema = new mongoose.Schema({
  agent: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  clientLabel: { type: String, required: true, trim: true }, // e.g. "Mr. Tan - buyer"
  propertyType: { type: String, required: true, enum: PROPERTY_TYPES },
  state: { type: String, required: true, enum: MALAYSIAN_STATES },
  area: { type: String, trim: true },
  budgetMin: { type: Number, required: true, min: 0 },
  budgetMax: { type: Number, required: true, min: 0 },
  bedrooms: { type: Number, min: 0 }, // minimum bedrooms wanted
  notes: { type: String, trim: true },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Requirement", requirementSchema);

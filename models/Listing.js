const mongoose = require("mongoose");
const { MALAYSIAN_STATES, PROPERTY_TYPES } = require("../utils/constants");

const listingSchema = new mongoose.Schema({
  agent: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  title: { type: String, required: true, trim: true },
  propertyType: { type: String, required: true, enum: PROPERTY_TYPES },
  state: { type: String, required: true, enum: MALAYSIAN_STATES },
  area: { type: String, trim: true }, // e.g. "Mont Kiara", free text
  price: { type: Number, required: true, min: 0 },
  // Set once at creation and never changed again - lets us show "price
  // reduced by RM X" if the agent later lowers the asking price.
  originalPrice: { type: Number, required: true, min: 0 },
  bedrooms: { type: Number, min: 0 },
  bathrooms: { type: Number, min: 0 },
  sizeSqft: { type: Number, min: 0 },
  description: { type: String, trim: true },
  photoUrl: { type: String, trim: true },
  // "active" listings count toward the commission dashboard's potential
  // total; "closed" ones count toward the closed total.
  status: { type: String, enum: ["active", "closed"], default: "active" },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Listing", listingSchema);

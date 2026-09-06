// Shared dropdown options used by both the listing form and the buyer
// requirement form, so their values always line up for matching.

const MALAYSIAN_STATES = [
  "Johor",
  "Kedah",
  "Kelantan",
  "Kuala Lumpur",
  "Labuan",
  "Melaka",
  "Negeri Sembilan",
  "Pahang",
  "Perak",
  "Perlis",
  "Pulau Pinang",
  "Putrajaya",
  "Sabah",
  "Sarawak",
  "Selangor",
  "Terengganu",
];

const PROPERTY_TYPES = [
  "Condominium/Apartment",
  "Terrace/Link House",
  "Semi-Detached",
  "Bungalow/Detached",
  "Townhouse",
  "Commercial",
  "Land",
];

const TENURE_OPTIONS = ["Freehold", "Leasehold"];
const BUMI_LOT_OPTIONS = ["Bumi Lot", "Non-Bumi Lot"];

// Land size unit for "Land" listings - Malaysian agents measure land in
// acres (ekar) or relung, not sq ft.
const LAND_SIZE_UNITS = ["Ekar", "Relung"];

// Buyer-requirement preference versions - same values plus "Any", since a
// buyer (unlike a listing) can be indifferent about tenure/lot status.
const TENURE_PREFERENCE_OPTIONS = ["Any", "Freehold", "Leasehold"];
const BUMI_LOT_PREFERENCE_OPTIONS = ["Any", "Bumi Lot", "Non-Bumi Lot"];

// Fixed budget bands for the buyer requirement form - agents pick one of
// these instead of typing a free min/max. Note the gap between RM650,000 and
// RM800,000 is intentional, as specified. "Above RM1,000,000" is capped at a
// high but finite ceiling so the matching engine's price-fit math (which
// needs a real budgetMax) still works.
const BUDGET_RANGES = [
  { key: "150000-250000", min: 150000, max: 250000, label: "RM150,000 - RM250,000" },
  { key: "251000-350000", min: 251000, max: 350000, label: "RM251,000 - RM350,000" },
  { key: "351000-450000", min: 351000, max: 450000, label: "RM351,000 - RM450,000" },
  { key: "451000-550000", min: 451000, max: 550000, label: "RM451,000 - RM550,000" },
  { key: "551000-650000", min: 551000, max: 650000, label: "RM551,000 - RM650,000" },
  { key: "800000-1000000", min: 800000, max: 1000000, label: "RM800,000 - RM1,000,000" },
  { key: "1000001-10000000", min: 1000001, max: 10000000, label: "Above RM1,000,000" },
];

// Plan caps and pricing. Change the *_PRICE_RM values any time - they're
// only used for display, since billing is manual for now.
const FREE_LISTING_LIMIT = 2;
const FREE_REQUIREMENT_LIMIT = 2;
const PRO_LISTING_LIMIT = 10;
const PRO_REQUIREMENT_LIMIT = 10;
// Premium has no cap - code checks for Infinity rather than a number.
const PREMIUM_LISTING_LIMIT = Infinity;
const PREMIUM_REQUIREMENT_LIMIT = Infinity;

const PRO_PRICE_RM = 19;
const PREMIUM_PRICE_RM = 97;

// Used for the commission dashboard: estimated commission = price * this.
const COMMISSION_RATE = 0.03;

module.exports = {
  MALAYSIAN_STATES,
  PROPERTY_TYPES,
  TENURE_OPTIONS,
  BUMI_LOT_OPTIONS,
  LAND_SIZE_UNITS,
  TENURE_PREFERENCE_OPTIONS,
  BUMI_LOT_PREFERENCE_OPTIONS,
  BUDGET_RANGES,
  FREE_LISTING_LIMIT,
  FREE_REQUIREMENT_LIMIT,
  PRO_LISTING_LIMIT,
  PRO_REQUIREMENT_LIMIT,
  PREMIUM_LISTING_LIMIT,
  PREMIUM_REQUIREMENT_LIMIT,
  PRO_PRICE_RM,
  PREMIUM_PRICE_RM,
  COMMISSION_RATE,
};

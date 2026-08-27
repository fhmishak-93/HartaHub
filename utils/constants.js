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

// Buyer-requirement preference versions - same values plus "Any", since a
// buyer (unlike a listing) can be indifferent about tenure/lot status.
const TENURE_PREFERENCE_OPTIONS = ["Any", "Freehold", "Leasehold"];
const BUMI_LOT_PREFERENCE_OPTIONS = ["Any", "Bumi Lot", "Non-Bumi Lot"];

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
  TENURE_PREFERENCE_OPTIONS,
  BUMI_LOT_PREFERENCE_OPTIONS,
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

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

// Free-plan caps and Pro pricing. Change PRO_PRICE_RM any time - it's only
// used for display, since billing is manual for now.
const FREE_LISTING_LIMIT = 2;
const FREE_REQUIREMENT_LIMIT = 2;
const PRO_PRICE_RM = 39;

module.exports = {
  MALAYSIAN_STATES,
  PROPERTY_TYPES,
  FREE_LISTING_LIMIT,
  FREE_REQUIREMENT_LIMIT,
  PRO_PRICE_RM,
};

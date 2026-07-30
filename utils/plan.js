const {
  FREE_LISTING_LIMIT,
  FREE_REQUIREMENT_LIMIT,
  PRO_LISTING_LIMIT,
  PRO_REQUIREMENT_LIMIT,
  PREMIUM_LISTING_LIMIT,
  PREMIUM_REQUIREMENT_LIMIT,
} = require("./constants");

// The user's effective plan tier right now - "free", "pro", or "premium".
// Handles the optional planExpiresAt date, so a manually-granted upgrade
// can lapse back to "free" on its own without any code needing to know
// or care that it happened.
function getTier(user) {
  if (!user || !user.plan || user.plan === "free") return "free";
  if (user.planExpiresAt && new Date(user.planExpiresAt) < new Date()) return "free";
  return user.plan; // "pro" or "premium"
}

function getListingLimit(tier) {
  if (tier === "premium") return PREMIUM_LISTING_LIMIT;
  if (tier === "pro") return PRO_LISTING_LIMIT;
  return FREE_LISTING_LIMIT;
}

function getRequirementLimit(tier) {
  if (tier === "premium") return PREMIUM_REQUIREMENT_LIMIT;
  if (tier === "pro") return PRO_REQUIREMENT_LIMIT;
  return FREE_REQUIREMENT_LIMIT;
}

// Pro and Premium both see full contact details on matches and can
// upload a real photo instead of pasting a link.
function canSeeContactDetails(tier) {
  return tier === "pro" || tier === "premium";
}

function canUploadPhoto(tier) {
  return tier === "pro" || tier === "premium";
}

function canSeeCommissionDashboard(tier) {
  return tier === "pro" || tier === "premium";
}

module.exports = {
  getTier,
  getListingLimit,
  getRequirementLimit,
  canSeeContactDetails,
  canUploadPhoto,
  canSeeCommissionDashboard,
};

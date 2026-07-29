// Core matching logic for Hartahub.
//
// A listing "matches" a buyer requirement when:
//   1. Same property type
//   2. Same state
//   3. The listing's price falls within the requirement's budget range
//   4. If the requirement specifies a minimum number of bedrooms, the
//      listing has at least that many (listings without a bedroom count
//      are treated as unknown and still allowed through)
//
// This is plain rule-based matching - no AI/ML involved, which keeps it
// fast, predictable, and easy to explain to users.

function isMatch(listing, requirement) {
  if (listing.propertyType !== requirement.propertyType) return false;
  if (listing.state !== requirement.state) return false;
  if (listing.price < requirement.budgetMin || listing.price > requirement.budgetMax) {
    return false;
  }
  if (requirement.bedrooms && listing.bedrooms && listing.bedrooms < requirement.bedrooms) {
    return false;
  }
  return true;
}

// Given all listings and all requirements, return every matching pair.
function computeMatches(listings, requirements) {
  const matches = [];
  for (const requirement of requirements) {
    for (const listing of listings) {
      if (isMatch(listing, requirement)) {
        matches.push({ listing, requirement });
      }
    }
  }
  return matches;
}

module.exports = { isMatch, computeMatches };

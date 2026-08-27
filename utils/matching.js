// Core matching logic for Hartahub.
//
// Two layers:
//
// 1. HARD FILTERS (isMatch) - property type and state are absolute
//    requirements, not a matter of degree. A buyer looking for a
//    Terrace/Link House in Selangor has no practical use for the same
//    property type in Johor no matter how well price/area line up - nobody
//    is co-broking a client across state lines - so there's no meaningful
//    "80% match" for a different state, same as there isn't for a
//    different property type.
//
// 2. PERCENTAGE SCORE (computeMatchScore) - everything else is weighted and
//    scored 0-100 rather than hard-gated, so a listing slightly over budget
//    or a bit short on bedrooms still surfaces (just ranked lower) instead
//    of disappearing entirely.
//
//      Price            40%
//      Preferred area   40%  (mandatory on the requirement - see models/Requirement.js)
//      Minimum bedrooms 10%
//      Lot status       10%
//
// Matches below MIN_MATCH_SCORE are dropped entirely, so a technically-passed
// pair with a terrible price/area/bedroom fit doesn't clutter the dashboard.
//
// Still plain rule-based scoring - no AI/ML involved, which keeps it fast,
// predictable, and easy to explain to an agent ("why is this 62%?").

const SCORE_WEIGHTS = {
  price: 40,
  area: 40,
  bedrooms: 10,
  lotStatus: 10,
};

const MIN_MATCH_SCORE = 30;

function isMatch(listing, requirement) {
  return listing.propertyType === requirement.propertyType && listing.state === requirement.state;
}

// Inside budget: 60-100, scored by how close to the midpoint (more room to
// negotiate). Outside budget: decays from 60 down to 0 the further off it
// is, so a listing 5-10% over budget can still show up, just lower-ranked.
function scorePriceFit(listing, requirement) {
  const { budgetMin, budgetMax } = requirement;
  const price = Number(listing.price);

  if (price >= budgetMin && price <= budgetMax) {
    const mid = (budgetMin + budgetMax) / 2;
    const halfRange = (budgetMax - budgetMin) / 2 || 1;
    const closeness = 1 - Math.abs(price - mid) / halfRange;
    return 60 + closeness * 40;
  }

  const edge = price < budgetMin ? budgetMin : budgetMax;
  const overshoot = Math.abs(price - edge) / edge; // relative distance past the edge
  return Math.max(0, Math.round(60 - overshoot * 200)); // ~30% past the edge = 0
}

// Preferred area is mandatory going forward, but older requirements posted
// before that requirement existed may still have it blank - fall back to a
// neutral score rather than crashing or unfairly zeroing them out.
function scoreAreaFit(listing, requirement) {
  const reqArea = (requirement.area || "").trim().toLowerCase();
  if (!reqArea) return 100;
  const listArea = (listing.area || "").trim().toLowerCase();
  if (!listArea) return 50; // buyer wants a specific area, listing didn't say
  if (listArea === reqArea) return 100;
  if (listArea.includes(reqArea) || reqArea.includes(listArea)) return 85; // e.g. "Kulim" vs "Lunas/Kulim"
  return 15; // different area entirely
}

// Meets-or-exceeds the minimum = strong score, tapering off the more the
// listing overshoots; short of the minimum scores low but not zero (isMatch
// no longer hard-blocks this, so a close-but-short listing can still surface).
function scoreBedroomsFit(listing, requirement) {
  if (!requirement.bedrooms) return 100; // no minimum stated
  if (listing.bedrooms == null) return 60; // listing didn't specify - can't confirm either way
  const diff = listing.bedrooms - requirement.bedrooms;
  if (diff === 0) return 100;
  if (diff === 1) return 90;
  if (diff === 2) return 80;
  if (diff > 2) return 70;
  if (diff === -1) return 40;
  return 15; // 2+ bedrooms short of what was asked for
}

function scoreLotStatusFit(listing, requirement) {
  const pref = requirement.bumiLotPreference;
  if (!pref || pref === "Any") return 100;
  if (!listing.bumiLot) return 60; // listing didn't specify
  return listing.bumiLot === pref ? 100 : 30;
}

// Weighted average of every scoring dimension, rounded to a whole percent.
function computeMatchScore(listing, requirement) {
  const scores = {
    price: scorePriceFit(listing, requirement),
    area: scoreAreaFit(listing, requirement),
    bedrooms: scoreBedroomsFit(listing, requirement),
    lotStatus: scoreLotStatusFit(listing, requirement),
  };
  let total = 0;
  for (const key of Object.keys(SCORE_WEIGHTS)) {
    total += scores[key] * SCORE_WEIGHTS[key];
  }
  return Math.round(total / 100);
}

// Given all listings and all requirements, return every matching pair
// scoring at least MIN_MATCH_SCORE, with its match percentage attached,
// best matches first.
function computeMatches(listings, requirements) {
  const matches = [];
  for (const requirement of requirements) {
    for (const listing of listings) {
      if (!isMatch(listing, requirement)) continue;
      const matchScore = computeMatchScore(listing, requirement);
      if (matchScore >= MIN_MATCH_SCORE) {
        matches.push({ listing, requirement, matchScore });
      }
    }
  }
  matches.sort((a, b) => b.matchScore - a.matchScore);
  return matches;
}

module.exports = { isMatch, computeMatchScore, computeMatches, MIN_MATCH_SCORE };

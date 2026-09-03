// Core matching logic for Hartahub.
//
// Two layers:
//
// 1. HARD FILTERS (isMatch) - absolute requirements, not a matter of degree.
//    Price and Area are deliberately on this list, not just weighted: a
//    listing must genuinely fit the buyer's price and location before it
//    counts as a match at all - a good bedroom count or lot status can never
//    make up for the wrong price or the wrong area.
//      - Property type must match. A buyer looking for a Terrace/Link House
//        has no practical use for a bungalow listing no matter how well
//        everything else lines up.
//      - State must match. Co-broking is local - a Selangor buyer can't use
//        a Johor listing no matter how good the price is.
//      - Listing price must not exceed the buyer's maximum budget. A buyer
//        literally cannot buy a property priced above what they can afford,
//        so this can never be "a lower score" - it's a hard no regardless of
//        how well area/bedrooms/lot status line up.
//      - Listing area must match the buyer's preferred area exactly (both
//        sides are now picked from the same structured town list - see
//        utils/areas.js - so an exact, case-insensitive comparison is
//        reliable). A listing with no area set, or in a different town,
//        never counts as a match no matter how well price/bedrooms/lot
//        status line up.
//
// 2. PERCENTAGE SCORE (computeMatchScore) - among pairs that already passed
//    every hard filter above, price closeness/bedrooms/lot status are
//    weighted and scored 0-100 to rank the better fits higher. Area no
//    longer varies here (isMatch already guarantees it's exact), so its
//    slice of the score is effectively a constant for every surviving match.
//
//      Price            40%  (closeness within budget - already guaranteed in-range on the high side)
//      Preferred area   40%  (already guaranteed exact by isMatch above)
//      Minimum bedrooms 10%
//      Lot status       10%
//
// Matches below MIN_MATCH_SCORE are dropped entirely, so a technically-passed
// pair with a terrible price/bedroom fit doesn't clutter the dashboard.
//
// On top of the weighted score, two flat bonuses can apply (each capped so
// the total never exceeds 100):
//   - LOAN_CHECKED_BONUS: the requirement's buyer has a loan eligibility
//     check on file - a pre-checked buyer is a more serious, ready-to-close
//     lead, so they get priority without needing their own weighted slice.
//   - PREMIUM_PRIORITY_BONUS: a Premium perk (see utils/plan.js). Applied
//     once for each side of the match (listing agent, requirement agent)
//     that's on the Premium plan, so a Premium agent's listings and buyer
//     requirements both rank higher across the board - if both agents in a
//     match are Premium, the bonus stacks.
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
const LOAN_CHECKED_BONUS = 5;
const PREMIUM_PRIORITY_BONUS = 5;

function areasMatch(listing, requirement) {
  const reqArea = (requirement.area || "").trim().toLowerCase();
  const listArea = (listing.area || "").trim().toLowerCase();
  if (!reqArea || !listArea) return false; // area is mandatory on the requirement; a listing with no area can't be confirmed
  return reqArea === listArea;
}

function isMatch(listing, requirement) {
  return (
    listing.propertyType === requirement.propertyType &&
    listing.state === requirement.state &&
    Number(listing.price) <= requirement.budgetMax &&
    areasMatch(listing, requirement)
  );
}

// isMatch() already guarantees price <= budgetMax, so this only ever scores
// two cases: comfortably inside the range (60-100, best at the midpoint - more
// room to negotiate), or below budgetMin (still affordable, but decays the
// cheaper it gets relative to what the buyer expected to pay - a price far
// below budget often means a very different property than what they had in mind).
function scorePriceFit(listing, requirement) {
  const { budgetMin, budgetMax } = requirement;
  const price = Number(listing.price);

  if (price >= budgetMin) {
    const mid = (budgetMin + budgetMax) / 2;
    const halfRange = (budgetMax - budgetMin) / 2 || 1;
    const closeness = 1 - Math.abs(price - mid) / halfRange;
    return 60 + closeness * 40;
  }

  const shortfall = (budgetMin - price) / budgetMin; // relative distance below the minimum
  return Math.max(0, Math.round(60 - shortfall * 200)); // ~30% under = 0
}

// isMatch() already requires an exact area match, so in practice this always
// returns 100 for any pair reaching computeMatchScore. Kept as its own
// function (rather than a hardcoded 100 in computeMatchScore) so the area
// slice stays self-documenting and safe if isMatch's rules ever change.
function scoreAreaFit(listing, requirement) {
  return areasMatch(listing, requirement) ? 100 : 0;
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
  let score = Math.round(total / 100);
  if (requirement.loanChecked) {
    score += LOAN_CHECKED_BONUS;
  }
  if (listing.agent && listing.agent.plan === "premium") {
    score += PREMIUM_PRIORITY_BONUS;
  }
  if (requirement.agent && requirement.agent.plan === "premium") {
    score += PREMIUM_PRIORITY_BONUS;
  }
  return Math.min(100, score);
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

module.exports = {
  isMatch,
  computeMatchScore,
  computeMatches,
  MIN_MATCH_SCORE,
  LOAN_CHECKED_BONUS,
  PREMIUM_PRIORITY_BONUS,
  areasMatch,
};

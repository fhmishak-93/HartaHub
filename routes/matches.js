const express = require("express");
const Listing = require("../models/Listing");
const Requirement = require("../models/Requirement");
const User = require("../models/User");
const requireAuth = require("../middleware/requireAuth");
const { computeMatches } = require("../utils/matching");
const { getTier, canSeeContactDetails } = require("../utils/plan");

const router = express.Router();

// Free-plan agents see that a match exists and who the counterpart agent
// is by name, but their email/phone are hidden behind an upgrade prompt.
// This is only ever done server-side, never in the browser, so a free
// user can't just peek at the raw API response to get around it.
function maskContact(match, myUserId) {
  const listingIsMine = String(match.listing.agent._id) === myUserId;
  const requirementIsMine = String(match.requirement.agent._id) === myUserId;

  if (!listingIsMine) {
    match.listing.agent.email = null;
    match.listing.agent.phone = null;
    match.listing.agent.locked = true;
  }
  if (!requirementIsMine) {
    match.requirement.agent.email = null;
    match.requirement.agent.phone = null;
    match.requirement.agent.locked = true;
  }
  return match;
}

// GET /api/matches - matches involving the logged-in agent, either as the
// lister (someone else's buyer requirement fits your listing) or as the
// one with the buyer requirement (someone else's listing fits your buyer).
router.get("/", requireAuth, async (req, res) => {
  try {
    const [listings, requirements, me] = await Promise.all([
      Listing.find().populate("agent", "name email phone renVerified"),
      Requirement.find().populate("agent", "name email phone renVerified"),
      User.findById(req.session.userId),
    ]);

    const allMatches = computeMatches(listings, requirements);

    const myUserId = String(req.session.userId);
    let myMatches = allMatches.filter(
      (m) => String(m.listing.agent._id) === myUserId || String(m.requirement.agent._id) === myUserId
    );

    // Sort newest first for a more useful dashboard.
    myMatches.sort(
      (a, b) =>
        new Date(b.requirement.createdAt) - new Date(a.requirement.createdAt)
    );

    // Convert to plain objects so we can safely null out fields below.
    myMatches = myMatches.map((m) => ({
      listing: m.listing.toObject(),
      requirement: m.requirement.toObject(),
    }));

    if (!canSeeContactDetails(getTier(me))) {
      myMatches = myMatches.map((m) => maskContact(m, myUserId));
    }

    res.json(myMatches);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not compute matches." });
  }
});

module.exports = router;

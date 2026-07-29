const express = require("express");
const Listing = require("../models/Listing");
const Requirement = require("../models/Requirement");
const requireAuth = require("../middleware/requireAuth");
const { computeMatches } = require("../utils/matching");

const router = express.Router();

// GET /api/matches - matches involving the logged-in agent, either as the
// lister (someone else's buyer requirement fits your listing) or as the
// one with the buyer requirement (someone else's listing fits your buyer).
router.get("/", requireAuth, async (req, res) => {
  try {
    const [listings, requirements] = await Promise.all([
      Listing.find().populate("agent", "name email phone"),
      Requirement.find().populate("agent", "name email phone"),
    ]);

    const allMatches = computeMatches(listings, requirements);

    const myUserId = String(req.session.userId);
    const myMatches = allMatches.filter(
      (m) => String(m.listing.agent._id) === myUserId || String(m.requirement.agent._id) === myUserId
    );

    // Sort newest first for a more useful dashboard.
    myMatches.sort(
      (a, b) =>
        new Date(b.requirement.createdAt) - new Date(a.requirement.createdAt)
    );

    res.json(myMatches);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not compute matches." });
  }
});

module.exports = router;

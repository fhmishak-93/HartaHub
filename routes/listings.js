const express = require("express");
const Listing = require("../models/Listing");
const requireAuth = require("../middleware/requireAuth");

const router = express.Router();

// GET /api/listings - browse all listings (newest first), optional filters
router.get("/", async (req, res) => {
  try {
    const filter = {};
    if (req.query.state) filter.state = req.query.state;
    if (req.query.propertyType) filter.propertyType = req.query.propertyType;

    const listings = await Listing.find(filter)
      .populate("agent", "name email phone")
      .sort({ createdAt: -1 });
    res.json(listings);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not load listings." });
  }
});

// GET /api/listings/mine - listings posted by the logged-in agent
router.get("/mine", requireAuth, async (req, res) => {
  try {
    const listings = await Listing.find({ agent: req.session.userId }).sort({ createdAt: -1 });
    res.json(listings);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not load your listings." });
  }
});

// POST /api/listings - create a new listing
router.post("/", requireAuth, async (req, res) => {
  try {
    const {
      title,
      propertyType,
      state,
      area,
      price,
      bedrooms,
      bathrooms,
      sizeSqft,
      description,
      photoUrl,
    } = req.body;

    if (!title || !propertyType || !state || !price) {
      return res
        .status(400)
        .json({ error: "Title, property type, state, and price are required." });
    }

    const listing = await Listing.create({
      agent: req.session.userId,
      title,
      propertyType,
      state,
      area,
      price,
      bedrooms: bedrooms || undefined,
      bathrooms: bathrooms || undefined,
      sizeSqft: sizeSqft || undefined,
      description,
      photoUrl,
    });

    res.status(201).json(listing);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not create listing." });
  }
});

// DELETE /api/listings/:id - remove one of your own listings
router.delete("/:id", requireAuth, async (req, res) => {
  try {
    const listing = await Listing.findById(req.params.id);
    if (!listing) return res.status(404).json({ error: "Listing not found." });
    if (String(listing.agent) !== String(req.session.userId)) {
      return res.status(403).json({ error: "You can only delete your own listings." });
    }
    await listing.deleteOne();
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not delete listing." });
  }
});

module.exports = router;

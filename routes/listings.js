const express = require("express");
const Listing = require("../models/Listing");
const User = require("../models/User");
const requireAuth = require("../middleware/requireAuth");
const { getTier, getListingLimit } = require("../utils/plan");
const { isValidArea } = require("../utils/areas");

const router = express.Router();

// GET /api/listings - browse all listings (newest first), optional filters
router.get("/", async (req, res) => {
  try {
    const filter = {};
    if (req.query.state) filter.state = req.query.state;
    if (req.query.propertyType) filter.propertyType = req.query.propertyType;
    if (req.query.area) filter.area = { $regex: req.query.area, $options: "i" };
    if (req.query.priceMin || req.query.priceMax) {
      filter.price = {};
      if (req.query.priceMin) filter.price.$gte = Number(req.query.priceMin);
      if (req.query.priceMax) filter.price.$lte = Number(req.query.priceMax);
    }

    const listings = await Listing.find(filter)
      .populate("agent", "name email phone renVerified")
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

// GET /api/listings/:id - a single listing (used to prefill the edit form)
router.get("/:id", async (req, res) => {
  try {
    const listing = await Listing.findById(req.params.id).populate(
      "agent",
      "name email phone renVerified"
    );
    if (!listing) return res.status(404).json({ error: "Listing not found." });
    res.json(listing);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not load listing." });
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
      tenure,
      bumiLot,
      maintenanceFee,
      floorLevel,
      description,
      photoUrl,
    } = req.body;

    if (!title || !propertyType || !state || !area || !price) {
      return res
        .status(400)
        .json({ error: "Title, property type, state, area, and price are required." });
    }
    // Must be a real town from that state's list - keeps matching
    // (utils/matching.js) comparing like-for-like instead of guessing at
    // free text, and lets a listing actually be found by area matching.
    if (!isValidArea(state, area)) {
      return res.status(400).json({ error: "Please choose an area from the list for the selected state." });
    }

    const user = await User.findById(req.session.userId);
    const tier = getTier(user);
    const limit = getListingLimit(tier);
    if (Number.isFinite(limit)) {
      const activeCount = await Listing.countDocuments({ agent: req.session.userId });
      if (activeCount >= limit) {
        return res.status(403).json({
          error: `Your plan is limited to ${limit} listings. Upgrade for more room.`,
        });
      }
    }

    const listing = await Listing.create({
      agent: req.session.userId,
      title,
      propertyType,
      state,
      area,
      price,
      originalPrice: price,
      bedrooms: bedrooms || undefined,
      bathrooms: bathrooms || undefined,
      sizeSqft: sizeSqft || undefined,
      tenure: tenure || undefined,
      bumiLot: bumiLot || undefined,
      maintenanceFee: maintenanceFee || undefined,
      floorLevel: floorLevel || undefined,
      description,
      photoUrl,
    });

    res.status(201).json(listing);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not create listing." });
  }
});

// PATCH /api/listings/:id - edit one of your own listings (including
// marking it active/closed). originalPrice is never touched here, so
// price-drop tracking stays accurate no matter how many times price changes.
router.patch("/:id", requireAuth, async (req, res) => {
  try {
    const listing = await Listing.findById(req.params.id);
    if (!listing) return res.status(404).json({ error: "Listing not found." });
    if (String(listing.agent) !== String(req.session.userId)) {
      return res.status(403).json({ error: "You can only edit your own listings." });
    }

    const editable = [
      "title",
      "propertyType",
      "state",
      "area",
      "price",
      "bedrooms",
      "bathrooms",
      "sizeSqft",
      "tenure",
      "bumiLot",
      "maintenanceFee",
      "floorLevel",
      "description",
      "photoUrl",
      "status",
    ];
    for (const field of editable) {
      if (req.body[field] !== undefined && req.body[field] !== "") {
        listing[field] = req.body[field];
      }
    }

    // Only re-validate area if this request actually touched area or state -
    // otherwise an older listing predating the structured area list would
    // get stuck unable to save any other edit until its area is fixed.
    if (
      (req.body.area !== undefined || req.body.state !== undefined) &&
      listing.area &&
      !isValidArea(listing.state, listing.area)
    ) {
      return res.status(400).json({ error: "Please choose an area from the list for the selected state." });
    }

    await listing.save();
    res.json(listing);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not update listing." });
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

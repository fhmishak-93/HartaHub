const express = require("express");
const Requirement = require("../models/Requirement");
const User = require("../models/User");
const requireAuth = require("../middleware/requireAuth");
const { getTier, getRequirementLimit } = require("../utils/plan");

const router = express.Router();

// GET /api/requirements/mine - buyer requirements posted by the logged-in agent
router.get("/mine", requireAuth, async (req, res) => {
  try {
    const requirements = await Requirement.find({ agent: req.session.userId }).sort({
      createdAt: -1,
    });
    res.json(requirements);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not load your buyer requirements." });
  }
});

// GET /api/requirements/:id - a single requirement (used to prefill the edit form)
router.get("/:id", requireAuth, async (req, res) => {
  try {
    const requirement = await Requirement.findById(req.params.id);
    if (!requirement) return res.status(404).json({ error: "Requirement not found." });
    if (String(requirement.agent) !== String(req.session.userId)) {
      return res.status(403).json({ error: "You can only view your own buyer requirements." });
    }
    res.json(requirement);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not load buyer requirement." });
  }
});

// POST /api/requirements - create a new buyer requirement
router.post("/", requireAuth, async (req, res) => {
  try {
    const { clientLabel, propertyType, state, area, budgetMin, budgetMax, bedrooms, notes } =
      req.body;

    if (!clientLabel || !propertyType || !state || !budgetMin || !budgetMax) {
      return res.status(400).json({
        error: "Client label, property type, state, and budget range are required.",
      });
    }
    if (Number(budgetMin) > Number(budgetMax)) {
      return res.status(400).json({ error: "Minimum budget cannot be more than maximum budget." });
    }

    const user = await User.findById(req.session.userId);
    const tier = getTier(user);
    const limit = getRequirementLimit(tier);
    if (Number.isFinite(limit)) {
      const activeCount = await Requirement.countDocuments({ agent: req.session.userId });
      if (activeCount >= limit) {
        return res.status(403).json({
          error: `Your plan is limited to ${limit} buyer requirements. Upgrade for more room.`,
        });
      }
    }

    const requirement = await Requirement.create({
      agent: req.session.userId,
      clientLabel,
      propertyType,
      state,
      area,
      budgetMin,
      budgetMax,
      bedrooms: bedrooms || undefined,
      notes,
    });

    res.status(201).json(requirement);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not create buyer requirement." });
  }
});

// PATCH /api/requirements/:id - edit one of your own buyer requirements
router.patch("/:id", requireAuth, async (req, res) => {
  try {
    const requirement = await Requirement.findById(req.params.id);
    if (!requirement) return res.status(404).json({ error: "Requirement not found." });
    if (String(requirement.agent) !== String(req.session.userId)) {
      return res.status(403).json({ error: "You can only edit your own buyer requirements." });
    }

    if (
      req.body.budgetMin !== undefined &&
      req.body.budgetMax !== undefined &&
      Number(req.body.budgetMin) > Number(req.body.budgetMax)
    ) {
      return res.status(400).json({ error: "Minimum budget cannot be more than maximum budget." });
    }

    const editable = ["clientLabel", "propertyType", "state", "area", "budgetMin", "budgetMax", "bedrooms", "notes"];
    for (const field of editable) {
      if (req.body[field] !== undefined && req.body[field] !== "") {
        requirement[field] = req.body[field];
      }
    }

    await requirement.save();
    res.json(requirement);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not update buyer requirement." });
  }
});

// DELETE /api/requirements/:id - remove one of your own buyer requirements
router.delete("/:id", requireAuth, async (req, res) => {
  try {
    const requirement = await Requirement.findById(req.params.id);
    if (!requirement) return res.status(404).json({ error: "Requirement not found." });
    if (String(requirement.agent) !== String(req.session.userId)) {
      return res.status(403).json({ error: "You can only delete your own buyer requirements." });
    }
    await requirement.deleteOne();
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not delete buyer requirement." });
  }
});

module.exports = router;

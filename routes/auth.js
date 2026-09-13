const express = require("express");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const { getTier, getListingLimit, getRequirementLimit } = require("../utils/plan");

const router = express.Router();

// POST /api/auth/signup - create a new agent account
router.post("/signup", async (req, res) => {
  try {
    const { name, email, password, phone, renNumber } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: "Name, email, and password are required." });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters." });
    }

    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      return res.status(400).json({ error: "An account with this email already exists." });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      passwordHash,
      phone: phone ? phone.trim() : undefined,
      renNumber: renNumber ? renNumber.trim() : undefined,
    });

    req.session.userId = user._id;
    res.json({ id: user._id, name: user.name, email: user.email });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Something went wrong creating your account." });
  }
});

// POST /api/auth/login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required." });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    req.session.userId = user._id;
    res.json({ id: user._id, name: user.name, email: user.email });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Something went wrong logging you in." });
  }
});

// POST /api/auth/logout
router.post("/logout", (req, res) => {
  req.session.destroy(() => {
    res.json({ success: true });
  });
});

// GET /api/auth/me - who is currently logged in (used by pages to check auth state)
router.get("/me", async (req, res) => {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: "Not logged in." });
  }
  const user = await User.findById(req.session.userId).select(
    "name email phone plan planExpiresAt renVerified renNumber"
  );
  if (!user) {
    return res.status(401).json({ error: "Not logged in." });
  }
  const tier = getTier(user);
  const listingLimit = getListingLimit(tier);
  const requirementLimit = getRequirementLimit(tier);
  res.json({
    id: user._id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    plan: tier,
    planExpiresAt: user.planExpiresAt,
    renVerified: user.renVerified,
    renNumber: user.renNumber,
    // Infinity isn't valid JSON - null means "unlimited" on the frontend.
    listingLimit: Number.isFinite(listingLimit) ? listingLimit : null,
    requirementLimit: Number.isFinite(requirementLimit) ? requirementLimit : null,
  });
});

// PATCH /api/auth/me - update your own profile. Only the fields provided are
// changed, so the phone-only call from the upgrade page's checkout flow
// (routes/billing.js) keeps working unchanged.
router.patch("/me", async (req, res) => {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: "Not logged in." });
  }
  try {
    const { name, email, phone, renNumber } = req.body;
    const user = await User.findById(req.session.userId);
    if (!user) return res.status(401).json({ error: "Not logged in." });

    if (name !== undefined) {
      if (!name.trim()) return res.status(400).json({ error: "Name cannot be empty." });
      user.name = name.trim();
    }
    if (email !== undefined) {
      const normalized = email.toLowerCase().trim();
      if (!normalized) return res.status(400).json({ error: "Email cannot be empty." });
      if (normalized !== user.email) {
        const existing = await User.findOne({ email: normalized });
        if (existing) return res.status(400).json({ error: "That email is already in use." });
        user.email = normalized;
      }
    }
    if (phone !== undefined) {
      if (!phone.trim()) return res.status(400).json({ error: "Phone number cannot be empty." });
      user.phone = phone.trim();
    }
    if (renNumber !== undefined) {
      const trimmed = renNumber.trim();
      // Changing your REN number invalidates the site owner's earlier
      // manual verification of the old one - see models/User.js.
      if (trimmed !== (user.renNumber || "")) {
        user.renVerified = false;
      }
      user.renNumber = trimmed;
    }

    await user.save();
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not update profile." });
  }
});

// PATCH /api/auth/password - change your own password.
router.patch("/password", async (req, res) => {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: "Not logged in." });
  }
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: "Current and new password are required." });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ error: "New password must be at least 6 characters." });
    }

    const user = await User.findById(req.session.userId);
    if (!user) return res.status(401).json({ error: "Not logged in." });

    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) return res.status(400).json({ error: "Current password is incorrect." });

    user.passwordHash = await bcrypt.hash(newPassword, 10);
    await user.save();
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not change password." });
  }
});

module.exports = router;

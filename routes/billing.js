const express = require("express");
const User = require("../models/User");
const requireAuth = require("../middleware/requireAuth");
const { createPaymentLink, getTransaction } = require("../utils/bcl");
const { PRO_PRICE_RM, PREMIUM_PRICE_RM } = require("../utils/constants");

const router = express.Router();

const PLAN_PRICES = { pro: PRO_PRICE_RM, premium: PREMIUM_PRICE_RM };
const PLAN_DAYS = 30;

// Encodes the user + plan into bcl.my's order_number, since Hartahub has no
// separate "pending order" table - the order number IS the record. Format
// must be letters/digits/._-/ only and not start with "LINK-" (bcl.my rule).
function buildOrderNumber(userId, plan) {
  return `HH-${userId}-${plan}-${Date.now()}`;
}

function parseOrderNumber(orderNumber) {
  const match = /^HH-([a-f0-9]{24})-(pro|premium)-(\d+)$/.exec(orderNumber || "");
  if (!match) return null;
  return { userId: match[1], plan: match[2] };
}

// Verifies a transaction with bcl.my directly (never trusts a webhook body
// or a redirect query string on its own - see utils/bcl.js) and, if it's
// genuinely paid and hasn't been applied yet, upgrades the account.
// Shared by the webhook and the success-redirect fast path below, so
// whichever fires first does the work and the other is a no-op.
async function applyUpgradeIfPaid(orderNumber) {
  const parsed = parseOrderNumber(orderNumber);
  if (!parsed) return { applied: false, reason: "Unrecognised order number." };

  const user = await User.findById(parsed.userId);
  if (!user) return { applied: false, reason: "Account not found." };

  if (user.lastBillingOrderNumber === orderNumber) {
    return { applied: true, alreadyApplied: true, plan: parsed.plan };
  }

  const result = await getTransaction(orderNumber);
  const txn = result && result.data && result.data.main_data;
  if (!txn || !txn.is_paid) {
    return { applied: false, reason: "Not paid yet." };
  }
  if (Number(txn.amount) !== Number(PLAN_PRICES[parsed.plan])) {
    return { applied: false, reason: "Amount does not match the plan price." };
  }

  const now = new Date();
  const currentExpiry = user.planExpiresAt && new Date(user.planExpiresAt) > now ? new Date(user.planExpiresAt) : now;
  const newExpiry = new Date(currentExpiry.getTime() + PLAN_DAYS * 24 * 60 * 60 * 1000);

  user.plan = parsed.plan;
  user.planExpiresAt = newExpiry;
  user.lastBillingOrderNumber = orderNumber;
  await user.save();

  return { applied: true, plan: parsed.plan, planExpiresAt: newExpiry };
}

// POST /api/billing/checkout - start an upgrade. Body: { plan: "pro"|"premium" }
// (and "phone" if the account doesn't have one on file yet - see
// public/upgrade.html). Returns { url } to redirect the browser to.
router.post("/checkout", requireAuth, async (req, res) => {
  try {
    const { plan, phone } = req.body;
    if (!PLAN_PRICES[plan]) {
      return res.status(400).json({ error: "Choose Pro or Premium." });
    }

    const user = await User.findById(req.session.userId);
    if (!user) return res.status(401).json({ error: "Please log in first." });

    let payerPhone = user.phone;
    if (!payerPhone) {
      if (!phone || !phone.trim()) {
        return res.status(400).json({ error: "A phone number is required to pay." });
      }
      payerPhone = phone.trim();
      user.phone = payerPhone;
      await user.save();
    }

    const orderNumber = buildOrderNumber(user._id, plan);
    const result = await createPaymentLink({
      orderNumber,
      amount: PLAN_PRICES[plan],
      payerName: user.name,
      payerEmail: user.email,
      payerPhone,
      remarks: `Hartahub ${plan} upgrade (30 days)`,
    });

    const url = result && result.data && result.data.payment_link;
    if (!url) {
      throw new Error("bcl.my did not return a payment link.");
    }

    res.json({ url });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || "Could not start checkout." });
  }
});

// GET /api/billing/verify/:orderNumber - fast path used by the
// success-redirect page, so the user's plan updates immediately instead of
// waiting on webhook delivery.
router.get("/verify/:orderNumber", requireAuth, async (req, res) => {
  try {
    const parsed = parseOrderNumber(req.params.orderNumber);
    if (!parsed || parsed.userId !== String(req.session.userId)) {
      return res.status(400).json({ error: "Invalid order number." });
    }
    const result = await applyUpgradeIfPaid(req.params.orderNumber);
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not verify payment." });
  }
});

// POST /api/billing/webhook - bcl.my calls this after a payment completes
// (configured account-wide under Payment Link Advanced Settings > Webhook
// Settings). Not auth-gated since bcl.my is the caller, not a logged-in
// agent - that's exactly why the payload is never trusted directly and
// applyUpgradeIfPaid re-checks with bcl.my itself before doing anything.
router.post("/webhook", async (req, res) => {
  try {
    const orderNumber = req.body && req.body.data && req.body.data.main_data && req.body.data.main_data.order_number;
    if (orderNumber) {
      await applyUpgradeIfPaid(orderNumber);
    }
  } catch (err) {
    console.error("bcl.my webhook error:", err);
  }
  // Always 200 - bcl.my should not retry-storm us over something on our end,
  // and applyUpgradeIfPaid is idempotent so a retry is harmless anyway.
  res.sendStatus(200);
});

module.exports = router;

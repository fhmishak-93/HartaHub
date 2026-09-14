const crypto = require("crypto");
const express = require("express");
const User = require("../models/User");
const requireAuth = require("../middleware/requireAuth");
const { createPaymentLink, getTransaction } = require("../utils/bcl");
const { PRO_PRICE_RM, PREMIUM_PRICE_RM, BILLING_PERIOD_DAYS } = require("../utils/constants");

const router = express.Router();

const PLAN_PRICES = { pro: PRO_PRICE_RM, premium: PREMIUM_PRICE_RM };
const PLAN_DAYS = BILLING_PERIOD_DAYS;

// bcl.my's docs claim order_number can be up to 64 characters, but the real
// (undocumented) limit enforced somewhere downstream at BayarCash/FPX is 26 -
// anything longer creates the payment link fine but silently fails to reach
// the bank-selection step when the payer clicks Pay. Confirmed by bisection
// during testing: 26 chars works, 27 doesn't. That's far too short to encode
// a Mongo _id + plan + timestamp, so the order number is just a short random
// token and the pending plan is looked up on the User document instead of
// being parsed back out of it.
function buildOrderNumber() {
  return `HH${crypto.randomBytes(10).toString("hex")}`; // 22 chars total
}

// Verifies a transaction with bcl.my directly (never trusts a webhook body
// or a redirect query string on its own - see utils/bcl.js) and, if it's
// genuinely paid and hasn't been applied yet, upgrades the account.
// Shared by the webhook and the success-redirect fast path below, so
// whichever fires first does the work and the other is a no-op.
async function applyUpgradeIfPaid(orderNumber) {
  const user = await User.findOne({ pendingBillingOrderNumber: orderNumber });
  if (!user) {
    // Not necessarily an error - could already be applied and cleared, or a
    // retry of an order we never issued.
    return { applied: false, reason: "No pending upgrade for this order." };
  }
  const plan = user.pendingBillingPlan;

  if (user.lastBillingOrderNumber === orderNumber) {
    return { applied: true, alreadyApplied: true, plan };
  }

  const result = await getTransaction(orderNumber);
  const txn = result && result.data && result.data.main_data;
  if (!txn || !txn.is_paid) {
    return { applied: false, reason: "Not paid yet." };
  }
  if (Number(txn.amount) !== Number(PLAN_PRICES[plan])) {
    return { applied: false, reason: "Amount does not match the plan price." };
  }

  const now = new Date();
  const currentExpiry = user.planExpiresAt && new Date(user.planExpiresAt) > now ? new Date(user.planExpiresAt) : now;
  const newExpiry = new Date(currentExpiry.getTime() + PLAN_DAYS * 24 * 60 * 60 * 1000);

  user.plan = plan;
  user.planExpiresAt = newExpiry;
  user.lastBillingOrderNumber = orderNumber;
  user.pendingBillingOrderNumber = undefined;
  user.pendingBillingPlan = undefined;
  await user.save();

  return { applied: true, plan, planExpiresAt: newExpiry };
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
    }

    const orderNumber = buildOrderNumber();
    user.pendingBillingOrderNumber = orderNumber;
    user.pendingBillingPlan = plan;
    await user.save();

    const result = await createPaymentLink({
      orderNumber,
      amount: PLAN_PRICES[plan],
      payerName: user.name,
      payerEmail: user.email,
      payerPhone,
      remarks: `Hartahub ${plan} upgrade (3 months)`,
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
    const user = await User.findOne({ pendingBillingOrderNumber: req.params.orderNumber });
    if (user && String(user._id) !== String(req.session.userId)) {
      return res.status(403).json({ error: "This order does not belong to your account." });
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

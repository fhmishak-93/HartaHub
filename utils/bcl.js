// Thin wrapper around the two bcl.my (BayarCash) endpoints Hartahub needs -
// see https://bcl.my/docs/api. Requires BCL_API_TOKEN and BCL_PORTAL_KEY
// (see .env.example) - both come from the bcl.my dashboard's
// Platform Setup > Integrations > API Token tab.

const BCL_API_BASE = "https://api.bcl.my/v1";

async function bclRequest(path, options = {}) {
  const token = process.env.BCL_API_TOKEN;
  if (!token) {
    throw new Error("Missing BCL_API_TOKEN - see .env.example.");
  }

  const res = await fetch(`${BCL_API_BASE}${path}`, {
    ...options,
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers,
    },
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || `bcl.my request failed (${res.status}).`);
  }
  return data;
}

// Creates a one-off payment link. Returns the full response; callers use
// data.data.payment_link as the URL to redirect the payer to.
async function createPaymentLink({ orderNumber, amount, payerName, payerEmail, payerPhone, remarks }) {
  const portalKey = process.env.BCL_PORTAL_KEY;
  if (!portalKey) {
    throw new Error("Missing BCL_PORTAL_KEY - see .env.example.");
  }

  return bclRequest("/payment-link", {
    method: "POST",
    body: JSON.stringify({
      order_number: orderNumber,
      amount,
      payer_name: payerName,
      payer_email: payerEmail,
      payer_telephone_number: payerPhone,
      portal_key: portalKey,
      remarks,
    }),
  });
}

// Looks up a transaction by order number. Returns the full response; callers
// check data.data.main_data.is_paid before trusting a payment succeeded -
// bcl.my's webhook has no documented signature, so this authenticated
// lookup is what actually gets trusted, not the webhook body itself.
async function getTransaction(orderNumber) {
  return bclRequest(`/transactions/${encodeURIComponent(orderNumber)}`);
}

module.exports = { createPaymentLink, getTransaction };

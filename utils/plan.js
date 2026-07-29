// Whether a user currently has an active Pro plan. Handles the optional
// proExpiresAt date, so a manually-granted Pro upgrade can lapse on its own.
function isPro(user) {
  if (!user || user.plan !== "pro") return false;
  if (user.proExpiresAt && new Date(user.proExpiresAt) < new Date()) return false;
  return true;
}

module.exports = { isPro };

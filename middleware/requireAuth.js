// Blocks API requests from anyone who isn't logged in.
function requireAuth(req, res, next) {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: "Please log in first." });
  }
  next();
}

module.exports = requireAuth;

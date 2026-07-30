// Photo storage for listings. Render's free tier wipes its local disk on
// every restart/redeploy, so uploaded photos can't just be saved to the
// server - they're sent to Cloudinary (free tier) instead, which gives us
// a permanent URL back. See README "Photo uploads (Cloudinary)" for setup.
const cloudinary = require("cloudinary").v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

module.exports = cloudinary;

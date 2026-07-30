const express = require("express");
const multer = require("multer");
const cloudinary = require("../config/cloudinary");
const User = require("../models/User");
const requireAuth = require("../middleware/requireAuth");
const { getTier, canUploadPhoto } = require("../utils/plan");

const router = express.Router();

// Keep the uploaded file in memory (not on disk) - Render's free tier
// disk doesn't persist anyway, and this keeps the code simple.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      return cb(new Error("Only image files are allowed."));
    }
    cb(null, true);
  },
});

// POST /api/uploads/photo - Pro/Premium only. Uploads one image to
// Cloudinary and returns its permanent URL for use as a listing's photoUrl.
router.post("/photo", requireAuth, upload.single("photo"), async (req, res) => {
  try {
    const user = await User.findById(req.session.userId);
    const tier = getTier(user);
    if (!canUploadPhoto(tier)) {
      return res.status(403).json({
        error: "Photo upload is a Pro/Premium feature. Free plan can still paste a photo link.",
      });
    }

    if (!req.file) {
      return res.status(400).json({ error: "No photo was uploaded." });
    }

    if (!process.env.CLOUDINARY_CLOUD_NAME) {
      return res.status(500).json({
        error:
          "Photo upload isn't configured yet. Add CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET to your environment variables (see README).",
      });
    }

    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: "hartahub", resource_type: "image" },
        (err, uploadResult) => {
          if (err) reject(err);
          else resolve(uploadResult);
        }
      );
      stream.end(req.file.buffer);
    });

    res.json({ url: result.secure_url });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not upload photo. Please try again." });
  }
});

module.exports = router;

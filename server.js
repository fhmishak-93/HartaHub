// Hartahub server entry point.
require("dotenv").config();

const path = require("path");
const express = require("express");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const connectDB = require("./config/db");

const authRoutes = require("./routes/auth");
const listingRoutes = require("./routes/listings");
const requirementRoutes = require("./routes/requirements");
const matchRoutes = require("./routes/matches");

const app = express();

// Connect to the database before anything else.
connectDB();

// Parse incoming JSON request bodies (form submissions from the browser).
app.use(express.json());

// Login sessions are stored in MongoDB so they survive server restarts
// (important on free hosting tiers, which can restart your app).
app.use(
  session({
    secret: process.env.SESSION_SECRET || "hartahub-dev-secret",
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({ mongoUrl: process.env.MONGODB_URI }),
    cookie: {
      maxAge: 1000 * 60 * 60 * 24 * 7, // 1 week
    },
  })
);

// Serve the frontend (HTML/CSS/JS) from the public/ folder.
app.use(express.static(path.join(__dirname, "public")));

// API routes.
app.use("/api/auth", authRoutes);
app.use("/api/listings", listingRoutes);
app.use("/api/requirements", requirementRoutes);
app.use("/api/matches", matchRoutes);

// Basic health check, useful for confirming the server deployed correctly.
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Hartahub server running on port ${PORT}`);
});

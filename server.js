// server.js - final production-safe version (replace your current file)
// Required env vars:
// - MONGO_URI
// - JWT_SECRET
// - ADMIN_EMAIL, ADMIN_PASS  (used for admin login route as before)
// - ADMIN_KEY  (a secret string that must be provided as header "x-admin-key" to access admin routes)
// Optional env vars:
// - ALLOWED_ORIGIN (if set, CORS will be restricted to this origin)
// - UPLOAD_TTL_DAYS (integer, default 7) - files older than this (days) will be auto-deleted from uploads

require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const cors = require("cors");
const mongoSanitize = require("express-mongo-sanitize");
const xss = require("xss-clean");
const fs = require("fs");
const path = require("path");

const app = express();

/* =========================
   ✅ CSP FIX (INLINE JS + ONCLICK ALLOWED)
========================= */
app.use((req, res, next) => {
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; img-src 'self' data: blob:; script-src 'self' 'unsafe-inline'; script-src-attr 'unsafe-inline'; style-src 'self' 'unsafe-inline'"
  );
  next();
});

/* =========================
   ✅ GLOBAL SECURITY
========================= */
app.use(helmet({ contentSecurityPolicy: false }));

// Optional: restrict CORS to your domain if ALLOWED_ORIGIN set in env
const allowedOrigin = process.env.ALLOWED_ORIGIN;
if (allowedOrigin) {
  app.use(cors({ origin: allowedOrigin }));
} else {
  app.use(cors());
}

app.use(express.json({ limit: "20kb" }));
app.use(express.urlencoded({ extended: true }));
app.use(mongoSanitize());
app.use(xss());

/* =========================
   ✅ RATE LIMIT (PRODUCTION SAFE)
========================= */
const limiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 800,                 // increased to handle normal traffic
  standardHeaders: true,
  legacyHeaders: false,
  message: "Too many requests, please try again after some time."
});
app.use(limiter);

/* =========================
   ✅ STATIC FILES
========================= */
app.use(express.static("public"));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

/* =========================
   ✅ MONGODB CONNECT
========================= */
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("✅ MongoDB Connected"))
  .catch(err => console.log("❌ MongoDB Error:", err));

/* =========================
   ✅ MODELS
========================= */
const User = mongoose.model("User", new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, unique: true, required: true },
  password: { type: String, required: true }
}));

const Wish = mongoose.model("Wish", new mongoose.Schema({
  from: String,
  to: String,
  message: String,
  photo: String,
  userId: String,
  createdAt: { type: Date, default: Date.now }
}));

/* =========================
   ✅ MULTER (SECURE IMAGE UPLOAD)
========================= */
const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) =>
    cb(null, Date.now() + "_" + file.originalname.replace(/\s+/g, "_"))
});

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      return cb(new Error("Only image files allowed"));
    }
    cb(null, true);
  }
});

/* =========================
   ✅ JWT MIDDLEWARE
========================= */
function verifyToken(req, res, next) {
  const token = req.headers["authorization"];
  if (!token) return res.status(403).json({ error: "Login Required" });

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) return res.status(401).json({ error: "Invalid Token" });
    req.userId = decoded.id;
    next();
  });
}

/* =========================
   ✅ ADMIN PROTECTION (HEADER CHECK)
   - requires header: x-admin-key: <ADMIN_KEY>
   - ADMIN_KEY must be set in .env
========================= */
function requireAdminKey(req, res, next) {
  const key = req.headers["x-admin-key"];
  if (!process.env.ADMIN_KEY) {
    // If ADMIN_KEY not set, deny access to admin routes (safe default)
    return res.status(403).json({ error: "Admin key not configured on server" });
  }
  if (!key || key !== process.env.ADMIN_KEY) {
    return res.status(401).json({ error: "Invalid admin key" });
  }
  next();
}

/* =========================
   ✅ AUTH ROUTES
========================= */
app.post("/api/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password)
      return res.status(400).json({ error: "All fields required" });

    if (password.length < 6)
      return res.status(400).json({ error: "Password must be at least 6 characters" });

    if (await User.findOne({ email }))
      return res.status(400).json({ error: "User already exists" });

    const hash = await bcrypt.hash(password, 12);
    await new User({ name, email, password: hash }).save();

    res.json({ success: true });
  } catch (err) {
    console.error("Register error:", err);
    res.status(500).json({ error: "Register Failed" });
  }
});

app.post("/api/login", async (req, res) => {
  try {
    const user = await User.findOne({ email: req.body.email });

    if (!user || !await bcrypt.compare(req.body.password, user.password))
      return res.status(401).json({ error: "Invalid Login" });

    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.json({ token });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Login Failed" });
  }
});

/* =========================
   ✅ WISH ROUTES (unchanged behavior)
========================= */

// create wish (login required)
app.post("/api/wish", verifyToken, upload.single("photo"), async (req, res) => {
  try {
    const wish = new Wish({
      from: req.body.from,
      to: req.body.to,
      message: req.body.message,
      photo: req.file?.filename,
      userId: req.userId
    });

    await wish.save();
    res.json({ link: `/view.html?id=${wish._id}` });

  } catch (err) {
    console.error("Create wish error:", err);
    res.status(500).json({ error: "Wish Create Failed" });
  }
});

// get single wish (public) - null protection added
app.get("/api/wish/:id", async (req, res) => {
  try {
    const wish = await Wish.findById(req.params.id);
    if (!wish) return res.status(404).json({ error: "Wish not found" });
    res.json(wish);
  } catch (err) {
    console.error("Get wish error:", err);
    res.status(500).json({ error: "Failed to get wish" });
  }
});

// get my wishes (user only)
app.get("/api/my-wishes", verifyToken, async (req, res) => {
  try {
    const wishes = await Wish.find({ userId: req.userId }).sort({ _id: -1 });
    res.json(wishes);
  } catch (err) {
    console.error("My wishes error:", err);
    res.status(500).json({ error: "Failed to fetch wishes" });
  }
});

/* =========================
   ✅ ADMIN ROUTES (NOW PROTECTED BY ADMIN KEY)
   - you must send header "x-admin-key: <ADMIN_KEY_FROM_ENV>"
========================= */

app.post("/api/admin/login", (req, res) => {
  if (
    req.body.email === process.env.ADMIN_EMAIL &&
    req.body.password === process.env.ADMIN_PASS
  ) return res.json({ success: true });

  res.status(401).json({ error: "Invalid Admin" });
});

// protected admin routes
app.get("/api/admin/users", requireAdminKey, async (req, res) => {
  try {
    res.json(await User.find());
  } catch (err) {
    console.error("Admin users error:", err);
    res.status(500).json({ error: "Failed" });
  }
});

app.get("/api/admin/wishes", requireAdminKey, async (req, res) => {
  try {
    res.json(await Wish.find());
  } catch (err) {
    console.error("Admin wishes error:", err);
    res.status(500).json({ error: "Failed" });
  }
});

app.delete("/api/admin/wish/:id", requireAdminKey, async (req, res) => {
  try {
    const w = await Wish.findByIdAndDelete(req.params.id);
    if (w && w.photo) {
      // delete local file if exists
      const p = path.join(uploadDir, w.photo);
      fs.unlink(p, (err) => { if (err) {/* ignore */} });
    }
    res.json({ success: true });
  } catch (err) {
    console.error("Admin delete wish error:", err);
    res.status(500).json({ error: "Failed to delete" });
  }
});

/* =========================
   ✅ UPLOADS AUTO-CLEAN (safe background task)
   - deletes files older than UPLOAD_TTL_DAYS (default 7)
   - runs every 6 hours
========================= */
const UPLOAD_TTL_DAYS = parseInt(process.env.UPLOAD_TTL_DAYS || "7", 10);

function cleanOldUploads() {
  fs.readdir(uploadDir, (err, files) => {
    if (err) return;
    const now = Date.now();
    const ttl = UPLOAD_TTL_DAYS * 24 * 60 * 60 * 1000;
    files.forEach(file => {
      const filePath = path.join(uploadDir, file);
      fs.stat(filePath, (err, stats) => {
        if (err) return;
        const mtime = new Date(stats.mtime).getTime();
        if (now - mtime > ttl) {
          fs.unlink(filePath, (err) => { /* ignore errors */ });
        }
      });
    });
  });
}

// schedule: run immediately on start and then every 6 hours
cleanOldUploads();
setInterval(cleanOldUploads, 6 * 60 * 60 * 1000);

/* =========================
   ✅ HEALTH CHECK
========================= */
app.get("/health", (req, res) => res.json({ ok: true }));

/* =========================
   ✅ PRODUCTION PORT
========================= */
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`✅ Secure Server Running on PORT ${PORT}`);
});

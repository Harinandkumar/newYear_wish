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
app.use(helmet({ contentSecurityPolicy: false })); // CSP hum manually handle kar rahe hain
app.use(cors());
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true }));

app.use(mongoSanitize());
app.use(xss());

// ✅ Rate limit: 100 requests / 10 minutes
const limiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 100
});
app.use(limiter);

/* =========================
   ✅ STATIC FILES
========================= */
app.use(express.static("public"));
app.use("/uploads", express.static("uploads"));

/* =========================
   ✅ MONGODB CONNECT
========================= */
mongoose.connect(process.env.MONGO_URI)
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
  userId: String
}));

/* =========================
   ✅ MULTER (SECURE IMAGE UPLOAD)
========================= */
const storage = multer.diskStorage({
  destination: "uploads",
  filename: (req, file, cb) =>
    cb(null, Date.now() + "_" + file.originalname)
});

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB limit
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
   ✅ AUTH ROUTES
========================= */

// ✅ REGISTER
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
    res.status(500).json({ error: "Register Failed" });
  }
});

// ✅ LOGIN
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
    res.status(500).json({ error: "Login Failed" });
  }
});

/* =========================
   ✅ WISH ROUTES
========================= */

// ✅ CREATE WISH (LOGIN REQUIRED)
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
    res.status(500).json({ error: "Wish Create Failed" });
  }
});

// ✅ GET SINGLE WISH (PUBLIC)
app.get("/api/wish/:id", async (req, res) => {
  const wish = await Wish.findById(req.params.id);
  res.json(wish);
});

// ✅ MY WISHES (USER ONLY)
app.get("/api/my-wishes", verifyToken, async (req, res) => {
  const wishes = await Wish.find({ userId: req.userId }).sort({ _id: -1 });
  res.json(wishes);
});

/* =========================
   ✅ ADMIN ROUTES
========================= */

app.post("/api/admin/login", (req, res) => {
  if (
    req.body.email === process.env.ADMIN_EMAIL &&
    req.body.password === process.env.ADMIN_PASS
  ) return res.json({ success: true });

  res.status(401).json({ error: "Invalid Admin" });
});

app.get("/api/admin/users", async (req, res) => {
  res.json(await User.find());
});

app.get("/api/admin/wishes", async (req, res) => {
  res.json(await Wish.find());
});

app.delete("/api/admin/wish/:id", async (req, res) => {
  await Wish.findByIdAndDelete(req.params.id);
  res.json({ success: true });
});

/* =========================
   ✅ PRODUCTION PORT
========================= */
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`✅ Secure Server Running on http://localhost:${PORT}`);
});

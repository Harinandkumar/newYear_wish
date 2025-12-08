require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const multer = require("multer");

const app = express();
app.use(express.json());
app.use(express.static("public"));
app.use("/uploads", express.static("uploads"));

// ✅ MongoDB Connect
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch(err => console.log("❌ MongoDB Error:", err));

// ================= MODELS =================
const User = mongoose.model("User", new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  password: String
}));

// ❌ ✅ NO VIEWS / COUNT FIELD (FINAL)
const Wish = mongoose.model("Wish", new mongoose.Schema({
  from: String,
  to: String,
  message: String,
  photo: String,
  userId: String
}));

// ================= MULTER =================
const storage = multer.diskStorage({
  destination: "uploads",
  filename: (req, file, cb) =>
    cb(null, Date.now() + "_" + file.originalname)
});
const upload = multer({ storage });

// ================= JWT MIDDLEWARE =================
function verifyToken(req, res, next) {
  const token = req.headers["authorization"];
  if (!token) return res.status(403).json({ error: "Login Required" });

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) return res.status(401).json({ error: "Invalid Token" });
    req.userId = decoded.id;
    next();
  });
}

// ================= AUTH SYSTEM =================
app.post("/api/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (await User.findOne({ email }))
      return res.status(400).json({ error: "User already exists" });

    const hash = await bcrypt.hash(password, 10);
    await new User({ name, email, password: hash }).save();

    res.json({ success: true });
  } catch (err) {
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
    res.status(500).json({ error: "Login Failed" });
  }
});

// ================= WISH SYSTEM (LOGIN REQUIRED) =================
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

// ✅ SIMPLE FETCH (NO COUNT, NO TRACKING)
app.get("/api/wish/:id", async (req, res) => {
  const wish = await Wish.findById(req.params.id);
  res.json(wish);
});

// ================= ADMIN AUTH =================
app.post("/api/admin/login", (req, res) => {
  if (
    req.body.email === process.env.ADMIN_EMAIL &&
    req.body.password === process.env.ADMIN_PASS
  ) return res.json({ success: true });

  res.status(401).json({ error: "Invalid Admin" });
});

// ================= ADMIN DATA =================
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

// ================= ✅ RENDER PRODUCTION PORT FIX =================
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`✅ Production Server Running on PORT ${PORT}`);
});
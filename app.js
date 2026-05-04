require("dotenv").config();

const express = require("express");
const app = express();
const mongoose = require("mongoose");
const path = require("path");
const methodOverride = require("method-override");
const ejsMate = require("ejs-mate");
const multer = require("multer");
app.use(express.json()); // for JSON
app.use(express.urlencoded({ extended: true })); // ✅ for form submissions (very important)
const paymentRoutes = require("./routes/payment");
app.use("/payment", paymentRoutes);


const session = require("express-session");
const passport = require("passport");
require("./auth/passport"); // passport config

// ✅ Import user model to check admin emails
const user = require("./models/user");

// Connect to MongoDB
const MONGO_URL = process.env.MONGO_URI;
mongoose.connect(MONGO_URL)
  .then(() => console.log("Connected to MongoDB"))
  .catch(err => console.error("Connection error:", err));

// View engine & middleware setup
app.engine("ejs", ejsMate);
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride("_method"));
app.use(express.static(path.join(__dirname, "public")));

app.use(session({
  secret: process.env.SESSION_SECRET || "defaultsecret",
  resave: false,
  saveUninitialized: false
}));
// app.js ya server.js me add karo
app.use((req, res, next) => {
  res.locals.razorpayKeyId = process.env.RAZORPAY_KEY_ID; // 👈 Automatically pass in all EJS
  next();
});

app.use(passport.initialize());
app.use(passport.session());

// ✅ Make user globally available to views
app.use((req, res, next) => {
  res.locals.user = req.user;
  next();
});

// ✅ Make sure admin email is marked properly
const ADMIN_EMAIL = process.env.ADMIN_EMAIL; 

// ✅ Update admin flag on login
app.use(async (req, res, next) => {
  if (req.user && req.user.email === ADMIN_EMAIL && !req.user.isAdmin) {
    req.user.isAdmin = true;
    await req.user.save();
  }
  next();
});

// Video upload config
const uploadDir = path.join(__dirname, "public/uploads/");
const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  }
});
const upload = multer({ storage });

// Mount routes
const authRoutes = require("./routes/auth");
app.use(authRoutes);

const userRoutes = require("./routes/user");
app.use(userRoutes);

const courseRoutes = require("./routes/courses");
app.use(courseRoutes);

const workingProRoutes = require("./routes/working_professionals");
app.use("/working_professionals", workingProRoutes);

const seniorcitizenProRoutes = require("./routes/seniorcitizen");
app.use("/seniorcitizen", seniorcitizenProRoutes);

// ✅ Root route logic based on admin or normal user
app.get("/", (req, res) => {
  if (req.isAuthenticated()) {
    if (req.user.isAdmin) {
      return res.redirect("/courses"); // Admin dashboard
    } else {
      return res.redirect("/user"); // Normal user dashboard
    }
  } else {
    return res.redirect("/auth/login");
  }
});

// 404 fallback
app.all("*", (req, res) => {
  res.status(404).send("Page Not Found");
});

const PORT = process.env.PORT || 8080;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
}); 
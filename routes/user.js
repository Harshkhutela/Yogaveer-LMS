const express = require("express");
const router = express.Router();
const path = require("path");
const crypto = require("crypto");
const multer = require("multer");
const nodemailer = require("nodemailer");

const Course = require("../models/course");
const Section = require("../models/section");
const Lesson = require("../models/lesson");
const User = require("../models/user");
const WorkingCourse = require("../models/working_professional_course");
const SeniorCitizen = require("../models/seniorcitizen");
const PurchasedCourse = require("../models/PurchasedCourse");

// Email setup
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS,
  },
});




// Multer setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "public/uploads"),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${req.user._id}_profile${ext}`);
  },
});
const upload = multer({ storage });

// Auth middleware
function ensureAuth(req, res, next) {
  if (!req.isAuthenticated()) return res.redirect("/auth/google");

  if (req.user && req.user.isProfileComplete !== undefined) return next();

  User.findById(req.user._id)
    .then((user) => {
      if (!user) return res.redirect("/auth/google");
      req.user = user;

      if (!user.isProfileComplete && req.originalUrl !== "/user/complete_profile") {
        return res.redirect("/user/complete_profile");
      }

      // After profile completion, always go to choose_category first
      if (user.isProfileComplete && req.originalUrl === "/user/complete_profile") {
        return res.redirect("/user/choose_category");
      }

      return next();
    })
    .catch((err) => {
      console.error("Auth middleware error:", err);
      return res.redirect("/auth/google");
    });
}

// =================== ASPIRANTS ===================

router.get("/user", ensureAuth, async (req, res) => {
  const user = await User.findById(req.user._id);
  const courses = await Course.find();

  // bundle purchase check (aspirants only)
  const bundlePurchased = await PurchasedCourse.findOne({
    user: req.user._id,
    courseType: "aspirants",
    status: "completed",
    expiresAt: { $gt: new Date() }
  });

  res.render("user/index", { 
    courses, 
    user, 
    bundlePurchased   // ab hamesha defined rahega
  });
});

router.get("/user/courses/:id", ensureAuth, async (req, res) => {
  const course = await Course.findById(req.params.id);
  if (!course) return res.status(404).send("Course not found");

  const sections = await Section.find({ course: course._id, courseModel: "Course" });
  const fullStructure = [];

  let currentLesson = null;

  for (let section of sections) {
    const lessons = await Lesson.find({ section: section._id });

    // Fix videoPath for each lesson
    lessons.forEach((lesson) => {
    if (
      lesson.videoPath &&
      !lesson.videoPath.startsWith("/uploads/") &&
      !lesson.videoPath.startsWith("http")
    ) {
      lesson.videoPath = "/uploads/" + lesson.videoPath;
    }
  });


    fullStructure.push({ section, lessons });

    if (req.query.lessonId) {
      const selected = lessons.find((l) => l._id.equals(req.query.lessonId));
      if (selected) currentLesson = selected;
    }
  }

  if (!currentLesson && fullStructure.length > 0 && fullStructure[0].lessons.length > 0) {
    currentLesson = fullStructure[0].lessons[0];
  }

  const user = await User.findById(req.user._id);

  const purchased = await PurchasedCourse.findOne({
    user: req.user._id,
    course: course._id,
    courseType: "aspirants",
    status: "completed",
    expiresAt: { $gt: new Date() }
  });

  const courseUnlocked = !!purchased;

  res.render("user/show", {
    course,
    fullStructure,
    currentLesson,
    user,
    courseUnlocked,
    access: purchased,
    razorpayKeyId: process.env.RAZORPAY_KEY_ID
  });
});

// =================== WORKING PROFESSIONAL ===================

router.get("/user/working_professionals", ensureAuth, async (req, res) => {
  const user = await User.findById(req.user._id);
  const courses = await WorkingCourse.find();

  // bundle purchase check (aspirants only)
  const bundlePurchased = await PurchasedCourse.findOne({
    user: req.user._id,
    courseType: "working_professionals",
    status: "completed",
    expiresAt: { $gt: new Date() }
  });
  res.render("user_work/index", { courses, user, bundlePurchased });
});


router.get("/user/working_professionals/:id", ensureAuth, async (req, res) => {
  const course = await WorkingCourse.findById(req.params.id);
  if (!course) return res.status(404).send("Course not found");

  const sections = await Section.find({ course: course._id, courseModel: "WorkingCourse" });
  const fullStructure = [];

  let currentLesson = null;

  for (let section of sections) {
    const lessons = await Lesson.find({ section: section._id });

    lessons.forEach((lesson) => {
    if (
      lesson.videoPath &&
      !lesson.videoPath.startsWith("/uploads/") &&
      !lesson.videoPath.startsWith("http")
    ) {
      lesson.videoPath = "/uploads/" + lesson.videoPath;
    }
  });

    fullStructure.push({ section, lessons });

    if (req.query.lessonId) {
      const selected = lessons.find((l) => l._id.equals(req.query.lessonId));
      if (selected) currentLesson = selected;
    }
  }

  if (!currentLesson && fullStructure.length > 0 && fullStructure[0].lessons.length > 0) {
    currentLesson = fullStructure[0].lessons[0];
  }

  const user = await User.findById(req.user._id);

  const purchased = await PurchasedCourse.findOne({
    user: req.user._id,
    course: course._id,
    courseType: "working_professionals",
    status: "completed",
    expiresAt: { $gt: new Date() },
  });

  const courseUnlocked = !!purchased;

  res.render("user_work/show", {
    course,
    fullStructure,
    currentLesson,
    user,
    courseUnlocked,
    access: purchased,
    razorpayKeyId: process.env.RAZORPAY_KEY_ID
  });
});

// =================== SENIOR CITIZENS ===================

router.get("/user/seniorcitizen", ensureAuth, async (req, res) => {
  const user = await User.findById(req.user._id);
  const courses = await SeniorCitizen.find();

  // bundle purchase check (aspirants only)
  const bundlePurchased = await PurchasedCourse.findOne({
    user: req.user._id,
    courseType: "seniorcitizen",
    status: "completed",
    expiresAt: { $gt: new Date() }
  });

  res.render("user_senior/index", { courses, user, bundlePurchased });
});

router.get("/user/seniorcitizen/:id", ensureAuth, async (req, res) => {
  const course = await SeniorCitizen.findById(req.params.id);
  if (!course) return res.status(404).send("Course not found");

  const sections = await Section.find({ course: course._id, courseModel: "SeniorCitizen" });
  const fullStructure = [];

  let currentLesson = null;

  for (let section of sections) {
    const lessons = await Lesson.find({ section: section._id });

    lessons.forEach((lesson) => {
    if (
      lesson.videoPath &&
      !lesson.videoPath.startsWith("/uploads/") &&
      !lesson.videoPath.startsWith("http")
    ) {
      lesson.videoPath = "/uploads/" + lesson.videoPath;
    }
  });

    fullStructure.push({ section, lessons });

    if (req.query.lessonId) {
      const selected = lessons.find((l) => l._id.equals(req.query.lessonId));
      if (selected) currentLesson = selected;
    }
  }

  if (!currentLesson && fullStructure.length > 0 && fullStructure[0].lessons.length > 0) {
    currentLesson = fullStructure[0].lessons[0];
  }

  const user = await User.findById(req.user._id);

  const purchased = await PurchasedCourse.findOne({
    user: req.user._id,
    course: course._id,
    courseType: "seniorcitizen",
    status: "completed",
    expiresAt: { $gt: new Date() },
  });

  const courseUnlocked = !!purchased;

  res.render("user_senior/show", {
    course,
    fullStructure,
    currentLesson,
    user,
    courseUnlocked,
    access: purchased,
    razorpayKeyId: process.env.RAZORPAY_KEY_ID
  });
});

// =================== PROFILE ===================

router.get("/user/complete_profile", ensureAuth, async (req, res) => {
  if (req.user.isProfileComplete) return res.redirect("/user/choose_category");
  const user = await User.findById(req.user._id);
  res.render("user/complete_profile", { user, errors: null });
});

router.get("/user/profile", ensureAuth, async (req, res) => {
  const user = await User.findById(req.user._id);
  if (!user) return res.status(404).send("User not found");
  res.render("user/profile", { user, errors: [] });
});

router.post("/user/profile", ensureAuth, upload.single("profileImage"), async (req, res) => {
  const {
    name,
    contact,
    dob,
    gender = "",
    address = "",
    medicalConditions,
    wellnessChallenges,
    wellnessChallengesOther = "",
    yogaGoals,
    yogaGoalsOther = "",
    referralSource = "",
    referralSourceOther = "",
    preferredTimeSlot = "",
    height,
    weight,
  } = req.body;

  const errors = [];
  if (!name) errors.push("Name is required.");
  if (!contact) errors.push("Contact Number is required.");
  if (!dob) errors.push("Date of Birth is required.");

  if (errors.length > 0) {
    const user = await User.findById(req.user._id);
    return res.render("user/complete_profile", { user, errors });
  }

  const makeArray = (value) => (!value ? [] : Array.isArray(value) ? value : [value]);

  const medicalArray = makeArray(medicalConditions);
  const wellnessArray = makeArray(wellnessChallenges);
  const yogaArray = makeArray(yogaGoals);

  const birthDate = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;

  let bmi = null;
  if (height && weight) {
    const h = parseFloat(height);
    const w = parseFloat(weight);
    if (!isNaN(h) && !isNaN(w) && h > 0) bmi = (w / ((h / 100) ** 2)).toFixed(2);
  }

  const updateData = {
    name: name.trim(),
    contact: contact.trim(),
    dob: dob.trim(),
    gender,
    address: address.trim(),
    medicalConditions: medicalArray,
    wellnessChallenges: wellnessArray,
    wellnessChallengesOther: wellnessChallengesOther.trim(),
    yogaGoals: yogaArray,
    yogaGoalsOther: yogaGoalsOther.trim(),
    referralSource:
      referralSource === "Other" ? referralSourceOther.trim() : referralSource.trim(),
    preferredTimeSlot: preferredTimeSlot.trim(),
    height: height ? parseFloat(height) : null,
    weight: weight ? parseFloat(weight) : null,
    bmi,
    age,
    isProfileComplete: true,
  };

  if (req.file) {
    updateData.profilePicture = `/uploads/${req.file.filename}`;
  }

  try {
    const updatedUser = await User.findByIdAndUpdate(req.user._id, updateData, { new: true });

    req.login(updatedUser, (err) => {
      if (err) {
        console.error("Login update failed:", err);
        return res.redirect("/user/complete_profile");
      }

    return res.redirect("/user/choose_category");
    });
  } catch (err) {
    console.error("❌ Profile save error:", err);
    res.status(500).send("Something went wrong while saving your profile.");
  }
});

// =================== OTP ===================

router.post("/user/send_otp", ensureAuth, async (req, res) => {
  const user = await User.findById(req.user._id);
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expiry = new Date(Date.now() + 5 * 60 * 1000);

  user.otp = otp;
  user.otpExpires = expiry;
  await user.save();

  const mailOptions = {
    from: process.env.GMAIL_USER,
    to: user.email,
    subject: "Your OTP for Yogaveer",
    html: `<p>Hello ${user.name || "User"},</p><p>Your OTP is: <b>${otp}</b></p><p>It is valid for 5 minutes.</p>`,
  };

  try {
    await transporter.sendMail(mailOptions);
    res.json({ success: true, message: "OTP sent successfully." });
  } catch (err) {
    console.error("Error sending OTP email:", err);
    res.status(500).json({ success: false, message: "Failed to send OTP." });
  }
});

router.get("/user/verify_email_otp", ensureAuth, async (req, res) => {
  const user = await User.findById(req.user._id);
  res.render("user/verify_email_otp", { email: user.email, success: null, error: null });
});

router.post("/user/verify_otp", ensureAuth, async (req, res) => {
  const { otp } = req.body;

  try {
    const user = await User.findById(req.user._id);

    if (!user.otp || !user.otpExpires)
      return res.status(400).json({ success: false, message: "OTP not requested." });

    if (new Date() > user.otpExpires)
      return res.status(400).json({ success: false, message: "OTP expired." });

    if (otp.trim() !== user.otp.trim())
      return res.status(400).json({ success: false, message: "Invalid OTP." });

    user.otp = null;
    user.otpExpires = null;
    user.emailVerified = true;
    await user.save();

    return res.json({ success: true, message: "Email verified successfully!" });
  } catch (err) {
    console.error("OTP verification error:", err);
    return res.status(500).json({ success: false, message: "Server error during OTP verification." });
  }
});

router.post("/purchase_all/:category", async (req, res) => {
  try {
    const category = req.params.category; // aspirants / working_professionals / senior_citizen
    const userId = req.user._id;

    // get all courses of that category
    let courses = [];
    if (category === "aspirants") {
      courses = await Course.find({});
    } else if (category === "working_professionals") {
      courses = await WorkingProfessional.find({});
    } else if (category === "senior_citizens") {
      courses = await SeniorCitizen.find({});
    }

    const expiresAt = new Date(Date.now() + 150 * 24 * 60 * 60 * 1000);

    for (const course of courses) {
      const alreadyPurchased = await PurchasedCourse.findOne({
        user: userId,
        course: course._id,
      });
      if (!alreadyPurchased) {
        await PurchasedCourse.create({
          user: userId,
          course: course._id,
          courseType: category,
          expiresAt,
        });
      }
    }

    res.redirect(`/user/${category}`); // back to category page
  } catch (err) {
    console.error(err);
    res.status(500).send("Error purchasing all courses");
  }
});

// =================== COMING SOON PAGE ===================
router.get("/seniors", (req, res) => {
  res.render("user/coming_soon", { audience: "Senior Citizens" });
});

// =================== CHOOSE CATEGORY ===================
router.get("/user/choose_category", ensureAuth, async (req, res) => {
  // Prevent admin from accessing this page
  if (req.user.isAdmin) {
    return res.redirect("/courses");
  }
  res.render("user/choose_category", { user: req.user });
});

module.exports = router;

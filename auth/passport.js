const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const User = require("../models/user"); 

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "/auth/google/callback",
    proxy: true
  },
  async function(accessToken, refreshToken, profile, done) {
    const email = profile.emails[0].value;

    let existingUser = await User.findOne({ email });
    if (!existingUser) {
      existingUser = new User({
        googleId: profile.id,
        name: profile.displayName,
        email: email
      });
      await existingUser.save();
    }

    return done(null, existingUser);
  }
));

// Serialize user to session
passport.serializeUser((user, done) => {
  done(null, user.id);
});

// Deserialize user from session
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id); // ✅ Using User model
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

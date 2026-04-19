const router = require("express").Router();
const auth = require("../controllers/auth.controller");

// OAuth GitHub
router.get("/oauth/github", auth.githubStart);
router.get("/oauth/github/callback", auth.githubCallback);

// OAuth Google
router.get("/oauth/google", auth.googleStart);
router.get("/oauth/google/callback", auth.googleCallback);

// Auth classique
router.post("/register", auth.register);
router.post("/login", auth.login);
router.post("/refresh", auth.refresh);
router.post("/logout", auth.logout);

module.exports = router;
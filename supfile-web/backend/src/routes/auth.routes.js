const router = require("express").Router();
const auth = require("../controllers/auth.controller");

// OAuth GitHub (DOIT être avant module.exports)
router.get("/oauth/github", auth.githubStart);
router.get("/oauth/github/callback", auth.githubCallback);

// Auth classique
router.post("/register", auth.register);
router.post("/login", auth.login);
router.post("/refresh", auth.refresh);
router.post("/logout", auth.logout);

module.exports = router;
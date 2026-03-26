const router = require("express").Router();
const z = require("zod");

const auth = require("../controllers/auth.controller");
const validate = require("../middlewares/validate.middleware");

router.get("/oauth/github/mobile/start", auth.githubMobileStart);
router.get("/oauth/github/mobile/callback", auth.githubMobileCallback);
// OAuth GitHub
router.get("/oauth/github", auth.githubStart);
router.get("/oauth/github/callback", auth.githubCallback);

// Auth classique
router.post(
  "/register",
  validate(
    z.object({
      email: z.string().trim().toLowerCase().email(),
      password: z.string().min(8),
    })
  ),
  auth.register
);

router.post(
  "/login",
  validate(
    z.object({
      email: z.string().trim().toLowerCase().email(),
      password: z.string().min(1),
    })
  ),
  auth.login
);

router.post(
  "/refresh",
  validate(
    z.object({
      refreshToken: z.string().min(1),
    })
  ),
  auth.refresh
);

router.post(
  "/logout",
  validate(
    z.object({
      refreshToken: z.string().min(1).optional(),
    })
  ),
  auth.logout
);

module.exports = router;
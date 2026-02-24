const router = require("express").Router();
const z = require("zod");
const validate = require("../middlewares/validate.middleware");
const auth = require("../middlewares/auth.middleware");
const user = require("../controllers/user.controller");

router.get("/me", auth, user.me);

router.patch(
  "/me",
  auth,
  validate(
    z.object({
      email: z.string().email().optional(),
      avatarUrl: z.string().url().optional(),
      avatarMeta: z.any().optional(),
    })
  ),
  user.updateMe
);

router.patch(
  "/me/password",
  auth,
  validate(z.object({ oldPassword: z.string().min(1), newPassword: z.string().min(8) })),
  user.changePassword
);

module.exports = router;
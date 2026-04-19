const router = require("express").Router();
const auth = require("../middlewares/auth.middleware");
const shares = require("../controllers/shares.controller");

// PUBLIC
router.get("/public/:token", shares.publicMeta);
router.post("/public/:token/access", shares.publicAccess);
router.get("/public/:token/file", shares.publicFile);

// 🔥 INTERNAL (MANQUANT)
router.get("/internal/:shareId/file", auth, shares.internalFile);

// PROTECTED
router.post("/public", auth, shares.createPublic);
router.post("/internal", auth, shares.createInternal);
router.get("/with-me", auth, shares.withMe);

module.exports = router;
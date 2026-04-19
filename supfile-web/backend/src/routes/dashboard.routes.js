const router = require("express").Router();
const auth = require("../middlewares/auth.middleware");
const dashboard = require("../controllers/dashboard.controller");

router.get("/usage", auth, dashboard.usage);
router.get("/recent", auth, dashboard.recent);
router.get("/active-shares", auth, dashboard.activeShares);
router.get("/trash-count", auth, dashboard.trashCount);

module.exports = router;
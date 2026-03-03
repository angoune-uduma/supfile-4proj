const router = require("express").Router();
const auth = require("../middlewares/auth.middleware");
const upload = require("../middlewares/upload.middleware");
const files = require("../controllers/files.controller");

router.get("/", auth, files.list);
router.post("/", auth, upload.single("file"), files.upload);

module.exports = router;
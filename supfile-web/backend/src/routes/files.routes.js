const router = require("express").Router();
const auth = require("../middlewares/auth.middleware");
const upload = require("../middlewares/upload.middleware");
const files = require("../controllers/files.controller");

router.post("/", auth, upload.single("file"), files.upload);
router.get("/", auth, files.listMine);
router.delete("/:id", auth, files.deleteMine);
module.exports = router;
const router = require("express").Router();
const auth = require("../middlewares/auth.middleware");
const upload = require("../middlewares/upload.middleware");
const files = require("../controllers/files.controller");

router.get("/", auth, files.list);
router.get("/trash", auth, files.trash);
router.post("/", auth, upload.single("file"), files.upload);
router.get("/:id/download", auth, files.download);
router.get("/:id/preview", auth, files.preview);
router.post("/:id/restore", auth, files.restore);
router.post("/folders", auth, files.createFolder);
router.delete("/:id", auth, files.remove);

module.exports = router;
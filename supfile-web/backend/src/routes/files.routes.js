// backend/src/routes/files.routes.js
const router = require("express").Router();
const auth = require("../middlewares/auth.middleware");
const upload = require("../middlewares/upload.middleware");
const files = require("../controllers/files.controller");

router.get("/", auth, files.list);
router.get("/trash", auth, files.trash);

router.post("/folders", auth, files.createFolder);
router.get("/breadcrumbs/:id", auth, files.breadcrumbs);
router.delete("/trash/empty", auth, files.emptyTrash);

router.post("/", auth, upload.single("file"), files.upload);
router.get("/:id/download-folder", auth, files.downloadFolder);
router.get("/:id/download", auth, files.download);
router.get("/:id/preview", auth, files.preview);
router.post("/:id/restore", auth, files.restore);
router.delete("/:id/hard", auth, files.hardRemove);
router.delete("/:id", auth, files.remove);
router.patch("/:id/rename", auth, files.rename);
router.patch("/:id/move", auth, files.move);

module.exports = router;
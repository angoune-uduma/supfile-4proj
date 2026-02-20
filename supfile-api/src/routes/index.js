import express from "express";
import multer from "multer";
import os from "os";

import {
  listItems,
  createFolder,
  renameOrMoveItem,
  trashItem,
  listTrash,
  restoreFromTrash,
  permanentlyDelete,
  uploadFile,
  downloadFile,
  previewFile,
  streamMedia,
  zipFolder
} from "../controllers/fs.controller.js";

import { validateObjectId } from "../middlewares/validateObjectId.js";

const router = express.Router();

// Multer en tmp
const upload = multer({
  dest: os.tmpdir(),
  limits: { fileSize: 1024 * 1024 * 1024 } // 1GB (à ajuster)
});

// navigation
router.get("/list", listItems);
router.post("/folders", createFolder);

// rename/move + delete logique
router.patch("/items/:id", validateObjectId("id"), renameOrMoveItem);
router.delete("/items/:id", validateObjectId("id"), trashItem);

// corbeille
router.get("/trash", listTrash);
router.post("/trash/:id/restore", validateObjectId("id"), restoreFromTrash);
router.delete("/trash/:id/permanent", validateObjectId("id"), permanentlyDelete);

// fichiers
router.post("/files/upload", upload.single("file"), uploadFile);
router.get("/files/:id/download", validateObjectId("id"), downloadFile);
router.get("/files/:id/preview", validateObjectId("id"), previewFile);
router.get("/files/:id/stream", validateObjectId("id"), streamMedia);

// zip dossier
router.get("/folders/:id/zip", validateObjectId("id"), zipFolder);

export default router;
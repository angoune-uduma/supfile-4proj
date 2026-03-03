const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const FileItem = require("../models/FileItem");

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function getStorageBaseDir() {
  return process.env.STORAGE_DIR || path.join(process.cwd(), "storage");
}

function genId() {
  return crypto.randomBytes(16).toString("hex");
}

exports.upload = async (req, res) => {
  try {
    if (!req.user?._id) return res.status(401).json({ error: "UNAUTHORIZED" });
    if (!req.file) return res.status(400).json({ error: "MISSING_FILE" });

    const maxMb = Number(process.env.MAX_UPLOAD_MB || 50);
    const maxBytes = maxMb * 1024 * 1024;
    if (req.file.size > maxBytes) {
      return res.status(413).json({ error: "FILE_TOO_LARGE", maxMb });
    }

    const ownerId = req.user._id;
    const parentId = req.body.parentId || null;

    const fileId = genId();
    const prefix = fileId.slice(0, 2);

    //  IMPORTANT: stocker un chemin DB en format POSIX (avec /)
    const storageRelPath = `${ownerId}/${prefix}/${fileId}`;

    //  chemin disque (portable Windows/Linux/Docker)
    const storageAbsPath = path.join(getStorageBaseDir(), String(ownerId), prefix, fileId);

    ensureDir(path.dirname(storageAbsPath));

    //  async (ne bloque pas Node)
    await fs.promises.writeFile(storageAbsPath, req.file.buffer);

    const doc = await FileItem.create({
      ownerId,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size,
      storageRelPath,
      parentId,
    });

    return res.status(201).json({
      ok: true,
      file: {
        id: doc._id,
        originalName: doc.originalName,
        mimeType: doc.mimeType,
        size: doc.size,
        parentId: doc.parentId,
        createdAt: doc.createdAt,
      },
    });
  } catch (err) {
    return res.status(500).json({ error: "UPLOAD_FAILED", message: err.message });
  }
};

exports.list = async (req, res) => {
  try {
    if (!req.user?._id) return res.status(401).json({ error: "UNAUTHORIZED" });

    const ownerId = req.user._id;

    // parentId optionnel (pour la suite: navigation dossier)
    const parentId = req.query.parentId || null;

    const query = {
      ownerId,
      deletedAt: null,
      parentId,
    };

    const items = await FileItem.find(query)
      .sort({ updatedAt: -1 })
      .select("_id originalName mimeType size parentId createdAt updatedAt");

    return res.json({
      ok: true,
      parentId,
      items: items.map((d) => ({
        id: d._id,
        originalName: d.originalName,
        mimeType: d.mimeType,
        size: d.size,
        parentId: d.parentId,
        createdAt: d.createdAt,
        updatedAt: d.updatedAt,
      })),
    });
  } catch (err) {
    return res.status(500).json({ error: "LIST_FAILED", message: err.message });
  }
};
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
      .select("_id type originalName mimeType size parentId createdAt updatedAt");

    return res.json({
      ok: true,
      parentId,
      items: items.map((d) => ({
        id: d._id,
        originalName: d.originalName,
        mimeType: d.mimeType,
        type: d.type,
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
exports.download = async (req, res) => {
  try {
    if (!req.user?._id) return res.status(401).json({ error: "UNAUTHORIZED" });

    const fileDoc = await FileItem.findOne({
      _id: req.params.id,
      ownerId: req.user._id,
      deletedAt: null,
    });

    if (!fileDoc) return res.status(404).json({ error: "NOT_FOUND" });
    if (fileDoc.type !== "file") {
      return res.status(400).json({ error: "NOT_A_FILE" });
    }

    const absPath = path.join(getStorageBaseDir(), ...fileDoc.storageRelPath.split("/"));

    if (!fs.existsSync(absPath)) {
      return res.status(404).json({ error: "FILE_MISSING_ON_DISK" });
    }

    res.setHeader("Content-Type", fileDoc.mimeType);
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${encodeURIComponent(fileDoc.originalName)}"`
    );

    return fs.createReadStream(absPath).pipe(res);
  } catch (err) {
    return res.status(500).json({ error: "DOWNLOAD_FAILED", message: err.message });
  }
};
exports.preview = async (req, res) => {
  try {
    if (!req.user?._id) return res.status(401).json({ error: "UNAUTHORIZED" });

    const fileDoc = await FileItem.findOne({
      _id: req.params.id,
      ownerId: req.user._id,
      deletedAt: null,
    });

    if (!fileDoc) return res.status(404).json({ error: "NOT_FOUND" });
    if (fileDoc.type !== "file") {
      return res.status(400).json({ error: "NOT_A_FILE" });
    }

    const absPath = path.join(getStorageBaseDir(), ...fileDoc.storageRelPath.split("/"));

    if (!fs.existsSync(absPath)) {
      return res.status(404).json({ error: "FILE_MISSING_ON_DISK" });
    }

    const stat = await fs.promises.stat(absPath);
    const fileSize = stat.size;

    const mime = fileDoc.mimeType || "application/octet-stream";
    res.setHeader("Content-Type", mime);
    res.setHeader(
      "Content-Disposition",
      `inline; filename="${encodeURIComponent(fileDoc.originalName)}"`
    );

    //  Range support for audio/video
    const range = req.headers.range;
    if (range) {
      const match = range.match(/bytes=(\d+)-(\d*)/);
      if (!match) return res.status(416).end();

      const start = parseInt(match[1], 10);
      const end = match[2] ? parseInt(match[2], 10) : fileSize - 1;

      if (start >= fileSize || end >= fileSize) return res.status(416).end();

      res.status(206);
      res.setHeader("Accept-Ranges", "bytes");
      res.setHeader("Content-Range", `bytes ${start}-${end}/${fileSize}`);
      res.setHeader("Content-Length", end - start + 1);

      return fs.createReadStream(absPath, { start, end }).pipe(res);
    }

    //  No range: normal stream
    res.setHeader("Content-Length", fileSize);
    return fs.createReadStream(absPath).pipe(res);
  } catch (err) {
    return res.status(500).json({ error: "PREVIEW_FAILED", message: err.message });
  }
};

exports.trash = async (req, res) => {
  try {
    if (!req.user?._id) return res.status(401).json({ error: "UNAUTHORIZED" });

    const items = await FileItem.find({
      ownerId: req.user._id,
      deletedAt: { $ne: null },
    })
      .sort({ deletedAt: -1 })
      .select("_id type originalName mimeType size parentId deletedAt createdAt updatedAt");

    return res.json({
      ok: true,
      items: items.map((d) => ({
        id: d._id,
        originalName: d.originalName,
        mimeType: d.mimeType,
        size: d.size,
        type: d.type,
        parentId: d.parentId,
        deletedAt: d.deletedAt,
        createdAt: d.createdAt,
        updatedAt: d.updatedAt,
      })),
    });
  } catch (err) {
    return res.status(500).json({ error: "TRASH_LIST_FAILED", message: err.message });
  }
};

exports.remove = async (req, res) => {
  try {
    if (!req.user?._id) return res.status(401).json({ error: "UNAUTHORIZED" });

    const doc = await FileItem.findOneAndUpdate(
      { _id: req.params.id, ownerId: req.user._id, deletedAt: null },
      { deletedAt: new Date() },
      { new: true }
    );

    if (!doc) return res.status(404).json({ error: "NOT_FOUND" });

    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ error: "DELETE_FAILED", message: err.message });
  }
};

exports.restore = async (req, res) => {
  try {
    if (!req.user?._id) return res.status(401).json({ error: "UNAUTHORIZED" });

    const doc = await FileItem.findOneAndUpdate(
      { _id: req.params.id, ownerId: req.user._id, deletedAt: { $ne: null } },
      { deletedAt: null },
      { new: true }
    );

    if (!doc) return res.status(404).json({ error: "NOT_FOUND" });

    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ error: "RESTORE_FAILED", message: err.message });
  }
};

exports.createFolder = async (req, res) => {
  try {
    if (!req.user?._id) return res.status(401).json({ error: "UNAUTHORIZED" });

    const name = (req.body.name || "").trim();
    const parentId = req.body.parentId || null;

    if (!name) return res.status(400).json({ error: "FOLDER_NAME_REQUIRED" });

    const folder = await FileItem.create({
      ownerId: req.user._id,
      type: "folder",
      originalName: name,
      parentId,
    });

    return res.status(201).json({
      ok: true,
      folder: {
        id: folder._id,
        name: folder.originalName,
        parentId: folder.parentId,
        createdAt: folder.createdAt,
      },
    });
  } catch (err) {
    return res.status(500).json({ error: "CREATE_FOLDER_FAILED", message: err.message });
  }
};
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");

const FileItem = require("../models/FileItem");
const ShareItem = require("../models/ShareItem");
const User = require("../models/User");

function getStorageBaseDir() {
  return process.env.STORAGE_DIR || path.join(process.cwd(), "storage");
}

function getAbsPathFromRel(storageRelPath) {
  return path.join(getStorageBaseDir(), ...String(storageRelPath).split("/"));
}

function hashPassword(password) {
  return crypto.createHash("sha256").update(password).digest("hex");
}

function isExpired(expiresAt) {
  return !!expiresAt && new Date(expiresAt).getTime() <= Date.now();
}

exports.createPublic = async (req, res) => {
  try {
    if (!req.user?._id) return res.status(401).json({ error: "UNAUTHORIZED" });

    const { nodeId, expiresAt, password } = req.body;

    if (!nodeId) {
      return res.status(400).json({ error: "NODE_ID_REQUIRED" });
    }
    let parsedExpiresAt = null;

    if (expiresAt) {
      parsedExpiresAt = new Date(expiresAt);

      if (Number.isNaN(parsedExpiresAt.getTime())) {
        return res.status(400).json({ error: "INVALID_EXPIRES_AT" });
      }

      if (parsedExpiresAt.getTime() <= Date.now()) {
        return res.status(400).json({ error: "EXPIRES_AT_MUST_BE_FUTURE" });
      }
    }

    const item = await FileItem.findOne({
      _id: nodeId,
      ownerId: req.user._id,
      deletedAt: null,
    }).select("_id type originalName mimeType size storageRelPath");

    if (!item) {
      return res.status(404).json({ error: "ITEM_NOT_FOUND" });
    }

    const token = crypto.randomBytes(18).toString("hex");

    const share = await ShareItem.create({
      ownerId: req.user._id,
      nodeId: item._id,
      nodeType: item.type,
      mode: "public",
      token,
      password: password ? hashPassword(password) : null,
      expiresAt: parsedExpiresAt,
      allowDownload: true,
    });

    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";

    return res.status(201).json({
      ok: true,
      share: {
        id: share._id,
        token: share.token,
        url: `${frontendUrl}/public/${share.token}`,
        expiresAt: share.expiresAt,
        protected: !!password,
      },
    });
  } catch (err) {
    return res.status(500).json({
      error: "CREATE_PUBLIC_SHARE_FAILED",
      message: err.message,
    });
  }
};

exports.createInternal = async (req, res) => {
  try {
    if (!req.user?._id) return res.status(401).json({ error: "UNAUTHORIZED" });

    const { nodeId, nodeType, toEmail } = req.body;

    if (!nodeId || !toEmail) {
      return res.status(400).json({ error: "NODE_ID_AND_EMAIL_REQUIRED" });
    }

    const item = await FileItem.findOne({
      _id: nodeId,
      ownerId: req.user._id,
      deletedAt: null,
    }).select("_id type originalName");

    if (!item) {
      return res.status(404).json({ error: "ITEM_NOT_FOUND" });
    }

    const targetUser = await User.findOne({
      email: String(toEmail).trim().toLowerCase(),
    }).select("_id email");

    if (!targetUser) {
      return res.status(404).json({ error: "TARGET_USER_NOT_FOUND" });
    }

    const share = await ShareItem.create({
      ownerId: req.user._id,
      targetUserId: targetUser._id,
      nodeId: item._id,
      nodeType: nodeType || item.type,
      mode: "internal",
      allowDownload: true,
    });

    return res.status(201).json({
      ok: true,
      share: {
        id: share._id,
        nodeId: item._id,
        nodeType: item.type,
        targetUserEmail: targetUser.email,
      },
    });
  } catch (err) {
    return res.status(500).json({
      error: "CREATE_INTERNAL_SHARE_FAILED",
      message: err.message,
    });
  }
};

exports.withMe = async (req, res) => {
  try {
    if (!req.user?._id) return res.status(401).json({ error: "UNAUTHORIZED" });

    const shares = await ShareItem.find({
      targetUserId: req.user._id,
      mode: "internal",
    })
      .sort({ createdAt: -1 })
      .populate("ownerId", "email")
      .populate("nodeId", "originalName type deletedAt");

    const items = shares
      .filter((s) => s.nodeId && !s.nodeId.deletedAt)
      .map((s) => ({
        id: s._id,
        nodeId: s.nodeId._id,
        nodeType: s.nodeType,
        name: s.nodeId.originalName,
        fromUser: {
          email: s.ownerId?.email || "—",
        },
        createdAt: s.createdAt,
      }));

    return res.json({
      ok: true,
      items,
    });
  } catch (err) {
    return res.status(500).json({
      error: "LIST_SHARES_WITH_ME_FAILED",
      message: err.message,
    });
  }
};

// ---------- PUBLIC ACCESS ----------

exports.publicMeta = async (req, res) => {
  try {
    const { token } = req.params;

    const share = await ShareItem.findOne({
      token,
      mode: "public",
    }).populate("nodeId", "originalName type mimeType size storageRelPath deletedAt");

    if (!share || !share.nodeId || share.nodeId.deletedAt) {
      return res.status(404).json({ error: "SHARE_NOT_FOUND" });
    }

    if (isExpired(share.expiresAt)) {
      return res.status(410).json({ error: "SHARE_EXPIRED" });
    }

    return res.json({
      ok: true,
      item: {
        name: share.nodeId.originalName,
        type: share.nodeId.type,
        mimeType: share.nodeId.mimeType || null,
        size: share.nodeId.size || 0,
      },
      protected: !!share.password,
      expiresAt: share.expiresAt,
    });
  } catch (err) {
    return res.status(500).json({
      error: "PUBLIC_SHARE_META_FAILED",
      message: err.message,
    });
  }
};

exports.publicAccess = async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body || {};

    const share = await ShareItem.findOne({
      token,
      mode: "public",
    }).populate("nodeId", "originalName type mimeType size storageRelPath deletedAt");

    if (!share || !share.nodeId || share.nodeId.deletedAt) {
      return res.status(404).json({ error: "SHARE_NOT_FOUND" });
    }

    if (isExpired(share.expiresAt)) {
      return res.status(410).json({ error: "SHARE_EXPIRED" });
    }

    if (share.password) {
      if (!password) {
        return res.status(401).json({ error: "PASSWORD_REQUIRED" });
      }

      const incoming = hashPassword(password);
      if (incoming !== share.password) {
        return res.status(401).json({ error: "INVALID_PASSWORD" });
      }
    }

    const accessToken = jwt.sign(
      {
        scope: "public-share",
        shareId: String(share._id),
        shareToken: share.token,
        nodeId: String(share.nodeId._id),
      },
      process.env.JWT_ACCESS_SECRET,
      { expiresIn: "15m" }
    );

    return res.json({
      ok: true,
      accessToken,
      item: {
        name: share.nodeId.originalName,
        type: share.nodeId.type,
        mimeType: share.nodeId.mimeType || null,
        size: share.nodeId.size || 0,
      },
      previewUrl: `/shares/public/${share.token}/file?access=${encodeURIComponent(accessToken)}&disposition=inline`,
      downloadUrl: `/shares/public/${share.token}/file?access=${encodeURIComponent(accessToken)}&disposition=attachment`,
    });
  } catch (err) {
    return res.status(500).json({
      error: "PUBLIC_SHARE_ACCESS_FAILED",
      message: err.message,
    });
  }
};

exports.publicFile = async (req, res) => {
  try {
    const { token } = req.params;
    const { access, disposition } = req.query;

    if (!access) {
      return res.status(401).json({ error: "MISSING_ACCESS_TOKEN" });
    }

    let payload;
    try {
      payload = jwt.verify(access, process.env.JWT_ACCESS_SECRET);
    } catch {
      return res.status(401).json({ error: "INVALID_ACCESS_TOKEN" });
    }

    if (
      payload?.scope !== "public-share" ||
      payload?.shareToken !== token
    ) {
      return res.status(401).json({ error: "INVALID_ACCESS_SCOPE" });
    }

    const share = await ShareItem.findOne({
      _id: payload.shareId,
      token,
      mode: "public",
    }).populate("nodeId", "originalName type mimeType size storageRelPath deletedAt");

    if (!share || !share.nodeId || share.nodeId.deletedAt) {
      return res.status(404).json({ error: "SHARE_NOT_FOUND" });
    }

    if (isExpired(share.expiresAt)) {
      return res.status(410).json({ error: "SHARE_EXPIRED" });
    }

    if (share.nodeId.type !== "file") {
      return res.status(400).json({ error: "PUBLIC_FOLDER_STREAM_NOT_SUPPORTED" });
    }

    const absPath = getAbsPathFromRel(share.nodeId.storageRelPath);
    if (!fs.existsSync(absPath)) {
      return res.status(404).json({ error: "FILE_MISSING_ON_DISK" });
    }

    const stat = await fs.promises.stat(absPath);
    const fileSize = stat.size;
    const mime = share.nodeId.mimeType || "application/octet-stream";
    const safeDisposition = disposition === "attachment" ? "attachment" : "inline";

    res.setHeader("Content-Type", mime);
    res.setHeader(
      "Content-Disposition",
      `${safeDisposition}; filename="${encodeURIComponent(share.nodeId.originalName)}"`
    );

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

    res.setHeader("Content-Length", fileSize);
    return fs.createReadStream(absPath).pipe(res);
  } catch (err) {
    return res.status(500).json({
      error: "PUBLIC_SHARE_FILE_FAILED",
      message: err.message,
    });
  }
};
exports.internalFile = async (req, res) => {
  try {
    if (!req.user?._id) return res.status(401).json({ error: "UNAUTHORIZED" });

    const { shareId } = req.params;
    const { disposition } = req.query;

    const share = await ShareItem.findOne({
      _id: shareId,
      targetUserId: req.user._id,
      mode: "internal",
    }).populate("nodeId", "originalName type mimeType size storageRelPath deletedAt");

    if (!share || !share.nodeId || share.nodeId.deletedAt) {
      return res.status(404).json({ error: "SHARE_NOT_FOUND" });
    }

    if (share.nodeId.type !== "file") {
      return res.status(400).json({ error: "FOLDER_STREAM_NOT_SUPPORTED" });
    }

    const absPath = getAbsPathFromRel(share.nodeId.storageRelPath);
    if (!fs.existsSync(absPath)) {
      return res.status(404).json({ error: "FILE_MISSING_ON_DISK" });
    }

    const stat = await fs.promises.stat(absPath);
    const fileSize = stat.size;
    const mime = share.nodeId.mimeType || "application/octet-stream";
    const safeDisposition = disposition === "attachment" ? "attachment" : "inline";

    res.setHeader("Content-Type", mime);
    res.setHeader(
      "Content-Disposition",
      `${safeDisposition}; filename="${encodeURIComponent(share.nodeId.originalName)}"`
    );

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

    res.setHeader("Content-Length", fileSize);
    return fs.createReadStream(absPath).pipe(res);
  } catch (err) {
    return res.status(500).json({
      error: "INTERNAL_SHARE_FILE_FAILED",
      message: err.message,
    });
  }
};
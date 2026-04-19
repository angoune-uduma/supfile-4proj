const FileItem = require("../models/FileItem");
const ShareItem = require("../models/ShareItem");

function categoryFromMime(mimeType = "") {
  if (!mimeType) return "other";
  if (mimeType.startsWith("video/")) return "video";
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("audio/")) return "audio";
  if (
    mimeType === "application/pdf" ||
    mimeType.includes("word") ||
    mimeType.includes("text") ||
    mimeType.includes("document") ||
    mimeType.includes("sheet") ||
    mimeType.includes("presentation")
  ) {
    return "document";
  }
  return "other";
}

exports.usage = async (req, res) => {
  try {
    if (!req.user?._id) return res.status(401).json({ error: "UNAUTHORIZED" });

    const files = await FileItem.find({
      ownerId: req.user._id,
      deletedAt: null,
      type: "file",
    }).select("size mimeType");

    const quotaBytes = 30 * 1024 * 1024 * 1024;
    let usedBytes = 0;

    const map = {
      video: 0,
      image: 0,
      audio: 0,
      document: 0,
      other: 0,
    };

    for (const f of files) {
      const size = Number(f.size || 0);
      usedBytes += size;
      const cat = categoryFromMime(f.mimeType);
      map[cat] += size;
    }

    return res.json({
      ok: true,
      quotaBytes,
      usedBytes,
      byCategory: [
        { key: "video", bytes: map.video },
        { key: "image", bytes: map.image },
        { key: "audio", bytes: map.audio },
        { key: "document", bytes: map.document },
        { key: "other", bytes: map.other },
      ],
    });
  } catch (err) {
    return res.status(500).json({ error: "DASHBOARD_USAGE_FAILED", message: err.message });
  }
};

exports.recent = async (req, res) => {
  try {
    if (!req.user?._id) return res.status(401).json({ error: "UNAUTHORIZED" });

    const limit = Math.min(Math.max(Number(req.query.limit || 5), 1), 20);

    const items = await FileItem.find({
      ownerId: req.user._id,
      deletedAt: null,
    })
      .sort({ updatedAt: -1 })
      .limit(limit)
      .select("_id originalName type size updatedAt");

    return res.json({
      ok: true,
      items: items.map((i) => ({
        id: i._id,
        name: i.originalName,
        type: i.type,
        sizeBytes: i.size || 0,
        updatedAt: i.updatedAt,
      })),
    });
  } catch (err) {
    return res.status(500).json({ error: "DASHBOARD_RECENT_FAILED", message: err.message });
  }
};

exports.activeShares = async (req, res) => {
  try {
    if (!req.user?._id) return res.status(401).json({ error: "UNAUTHORIZED" });

    const count = await ShareItem.countDocuments({
      ownerId: req.user._id,
    });

    return res.json({ ok: true, count });
  } catch (err) {
    return res.status(500).json({ error: "DASHBOARD_ACTIVE_SHARES_FAILED", message: err.message });
  }
};
exports.trashCount = async (req, res) => {
  try {
    if (!req.user?._id) return res.status(401).json({ error: "UNAUTHORIZED" });

    const count = await FileItem.countDocuments({
      ownerId: req.user._id,
      deletedAt: { $ne: null },
    });

    return res.json({ ok: true, count });
  } catch (err) {
    return res.status(500).json({
      error: "DASHBOARD_TRASH_COUNT_FAILED",
      message: err.message,
    });
  }
};
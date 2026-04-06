//files.controller.js
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const archiver = require("archiver");

const FileItem = require("../models/FileItem");
const ShareItem = require("../models/ShareItem");

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function getStorageBaseDir() {
  return process.env.STORAGE_DIR || path.join(process.cwd(), "storage");
}
function getAbsolutePathFromStorageRelPath(storageRelPath) {
  return path.join(getStorageBaseDir(), ...storageRelPath.split("/"));
}
async function getInternalShareForNode(userId, nodeId) {
  return ShareItem.findOne({
    mode: "internal",
    targetUserId: userId,
    nodeId,
  }).select("_id ownerId targetUserId nodeId nodeType");
}

async function canAccessNode(userId, nodeId) {
  // 1) accès direct propriétaire
  const ownNode = await FileItem.findOne({
    _id: nodeId,
    ownerId: userId,
    deletedAt: null,
  }).select("_id ownerId parentId type");

  if (ownNode) {
    return {
      ok: true,
      accessType: "owner",
      sharedRootId: null,
      node: ownNode,
    };
  }

  // 2) accès direct via partage interne sur ce noeud
  const directShare = await getInternalShareForNode(userId, nodeId);
  if (directShare) {
    const sharedNode = await FileItem.findOne({
      _id: nodeId,
      deletedAt: null,
    }).select("_id ownerId parentId type originalName");

    if (!sharedNode) return { ok: false };

    return {
      ok: true,
      accessType: "shared",
      sharedRootId: String(nodeId),
      node: sharedNode,
      share: directShare,
    };
  }

  // 3) accès hérité si nodeId est à l'intérieur d'un dossier partagé
  let current = await FileItem.findById(nodeId).select("_id ownerId parentId type deletedAt");
  if (!current || current.deletedAt) {
    return { ok: false };
  }

  while (current.parentId) {
    const parentId = String(current.parentId);

    const parentShare = await getInternalShareForNode(userId, parentId);
    if (parentShare) {
      return {
        ok: true,
        accessType: "shared",
        sharedRootId: parentId,
        node: current,
        share: parentShare,
      };
    }

    current = await FileItem.findById(parentId).select("_id ownerId parentId type deletedAt");
    if (!current || current.deletedAt) {
      return { ok: false };
    }
  }

  return { ok: false };
}
async function deletePhysicalFileIfNeeded(item) {
  if (item.type !== "file") return;
  if (!item.storageRelPath) return;

  const absPath = path.join(getStorageBaseDir(), ...item.storageRelPath.split("/"));

  try {
    await fs.promises.unlink(absPath);
  } catch (err) {
    // si le fichier n'existe déjà plus, on ignore
    if (err.code !== "ENOENT") throw err;
  }
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
    if (parentId) {
      const parent = await FileItem.findOne({
        _id: parentId,
        ownerId,
        deletedAt: null,
        type: "folder",
      });

      if (!parent) {
        return res.status(400).json({ error: "INVALID_PARENT_FOLDER" });
      }
    }

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

    const userId = req.user._id;
    const parentId = req.query.parentId || null;

    // CAS 1 : racine = fichiers perso + dossiers/fichiers partagés reçus
    if (!parentId) {
      const ownItems = await FileItem.find({
        ownerId: userId,
        deletedAt: null,
        parentId: null,
      })
        .sort({ updatedAt: -1 })
        .select("_id type originalName mimeType size parentId createdAt updatedAt");

      const receivedShares = await ShareItem.find({
        mode: "internal",
        targetUserId: userId,
      }).select("nodeId ownerId nodeType createdAt");

      const sharedNodeIds = receivedShares.map((s) => s.nodeId);

      const sharedItemsRaw = sharedNodeIds.length
        ? await FileItem.find({
            _id: { $in: sharedNodeIds },
            deletedAt: null,
          }).select("_id type originalName mimeType size parentId createdAt updatedAt ownerId")
        : [];

      const sharedItems = sharedItemsRaw.map((d) => {
        const share = receivedShares.find((s) => String(s.nodeId) === String(d._id));

        return {
          id: d._id,
          originalName: d.originalName,
          mimeType: d.mimeType,
          type: d.type,
          size: d.size,
          parentId: null, // affiché à la racine chez le receveur
          createdAt: d.createdAt,
          updatedAt: d.updatedAt,
          isShared: true,
          sharedBy: share?.ownerId || null,
          sharedAt: share?.createdAt || null,
        };
      });

      const ownMapped = ownItems.map((d) => ({
        id: d._id,
        originalName: d.originalName,
        mimeType: d.mimeType,
        type: d.type,
        size: d.size,
        parentId: d.parentId,
        createdAt: d.createdAt,
        updatedAt: d.updatedAt,
        isShared: false,
        sharedBy: null,
        sharedAt: null,
      }));

      return res.json({
        ok: true,
        parentId: null,
        items: [...ownMapped, ...sharedItems],
      });
    }

    // CAS 2 : navigation dans un dossier
    const access = await canAccessNode(userId, parentId);
    if (!access.ok) {
      return res.status(403).json({ error: "FORBIDDEN" });
    }

    const children = await FileItem.find({
      parentId,
      deletedAt: null,
    })
      .sort({ updatedAt: -1 })
      .select("_id type originalName mimeType size parentId createdAt updatedAt ownerId");

    return res.json({
      ok: true,
      parentId,
      items: children.map((d) => ({
        id: d._id,
        originalName: d.originalName,
        mimeType: d.mimeType,
        type: d.type,
        size: d.size,
        parentId: d.parentId,
        createdAt: d.createdAt,
        updatedAt: d.updatedAt,
        isShared: access.accessType === "shared",
        sharedBy: access.share?.ownerId || null,
      })),
    });
  } catch (err) {
    return res.status(500).json({ error: "LIST_FAILED", message: err.message });
  }
};

exports.download = async (req, res) => {
  try {
    if (!req.user?._id) return res.status(401).json({ error: "UNAUTHORIZED" });

    const access = await canAccessNode(req.user._id, req.params.id);
    if (!access.ok) {
      return res.status(403).json({ error: "FORBIDDEN" });
    }

    const fileDoc = await FileItem.findOne({
      _id: req.params.id,
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
exports.downloadFolder = async (req, res) => {
  try {
    if (!req.user?._id) {
      return res.status(401).json({ error: "UNAUTHORIZED" });
    }



    const access = await canAccessNode(req.user._id, req.params.id);
    if (!access.ok) {
      return res.status(403).json({ error: "FORBIDDEN" });
    }

    const rootFolder = await FileItem.findOne({
      _id: req.params.id,
      deletedAt: null,
      type: "folder",
    }).select("_id originalName type ownerId");

    if (!rootFolder) {
      return res.status(404).json({ error: "FOLDER_NOT_FOUND" });
    }

    const ownerId = rootFolder.ownerId;

    if (!rootFolder) {
      return res.status(404).json({ error: "FOLDER_NOT_FOUND" });
    }

    const safeName = (rootFolder.originalName || "folder").replace(/[\\/:*?"<>|]+/g, "_");

    res.setHeader("Content-Type", "application/zip");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${encodeURIComponent(safeName)}.zip"`
    );

    const archive = archiver("zip", { zlib: { level: 9 } });

    archive.on("error", (err) => {
      throw err;
    });

    archive.pipe(res);

    const queue = [
      {
        folderId: rootFolder._id,
        relativePath: safeName,
      },
    ];

    while (queue.length > 0) {
      const current = queue.shift();

      const children = await FileItem.find({
        ownerId,
        deletedAt: null,
        parentId: current.folderId,
      }).select("_id type originalName storageRelPath");

      for (const child of children) {
        const childPath = `${current.relativePath}/${child.originalName}`;

        if (child.type === "folder") {
          archive.append("", { name: `${childPath}/` });
          queue.push({
            folderId: child._id,
            relativePath: childPath,
          });
        } else if (child.type === "file" && child.storageRelPath) {
          const absPath = getAbsolutePathFromStorageRelPath(child.storageRelPath);

          if (fs.existsSync(absPath)) {
            archive.file(absPath, { name: childPath });
          }
        }
      }
    }

    await archive.finalize();
  } catch (err) {
    if (!res.headersSent) {
      return res.status(500).json({
        error: "FOLDER_DOWNLOAD_FAILED",
        message: err.message,
      });
    }
  }
};

exports.preview = async (req, res) => {
  try {
    if (!req.user?._id) return res.status(401).json({ error: "UNAUTHORIZED" });

    const access = await canAccessNode(req.user._id, req.params.id);
    if (!access.ok) {
      return res.status(403).json({ error: "FORBIDDEN" });
    }

    const fileDoc = await FileItem.findOne({
      _id: req.params.id,
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

    const ownerId = req.user._id;

    const item = await FileItem.findOne({
      _id: req.params.id,
      ownerId,
      deletedAt: null,
    }).select("_id type");

    if (!item) return res.status(404).json({ error: "Vous ne disposez pas des droits nécéssaires" });

    const now = new Date();

    // Cas 1: fichier -> soft delete direct
    if (item.type === "file") {
      await FileItem.updateOne(
        { _id: item._id, ownerId, deletedAt: null },
        { $set: { deletedAt: now } }
      );
      return res.json({ ok: true });
    }

    // Cas 2: folder -> soft delete récursif (BFS)
    const toVisit = [item._id];
    const idsToDelete = [];

    while (toVisit.length > 0) {
      const currentId = toVisit.shift();
      idsToDelete.push(currentId);

      const children = await FileItem.find({
        ownerId,
        deletedAt: null,
        parentId: currentId,
      }).select("_id type");

      for (const child of children) {
        toVisit.push(child._id);
      }
    }

    await FileItem.updateMany(
      { ownerId, deletedAt: null, _id: { $in: idsToDelete } },
      { $set: { deletedAt: now } }
    );

    return res.json({ ok: true, deletedCount: idsToDelete.length });
  } catch (err) {
    return res.status(500).json({ error: "DELETE_FAILED", message: err.message });
  }
};

exports.restore = async (req, res) => {
  try {
    if (!req.user?._id) return res.status(401).json({ error: "UNAUTHORIZED" });

    const ownerId = req.user._id;

    // 1) item à restaurer (file ou folder)
    const item = await FileItem.findOne({
      _id: req.params.id,
      ownerId,
      deletedAt: { $ne: null },
    }).select("_id type parentId");

    if (!item) return res.status(404).json({ error: "NOT_FOUND" });

    // 2) Restaurer les ancêtres si besoin (A -> ... -> parent de item)
    let parentId = item.parentId;

    while (parentId) {
      const parent = await FileItem.findOne({ _id: parentId, ownerId }).select(
        "_id type parentId deletedAt"
      );

      // parent définitivement absent (hard delete ou incohérence) => on casse le lien
      if (!parent) {
        await FileItem.updateOne({ _id: item._id, ownerId }, { $set: { parentId: null } });
        parentId = null;
        break;
      }

      // si parent est supprimé => on le restaure
      if (parent.deletedAt) {
        await FileItem.updateOne({ _id: parent._id, ownerId }, { $set: { deletedAt: null } });
      }

      // continuer à remonter
      parentId = parent.parentId;
    }

    // 3) Cas fichier => restore direct
    if (item.type === "file") {
      await FileItem.updateOne({ _id: item._id, ownerId }, { $set: { deletedAt: null } });
      return res.json({ ok: true });
    }

    // 4) Cas dossier => restore récursif du sous-arbre
    const toVisit = [item._id];
    const idsToRestore = [];

    while (toVisit.length > 0) {
      const currentId = toVisit.shift();
      idsToRestore.push(currentId);

      const children = await FileItem.find({
        ownerId,
        parentId: currentId,
        deletedAt: { $ne: null },
      }).select("_id");

      for (const child of children) {
        toVisit.push(child._id);
      }
    }

    await FileItem.updateMany(
      { ownerId, _id: { $in: idsToRestore } },
      { $set: { deletedAt: null } }
    );

    return res.json({ ok: true, restoredCount: idsToRestore.length });
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
    if (parentId) {
      const parent = await FileItem.findOne({
        _id: parentId,
        ownerId: req.user._id,
        deletedAt: null,
        type: "folder",
      }).select("_id");

      if (!parent) {
        return res.status(400).json({ error: "INVALID_PARENT_FOLDER" });
      }
    }
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
exports.rename = async (req, res) => {
  try {
    if (!req.user?._id) return res.status(401).json({ error: "UNAUTHORIZED" });

    const newName = (req.body.name || "").trim();
    if (!newName) return res.status(400).json({ error: "NAME_REQUIRED" });

    const doc = await FileItem.findOneAndUpdate(
      { _id: req.params.id, ownerId: req.user._id, deletedAt: null },
      { originalName: newName },
      { new: true }
    ).select("_id type originalName parentId updatedAt");

    if (!doc) return res.status(404).json({ error: "Vous ne disposez pas des droits nédéssaires" });

    return res.json({
      ok: true,
      item: {
        id: doc._id,
        type: doc.type,
        originalName: doc.originalName,
        parentId: doc.parentId,
        updatedAt: doc.updatedAt,
      },
    });
  } catch (err) {
    return res.status(500).json({ error: "RENAME_FAILED", message: err.message });
  }
};

exports.move = async (req, res) => {
  try {
    if (!req.user?._id) return res.status(401).json({ error: "UNAUTHORIZED" });

    const ownerId = req.user._id;
    const targetParentId = req.body.parentId ?? null;

    // 1) item à déplacer
    const item = await FileItem.findOne({
      _id: req.params.id,
      ownerId,
      deletedAt: null,
    }).select("_id type parentId");

    if (!item) return res.status(404).json({ error: "NOT_FOUND" });

    if (String(item.parentId || "") === String(targetParentId || "")) {
      return res.json({ ok: true, unchanged: true });
    }
    // 2) si parentId fourni, vérifier que c'est un folder du user
    if (targetParentId) {
      const parent = await FileItem.findOne({
        _id: targetParentId,
        ownerId,
        deletedAt: null,
        type: "folder",
      }).select("_id parentId");

      if (!parent) return res.status(400).json({ error: "INVALID_PARENT" });

      // 3) empêcher de mettre dans soi-même
      if (String(targetParentId) === String(item._id)) {
        return res.status(400).json({ error: "CANNOT_MOVE_INTO_SELF" });
      }

      // 4) empêcher cycle : si item est un folder, on remonte les parents du target
      if (item.type === "folder") {
        let currentParentId = parent.parentId ? String(parent.parentId) : null;

        while (currentParentId) {
          if (currentParentId === String(item._id)) {
            return res.status(400).json({ error: "CYCLE_DETECTED" });
          }

          const p = await FileItem.findOne({
            _id: currentParentId,
            ownerId,
            deletedAt: null,
            type: "folder",
          }).select("_id parentId");

          if (!p) break; // parent manquant => on s'arrête

          currentParentId = p.parentId ? String(p.parentId) : null;
        }
      }
    }

    // 5) update
    await FileItem.updateOne(
      { _id: item._id, ownerId, deletedAt: null },
      { $set: { parentId: targetParentId } }
    );

    const updated = await FileItem.findOne({
  _id: item._id,
  ownerId,
  deletedAt: null,
}).select("_id type originalName parentId updatedAt");

return res.json({
  ok: true,
  item: {
    id: updated._id,
    type: updated.type,
    originalName: updated.originalName,
    parentId: updated.parentId,
    updatedAt: updated.updatedAt,
  },
});
  } catch (err) {
    return res.status(500).json({ error: "MOVE_FAILED", message: err.message });
  }
};

exports.breadcrumbs = async (req, res) => {
  try {
    if (!req.user?._id) return res.status(401).json({ error: "UNAUTHORIZED" });

    const userId = req.user._id;
    const access = await canAccessNode(userId, req.params.id);

    if (!access.ok) {
      return res.status(403).json({ error: "FORBIDDEN" });
    }

    let current = await FileItem.findById(req.params.id).select("_id originalName parentId deletedAt");
    if (!current || current.deletedAt) {
      return res.status(404).json({ error: "NOT_FOUND" });
    }

    const path = [];

    while (current) {
      path.unshift({
        id: current._id,
        name: current.originalName,
      });

      if (!current.parentId) break;

      if (
        access.accessType === "shared" &&
        String(current._id) === String(access.sharedRootId)
      ) {
        break;
      }

      current = await FileItem.findById(current.parentId).select("_id originalName parentId deletedAt");
      if (!current || current.deletedAt) break;
    }

    return res.json({ ok: true, path });
  } catch (err) {
    return res.status(500).json({ error: "BREADCRUMBS_FAILED", message: err.message });
  }
};

exports.hardRemove = async (req, res) => {
  try {
    if (!req.user?._id) return res.status(401).json({ error: "UNAUTHORIZED" });

    const ownerId = req.user._id;

    const item = await FileItem.findOne({
      _id: req.params.id,
      ownerId,
      deletedAt: { $ne: null },
    }).select("_id type parentId storageRelPath");

    if (!item) return res.status(404).json({ error: "NOT_FOUND_IN_TRASH" });

    const toVisit = [item._id];
    const idsToDelete = [];
    const filesToDelete = [];

    while (toVisit.length > 0) {
      const currentId = toVisit.shift();

      const current = await FileItem.findOne({
        _id: currentId,
        ownerId,
        deletedAt: { $ne: null },
      }).select("_id type storageRelPath");

      if (!current) continue;

      idsToDelete.push(current._id);

      if (current.type === "file") {
        filesToDelete.push(current);
      }

      const children = await FileItem.find({
        ownerId,
        parentId: current._id,
        deletedAt: { $ne: null },
      }).select("_id");

      for (const child of children) {
        toVisit.push(child._id);
      }
    }

    // 1) supprimer physiquement les fichiers
    for (const file of filesToDelete) {
      await deletePhysicalFileIfNeeded(file);
    }

    // 2) supprimer définitivement en DB
    await FileItem.deleteMany({
      ownerId,
      _id: { $in: idsToDelete },
      deletedAt: { $ne: null },
    });

    return res.json({ ok: true, deletedCount: idsToDelete.length });
  } catch (err) {
    return res.status(500).json({ error: "HARD_DELETE_FAILED", message: err.message });
  }
};

exports.emptyTrash = async (req, res) => {
  try {
    if (!req.user?._id) return res.status(401).json({ error: "UNAUTHORIZED" });

    const ownerId = req.user._id;

    const trashedItems = await FileItem.find({
      ownerId,
      deletedAt: { $ne: null },
    }).select("_id type storageRelPath");

    for (const item of trashedItems) {
      if (item.type === "file") {
        await deletePhysicalFileIfNeeded(item);
      }
    }

    const result = await FileItem.deleteMany({
      ownerId,
      deletedAt: { $ne: null },
    });

    return res.json({ ok: true, deletedCount: result.deletedCount || 0 });
  } catch (err) {
    return res.status(500).json({ error: "EMPTY_TRASH_FAILED", message: err.message });
  }
};


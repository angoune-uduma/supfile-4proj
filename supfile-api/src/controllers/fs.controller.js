import fs from "fs";
import path from "path";
import { FileItem } from "../models/FileItem.js";
import { getExt, getMimeType, isPreviewable, isStreamable } from "../services/mime.service.js";
import { buildStoredFilename, ensureUserRoot, deletePhysicalFile, getUserRoot } from "../services/storage.service.js";
import { streamFolderAsZip } from "../services/zip.service.js";

// Helpers
function toObjectIdOrNull(value) {
  if (!value || value === "root") return null;
  return value;
}

export async function listItems(req, res) {
  const ownerId = req.user.id;
  const parentId = toObjectIdOrNull(req.query.parentId);

  const items = await FileItem.find({
    ownerId,
    parentId,
    isDeleted: false
  }).sort({ kind: 1, name: 1 });

  res.json({ items });
}

export async function createFolder(req, res) {
  const ownerId = req.user.id;
  const { name, parentId } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ error: { message: "Folder name required", status: 400 } });
  }

  const folder = await FileItem.create({
    ownerId,
    kind: "folder",
    name: name.trim(),
    parentId: toObjectIdOrNull(parentId)
  });

  res.status(201).json({ folder });
}

export async function renameOrMoveItem(req, res) {
  const ownerId = req.user.id;
  const { id } = req.params;
  const { name, parentId } = req.body;

  const item = await FileItem.findOne({ _id: id, ownerId });
  if (!item) return res.status(404).json({ error: { message: "Item not found", status: 404 } });

  if (typeof name === "string" && name.trim()) item.name = name.trim();
  if (parentId !== undefined) item.parentId = toObjectIdOrNull(parentId);

  await item.save();
  res.json({ item });
}

export async function trashItem(req, res) {
  const ownerId = req.user.id;
  const { id } = req.params;

  const item = await FileItem.findOne({ _id: id, ownerId, isDeleted: false });
  if (!item) return res.status(404).json({ error: { message: "Item not found", status: 404 } });

  item.isDeleted = true;
  item.deletedAt = new Date();
  await item.save();

  // Option : si folder -> tout passer en isDeleted (récursif simple BFS)
  if (item.kind === "folder") {
    const queue = [item._id];
    while (queue.length) {
      const current = queue.shift();
      const children = await FileItem.find({ ownerId, parentId: current, isDeleted: false });
      for (const c of children) {
        c.isDeleted = true;
        c.deletedAt = new Date();
        await c.save();
        if (c.kind === "folder") queue.push(c._id);
      }
    }
  }

  res.json({ ok: true });
}

export async function listTrash(req, res) {
  const ownerId = req.user.id;
  const items = await FileItem.find({ ownerId, isDeleted: true }).sort({ deletedAt: -1 });
  res.json({ items });
}

export async function restoreFromTrash(req, res) {
  const ownerId = req.user.id;
  const { id } = req.params;

  const item = await FileItem.findOne({ _id: id, ownerId, isDeleted: true });
  if (!item) return res.status(404).json({ error: { message: "Item not in trash", status: 404 } });

  item.isDeleted = false;
  item.deletedAt = null;
  await item.save();

  // Si folder -> restore enfants (simple)
  if (item.kind === "folder") {
    const queue = [item._id];
    while (queue.length) {
      const current = queue.shift();
      const children = await FileItem.find({ ownerId, parentId: current, isDeleted: true });
      for (const c of children) {
        c.isDeleted = false;
        c.deletedAt = null;
        await c.save();
        if (c.kind === "folder") queue.push(c._id);
      }
    }
  }

  res.json({ ok: true });
}

export async function permanentlyDelete(req, res) {
  const ownerId = req.user.id;
  const { id } = req.params;

  const item = await FileItem.findOne({ _id: id, ownerId });
  if (!item) return res.status(404).json({ error: { message: "Item not found", status: 404 } });

  // si file, supprimer physiquement
  if (item.kind === "file" && item.path) {
    await deletePhysicalFile(item.path);
  }

  // si folder, supprimer récursif (fichiers physiques aussi)
  if (item.kind === "folder") {
    const queue = [item._id];
    while (queue.length) {
      const current = queue.shift();
      const children = await FileItem.find({ ownerId, parentId: current });
      for (const c of children) {
        if (c.kind === "file" && c.path) await deletePhysicalFile(c.path);
        await FileItem.deleteOne({ _id: c._id });
        if (c.kind === "folder") queue.push(c._id);
      }
    }
  }

  await FileItem.deleteOne({ _id: item._id });
  res.json({ ok: true });
}

export async function uploadFile(req, res) {
  const ownerId = req.user.id;
  const parentId = toObjectIdOrNull(req.body.parentId);
  const f = req.file;

  if (!f) {
    return res.status(400).json({ error: { message: "No file provided", status: 400 } });
  }

  // créer d'abord l'item DB pour avoir l'id
  const mimeType = f.mimetype || getMimeType(f.originalname);
  const ext = getExt(f.originalname);

  const item = await FileItem.create({
    ownerId,
    kind: "file",
    name: f.originalname,
    parentId,
    mimeType,
    ext,
    size: f.size,
    path: null
  });

  await ensureUserRoot(ownerId);
  const storedName = buildStoredFilename(item._id, f.originalname);
  const destPath = path.join(getUserRoot(ownerId), storedName);

  // déplacer du tmp vers dest
  fs.renameSync(f.path, destPath);

  item.path = destPath;
  await item.save();

  res.status(201).json({ file: item });
}

export async function downloadFile(req, res) {
  const ownerId = req.user.id;
  const { id } = req.params;

  const item = await FileItem.findOne({ _id: id, ownerId, kind: "file", isDeleted: false });
  if (!item || !item.path) return res.status(404).json({ error: { message: "File not found", status: 404 } });

  res.setHeader("Content-Type", item.mimeType || "application/octet-stream");
  res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(item.name)}"`);

  fs.createReadStream(item.path).pipe(res);
}

export async function previewFile(req, res) {
  const ownerId = req.user.id;
  const { id } = req.params;

  const item = await FileItem.findOne({ _id: id, ownerId, kind: "file", isDeleted: false });
  if (!item || !item.path) return res.status(404).json({ error: { message: "File not found", status: 404 } });

  const mimeType = item.mimeType || "application/octet-stream";
  if (!isPreviewable(mimeType)) {
    return res.status(415).json({ error: { message: "File not previewable", status: 415 } });
  }

  res.setHeader("Content-Type", mimeType);
  // inline pour afficher dans navigateur
  res.setHeader("Content-Disposition", `inline; filename="${encodeURIComponent(item.name)}"`);

  fs.createReadStream(item.path).pipe(res);
}

export async function streamMedia(req, res) {
  const ownerId = req.user.id;
  const { id } = req.params;

  const item = await FileItem.findOne({ _id: id, ownerId, kind: "file", isDeleted: false });
  if (!item || !item.path) return res.status(404).json({ error: { message: "File not found", status: 404 } });

  const mimeType = item.mimeType || "application/octet-stream";
  if (!isStreamable(mimeType)) {
    return res.status(415).json({ error: { message: "File not streamable", status: 415 } });
  }

  const stat = fs.statSync(item.path);
  const fileSize = stat.size;
  const range = req.headers.range;

  if (!range) {
    // fallback: stream complet
    res.setHeader("Content-Type", mimeType);
    res.setHeader("Content-Length", fileSize);
    fs.createReadStream(item.path).pipe(res);
    return;
  }

  // Exemple "bytes=0-"
  const parts = range.replace(/bytes=/, "").split("-");
  const start = parseInt(parts[0], 10);
  const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

  if (Number.isNaN(start) || Number.isNaN(end) || start > end) {
    return res.status(416).end();
  }

  const chunkSize = end - start + 1;

  res.writeHead(206, {
    "Content-Range": `bytes ${start}-${end}/${fileSize}`,
    "Accept-Ranges": "bytes",
    "Content-Length": chunkSize,
    "Content-Type": mimeType
  });

  fs.createReadStream(item.path, { start, end }).pipe(res);
}

export async function zipFolder(req, res) {
  const ownerId = req.user.id;
  const { id } = req.params;

  await streamFolderAsZip({ res, ownerId, folderId: id });
}
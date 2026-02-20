import archiver from "archiver";
import fs from "fs";
import path from "path";
import { FileItem } from "../models/FileItem.js";

async function collectFolderTree(ownerId, folderId) {
  const items = await FileItem.find({
    ownerId,
    isDeleted: false,
    $or: [{ _id: folderId }, { parentId: folderId }]
  }).lean();

  // On va faire une collecte récursive
  const result = [];
  const queue = [folderId];

  while (queue.length) {
    const current = queue.shift();

    const children = await FileItem.find({
      ownerId,
      parentId: current,
      isDeleted: false
    }).lean();

    for (const c of children) {
      result.push(c);
      if (c.kind === "folder") queue.push(c._id);
    }
  }

  return result;
}

async function buildPathMap(ownerId, rootFolder) {
  // calcule le chemin relatif de chaque item dans le zip
  const map = new Map();
  map.set(String(rootFolder._id), rootFolder.name);

  const all = await collectFolderTree(ownerId, rootFolder._id);

  // on reconstruit les chemins en remontant parentId
  const byId = new Map([[String(rootFolder._id), rootFolder], ...all.map((x) => [String(x._id), x])]);

  function getRelPath(item) {
    if (!item.parentId) return item.name;
    const pid = String(item.parentId);
    if (pid === String(rootFolder._id)) return path.join(rootFolder.name, item.name);

    const parent = byId.get(pid);
    if (!parent) return path.join(rootFolder.name, item.name);

    return path.join(getRelPath(parent), item.name);
  }

  for (const it of all) {
    map.set(String(it._id), getRelPath(it));
  }

  return { all, byId, map };
}

export async function streamFolderAsZip({ res, ownerId, folderId }) {
  const rootFolder = await FileItem.findOne({
    _id: folderId,
    ownerId,
    kind: "folder",
    isDeleted: false
  });

  if (!rootFolder) {
    const err = new Error("Folder not found");
    err.statusCode = 404;
    throw err;
  }

  const archive = archiver("zip", { zlib: { level: 9 } });

  res.setHeader("Content-Type", "application/zip");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${encodeURIComponent(rootFolder.name)}.zip"`
  );

  archive.on("error", (err) => {
    throw err;
  });

  archive.pipe(res);

  const { all, map } = await buildPathMap(ownerId, rootFolder);

  for (const it of all) {
    const rel = map.get(String(it._id));
    if (it.kind === "folder") {
      archive.append("", { name: rel.endsWith("/") ? rel : rel + "/" });
    } else if (it.kind === "file" && it.path) {
      if (fs.existsSync(it.path)) {
        archive.file(it.path, { name: rel });
      }
    }
  }

  await archive.finalize();
}
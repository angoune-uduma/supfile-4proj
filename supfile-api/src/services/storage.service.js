import fs from "fs";
import fsp from "fs/promises";
import path from "path";
import { env } from "../config/env.js";

export function ensureDirSync(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

export function getUserRoot(ownerId) {
  return path.join(env.STORAGE_ROOT, "users", ownerId);
}

export function buildStoredFilename(fileId, originalName) {
  // évite collisions + garde le nom original visible
  const safeName = (originalName || "file")
    .replaceAll("/", "_")
    .replaceAll("\\", "_");
  return `${fileId}__${safeName}`;
}

export async function ensureUserRoot(ownerId) {
  const dir = getUserRoot(ownerId);
  await fsp.mkdir(dir, { recursive: true });
  return dir;
}

export async function deletePhysicalFile(filePath) {
  try {
    await fsp.unlink(filePath);
  } catch (e) {
    // ignorer si déjà supprimé
  }
}
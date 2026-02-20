import path from "path";
import mime from "mime-types";

export function getExt(filename) {
  const ext = path.extname(filename || "").toLowerCase();
  return ext.startsWith(".") ? ext.slice(1) : ext;
}

export function getMimeType(filename) {
  return mime.lookup(filename) || "application/octet-stream";
}

export function isTextMime(mimeType) {
  return (
    mimeType.startsWith("text/") ||
    mimeType === "application/json" ||
    mimeType === "application/xml"
  );
}

export function isPreviewable(mimeType) {
  // images, pdf, texte
  return (
    mimeType.startsWith("image/") ||
    mimeType === "application/pdf" ||
    isTextMime(mimeType)
  );
}

export function isStreamable(mimeType) {
  return mimeType.startsWith("video/") || mimeType.startsWith("audio/");
}
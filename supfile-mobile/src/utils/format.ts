import { FileItem } from "../services/files";

/**
 * Formate un nombre de bytes en taille lisible (B, KB, MB, GB).
 */
export function formatSize(bytes: number): string {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

/**
 * Formate un nombre de gigaoctets en chaîne lisible.
 */
export function formatGb(n: number): string {
  return `${n.toFixed(1)} Go`;
}

/**
 * Retourne un emoji représentant le type d'un fichier ou dossier.
 */
export function getEmoji(item: FileItem): string {
  if (item.type === "folder") return "📁";
  if (item.mimeType?.startsWith("image/")) return "🖼️";
  if (item.mimeType?.startsWith("video/")) return "🎬";
  if (item.mimeType?.startsWith("audio/")) return "🎵";
  if (item.mimeType === "application/pdf") return "📄";
  if (item.mimeType?.startsWith("text/")) return "📝";
  return "📦";
}

/**
 * Décode un nom de fichier encodé en URI.
 */
export function decodeName(name: string): string {
  try {
    return decodeURIComponent(name);
  } catch {
    return name;
  }
}

/**
 * Formate une date ISO en date locale française (JJ/MM/AAAA).
 */
export function formatDate(value?: string): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

/**
 * Formate une date ISO en date + heure locale complète.
 */
export function formatDateTime(value?: string): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}
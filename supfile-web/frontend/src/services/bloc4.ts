//frontend/src/pages/services/bloc4.ts
import { apiFetch } from "./api";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

function pickError(data: any, fallback: string) {
  return data?.error || data?.message || fallback;
}

export async function getDashboardUsage() {
  const { res, data } = await apiFetch("/dashboard/usage", { method: "GET" });
  if (!res.ok) throw new Error(pickError(data, "Get dashboard usage failed"));
  return data;
}

export async function getDashboardRecent(limit = 5) {
  const { res, data } = await apiFetch(`/dashboard/recent?limit=${limit}`, { method: "GET" });
  if (!res.ok) throw new Error(pickError(data, "Get dashboard recent failed"));
  return Array.isArray(data?.items) ? data.items : [];
}

export async function createPublicShare(payload: {
  nodeId: string;
  expiresAt?: string;
  password?: string;
}) {
  const { res, data } = await apiFetch("/shares/public", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  if (!res.ok) throw new Error(pickError(data, "Create public share failed"));
  return data.share;
}

export async function createInternalShare(payload: {
  nodeId: string;
  nodeType: "file" | "folder";
  toEmail: string;
}) {
  const { res, data } = await apiFetch("/shares/internal", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  if (!res.ok) throw new Error(pickError(data, "Create internal share failed"));
  return data.share;
}

export async function getSharesWithMe() {
  const { res, data } = await apiFetch("/shares/with-me", { method: "GET" });
  if (!res.ok) throw new Error(pickError(data, "Get shares with me failed"));
  return Array.isArray(data?.items) ? data.items : [];
}

// ---------- public share ----------

export async function getPublicShareMeta(token: string) {
  const res = await fetch(`${API_URL}/shares/public/${token}`, {
    method: "GET",
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(pickError(data, "Public share meta failed"));
  }

  return data;
}

export async function accessPublicShare(token: string, password?: string) {
  const res = await fetch(`${API_URL}/shares/public/${token}/access`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ password }),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(pickError(data, "Public share access failed"));
  }

  return {
    ...data,
    previewUrl: data?.previewUrl ? `${API_URL}${data.previewUrl}` : null,
    downloadUrl: data?.downloadUrl ? `${API_URL}${data.downloadUrl}` : null,
  };
}
export async function getTrashCount() {
  const { res, data } = await apiFetch("/dashboard/trash-count", { method: "GET" });
  if (!res.ok) throw new Error(pickError(data, "Get trash count failed"));
  return Number(data?.count || 0);
}


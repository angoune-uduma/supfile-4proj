//frontend/src/services/files.ts
import { apiFetch, getAccessToken } from "./api";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

export async function listFiles(parentId?: string | null) {
  const query = parentId ? `?parentId=${encodeURIComponent(parentId)}` : "";
  return apiFetch(`/files${query}`, { method: "GET" });
}

export async function createFolder(name: string, parentId?: string | null) {
  return apiFetch("/files/folders", {
    method: "POST",
    body: JSON.stringify({
      name,
      parentId: parentId || null,
    }),
  });
}

export async function renameItem(id: string, name: string) {
  return apiFetch(`/files/${id}/rename`, {
    method: "PATCH",
    body: JSON.stringify({ name }),
  });
}

export async function moveItem(id: string, parentId?: string | null) {
  return apiFetch(`/files/${id}/move`, {
    method: "PATCH",
    body: JSON.stringify({ parentId: parentId || null }),
  });
}

export async function softDeleteItem(id: string) {
  return apiFetch(`/files/${id}`, {
    method: "DELETE",
  });
}

export async function restoreItem(id: string) {
  return apiFetch(`/files/${id}/restore`, {
    method: "POST",
  });
}

export async function getBreadcrumbs(id: string) {
  return apiFetch(`/files/breadcrumbs/${id}`, { method: "GET" });
}

export async function uploadFile(
  file: File,
  parentId?: string | null,
  onProgress?: (percent: number) => void
): Promise<{ res: { ok: boolean; status: number }; data: any }> {
  const token = getAccessToken();

  const formData = new FormData();
  formData.append("file", file);

  if (parentId) {
    formData.append("parentId", parentId);
  }

  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${API_URL}/files`);

    if (token) {
      xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    }

    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable || !onProgress) return;
      const percent = Math.round((event.loaded / event.total) * 100);
      onProgress(percent);
    };

    xhr.onload = () => {
      let data: any = {};
      try {
        data = JSON.parse(xhr.responseText || "{}");
      } catch {
        data = {};
      }

      resolve({
        res: {
          ok: xhr.status >= 200 && xhr.status < 300,
          status: xhr.status,
        },
        data,
      });
    };

    xhr.onerror = () => {
      resolve({
        res: {
          ok: false,
          status: xhr.status || 0,
        },
        data: { error: "UPLOAD_NETWORK_ERROR" },
      });
    };

    xhr.send(formData);
  });
}

/* ===========================
   PREVIEW / DOWNLOAD via BLOB
   =========================== */

async function fetchFileBlob(path: string): Promise<Blob> {
  const token = getAccessToken();

  const res = await fetch(`${API_URL}${path}`, {
    method: "GET",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  if (!res.ok) {
    let message = "Impossible de récupérer le fichier.";
    try {
      const data = await res.json();
      message = data?.error || message;
    } catch {
      // ignore
    }
    throw new Error(message);
  }

  return res.blob();
}

export async function getPreviewBlob(fileId: string) {
  return fetchFileBlob(`/files/${fileId}/preview`);
}

export async function getDownloadBlob(fileId: string) {
  return fetchFileBlob(`/files/${fileId}/download`);
}

export async function listTrash() {
  return apiFetch("/files/trash", { method: "GET" });
}

export async function hardDeleteItem(id: string) {
  return apiFetch(`/files/${id}/hard`, {
    method: "DELETE",
  });
}

export async function emptyTrash() {
  return apiFetch("/files/trash/empty", {
    method: "DELETE",
  });
}
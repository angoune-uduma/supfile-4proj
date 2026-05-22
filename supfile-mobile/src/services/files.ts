import { api } from "./api";

export type FileItem = {
  id: string;
  originalName: string;
  mimeType: string | null;
  type: "file" | "folder";
  size: number;
  parentId: string | null;
  createdAt: string;
  updatedAt: string;
  isShared?: boolean;
  sharedBy?: string | null;
  sharedAt?: string | null;
};

export type BreadcrumbItem = {
  id: string;
  name: string;
};

export async function listFiles(parentId?: string | null) {
  const query = parentId ? `?parentId=${encodeURIComponent(parentId)}` : "";
  const res = await api.get(`/files${query}`);
  return res.data as {
    ok: boolean;
    parentId: string | null;
    items: FileItem[];
  };
}

export async function getBreadcrumbs(id: string) {
  const res = await api.get(`/files/breadcrumbs/${id}`);
  return res.data as {
    ok: boolean;
    path: BreadcrumbItem[];
  };
}

export async function createFolder(name: string, parentId?: string | null) {
  const res = await api.post("/files/folders", {
    name,
    parentId: parentId || null,
  });
  return res.data;
}

export async function renameItem(id: string, name: string) {
  const res = await api.patch(`/files/${id}/rename`, { name });
  return res.data;
}

export async function softDeleteItem(id: string) {
  const res = await api.delete(`/files/${id}`);
  return res.data;
}

export async function moveItem(id: string, parentId?: string | null) {
  const res = await api.patch(`/files/${id}/move`, {
    parentId: parentId || null,
  });
  return res.data;
}
export async function uploadFile(
  file: {
    uri: string;
    name: string;
    mimeType?: string | null;
  },
  parentId?: string | null,
  onProgress?: (percent: number) => void
) {
  const formData = new FormData();

  formData.append("file", {
    uri: file.uri,
    name: file.name,
    type: file.mimeType || "application/octet-stream",
  } as any);

  if (parentId) {
    formData.append("parentId", parentId);
  }

  const res = await api.post("/files", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
    onUploadProgress: (progressEvent) => {
      const total = progressEvent.total ?? 0;
      const loaded = progressEvent.loaded ?? 0;

      if (!total) return;

      const percent = Math.round((loaded / total) * 100);
      onProgress?.(percent);
    },
  });

  return res.data;
}
export async function getPreviewText(id: string) {
  const res = await api.get(`/files/${id}/preview`, {
    responseType: "text",
  });
  return res.data as string;
}

export function getDownloadUrl(id: string) {
  return `${api.defaults.baseURL}/files/${id}/download`;
}

export function getPreviewUrl(id: string) {
  return `${api.defaults.baseURL}/files/${id}/preview`;
}

export function getFolderDownloadUrl(id: string) {
  return `${api.defaults.baseURL}/files/${id}/download-folder`;
}

export async function listTrash() {
  const res = await api.get("/files/trash");
  return res.data as {
    ok: boolean;
    items: FileItem[];
  };
}

export async function restoreItem(id: string) {
  const res = await api.post(`/files/${id}/restore`);
  return res.data;
}

export async function hardDeleteItem(id: string) {
  const res = await api.delete(`/files/${id}/hard`);
  return res.data;
}

export async function emptyTrash() {
  const res = await api.delete("/files/trash/empty");
  return res.data;
}

export async function searchFiles(q: string, type: "all" | "file" | "folder" = "all") {
  const params = new URLSearchParams();

  params.set("q", q);

  if (type !== "all") {
    params.set("type", type);
  }

  const res = await api.get(`/files/search?${params.toString()}`);

  return res.data as {
    ok: boolean;
    items: FileItem[];
  };
}
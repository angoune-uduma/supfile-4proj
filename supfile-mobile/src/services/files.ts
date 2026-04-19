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
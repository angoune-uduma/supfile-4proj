import { apiFetch } from "./api";

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

export async function uploadFile(file: File, parentId?: string | null) {
  const formData = new FormData();
  formData.append("file", file);

  if (parentId) {
    formData.append("parentId", parentId);
  }

  return apiFetch("/files", {
    method: "POST",
    body: formData,
    isFormData: true,
  });
}
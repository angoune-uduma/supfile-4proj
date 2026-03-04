import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

export function listFiles(token, parentId = null) {
  return axios.get(`${API_URL}/files`, {
    headers: { Authorization: `Bearer ${token}` },
    params: parentId ? { parentId } : {},
  });
}

export function uploadFile(token, file, parentId = null, onProgress) {
  const form = new FormData();
  form.append("file", file);
  if (parentId) form.append("parentId", parentId);

  return axios.post(`${API_URL}/files`, form, {
    headers: { Authorization: `Bearer ${token}` },
    onUploadProgress: (evt) => {
      if (!onProgress) return;
      const percent = Math.round((evt.loaded * 100) / (evt.total || 1));
      onProgress(percent);
    },
  });
}

export function getPreviewUrl(fileId) {
  return `${API_URL}/files/${fileId}/preview`;
}

export function downloadFile(token, fileId) {
  return axios.get(`${API_URL}/files/${fileId}/download`, {
    headers: { Authorization: `Bearer ${token}` },
    responseType: "blob",
  });
}
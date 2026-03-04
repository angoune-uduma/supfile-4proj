import { useEffect, useState } from "react";
import { listFiles, uploadFile, getPreviewUrl, downloadFile } from "../services/files.api";

export default function MyFilesPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploadPct, setUploadPct] = useState(0);
  const [preview, setPreview] = useState(null); // { id, name, mime }
  const token = localStorage.getItem("accessToken"); // adapte si tu utilises un context

  async function refresh() {
    setLoading(true);
    try {
      const res = await listFiles(token);
      setItems(res.data.items || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onPickFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadPct(0);
    await uploadFile(token, file, null, setUploadPct);
    e.target.value = "";
    await refresh();
  }

  async function onDownload(item) {
    const res = await downloadFile(token, item.id);
    const blobUrl = window.URL.createObjectURL(res.data);

    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = item.originalName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(blobUrl);
  }

  return (
    <div style={{ padding: 24 }}>
      <h2>My Files</h2>

      {!token && (
        <p style={{ color: "crimson" }}>
          Tu n’es pas connecté (token manquant). Connecte-toi puis reviens ici.
        </p>
      )}

      <div style={{ margin: "16px 0" }}>
        <input type="file" onChange={onPickFile} />
        {uploadPct > 0 && uploadPct < 100 && (
          <div style={{ marginTop: 8 }}>Upload: {uploadPct}%</div>
        )}
      </div>

      {loading ? (
        <p>Chargement...</p>
      ) : items.length === 0 ? (
        <p>Aucun fichier.</p>
      ) : (
        <table width="100%" cellPadding="10" style={{ borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th align="left">Nom</th>
              <th align="left">Type</th>
              <th align="right">Taille</th>
              <th align="left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it) => (
              <tr key={it.id} style={{ borderTop: "1px solid #ddd" }}>
                <td>{it.originalName}</td>
                <td>{it.mimeType}</td>
                <td align="right">{Math.round(it.size / 1024)} KB</td>
                <td>
                  <button onClick={() => setPreview(it)}>Preview</button>{" "}
                  <button onClick={() => onDownload(it)}>Download</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {preview && (
        <div style={{ marginTop: 24, padding: 16, border: "1px solid #ddd" }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <strong>{preview.originalName}</strong>
            <button onClick={() => setPreview(null)}>Fermer</button>
          </div>

          <div style={{ marginTop: 12 }}>
            {/* Preview simple */}
            {preview.mimeType.startsWith("image/") && (
              <img
                src={getPreviewUrl(preview.id)}
                alt={preview.originalName}
                style={{ maxWidth: "100%", height: "auto" }}
              />
            )}

            {preview.mimeType === "application/pdf" && (
              <iframe
                title="pdf"
                src={getPreviewUrl(preview.id)}
                style={{ width: "100%", height: 600, border: 0 }}
              />
            )}

            {preview.mimeType.startsWith("video/") && (
              <video controls style={{ width: "100%" }} src={getPreviewUrl(preview.id)} />
            )}

            {preview.mimeType.startsWith("audio/") && (
              <audio controls style={{ width: "100%" }} src={getPreviewUrl(preview.id)} />
            )}

            {/* DOCX etc : pas preview natif */}
            {!preview.mimeType.startsWith("image/") &&
              preview.mimeType !== "application/pdf" &&
              !preview.mimeType.startsWith("video/") &&
              !preview.mimeType.startsWith("audio/") && (
                <p>
                  Prévisualisation non supportée pour ce type. Utilise “Download”.
                </p>
              )}
          </div>
        </div>
      )}
    </div>
  );
}
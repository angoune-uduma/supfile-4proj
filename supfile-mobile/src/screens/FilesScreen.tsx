import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { WebView } from "react-native-webview";
import { Video, ResizeMode } from "expo-av";
import {
  ActivityIndicator, Alert, FlatList, Modal, Pressable,
  RefreshControl, ScrollView, Share, Text, TextInput, View,
} from "react-native";
import Screen from "../components/Screen";
import Panel from "../components/Panel";
import { useThemeMode } from "../theme/ThemeContext";
import { buildTheme } from "../theme/theme";
import { createPublicShare, createInternalShare } from "../services/shares";
import { getAccessToken } from "../services/secureStore";
import { formatSize, getEmoji, decodeName } from "../utils/format";
import {
  BreadcrumbItem, FileItem, createFolder, getBreadcrumbs, getDownloadUrl, getFolderDownloadUrl, getPreviewText, getPreviewUrl,
  listFiles, moveItem, renameItem, searchFiles, softDeleteItem, uploadFile,
} from "../services/files";

type TypeFilter = "all" | "file" | "folder";
type CategoryFilter = "all" | "image" | "video" | "audio" | "document" | "other";
type DateFilter = "all" | "today" | "week" | "month";

function parseExpirationDate(value: string) {
  const match = value.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2})$/);
  if (!match) return null;
  const [, d, m, y, h, min] = match.map(Number);
  if (m < 1 || m > 12 || d < 1 || d > 31 || h > 23 || min > 59) return null;
  const date = new Date(y, m - 1, d, h, min, 0, 0);
  if (isNaN(date.getTime())) return null;
  if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) return null;
  return date;
}
function validateSharePassword(password: string) {
  const p = password.trim();
  if (!p) return null;
  if (p.length < 8) return "Le mot de passe doit contenir au moins 8 caractères.";
  if (!/[A-Z]/.test(p)) return "Le mot de passe doit contenir au moins une majuscule.";
  if (!/[a-z]/.test(p)) return "Le mot de passe doit contenir au moins une minuscule.";
  if (!/[0-9]/.test(p)) return "Le mot de passe doit contenir au moins un chiffre.";
  if (!/[^A-Za-z0-9]/.test(p)) return "Le mot de passe doit contenir au moins un caractère spécial.";
  return null;
}
function getCategory(item: FileItem): CategoryFilter {
  if (item.type === "folder") return "other";
  const mime = item.mimeType || "";
  const name = item.originalName.toLowerCase();
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("video/")) return "video";
  if (mime.startsWith("audio/")) return "audio";
  if (mime === "application/pdf" || mime.startsWith("text/") || mime.includes("word") ||
    mime.includes("document") || mime.includes("sheet") || mime.includes("presentation") ||
    [".pdf",".txt",".md",".doc",".docx",".xls",".xlsx",".ppt",".pptx"].some(ext => name.endsWith(ext)))
    return "document";
  return "other";
}
function matchesDateFilter(item: FileItem, filter: DateFilter) {
  if (filter === "all") return true;
  const date = new Date(item.updatedAt || item.createdAt);
  if (isNaN(date.getTime())) return false;
  const now = new Date();
  if (filter === "today") return date.toDateString() === now.toDateString();
  if (filter === "week") { const d = new Date(); d.setDate(now.getDate() - 7); return date >= d; }
  if (filter === "month") return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
  return true;
}

function getUploadErrorMessage(e: any) {
  const backendError =
    e?.response?.data?.error ||
    e?.response?.data?.message ||
    e?.message;

  if (backendError === "STORAGE_QUOTA_EXCEEDED") {
    return "Quota de stockage dépassé. Supprime des fichiers ou vide la corbeille avant d’uploader.";
  }

  if (backendError === "FILE_TOO_LARGE") {
    const maxMb = e?.response?.data?.maxMb || 50;
    return `Fichier trop volumineux. Taille maximale autorisée : ${maxMb} Mo.`;
  }

  if (backendError === "MISSING_FILE") {
    return "Aucun fichier sélectionné.";
  }

  if (backendError === "INVALID_PARENT_FOLDER") {
    return "Le dossier de destination est invalide.";
  }

  if (backendError === "UNAUTHORIZED") {
    return "Session expirée. Reconnecte-toi puis réessaie.";
  }

  if (backendError === "Network Error" || backendError === "NETWORK_ERROR") {
    return "Impossible de contacter le serveur. Vérifie l’adresse API et ta connexion.";
  }

  return backendError || "Upload impossible.";
}

export default function FilesScreen() {
  const { mode } = useThemeMode();
  const theme = buildTheme(mode);
  const c = theme.colors;

  const inputStyle = {
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
    paddingHorizontal: 14 as const,
    paddingVertical: 12 as const,
    borderRadius: 14 as const,
    color: c.text,
  };
  const chipBase = {
    paddingHorizontal: 12 as const,
    paddingVertical: 8 as const,
    borderRadius: 999 as const,
    borderWidth: 1 as const,
  };
  const btnSecondary = {
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 12 as const,
    paddingVertical: 10 as const,
    alignItems: "center" as const,
  };

  const [items, setItems] = useState<FileItem[]>([]);
  const [currentParentId, setCurrentParentId] = useState<string | null>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [folderName, setFolderName] = useState("");
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameValue, setRenameValue] = useState("");
  const [renameTarget, setRenameTarget] = useState<FileItem | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewItem, setPreviewItem] = useState<FileItem | null>(null);
  const [previewTextContent, setPreviewTextContent] = useState("");
  const [previewToken, setPreviewToken] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [moveOpen, setMoveOpen] = useState(false);
  const [moveTarget, setMoveTarget] = useState<FileItem | null>(null);
  const [moveFolders, setMoveFolders] = useState<FileItem[]>([]);
  const [moveCurrentParentId, setMoveCurrentParentId] = useState<string | null>(null);
  const [moveBreadcrumbs, setMoveBreadcrumbs] = useState<BreadcrumbItem[]>([]);
  const [moveLoading, setMoveLoading] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [shareTarget, setShareTarget] = useState<FileItem | null>(null);
  const [shareExpiresAt, setShareExpiresAt] = useState("");
  const [sharePassword, setSharePassword] = useState("");
  const [shareToEmail, setShareToEmail] = useState("");
  const [shareLink, setShareLink] = useState("");
  const [shareLoading, setShareLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadingFileName, setUploadingFileName] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all");
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [searchResults, setSearchResults] = useState<FileItem[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  const visibleItems = useMemo(() => {
    const baseItems = searchTerm.trim() ? searchResults : items;
    return baseItems
      .filter((item) => {
        return (
          (typeFilter === "all" ? true : item.type === typeFilter) &&
          (categoryFilter === "all"
            ? true
            : item.type === "file" && getCategory(item) === categoryFilter) &&
          matchesDateFilter(item, dateFilter)
        );
      })
      .sort((a, b) => {
        if (a.type === "folder" && b.type !== "folder") return -1;
        if (a.type !== "folder" && b.type === "folder") return 1;
        return decodeName(a.originalName).localeCompare(decodeName(b.originalName));
      });
  }, [items, searchResults, searchTerm, typeFilter, categoryFilter, dateFilter]);

  async function loadFolder(parentId?: string | null, isRefresh = false) {
    try {
      setError(null);
      isRefresh ? setRefreshing(true) : setLoading(true);
      const data = await listFiles(parentId ?? null);
      setItems(data.items || []);
      setCurrentParentId(parentId ?? null);
      if (parentId) { const bc = await getBreadcrumbs(parentId); setBreadcrumbs(bc.path || []); }
      else setBreadcrumbs([]);
    } catch (e: any) {
      setError(e?.response?.data?.error || e?.response?.data?.message || e?.message || "Impossible de charger les fichiers.");
    } finally { setLoading(false); setRefreshing(false); }
  }

  useEffect(() => { loadFolder(null); }, []);
  useFocusEffect(useCallback(() => { loadFolder(currentParentId); }, [currentParentId]));

  useEffect(() => {
    const q = searchTerm.trim();
    if (!q) { setSearchResults([]); setSearchLoading(false); return; }
    const timeout = setTimeout(async () => {
      try {
        setSearchLoading(true);
        setError(null);
        const data = await searchFiles(q, typeFilter);
        setSearchResults(data.items || []);
      } catch (e: any) {
        setSearchResults([]);
        setError(e?.response?.data?.error || e?.response?.data?.message || e?.message || "Recherche impossible.");
      } finally { setSearchLoading(false); }
    }, 300);
    return () => clearTimeout(timeout);
  }, [searchTerm, typeFilter]);

  const isTextFile = (item: FileItem) => item.mimeType?.startsWith("text/") || item.mimeType === "application/json";
  const isImageFile = (item: FileItem) => item.mimeType?.startsWith("image/") || false;
  const isPdfFile = (item: FileItem) => item.mimeType === "application/pdf";
  const isVideoFile = (item: FileItem) => item.mimeType?.startsWith("video/") || false;
  const isAudioFile = (item: FileItem) => item.mimeType?.startsWith("audio/") || false;
  const isPreviewable = (item: FileItem) => isTextFile(item) || isImageFile(item) || isPdfFile(item) || isVideoFile(item) || isAudioFile(item);

  async function handleDownload(item: FileItem) {
    try {
      setDownloading(true);
      const token = await getAccessToken();
      if (!token) { Alert.alert("Erreur", "Session expirée."); return; }
      const safeName = decodeName(item.originalName).replace(/[\\/:*?"<>|]+/g, "_");
      const fileName = item.type === "folder" ? `${safeName}.zip` : safeName || `download-${item.id}`;
      const url = item.type === "folder" ? getFolderDownloadUrl(item.id) : getDownloadUrl(item.id);
      const result = await FileSystem.downloadAsync(url, `${FileSystem.cacheDirectory}${fileName}`, {
        headers: { Authorization: `Bearer ${token}`, "ngrok-skip-browser-warning": "true" }
      });
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) await Sharing.shareAsync(result.uri, { mimeType: item.type === "folder" ? "application/zip" : item.mimeType || "application/octet-stream", dialogTitle: decodeName(item.originalName) });
      else Alert.alert("Téléchargement terminé", `Fichier enregistré : ${result.uri}`);
    } catch (e: any) { Alert.alert("Erreur", e?.message || "Téléchargement impossible."); }
    finally { setDownloading(false); }
  }

  async function handlePickAndUpload() {
    try {
      setError(null);

      const result = await DocumentPicker.getDocumentAsync({
        multiple: false,
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;

      const picked = result.assets?.[0];
      if (!picked) return;

      setUploading(true);
      setUploadProgress(0);
      setUploadingFileName(decodeName(picked.name));

      await uploadFile(
        {
          uri: picked.uri,
          name: picked.name,
          mimeType: picked.mimeType,
        },
        currentParentId,
        (p) => setUploadProgress(p)
      );

      await loadFolder(currentParentId);
      Alert.alert("Succès", "Fichier uploadé avec succès.");
    } catch (e: any) {
      const message = getUploadErrorMessage(e);
      setError(message);
      Alert.alert("Erreur", message);
    } finally {
      setUploading(false);
      setUploadProgress(0);
      setUploadingFileName("");
    }
  }

  async function handleCreateFolder() {
    if (!folderName.trim()) return;
    try { await createFolder(folderName.trim(), currentParentId); setFolderName(""); setCreateOpen(false); await loadFolder(currentParentId); }
    catch (e: any) { Alert.alert("Erreur", e?.response?.data?.error || e?.response?.data?.message || "Création impossible."); }
  }

  async function handleRename() {
    if (!renameTarget || !renameValue.trim()) return;
    try { await renameItem(renameTarget.id, renameValue.trim()); setRenameOpen(false); setRenameTarget(null); setRenameValue(""); await loadFolder(currentParentId); }
    catch (e: any) { Alert.alert("Erreur", e?.response?.data?.error || e?.response?.data?.message || "Renommage impossible."); }
  }

  async function handleDelete(item: FileItem) {
    Alert.alert("Supprimer", `Voulez-vous supprimer "${decodeName(item.originalName)}" ?`, [
      { text: "Annuler", style: "cancel" },
      { text: "Supprimer", style: "destructive", onPress: async () => {
        try { await softDeleteItem(item.id); await loadFolder(currentParentId); }
        catch (e: any) { Alert.alert("Erreur", e?.response?.data?.error || e?.response?.data?.message || "Suppression impossible."); }
      }},
    ]);
  }

  function handleShare(item: FileItem) {
    if (item.isShared) { Alert.alert("Info", "Vous ne pouvez pas repartager un élément partagé avec vous."); return; }
    setShareTarget(item); setShareExpiresAt(""); setSharePassword(""); setShareToEmail(""); setShareLink(""); setShareOpen(true);
  }

  function closeShareModal() { setShareOpen(false); setShareTarget(null); setShareExpiresAt(""); setSharePassword(""); setShareToEmail(""); setShareLink(""); setShareLoading(false); }

  async function handleCreatePublicShare() {
    if (!shareTarget) return;
    const cleaned = shareExpiresAt.trim();
    let expiresAtToSend: string | undefined;
    if (cleaned) {
      const d = parseExpirationDate(cleaned);
      if (!d) { Alert.alert("Date invalide", "Utilise le format JJ/MM/AAAA HH:mm"); return; }
      if (d.getTime() <= Date.now()) { Alert.alert("Date invalide", "La date doit être dans le futur."); return; }
      expiresAtToSend = d.toISOString();
    }
    const pwErr = validateSharePassword(sharePassword);
    if (pwErr) { Alert.alert("Mot de passe trop faible", pwErr); return; }
    try {
      setShareLoading(true);
      const share = await createPublicShare({ nodeId: shareTarget.id, expiresAt: expiresAtToSend, password: sharePassword || undefined });
      const url = share?.url || "";
      setShareLink(url);
      if (url) Alert.alert("Lien créé", "Le lien public a été généré.");
    } catch (e: any) { Alert.alert("Erreur", e?.response?.data?.error || e?.message || "Création impossible."); }
    finally { setShareLoading(false); }
  }

  async function handleCreateInternalShare() {
    if (!shareTarget) return;
    const email = shareToEmail.trim().toLowerCase();
    if (!email) { Alert.alert("Erreur", "Renseigne l'email du destinataire."); return; }
    try {
      setShareLoading(true);
      await createInternalShare({ nodeId: shareTarget.id, nodeType: shareTarget.type, toEmail: email });
      Alert.alert("Succès", "Partage interne créé."); setShareToEmail("");
    } catch (e: any) { Alert.alert("Erreur", e?.message || "Partage interne impossible."); }
    finally { setShareLoading(false); }
  }

  async function handleShareGeneratedLink() {
    if (!shareLink) return;
    try { await Share.share({ message: shareLink }); }
    catch { Alert.alert("Erreur", "Impossible de partager le lien."); }
  }

  async function loadMoveFolders(parentId?: string | null) {
    try {
      setMoveLoading(true);
      const data = await listFiles(parentId ?? null);
      setMoveFolders((data.items || []).filter(i => i.type === "folder" && i.id !== moveTarget?.id));
      setMoveCurrentParentId(parentId ?? null);
      if (parentId) { const bc = await getBreadcrumbs(parentId); setMoveBreadcrumbs(bc.path || []); }
      else setMoveBreadcrumbs([]);
    } catch (e: any) { Alert.alert("Erreur", e?.response?.data?.error || e?.message || "Impossible de charger les dossiers."); }
    finally { setMoveLoading(false); }
  }

  function openMoveModal(item: FileItem) {
    if (item.isShared) { Alert.alert("Accès refusé", "Vous ne pouvez pas déplacer un élément partagé avec vous."); return; }
    setMoveTarget(item); setMoveOpen(true); loadMoveFolders(null);
  }
  function closeMoveModal() { setMoveOpen(false); setMoveTarget(null); setMoveFolders([]); setMoveCurrentParentId(null); setMoveBreadcrumbs([]); setMoveLoading(false); }

  async function handleConfirmMove(targetParentId: string | null) {
    if (!moveTarget) return;
    try { await moveItem(moveTarget.id, targetParentId); closeMoveModal(); await loadFolder(currentParentId); Alert.alert("Succès", "Élément déplacé."); }
    catch (e: any) { Alert.alert("Erreur", e?.response?.data?.error || e?.message || "Déplacement impossible."); }
  }

  function goBackMoveFolder() {
    if (moveBreadcrumbs.length >= 2) loadMoveFolders(moveBreadcrumbs[moveBreadcrumbs.length - 2].id);
    else loadMoveFolders(null);
  }

  function closePreview() { setPreviewOpen(false); setPreviewItem(null); setPreviewTextContent(""); setPreviewToken(null); setPreviewLoading(false); }

  async function handleOpen(item: FileItem) {
    if (item.type === "folder") { loadFolder(item.id); return; }
    if (!isPreviewable(item)) { Alert.alert("Info", "Ce type de fichier n'a pas de prévisualisation mobile."); return; }
    try {
      setPreviewLoading(true); setPreviewItem(item); setPreviewTextContent(""); setPreviewOpen(true);
      const token = await getAccessToken(); setPreviewToken(token);
      if (isTextFile(item)) { const text = await getPreviewText(item.id); setPreviewTextContent(text); }
    } catch (e: any) { Alert.alert("Erreur", e?.message || "Prévisualisation impossible."); setPreviewOpen(false); setPreviewItem(null); }
    finally { setPreviewLoading(false); }
  }

  function goBack() {
    if (breadcrumbs.length >= 2) loadFolder(breadcrumbs[breadcrumbs.length - 2].id);
    else loadFolder(null);
  }

  const filterChip = (active: boolean, color: string) => ({
    ...chipBase,
    backgroundColor: active ? color : c.surface,
    borderColor: active ? color : c.border,
  });

  return (
    <Screen>
      <View style={{ flex: 1 }}>
        <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8, gap: 10 }}>
          <Text style={{ color: c.text, fontSize: 32, fontWeight: "900" }}>Fichiers</Text>
          <Text style={{ color: c.textSecondary }}>Gère tes dossiers et fichiers.</Text>

          <View style={{ gap: 10, marginTop: 6 }}>
            <View style={{ flexDirection: "row", gap: 8 }}>
              <TextInput
                value={searchTerm} onChangeText={setSearchTerm}
                placeholder="Rechercher..." placeholderTextColor={c.textSecondary}
                style={[inputStyle, { flex: 1 }]}
              />
              <Pressable onPress={() => setFiltersOpen(p => !p)} style={{ paddingHorizontal: 16, justifyContent: "center", borderRadius: 14, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border }}>
                <Text style={{ color: c.text, fontWeight: "800" }}>{filtersOpen ? "Fermer" : "Filtres"}</Text>
              </Pressable>
            </View>

            {filtersOpen ? (
              <Panel style={{ padding: 12 }}>
                <Text style={{ color: c.text, fontWeight: "900", marginBottom: 10 }}>Type</Text>
                <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
                  {[{ value: "all", label: "Tous" }, { value: "file", label: "Fichiers" }, { value: "folder", label: "Dossiers" }].map(f => (
                    <Pressable key={f.value} onPress={() => setTypeFilter(f.value as TypeFilter)} style={filterChip(typeFilter === f.value, c.primary)}>
                      <Text style={{ color: typeFilter === f.value ? "#fff" : c.text, fontWeight: "800" }}>{f.label}</Text>
                    </Pressable>
                  ))}
                </View>
                <Text style={{ color: c.text, fontWeight: "900", marginBottom: 10 }}>Catégorie</Text>
                <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
                  {[{ value: "all", label: "Toutes" }, { value: "image", label: "Images" }, { value: "video", label: "Vidéos" }, { value: "audio", label: "Audio" }, { value: "document", label: "Documents" }, { value: "other", label: "Autres" }].map(f => (
                    <Pressable key={f.value} onPress={() => setCategoryFilter(f.value as CategoryFilter)} style={filterChip(categoryFilter === f.value, "#22c55e")}>
                      <Text style={{ color: categoryFilter === f.value ? "#fff" : c.text, fontWeight: "800" }}>{f.label}</Text>
                    </Pressable>
                  ))}
                </View>
                <Text style={{ color: c.text, fontWeight: "900", marginBottom: 10 }}>Date de modification</Text>
                <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
                  {[{ value: "all", label: "Toutes" }, { value: "today", label: "Aujourd'hui" }, { value: "week", label: "7 derniers jours" }, { value: "month", label: "Ce mois-ci" }].map(f => (
                    <Pressable key={f.value} onPress={() => setDateFilter(f.value as DateFilter)} style={filterChip(dateFilter === f.value, "#a855f7")}>
                      <Text style={{ color: dateFilter === f.value ? "#fff" : c.text, fontWeight: "800" }}>{f.label}</Text>
                    </Pressable>
                  ))}
                </View>
                <Pressable onPress={() => { setSearchTerm(""); setTypeFilter("all"); setCategoryFilter("all"); setDateFilter("all"); }} style={[btnSecondary, { paddingVertical: 10 }]}>
                  <Text style={{ color: c.text, fontWeight: "800" }}>Réinitialiser les filtres</Text>
                </Pressable>
              </Panel>
            ) : null}
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={{ flexDirection: "row", gap: 8 }}>
              {[{ id: null, name: "Racine" }, ...breadcrumbs].map((crumb, i) => (
                <Pressable key={i} onPress={() => loadFolder(crumb.id ?? null)} style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border }}>
                  <Text style={{ color: c.text, fontWeight: "700" }}>{crumb.name}</Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>

          <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap" }}>
            <Pressable onPress={() => setCreateOpen(true)} style={{ flex: 1, minWidth: 100, paddingVertical: 12, borderRadius: 14, alignItems: "center", backgroundColor: c.primary }}>
              <Text style={{ color: "#fff", fontWeight: "900" }}>Nouveau dossier</Text>
            </Pressable>
            <Pressable onPress={handlePickAndUpload} disabled={uploading} style={{ flex: 1, minWidth: 100, paddingVertical: 12, borderRadius: 14, alignItems: "center", backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, opacity: uploading ? 0.6 : 1 }}>
              <Text style={{ color: c.text, fontWeight: "800" }}>{uploading ? "Upload..." : "Upload"}</Text>
            </Pressable>
            {currentParentId ? (
              <Pressable onPress={goBack} style={{ flex: 1, minWidth: 100, paddingVertical: 12, borderRadius: 14, alignItems: "center", backgroundColor: c.surface, borderWidth: 1, borderColor: c.border }}>
                <Text style={{ color: c.text, fontWeight: "800" }}>Retour</Text>
              </Pressable>
            ) : null}
          </View>

          {uploading ? (
            <Panel style={{ marginTop: 10, padding: 14 }}>
              <Text style={{ color: c.text, fontWeight: "800", marginBottom: 8 }}>Upload en cours{uploadingFileName ? ` : ${uploadingFileName}` : ""}</Text>
              <View style={{ height: 10, borderRadius: 999, backgroundColor: c.border, overflow: "hidden" }}>
                <View style={{ height: "100%", width: `${uploadProgress}%`, backgroundColor: c.primary }} />
              </View>
              <Text style={{ color: c.textSecondary, marginTop: 8, fontWeight: "700" }}>{uploadProgress}%</Text>
            </Panel>
          ) : null}
        </View>

        {loading || searchLoading ? (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
            <ActivityIndicator color={c.primary} />
            <Text style={{ color: c.textSecondary, marginTop: 10 }}>
              {searchLoading ? "Recherche en cours..." : "Chargement..."}
            </Text>
          </View>
        ) : (
          <FlatList
            data={visibleItems}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ padding: 16, paddingBottom: 120, gap: 12 }}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadFolder(currentParentId, true)} />}
            ListEmptyComponent={
              <Panel style={{ padding: 16 }}>
                <Text style={{ color: c.textSecondary }}>
                  {searchTerm || typeFilter !== "all" || categoryFilter !== "all" || dateFilter !== "all"
                    ? "Aucun résultat ne correspond à votre recherche."
                    : "Aucun fichier ou dossier ici."}
                </Text>
              </Panel>
            }
            ListHeaderComponent={error ? (
              <Panel style={{ marginBottom: 12, padding: 14 }}>
                <Text style={{ color: "#e53e3e", fontWeight: "700" }}>{error}</Text>
              </Panel>
            ) : null}
            renderItem={({ item }) => (
              <Panel style={{
                padding: 14, marginBottom: 12,
                borderWidth: item.isShared ? 1.5 : 1,
                borderColor: item.isShared ? "#a855f788" : c.border,
                backgroundColor: item.isShared ? "#a855f711" : undefined,
              }}>
                <Pressable onPress={() => handleOpen(item)}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                    <Text style={{ fontSize: 24 }}>{getEmoji(item)}</Text>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                        <Text style={{ color: c.text, fontWeight: "800", fontSize: 16, flex: 1 }} numberOfLines={1}>
                          {decodeName(item.originalName)}
                        </Text>
                        {item.isShared ? (
                          <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, backgroundColor: "#a855f733", borderWidth: 1, borderColor: "#a855f788" }}>
                            <Text style={{ color: "#d8b4fe", fontSize: 12, fontWeight: "800" }}>Partagé</Text>
                          </View>
                        ) : null}
                      </View>
                      <Text style={{ color: c.textSecondary, marginTop: 4 }}>
                        {item.type === "folder" ? (item.isShared ? "Dossier partagé avec vous" : "Dossier")
                          : item.isShared ? `Fichier partagé avec vous • ${formatSize(item.size)}`
                          : `${item.mimeType || "Fichier"} • ${formatSize(item.size)}`}
                      </Text>
                      {item.isShared ? <Text style={{ color: "#c4b5fd", marginTop: 6, fontSize: 13, fontWeight: "700" }}>Cet élément provient d'un partage interne.</Text> : null}
                    </View>
                  </View>
                </Pressable>

                <View style={{ flexDirection: "row", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
                  <Pressable onPress={() => handleDownload(item)} disabled={downloading} style={{ flex: 1, minWidth: 90, paddingVertical: 10, borderRadius: 12, alignItems: "center", backgroundColor: c.surface, borderWidth: 1, borderColor: c.primary, opacity: downloading ? 0.6 : 1 }}>
                    <Text style={{ color: c.primary, fontWeight: "700" }}>{downloading ? "..." : "Télécharger"}</Text>
                  </Pressable>
                  <Pressable onPress={() => { setRenameTarget(item); setRenameValue(decodeName(item.originalName)); setRenameOpen(true); }} style={[btnSecondary, { flex: 1, minWidth: 90 }]}>
                    <Text style={{ color: c.text, fontWeight: "700" }}>Renommer</Text>
                  </Pressable>
                  <Pressable onPress={() => openMoveModal(item)} style={[btnSecondary, { flex: 1, minWidth: 90, opacity: item.isShared ? 0.65 : 1 }]}>
                    <Text style={{ color: c.text, fontWeight: "700" }}>Déplacer</Text>
                  </Pressable>
                  <Pressable onPress={() => handleShare(item)} style={{ flex: 1, minWidth: 90, paddingVertical: 10, borderRadius: 12, alignItems: "center", backgroundColor: "#22c55e22", borderWidth: 1, borderColor: "#22c55e" }}>
                    <Text style={{ color: "#22c55e", fontWeight: "700" }}>Partager</Text>
                  </Pressable>
                  <Pressable onPress={() => handleDelete(item)} style={{ flex: 1, minWidth: 90, paddingVertical: 10, borderRadius: 12, alignItems: "center", backgroundColor: "#e53e3e22", borderWidth: 1, borderColor: "#e53e3e" }}>
                    <Text style={{ color: "#e53e3e", fontWeight: "700" }}>Supprimer</Text>
                  </Pressable>
                </View>
              </Panel>
            )}
          />
        )}
      </View>

      {/* Modal: Nouveau dossier */}
      <Modal visible={createOpen} transparent animationType="fade" onRequestClose={() => setCreateOpen(false)}>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "center", padding: 20 }}>
          <Panel style={{ padding: 16 }}>
            <Text style={{ color: c.text, fontSize: 22, fontWeight: "900", marginBottom: 12 }}>Nouveau dossier</Text>
            <TextInput value={folderName} onChangeText={setFolderName} placeholder="Nom du dossier" placeholderTextColor={c.textSecondary} style={inputStyle} />
            <View style={{ flexDirection: "row", gap: 10, marginTop: 14 }}>
              <Pressable onPress={() => setCreateOpen(false)} style={[btnSecondary, { flex: 1, paddingVertical: 12 }]}>
                <Text style={{ color: c.text, fontWeight: "700" }}>Annuler</Text>
              </Pressable>
              <Pressable onPress={handleCreateFolder} style={{ flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: "center", backgroundColor: c.primary }}>
                <Text style={{ color: "#fff", fontWeight: "900" }}>Créer</Text>
              </Pressable>
            </View>
          </Panel>
        </View>
      </Modal>

      {/* Modal: Renommer */}
      <Modal visible={renameOpen} transparent animationType="fade" onRequestClose={() => setRenameOpen(false)}>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "center", padding: 20 }}>
          <Panel style={{ padding: 16 }}>
            <Text style={{ color: c.text, fontSize: 22, fontWeight: "900", marginBottom: 12 }}>Renommer</Text>
            <TextInput value={renameValue} onChangeText={setRenameValue} placeholder="Nouveau nom" placeholderTextColor={c.textSecondary} style={inputStyle} />
            <View style={{ flexDirection: "row", gap: 10, marginTop: 14 }}>
              <Pressable onPress={() => setRenameOpen(false)} style={[btnSecondary, { flex: 1, paddingVertical: 12 }]}>
                <Text style={{ color: c.text, fontWeight: "700" }}>Annuler</Text>
              </Pressable>
              <Pressable onPress={handleRename} style={{ flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: "center", backgroundColor: c.primary }}>
                <Text style={{ color: "#fff", fontWeight: "900" }}>Enregistrer</Text>
              </Pressable>
            </View>
          </Panel>
        </View>
      </Modal>

      {/* Modal: Partager */}
      <Modal visible={shareOpen} transparent animationType="slide" onRequestClose={closeShareModal}>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "center", padding: 20 }}>
          <Panel style={{ maxHeight: "85%", padding: 16 }}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={{ color: c.text, fontSize: 22, fontWeight: "900", marginBottom: 8 }}>Partager</Text>
              <Text style={{ color: c.textSecondary, marginBottom: 14 }}>{shareTarget ? decodeName(shareTarget.originalName) : ""}</Text>

              <Text style={{ color: c.text, fontWeight: "800", marginBottom: 8 }}>Lien public</Text>
              <TextInput value={shareExpiresAt} onChangeText={setShareExpiresAt} placeholder="Expiration optionnelle, ex: 30/06/2026 23:59" placeholderTextColor={c.textSecondary} style={[inputStyle, { marginBottom: 10 }]} />
              <Text style={{ color: c.textSecondary, marginBottom: 10, fontSize: 12 }}>Format attendu : JJ/MM/AAAA HH:mm</Text>
              <TextInput value={sharePassword} onChangeText={setSharePassword} placeholder="Mot de passe optionnel" placeholderTextColor={c.textSecondary} secureTextEntry style={[inputStyle, { marginBottom: 10 }]} />
              <Text style={{ color: c.textSecondary, marginBottom: 10, fontSize: 12 }}>Si renseigné : 8 caractères min, majuscule, minuscule, chiffre et caractère spécial.</Text>

              <Pressable onPress={handleCreatePublicShare} disabled={shareLoading} style={{ paddingVertical: 12, borderRadius: 12, alignItems: "center", backgroundColor: "#22c55e22", borderWidth: 1, borderColor: "#22c55e", opacity: shareLoading ? 0.6 : 1, marginBottom: 12 }}>
                <Text style={{ color: "#22c55e", fontWeight: "900" }}>{shareLoading ? "Création..." : "Créer un lien public"}</Text>
              </Pressable>

              {shareLink ? (
                <Panel style={{ padding: 12, marginBottom: 16 }}>
                  <Text style={{ color: c.textSecondary, marginBottom: 8 }}>Lien généré :</Text>
                  <Text style={{ color: c.text, fontWeight: "700" }}>{shareLink}</Text>
                  <Pressable onPress={handleShareGeneratedLink} style={{ marginTop: 12, paddingVertical: 10, borderRadius: 12, alignItems: "center", backgroundColor: c.primary }}>
                    <Text style={{ color: "#fff", fontWeight: "900" }}>Partager ce lien</Text>
                  </Pressable>
                </Panel>
              ) : null}

              <Text style={{ color: c.text, fontWeight: "800", marginBottom: 8 }}>Partage interne</Text>
              <TextInput value={shareToEmail} onChangeText={setShareToEmail} placeholder="Email du destinataire" placeholderTextColor={c.textSecondary} autoCapitalize="none" keyboardType="email-address" style={[inputStyle, { marginBottom: 10 }]} />
              <Pressable onPress={handleCreateInternalShare} disabled={shareLoading} style={{ paddingVertical: 12, borderRadius: 12, alignItems: "center", backgroundColor: c.surface, borderWidth: 1, borderColor: c.primary, opacity: shareLoading ? 0.6 : 1 }}>
                <Text style={{ color: c.primary, fontWeight: "900" }}>{shareLoading ? "Partage..." : "Partager en interne"}</Text>
              </Pressable>
              <Pressable onPress={closeShareModal} style={[btnSecondary, { marginTop: 14, paddingVertical: 12 }]}>
                <Text style={{ color: c.text, fontWeight: "700" }}>Fermer</Text>
              </Pressable>
            </ScrollView>
          </Panel>
        </View>
      </Modal>

      {/* Modal: Déplacer */}
      <Modal visible={moveOpen} transparent animationType="slide" onRequestClose={closeMoveModal}>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "center", padding: 20 }}>
          <Panel style={{ maxHeight: "85%", padding: 16 }}>
            <Text style={{ color: c.text, fontSize: 22, fontWeight: "900", marginBottom: 8 }}>Déplacer</Text>
            <Text style={{ color: c.textSecondary, marginBottom: 12 }}>{moveTarget ? `Élément : ${decodeName(moveTarget.originalName)}` : ""}</Text>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
              <View style={{ flexDirection: "row", gap: 8 }}>
                {[{ id: null, name: "Racine" }, ...moveBreadcrumbs].map((crumb, i) => (
                  <Pressable key={i} onPress={() => loadMoveFolders(crumb.id ?? null)} style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border }}>
                    <Text style={{ color: c.text, fontWeight: "700" }}>{crumb.name}</Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>

            <View style={{ flexDirection: "row", gap: 10, marginBottom: 12 }}>
              <Pressable onPress={() => handleConfirmMove(null)} style={{ flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: "center", backgroundColor: c.surface, borderWidth: 1, borderColor: c.primary }}>
                <Text style={{ color: c.primary, fontWeight: "700" }}>Déplacer à la racine</Text>
              </Pressable>
              {moveCurrentParentId ? (
                <Pressable onPress={goBackMoveFolder} style={[btnSecondary, { flex: 1, paddingVertical: 12 }]}>
                  <Text style={{ color: c.text, fontWeight: "700" }}>Retour</Text>
                </Pressable>
              ) : null}
            </View>

            {moveLoading ? (
              <View style={{ paddingVertical: 30, alignItems: "center" }}><ActivityIndicator color={c.primary} /></View>
            ) : moveFolders.length === 0 ? (
              <Panel style={{ padding: 14 }}><Text style={{ color: c.textSecondary }}>Aucun dossier disponible ici.</Text></Panel>
            ) : (
              <ScrollView style={{ maxHeight: 320 }} showsVerticalScrollIndicator={false}>
                {moveFolders.map((folder) => (
                  <Panel key={folder.id} style={{ padding: 14, marginBottom: 10 }}>
                    <Pressable onPress={() => loadMoveFolders(folder.id)}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                        <Text style={{ fontSize: 24 }}>📁</Text>
                        <Text style={{ color: c.text, fontWeight: "800", fontSize: 16, flex: 1 }} numberOfLines={1}>{decodeName(folder.originalName)}</Text>
                      </View>
                    </Pressable>
                    <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
                      <Pressable onPress={() => handleConfirmMove(folder.id)} style={{ flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: "center", backgroundColor: c.primary }}>
                        <Text style={{ color: "#fff", fontWeight: "900" }}>Déplacer ici</Text>
                      </Pressable>
                      <Pressable onPress={() => loadMoveFolders(folder.id)} style={[btnSecondary, { flex: 1, paddingVertical: 10 }]}>
                        <Text style={{ color: c.text, fontWeight: "700" }}>Ouvrir</Text>
                      </Pressable>
                    </View>
                  </Panel>
                ))}
              </ScrollView>
            )}

            <Pressable onPress={closeMoveModal} style={[btnSecondary, { marginTop: 14, paddingVertical: 12 }]}>
              <Text style={{ color: c.text, fontWeight: "700" }}>Fermer</Text>
            </Pressable>
          </Panel>
        </View>
      </Modal>

      {/* Modal: Prévisualisation */}
      <Modal visible={previewOpen} transparent={false} animationType="slide" onRequestClose={closePreview}>
        <Screen>
          <View style={{ flex: 1 }}>
            <View style={{ paddingHorizontal: 16, paddingTop: 10, paddingBottom: 12, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Text style={{ color: c.text, fontSize: 22, fontWeight: "900", flex: 1, paddingRight: 10 }} numberOfLines={1}>
                {previewItem ? decodeName(previewItem.originalName) : "Prévisualisation"}
              </Text>
              <Pressable onPress={closePreview} style={[btnSecondary, { paddingHorizontal: 14, paddingVertical: 10 }]}>
                <Text style={{ color: c.text, fontWeight: "800" }}>Fermer</Text>
              </Pressable>
            </View>
            <View style={{ flex: 1, paddingHorizontal: 16, paddingBottom: 16 }}>
              <Panel style={{ flex: 1, padding: 12 }}>
                {previewLoading ? (
                  <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
                    <ActivityIndicator color={c.primary} />
                    <Text style={{ color: c.textSecondary, marginTop: 10 }}>Chargement...</Text>
                  </View>
                ) : previewItem && isTextFile(previewItem) ? (
                  <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
                    <Text style={{ color: c.text, fontSize: 15, lineHeight: 22 }}>{previewTextContent}</Text>
                  </ScrollView>
                ) : previewItem && previewToken && isVideoFile(previewItem) ? (
                  <Video
                    source={{ uri: getPreviewUrl(previewItem.id), headers: { Authorization: `Bearer ${previewToken}`, "ngrok-skip-browser-warning": "true" } }}
                    useNativeControls
                    resizeMode={ResizeMode.CONTAIN}
                    style={{ width: "100%", height: 300 }}
                  />
                ) : previewItem && previewToken && isAudioFile(previewItem) ? (
                  <Video
                    source={{ uri: getPreviewUrl(previewItem.id), headers: { Authorization: `Bearer ${previewToken}`, "ngrok-skip-browser-warning": "true" } }}
                    useNativeControls
                    style={{ width: "100%", height: 100 }}
                  />
                ) : previewItem && previewToken ? (
                  <WebView
                    source={{ uri: getPreviewUrl(previewItem.id), headers: { Authorization: `Bearer ${previewToken}`, "ngrok-skip-browser-warning": "true" } }}
                    style={{ flex: 1, backgroundColor: "transparent" }}
                    allowsInlineMediaPlayback
                    mediaPlaybackRequiresUserAction={false}
                    startInLoadingState
                  />
                ) : (
                  <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
                    <Text style={{ color: c.textSecondary }}>Impossible d'afficher ce fichier.</Text>
                  </View>
                )}
              </Panel>
            </View>
          </View>
        </Screen>
      </Modal>
    </Screen>
  );
}
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { WebView } from "react-native-webview";
import { Video, ResizeMode } from "expo-av";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  Share,
  Text,
  TextInput,
  View,
} from "react-native";

import Screen from "../components/Screen";
import Panel from "../components/Panel";
import { theme } from "../theme/theme";
import { createPublicShare, createInternalShare } from "../services/shares";
import { getAccessToken } from "../services/secureStore";
import {
  BreadcrumbItem,
  FileItem,
  createFolder,
  getBreadcrumbs,
  getDownloadUrl,
  getFolderDownloadUrl,
  getPreviewText,
  getPreviewUrl,
  listFiles,
  moveItem,
  renameItem,
  softDeleteItem,
  uploadFile,
} from "../services/files";

type TypeFilter = "all" | "file" | "folder";

type CategoryFilter =
  | "all"
  | "image"
  | "video"
  | "audio"
  | "document"
  | "other";

type DateFilter =
  | "all"
  | "today"
  | "week"
  | "month";

function formatSize(bytes: number) {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

function getEmoji(item: FileItem) {
  if (item.type === "folder") return "📁";
  if (item.mimeType?.startsWith("image/")) return "🖼️";
  if (item.mimeType?.startsWith("video/")) return "🎬";
  if (item.mimeType?.startsWith("audio/")) return "🎵";
  if (item.mimeType === "application/pdf") return "📄";
  if (item.mimeType?.startsWith("text/")) return "📝";
  return "📦";
}

function decodeName(name: string) {
  try {
    return decodeURIComponent(name);
  } catch {
    return name;
  }
}
function parseExpirationDate(value: string) {
  const cleaned = value.trim();

  const match = cleaned.match(
    /^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2})$/
  );

  if (!match) return null;

  const [, dayText, monthText, yearText, hourText, minuteText] = match;

  const day = Number(dayText);
  const month = Number(monthText);
  const year = Number(yearText);
  const hour = Number(hourText);
  const minute = Number(minuteText);

  if (month < 1 || month > 12) return null;
  if (day < 1 || day > 31) return null;
  if (hour < 0 || hour > 23) return null;
  if (minute < 0 || minute > 59) return null;

  const date = new Date(year, month - 1, day, hour, minute, 0, 0);

  if (Number.isNaN(date.getTime())) return null;

  const isSameDate =
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day &&
    date.getHours() === hour &&
    date.getMinutes() === minute;

  if (!isSameDate) return null;

  return date;
}
function validateSharePassword(password: string) {
  const cleaned = password.trim();

  if (!cleaned) {
    return null;
  }

  if (cleaned.length < 8) {
    return "Le mot de passe doit contenir au moins 8 caractères.";
  }

  if (!/[A-Z]/.test(cleaned)) {
    return "Le mot de passe doit contenir au moins une majuscule.";
  }

  if (!/[a-z]/.test(cleaned)) {
    return "Le mot de passe doit contenir au moins une minuscule.";
  }

  if (!/[0-9]/.test(cleaned)) {
    return "Le mot de passe doit contenir au moins un chiffre.";
  }

  if (!/[^A-Za-z0-9]/.test(cleaned)) {
    return "Le mot de passe doit contenir au moins un caractère spécial.";
  }

  return null;
}

function getCategory(item: FileItem): CategoryFilter {
  if (item.type === "folder") return "other";

  const mime = item.mimeType || "";
  const name = item.originalName.toLowerCase();

  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("video/")) return "video";
  if (mime.startsWith("audio/")) return "audio";

  if (
    mime === "application/pdf" ||
    mime.startsWith("text/") ||
    mime.includes("word") ||
    mime.includes("document") ||
    mime.includes("sheet") ||
    mime.includes("presentation") ||
    name.endsWith(".pdf") ||
    name.endsWith(".txt") ||
    name.endsWith(".md") ||
    name.endsWith(".doc") ||
    name.endsWith(".docx") ||
    name.endsWith(".xls") ||
    name.endsWith(".xlsx") ||
    name.endsWith(".ppt") ||
    name.endsWith(".pptx")
  ) {
    return "document";
  }

  return "other";
}

function getFileExtension(name: string) {
  const parts = name.toLowerCase().split(".");
  if (parts.length < 2) return "";
  return parts[parts.length - 1];
}

function matchesDateFilter(item: FileItem, filter: DateFilter) {
  if (filter === "all") return true;

  const date = new Date(item.updatedAt || item.createdAt);

  if (Number.isNaN(date.getTime())) return false;

  const now = new Date();

  if (filter === "today") {
    return (
      date.getFullYear() === now.getFullYear() &&
      date.getMonth() === now.getMonth() &&
      date.getDate() === now.getDate()
    );
  }

  if (filter === "week") {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(now.getDate() - 7);
    return date >= sevenDaysAgo;
  }

  if (filter === "month") {
    return (
      date.getFullYear() === now.getFullYear() &&
      date.getMonth() === now.getMonth()
    );
  }

  return true;
}
export default function FilesScreen() {
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

  const visibleItems = useMemo(() => {
    return items
      .filter((item) => {
        const normalizedSearch = searchTerm.trim().toLowerCase();
        const itemName = decodeName(item.originalName).toLowerCase();
        const extension = getFileExtension(item.originalName);

        const matchesSearch = normalizedSearch
          ? itemName.includes(normalizedSearch) ||
            extension.includes(normalizedSearch.replace(".", ""))
          : true;

        const matchesType =
          typeFilter === "all" ? true : item.type === typeFilter;

        const matchesCategory =
          categoryFilter === "all"
            ? true
            : item.type === "file" && getCategory(item) === categoryFilter;

        const matchesDate = matchesDateFilter(item, dateFilter);

        return matchesSearch && matchesType && matchesCategory && matchesDate;
      })
      .sort((a, b) => {
        if (a.type === "folder" && b.type !== "folder") return -1;
        if (a.type !== "folder" && b.type === "folder") return 1;
        return decodeName(a.originalName).localeCompare(decodeName(b.originalName));
      });
  }, [items, searchTerm, typeFilter, categoryFilter, dateFilter]);

  async function loadFolder(parentId?: string | null, isRefresh = false) {
    try {
      setError(null);
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      const data = await listFiles(parentId ?? null);
      setItems(data.items || []);
      setCurrentParentId(parentId ?? null);

      if (parentId) {
        const bc = await getBreadcrumbs(parentId);
        setBreadcrumbs(bc.path || []);
      } else {
        setBreadcrumbs([]);
      }
    } catch (e: any) {
        const apiError =
          e?.response?.data?.error ||
          e?.response?.data?.message ||
          e?.message ||
          "Impossible de charger les fichiers.";

        if (apiError === "INVALID_TOKEN") {
          setError("Session expirée. Déconnecte-toi puis reconnecte-toi.");
          return;
        }

        setError(apiError);
      } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadFolder(null);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadFolder(currentParentId);
    }, [currentParentId])
  );

  function isTextFile(item: FileItem) {
    return item.mimeType?.startsWith("text/") || item.mimeType === "application/json";
  }

  function isImageFile(item: FileItem) {
    return item.mimeType?.startsWith("image/") || false;
  }

  function isPdfFile(item: FileItem) {
    return item.mimeType === "application/pdf";
  }

  function isVideoFile(item: FileItem) {
    return item.mimeType?.startsWith("video/") || false;
  }

  function isAudioFile(item: FileItem) {
    return item.mimeType?.startsWith("audio/") || false;
  }

  function isPreviewable(item: FileItem) {
    return (
      isTextFile(item) ||
      isImageFile(item) ||
      isPdfFile(item) ||
      isVideoFile(item) ||
      isAudioFile(item)
    );
  }

  async function handleDownload(item: FileItem) {
    try {
      setDownloading(true);

      const token = await getAccessToken();
      if (!token) {
        Alert.alert("Erreur", "Session expirée. Reconnecte-toi.");
        return;
      }

      const safeName = decodeName(item.originalName).replace(/[\\/:*?"<>|]+/g, "_");
      const fileName = item.type === "folder" ? `${safeName}.zip` : safeName || `download-${item.id}`;
      const downloadUrl = item.type === "folder" ? getFolderDownloadUrl(item.id) : getDownloadUrl(item.id);
      const targetUri = `${FileSystem.cacheDirectory}${fileName}`;

      const result = await FileSystem.downloadAsync(downloadUrl, targetUri, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const canShare = await Sharing.isAvailableAsync();

      if (canShare) {
        await Sharing.shareAsync(result.uri, {
          mimeType: item.type === "folder" ? "application/zip" : item.mimeType || "application/octet-stream",
          dialogTitle: decodeName(item.originalName),
        });
      } else {
        Alert.alert("Téléchargement terminé", `Fichier enregistré : ${result.uri}`);
      }
    } catch (e: any) {
      Alert.alert("Erreur", e?.message || "Téléchargement impossible.");
    } finally {
      setDownloading(false);
    }
  }

  async function handlePickAndUpload() {
    try {
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
        (percent) => {
          setUploadProgress(percent);
        }
      );

      await loadFolder(currentParentId);
      Alert.alert("Succès", "Fichier uploadé avec succès.");
    } catch (e: any) {
      Alert.alert(
        "Erreur",
        e?.response?.data?.error || e?.response?.data?.message || "Upload impossible."
      );
    } finally {
      setUploading(false);
      setUploadProgress(0);
      setUploadingFileName("");
    }
  }

  async function handleCreateFolder() {
    if (!folderName.trim()) return;

    try {
      await createFolder(folderName.trim(), currentParentId);
      setFolderName("");
      setCreateOpen(false);
      await loadFolder(currentParentId);
    } catch (e: any) {
      Alert.alert(
        "Erreur",
        e?.response?.data?.error || e?.response?.data?.message || "Création impossible."
      );
    }
  }

  async function handleRename() {
    if (!renameTarget || !renameValue.trim()) return;

    try {
      await renameItem(renameTarget.id, renameValue.trim());
      setRenameOpen(false);
      setRenameTarget(null);
      setRenameValue("");
      await loadFolder(currentParentId);
    } catch (e: any) {
      Alert.alert(
        "Erreur",
        e?.response?.data?.error || e?.response?.data?.message || "Renommage impossible."
      );
    }
  }

  async function handleDelete(item: FileItem) {
    Alert.alert("Supprimer", `Voulez-vous supprimer "${decodeName(item.originalName)}" ?`, [
      { text: "Annuler", style: "cancel" },
      {
        text: "Supprimer",
        style: "destructive",
        onPress: async () => {
          try {
            await softDeleteItem(item.id);
            await loadFolder(currentParentId);
          } catch (e: any) {
            Alert.alert(
              "Erreur",
              e?.response?.data?.error || e?.response?.data?.message || "Suppression impossible."
            );
          }
        },
      },
    ]);
  }

  function handleShare(item: FileItem) {
    if (item.isShared) {
      Alert.alert("Info", "Vous ne pouvez pas repartager un élément qui vous a été partagé.");
      return;
    }

    setShareTarget(item);
    setShareExpiresAt("");
    setSharePassword("");
    setShareToEmail("");
    setShareLink("");
    setShareOpen(true);
  }

  function closeShareModal() {
    setShareOpen(false);
    setShareTarget(null);
    setShareExpiresAt("");
    setSharePassword("");
    setShareToEmail("");
    setShareLink("");
    setShareLoading(false);
  }

 async function handleCreatePublicShare() {
   if (!shareTarget) return;

   const cleanedExpiresAt = shareExpiresAt.trim();
   let expiresAtToSend: string | undefined = undefined;

   if (cleanedExpiresAt) {
     const expirationDate = parseExpirationDate(cleanedExpiresAt);

     if (!expirationDate) {
       Alert.alert(
         "Date invalide",
         "Utilise le format JJ/MM/AAAA HH:mm, par exemple : 30/06/2026 23:59"
       );
       return;
     }

     if (expirationDate.getTime() <= Date.now()) {
       Alert.alert(
         "Date invalide",
         "La date d’expiration doit être dans le futur."
       );
       return;
     }

     expiresAtToSend = expirationDate.toISOString();
   }
    const passwordError = validateSharePassword(sharePassword);

    if (passwordError) {
      Alert.alert("Mot de passe trop faible", passwordError);
      return;
    }
   try {
     setShareLoading(true);

     const share = await createPublicShare({
       nodeId: shareTarget.id,
       expiresAt: expiresAtToSend,
       password: sharePassword || undefined,
     });

     const url = share?.url || "";
     setShareLink(url);

     if (url) {
       Alert.alert(
         "Lien créé",
         "Le lien public a été généré. Tu peux maintenant appuyer sur “Partager ce lien”."
       );
     }
   } catch (e: any) {
     Alert.alert(
       "Erreur",
       e?.response?.data?.error ||
         e?.response?.data?.message ||
         e?.message ||
         "Création du lien public impossible."
     );
   } finally {
     setShareLoading(false);
   }
 }

  async function handleCreateInternalShare() {
    if (!shareTarget) return;

    const email = shareToEmail.trim().toLowerCase();

    if (!email) {
      Alert.alert("Erreur", "Renseigne l’email du destinataire.");
      return;
    }

    try {
      setShareLoading(true);

      await createInternalShare({
        nodeId: shareTarget.id,
        nodeType: shareTarget.type,
        toEmail: email,
      });

      Alert.alert(
        "Succès",
        "Partage interne créé avec succès. Tu peux maintenant ajouter un autre destinataire."
      );

      setShareToEmail("");
    } catch (e: any) {
      Alert.alert("Erreur", e?.message || "Partage interne impossible.");
    } finally {
      setShareLoading(false);
    }

  }

  async function handleShareGeneratedLink() {
    if (!shareLink) return;

    try {
      await Share.share({
        message: shareLink,
        url: shareLink,
      });
    } catch {
      Alert.alert("Erreur", "Impossible de partager le lien.");
    }
  }

  async function loadMoveFolders(parentId?: string | null) {
    try {
      setMoveLoading(true);

      const data = await listFiles(parentId ?? null);
      const foldersOnly = (data.items || []).filter(
        (item) => item.type === "folder" && item.id !== moveTarget?.id
      );

      setMoveFolders(foldersOnly);
      setMoveCurrentParentId(parentId ?? null);

      if (parentId) {
        const bc = await getBreadcrumbs(parentId);
        setMoveBreadcrumbs(bc.path || []);
      } else {
        setMoveBreadcrumbs([]);
      }
    } catch (e: any) {
      Alert.alert(
        "Erreur",
        e?.response?.data?.error || e?.response?.data?.message || "Impossible de charger les dossiers."
      );
    } finally {
      setMoveLoading(false);
    }
  }

  function openMoveModal(item: FileItem) {
    if (item.isShared) {
      Alert.alert(
        "Accès refusé",
        "Vous ne disposez pas des droits nécessaires pour déplacer un élément partagé avec vous."
      );
      return;
    }

    setMoveTarget(item);
    setMoveOpen(true);
    loadMoveFolders(null);
  }

  function closeMoveModal() {
    setMoveOpen(false);
    setMoveTarget(null);
    setMoveFolders([]);
    setMoveCurrentParentId(null);
    setMoveBreadcrumbs([]);
    setMoveLoading(false);
  }

  async function handleConfirmMove(targetParentId: string | null) {
    if (!moveTarget) return;

    if (moveTarget.isShared) {
      Alert.alert(
        "Accès refusé",
        "Vous ne disposez pas des droits nécessaires pour déplacer un élément partagé avec vous."
      );
      closeMoveModal();
      return;
    }

    try {
      await moveItem(moveTarget.id, targetParentId);
      closeMoveModal();
      await loadFolder(currentParentId);
      Alert.alert("Succès", "Élément déplacé avec succès.");
    } catch (e: any) {
      Alert.alert(
        "Erreur",
        e?.response?.data?.error || e?.response?.data?.message || "Déplacement impossible."
      );
    }
  }

  function goBackMoveFolder() {
    if (moveBreadcrumbs.length >= 2) {
      loadMoveFolders(moveBreadcrumbs[moveBreadcrumbs.length - 2].id);
    } else {
      loadMoveFolders(null);
    }
  }

  function closePreview() {
    setPreviewOpen(false);
    setPreviewItem(null);
    setPreviewTextContent("");
    setPreviewToken(null);
    setPreviewLoading(false);
  }

  async function handleOpen(item: FileItem) {
    if (item.type === "folder") {
      loadFolder(item.id);
      return;
    }

    if (!isPreviewable(item)) {
      Alert.alert("Info", "Ce type de fichier n’a pas encore de prévisualisation mobile.");
      return;
    }

    try {
      setPreviewLoading(true);
      setPreviewItem(item);
      setPreviewTextContent("");
      setPreviewOpen(true);

      const token = await getAccessToken();
      setPreviewToken(token);

      if (isTextFile(item)) {
        const text = await getPreviewText(item.id);
        setPreviewTextContent(text);
      }
    } catch (e: any) {
      Alert.alert(
        "Erreur",
        e?.response?.data?.error || e?.response?.data?.message || "Prévisualisation impossible."
      );
      setPreviewOpen(false);
      setPreviewItem(null);
    } finally {
      setPreviewLoading(false);
    }
  }

  function goBack() {
    if (breadcrumbs.length >= 2) {
      loadFolder(breadcrumbs[breadcrumbs.length - 2].id);
    } else {
      loadFolder(null);
    }
  }

  return (
    <Screen>
      <View style={{ flex: 1 }}>
        <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8, gap: 10 }}>
          <Text style={{ color: theme.colors.text, fontSize: 32, fontWeight: "900" }}>
            Fichiers
          </Text>

          <Text style={{ color: theme.colors.muted }}>Gère tes dossiers et fichiers.</Text>

          <View style={{ gap: 10, marginTop: 6 }}>
            <View style={{ flexDirection: "row", gap: 8 }}>
              <TextInput
                value={searchTerm}
                onChangeText={setSearchTerm}
                placeholder="Rechercher..."
                placeholderTextColor="rgba(255,255,255,0.35)"
                style={{
                  flex: 1,
                  backgroundColor: "rgba(255,255,255,0.06)",
                  borderWidth: 1,
                  borderColor: "rgba(255,255,255,0.10)",
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                  borderRadius: 14,
                  color: theme.colors.text,
                }}
              />

              <Pressable
                onPress={() => setFiltersOpen((prev) => !prev)}
                style={{
                  paddingHorizontal: 16,
                  justifyContent: "center",
                  borderRadius: 14,
                  backgroundColor: "rgba(255,255,255,0.06)",
                  borderWidth: 1,
                  borderColor: "rgba(255,255,255,0.10)",
                }}
              >
                <Text style={{ color: theme.colors.text, fontWeight: "800" }}>
                  {filtersOpen ? "Fermer" : "Filtres"}
                </Text>
              </Pressable>
            </View>

            {filtersOpen ? (
              <Panel style={{ padding: 12 }}>
                <Text style={{ color: theme.colors.text, fontWeight: "900", marginBottom: 10 }}>
                  Type
                </Text>

                <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
                  {[
                    { value: "all", label: "Tous" },
                    { value: "file", label: "Fichiers" },
                    { value: "folder", label: "Dossiers" },
                  ].map((filter) => (
                    <Pressable
                      key={filter.value}
                      onPress={() => setTypeFilter(filter.value as TypeFilter)}
                      style={{
                        paddingHorizontal: 12,
                        paddingVertical: 8,
                        borderRadius: 999,
                        backgroundColor:
                          typeFilter === filter.value
                            ? "rgba(96,165,250,0.95)"
                            : "rgba(255,255,255,0.06)",
                        borderWidth: 1,
                        borderColor:
                          typeFilter === filter.value
                            ? "rgba(96,165,250,0.95)"
                            : "rgba(255,255,255,0.10)",
                      }}
                    >
                      <Text
                        style={{
                          color:
                            typeFilter === filter.value
                              ? "rgba(0,0,0,0.85)"
                              : theme.colors.text,
                          fontWeight: "800",
                        }}
                      >
                        {filter.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>

                <Text style={{ color: theme.colors.text, fontWeight: "900", marginBottom: 10 }}>
                  Catégorie
                </Text>

                <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
                  {[
                    { value: "all", label: "Toutes" },
                    { value: "image", label: "Images" },
                    { value: "video", label: "Vidéos" },
                    { value: "audio", label: "Audio" },
                    { value: "document", label: "Documents" },
                    { value: "other", label: "Autres" },
                  ].map((filter) => (
                    <Pressable
                      key={filter.value}
                      onPress={() => setCategoryFilter(filter.value as CategoryFilter)}
                      style={{
                        paddingHorizontal: 12,
                        paddingVertical: 8,
                        borderRadius: 999,
                        backgroundColor:
                          categoryFilter === filter.value
                            ? "rgba(34,197,94,0.85)"
                            : "rgba(255,255,255,0.06)",
                        borderWidth: 1,
                        borderColor:
                          categoryFilter === filter.value
                            ? "rgba(34,197,94,0.85)"
                            : "rgba(255,255,255,0.10)",
                      }}
                    >
                      <Text
                        style={{
                          color:
                            categoryFilter === filter.value
                              ? "rgba(0,0,0,0.85)"
                              : theme.colors.text,
                          fontWeight: "800",
                        }}
                      >
                        {filter.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>

                <Text style={{ color: theme.colors.text, fontWeight: "900", marginBottom: 10 }}>
                  Date de modification
                </Text>

                <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
                  {[
                    { value: "all", label: "Toutes" },
                    { value: "today", label: "Aujourd’hui" },
                    { value: "week", label: "7 derniers jours" },
                    { value: "month", label: "Ce mois-ci" },
                  ].map((filter) => (
                    <Pressable
                      key={filter.value}
                      onPress={() => setDateFilter(filter.value as DateFilter)}
                      style={{
                        paddingHorizontal: 12,
                        paddingVertical: 8,
                        borderRadius: 999,
                        backgroundColor:
                          dateFilter === filter.value
                            ? "rgba(168,85,247,0.85)"
                            : "rgba(255,255,255,0.06)",
                        borderWidth: 1,
                        borderColor:
                          dateFilter === filter.value
                            ? "rgba(168,85,247,0.85)"
                            : "rgba(255,255,255,0.10)",
                      }}
                    >
                      <Text
                        style={{
                          color:
                            dateFilter === filter.value
                              ? "rgba(0,0,0,0.85)"
                              : theme.colors.text,
                          fontWeight: "800",
                        }}
                      >
                        {filter.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>

                <Pressable
                  onPress={() => {
                    setSearchTerm("");
                    setTypeFilter("all");
                    setCategoryFilter("all");
                    setDateFilter("all");
                  }}
                  style={{
                    paddingVertical: 10,
                    borderRadius: 12,
                    alignItems: "center",
                    backgroundColor: "rgba(255,255,255,0.06)",
                    borderWidth: 1,
                    borderColor: "rgba(255,255,255,0.10)",
                  }}
                >
                  <Text style={{ color: theme.colors.text, fontWeight: "800" }}>
                    Réinitialiser les filtres
                  </Text>
                </Pressable>
              </Panel>
            ) : null}
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={{ flexDirection: "row", gap: 8 }}>
              <Pressable
                onPress={() => loadFolder(null)}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  borderRadius: 999,
                  backgroundColor: "rgba(255,255,255,0.06)",
                  borderWidth: 1,
                  borderColor: "rgba(255,255,255,0.10)",
                }}
              >
                <Text style={{ color: theme.colors.text, fontWeight: "700" }}>Racine</Text>
              </Pressable>

              {breadcrumbs.map((crumb) => (
                <Pressable
                  key={crumb.id}
                  onPress={() => loadFolder(crumb.id)}
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    borderRadius: 999,
                    backgroundColor: "rgba(255,255,255,0.06)",
                    borderWidth: 1,
                    borderColor: "rgba(255,255,255,0.10)",
                  }}
                >
                  <Text style={{ color: theme.colors.text, fontWeight: "700" }}>{crumb.name}</Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>

          <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap" }}>
            <Pressable
              onPress={() => setCreateOpen(true)}
              style={{
                flex: 1,
                minWidth: 100,
                paddingVertical: 12,
                borderRadius: 14,
                alignItems: "center",
                backgroundColor: "rgba(96,165,250,0.95)",
              }}
            >
              <Text style={{ color: "rgba(0,0,0,0.85)", fontWeight: "900" }}>
                Nouveau dossier
              </Text>
            </Pressable>

            <Pressable
              onPress={handlePickAndUpload}
              disabled={uploading}
              style={{
                flex: 1,
                minWidth: 100,
                paddingVertical: 12,
                borderRadius: 14,
                alignItems: "center",
                backgroundColor: "rgba(255,255,255,0.06)",
                borderWidth: 1,
                borderColor: "rgba(255,255,255,0.10)",
                opacity: uploading ? 0.6 : 1,
              }}
            >
              <Text style={{ color: theme.colors.text, fontWeight: "800" }}>
                {uploading ? "Upload..." : "Upload"}
              </Text>
            </Pressable>

            {currentParentId ? (
              <Pressable
                onPress={goBack}
                style={{
                  flex: 1,
                  minWidth: 100,
                  paddingVertical: 12,
                  borderRadius: 14,
                  alignItems: "center",
                  backgroundColor: "rgba(255,255,255,0.06)",
                  borderWidth: 1,
                  borderColor: "rgba(255,255,255,0.10)",
                }}
              >
                <Text style={{ color: theme.colors.text, fontWeight: "800" }}>Retour</Text>
              </Pressable>
            ) : null}
          </View>

          {uploading ? (
            <Panel style={{ marginTop: 10, padding: 14 }}>
              <Text style={{ color: theme.colors.text, fontWeight: "800", marginBottom: 8 }}>
                Upload en cours{uploadingFileName ? ` : ${uploadingFileName}` : ""}
              </Text>

              <View
                style={{
                  height: 10,
                  borderRadius: 999,
                  backgroundColor: "rgba(255,255,255,0.08)",
                  overflow: "hidden",
                  borderWidth: 1,
                  borderColor: "rgba(255,255,255,0.10)",
                }}
              >
                <View
                  style={{
                    height: "100%",
                    width: `${uploadProgress}%`,
                    backgroundColor: "rgba(96,165,250,0.95)",
                  }}
                />
              </View>

              <Text style={{ color: theme.colors.muted, marginTop: 8, fontWeight: "700" }}>
                {uploadProgress}%
              </Text>
            </Panel>
          ) : null}
        </View>

        {loading ? (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
            <ActivityIndicator />
          </View>
        ) : (
          <FlatList
            data={visibleItems}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ padding: 16, paddingBottom: 120, gap: 12 }}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => loadFolder(currentParentId, true)}
              />
            }
            ListEmptyComponent={
              <Panel style={{ padding: 16 }}>
                <Text style={{ color: theme.colors.muted }}>
                  {searchTerm || typeFilter !== "all" || categoryFilter !== "all" || dateFilter !== "all"
                    ? "Aucun résultat ne correspond à votre recherche."
                    : "Aucun fichier ou dossier ici."}
                </Text>
              </Panel>
            }
            ListHeaderComponent={
              error ? (
                <Panel style={{ marginBottom: 12, padding: 14 }}>
                  <Text style={{ color: theme.colors.danger, fontWeight: "700" }}>{error}</Text>
                </Panel>
              ) : null
            }
            renderItem={({ item }) => (
              <Panel
                style={{
                  padding: 14,
                  marginBottom: 12,
                  borderWidth: item.isShared ? 1.5 : 1,
                  borderColor: item.isShared
                    ? "rgba(168,85,247,0.55)"
                    : "rgba(255,255,255,0.10)",
                  backgroundColor: item.isShared
                    ? "rgba(168,85,247,0.08)"
                    : undefined,
                }}
              >
                <Pressable onPress={() => handleOpen(item)}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                    <Text style={{ fontSize: 24 }}>{getEmoji(item)}</Text>

                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                        <Text
                          style={{
                            color: theme.colors.text,
                            fontWeight: "800",
                            fontSize: 16,
                            flex: 1,
                          }}
                          numberOfLines={1}
                        >
                          {decodeName(item.originalName)}
                        </Text>

                        {item.isShared ? (
                          <View
                            style={{
                              paddingHorizontal: 10,
                              paddingVertical: 4,
                              borderRadius: 999,
                              backgroundColor: "rgba(168,85,247,0.20)",
                              borderWidth: 1,
                              borderColor: "rgba(168,85,247,0.45)",
                            }}
                          >
                            <Text
                              style={{
                                color: "#e9d5ff",
                                fontSize: 12,
                                fontWeight: "800",
                              }}
                            >
                              Partagé
                            </Text>
                          </View>
                        ) : null}
                      </View>

                      <Text style={{ color: theme.colors.muted, marginTop: 4 }}>
                        {item.type === "folder"
                          ? item.isShared
                            ? "Dossier partagé avec vous"
                            : "Dossier"
                          : item.isShared
                          ? `Fichier partagé avec vous • ${formatSize(item.size)}`
                          : `${item.mimeType || "Fichier"} • ${formatSize(item.size)}`}
                      </Text>

                      {item.isShared ? (
                        <Text
                          style={{
                            color: "#c4b5fd",
                            marginTop: 6,
                            fontSize: 13,
                            fontWeight: "700",
                          }}
                        >
                          Cet élément provient d’un partage interne.
                        </Text>
                      ) : null}
                    </View>
                  </View>
                </Pressable>

                <View style={{ flexDirection: "row", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
                  <Pressable
                    onPress={() => handleDownload(item)}
                    disabled={downloading}
                    style={{
                      flex: 1,
                      minWidth: 90,
                      paddingVertical: 10,
                      borderRadius: 12,
                      alignItems: "center",
                      backgroundColor: "rgba(96,165,250,0.18)",
                      borderWidth: 1,
                      borderColor: "rgba(96,165,250,0.35)",
                      opacity: downloading ? 0.6 : 1,
                    }}
                  >
                    <Text style={{ color: theme.colors.text, fontWeight: "700" }}>
                      {downloading ? "..." : "Télécharger"}
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={() => {
                      setRenameTarget(item);
                      setRenameValue(decodeName(item.originalName));
                      setRenameOpen(true);
                    }}
                    style={{
                      flex: 1,
                      minWidth: 90,
                      paddingVertical: 10,
                      borderRadius: 12,
                      alignItems: "center",
                      backgroundColor: "rgba(255,255,255,0.06)",
                      borderWidth: 1,
                      borderColor: "rgba(255,255,255,0.10)",
                    }}
                  >
                    <Text style={{ color: theme.colors.text, fontWeight: "700" }}>Renommer</Text>
                  </Pressable>

                  <Pressable
                    onPress={() => openMoveModal(item)}
                    style={{
                      flex: 1,
                      minWidth: 90,
                      paddingVertical: 10,
                      borderRadius: 12,
                      alignItems: "center",
                      backgroundColor: "rgba(255,255,255,0.06)",
                      borderWidth: 1,
                      borderColor: "rgba(255,255,255,0.10)",
                      opacity: item.isShared ? 0.65 : 1,
                    }}
                  >
                    <Text style={{ color: theme.colors.text, fontWeight: "700" }}>
                      Déplacer
                    </Text>
                  </Pressable>


                  <Pressable
                    onPress={() => handleShare(item)}
                    style={{
                      flex: 1,
                      minWidth: 90,
                      paddingVertical: 10,
                      borderRadius: 12,
                      alignItems: "center",
                      backgroundColor: "rgba(34,197,94,0.18)",
                      borderWidth: 1,
                      borderColor: "rgba(34,197,94,0.35)",
                    }}
                  >
                    <Text style={{ color: "#bbf7d0", fontWeight: "700" }}>Partager</Text>
                  </Pressable>

                  <Pressable
                    onPress={() => handleDelete(item)}
                    style={{
                      flex: 1,
                      minWidth: 90,
                      paddingVertical: 10,
                      borderRadius: 12,
                      alignItems: "center",
                      backgroundColor: "rgba(255,107,107,0.18)",
                      borderWidth: 1,
                      borderColor: "rgba(255,107,107,0.35)",
                    }}
                  >
                    <Text style={{ color: "#ffd4d4", fontWeight: "700" }}>Supprimer</Text>
                  </Pressable>
                </View>
              </Panel>
            )}
          />
        )}
      </View>

      <Modal visible={createOpen} transparent animationType="fade" onRequestClose={() => setCreateOpen(false)}>
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.45)",
            justifyContent: "center",
            padding: 20,
          }}
        >
          <Panel style={{ padding: 16 }}>
            <Text style={{ color: theme.colors.text, fontSize: 22, fontWeight: "900", marginBottom: 12 }}>
              Nouveau dossier
            </Text>

            <TextInput
              value={folderName}
              onChangeText={setFolderName}
              placeholder="Nom du dossier"
              placeholderTextColor="rgba(255,255,255,0.35)"
              style={{
                backgroundColor: "rgba(255,255,255,0.06)",
                borderWidth: 1,
                borderColor: "rgba(255,255,255,0.08)",
                paddingHorizontal: 14,
                paddingVertical: 12,
                borderRadius: 14,
                color: theme.colors.text,
              }}
            />

            <View style={{ flexDirection: "row", gap: 10, marginTop: 14 }}>
              <Pressable
                onPress={() => setCreateOpen(false)}
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  borderRadius: 12,
                  alignItems: "center",
                  backgroundColor: "rgba(255,255,255,0.06)",
                }}
              >
                <Text style={{ color: theme.colors.text, fontWeight: "700" }}>Annuler</Text>
              </Pressable>

              <Pressable
                onPress={handleCreateFolder}
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  borderRadius: 12,
                  alignItems: "center",
                  backgroundColor: "rgba(96,165,250,0.95)",
                }}
              >
                <Text style={{ color: "rgba(0,0,0,0.85)", fontWeight: "900" }}>Créer</Text>
              </Pressable>
            </View>
          </Panel>
        </View>
      </Modal>

      <Modal visible={renameOpen} transparent animationType="fade" onRequestClose={() => setRenameOpen(false)}>
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.45)",
            justifyContent: "center",
            padding: 20,
          }}
        >
          <Panel style={{ padding: 16 }}>
            <Text style={{ color: theme.colors.text, fontSize: 22, fontWeight: "900", marginBottom: 12 }}>
              Renommer
            </Text>

            <TextInput
              value={renameValue}
              onChangeText={setRenameValue}
              placeholder="Nouveau nom"
              placeholderTextColor="rgba(255,255,255,0.35)"
              style={{
                backgroundColor: "rgba(255,255,255,0.06)",
                borderWidth: 1,
                borderColor: "rgba(255,255,255,0.08)",
                paddingHorizontal: 14,
                paddingVertical: 12,
                borderRadius: 14,
                color: theme.colors.text,
              }}
            />

            <View style={{ flexDirection: "row", gap: 10, marginTop: 14 }}>
              <Pressable
                onPress={() => setRenameOpen(false)}
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  borderRadius: 12,
                  alignItems: "center",
                  backgroundColor: "rgba(255,255,255,0.06)",
                }}
              >
                <Text style={{ color: theme.colors.text, fontWeight: "700" }}>Annuler</Text>
              </Pressable>

              <Pressable
                onPress={handleRename}
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  borderRadius: 12,
                  alignItems: "center",
                  backgroundColor: "rgba(96,165,250,0.95)",
                }}
              >
                <Text style={{ color: "rgba(0,0,0,0.85)", fontWeight: "900" }}>Enregistrer</Text>
              </Pressable>
            </View>
          </Panel>
        </View>
      </Modal>

      <Modal visible={shareOpen} transparent animationType="slide" onRequestClose={closeShareModal}>
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.45)",
            justifyContent: "center",
            padding: 20,
          }}
        >
          <Panel style={{ maxHeight: "85%", padding: 16 }}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={{ color: theme.colors.text, fontSize: 22, fontWeight: "900", marginBottom: 8 }}>
                Partager
              </Text>

              <Text style={{ color: theme.colors.muted, marginBottom: 14 }}>
                {shareTarget ? decodeName(shareTarget.originalName) : ""}
              </Text>

              <Text style={{ color: theme.colors.text, fontWeight: "800", marginBottom: 8 }}>
                Lien public
              </Text>

              <TextInput
                value={shareExpiresAt}
                onChangeText={setShareExpiresAt}
                placeholder="Expiration optionnelle, ex: 30/06/2026 23:59"

                placeholderTextColor="rgba(255,255,255,0.35)"
                style={{
                  backgroundColor: "rgba(255,255,255,0.06)",
                  borderWidth: 1,
                  borderColor: "rgba(255,255,255,0.08)",
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                  borderRadius: 14,
                  color: theme.colors.text,
                  marginBottom: 10,
                }}
              />
              <Text style={{ color: theme.colors.muted, marginBottom: 10, fontSize: 12 }}>
                Format attendu : JJ/MM/AAAA HH:mm. Exemple : 30/06/2026 23:59
              </Text>

              <TextInput
                value={sharePassword}
                onChangeText={setSharePassword}
                placeholder="Mot de passe optionnel"
                placeholderTextColor="rgba(255,255,255,0.35)"
                secureTextEntry
                style={{
                  backgroundColor: "rgba(255,255,255,0.06)",
                  borderWidth: 1,
                  borderColor: "rgba(255,255,255,0.08)",
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                  borderRadius: 14,
                  color: theme.colors.text,
                  marginBottom: 10,
                }}
              />
              <Text style={{ color: theme.colors.muted, marginBottom: 10, fontSize: 12 }}>
               Si renseigné : 8 caractères minimum, majuscule, minuscule,
                chiffre et caractère spécial.
              </Text>

              <Pressable
                onPress={handleCreatePublicShare}
                disabled={shareLoading}
                style={{
                  paddingVertical: 12,
                  borderRadius: 12,
                  alignItems: "center",
                  backgroundColor: "rgba(34,197,94,0.18)",
                  borderWidth: 1,
                  borderColor: "rgba(34,197,94,0.35)",
                  opacity: shareLoading ? 0.6 : 1,
                  marginBottom: 12,
                }}
              >
                <Text style={{ color: "#bbf7d0", fontWeight: "900" }}>
                  {shareLoading ? "Création..." : "Créer un lien public"}
                </Text>
              </Pressable>

              {shareLink ? (
                <Panel style={{ padding: 12, marginBottom: 16 }}>
                  <Text style={{ color: theme.colors.muted, marginBottom: 8 }}>Lien généré :</Text>
                  <Text style={{ color: theme.colors.text, fontWeight: "700" }}>{shareLink}</Text>

                  <Pressable
                    onPress={handleShareGeneratedLink}
                    style={{
                      marginTop: 12,
                      paddingVertical: 10,
                      borderRadius: 12,
                      alignItems: "center",
                      backgroundColor: "rgba(96,165,250,0.95)",
                    }}
                  >
                    <Text style={{ color: "rgba(0,0,0,0.85)", fontWeight: "900" }}>
                      Partager ce lien
                    </Text>
                  </Pressable>
                </Panel>
              ) : null}

              <Text style={{ color: theme.colors.text, fontWeight: "800", marginBottom: 8 }}>
                Partage interne
              </Text>

              <TextInput
                value={shareToEmail}
                onChangeText={setShareToEmail}
                placeholder="Email du destinataire"
                placeholderTextColor="rgba(255,255,255,0.35)"
                autoCapitalize="none"
                keyboardType="email-address"
                style={{
                  backgroundColor: "rgba(255,255,255,0.06)",
                  borderWidth: 1,
                  borderColor: "rgba(255,255,255,0.08)",
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                  borderRadius: 14,
                  color: theme.colors.text,
                  marginBottom: 10,
                }}
              />

              <Pressable
                onPress={handleCreateInternalShare}
                disabled={shareLoading}
                style={{
                  paddingVertical: 12,
                  borderRadius: 12,
                  alignItems: "center",
                  backgroundColor: "rgba(96,165,250,0.18)",
                  borderWidth: 1,
                  borderColor: "rgba(96,165,250,0.35)",
                  opacity: shareLoading ? 0.6 : 1,
                }}
              >
                <Text style={{ color: theme.colors.text, fontWeight: "900" }}>
                  {shareLoading ? "Partage..." : "Partager en interne"}
                </Text>
              </Pressable>

              <Pressable
                onPress={closeShareModal}
                style={{
                  marginTop: 14,
                  paddingVertical: 12,
                  borderRadius: 12,
                  alignItems: "center",
                  backgroundColor: "rgba(255,255,255,0.06)",
                }}
              >
                <Text style={{ color: theme.colors.text, fontWeight: "700" }}>Fermer</Text>
              </Pressable>
            </ScrollView>
          </Panel>
        </View>
      </Modal>

      <Modal visible={moveOpen} transparent animationType="slide" onRequestClose={closeMoveModal}>
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.45)",
            justifyContent: "center",
            padding: 20,
          }}
        >
          <Panel style={{ maxHeight: "85%", padding: 16 }}>
            <Text style={{ color: theme.colors.text, fontSize: 22, fontWeight: "900", marginBottom: 8 }}>
              Déplacer
            </Text>

            <Text style={{ color: theme.colors.muted, marginBottom: 12 }}>
              {moveTarget ? `Élément : ${decodeName(moveTarget.originalName)}` : ""}
            </Text>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
              <View style={{ flexDirection: "row", gap: 8 }}>
                <Pressable
                  onPress={() => loadMoveFolders(null)}
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    borderRadius: 999,
                    backgroundColor: "rgba(255,255,255,0.06)",
                    borderWidth: 1,
                    borderColor: "rgba(255,255,255,0.10)",
                  }}
                >
                  <Text style={{ color: theme.colors.text, fontWeight: "700" }}>Racine</Text>
                </Pressable>

                {moveBreadcrumbs.map((crumb) => (
                  <Pressable
                    key={crumb.id}
                    onPress={() => loadMoveFolders(crumb.id)}
                    style={{
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                      borderRadius: 999,
                      backgroundColor: "rgba(255,255,255,0.06)",
                      borderWidth: 1,
                      borderColor: "rgba(255,255,255,0.10)",
                    }}
                  >
                    <Text style={{ color: theme.colors.text, fontWeight: "700" }}>{crumb.name}</Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>

            <View style={{ flexDirection: "row", gap: 10, marginBottom: 12 }}>
              <Pressable
                onPress={() => handleConfirmMove(null)}
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  borderRadius: 12,
                  alignItems: "center",
                  backgroundColor: "rgba(96,165,250,0.18)",
                  borderWidth: 1,
                  borderColor: "rgba(96,165,250,0.35)",
                }}
              >
                <Text style={{ color: theme.colors.text, fontWeight: "700" }}>Déplacer à la racine</Text>
              </Pressable>

              {moveCurrentParentId ? (
                <Pressable
                  onPress={goBackMoveFolder}
                  style={{
                    flex: 1,
                    paddingVertical: 12,
                    borderRadius: 12,
                    alignItems: "center",
                    backgroundColor: "rgba(255,255,255,0.06)",
                    borderWidth: 1,
                    borderColor: "rgba(255,255,255,0.10)",
                  }}
                >
                  <Text style={{ color: theme.colors.text, fontWeight: "700" }}>Retour</Text>
                </Pressable>
              ) : null}
            </View>

            {moveLoading ? (
              <View style={{ paddingVertical: 30, alignItems: "center" }}>
                <ActivityIndicator />
              </View>
            ) : moveFolders.length === 0 ? (
              <Panel style={{ padding: 14 }}>
                <Text style={{ color: theme.colors.muted }}>Aucun dossier disponible ici.</Text>
              </Panel>
            ) : (
              <ScrollView style={{ maxHeight: 320 }} showsVerticalScrollIndicator={false}>
                {moveFolders.map((folder) => (
                  <Panel key={folder.id} style={{ padding: 14, marginBottom: 10 }}>
                    <Pressable onPress={() => loadMoveFolders(folder.id)}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                        <Text style={{ fontSize: 24 }}>📁</Text>
                        <View style={{ flex: 1 }}>
                          <Text
                            style={{ color: theme.colors.text, fontWeight: "800", fontSize: 16 }}
                            numberOfLines={1}
                          >
                            {decodeName(folder.originalName)}
                          </Text>
                        </View>
                      </View>
                    </Pressable>

                    <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
                      <Pressable
                        onPress={() => handleConfirmMove(folder.id)}
                        style={{
                          flex: 1,
                          paddingVertical: 10,
                          borderRadius: 12,
                          alignItems: "center",
                          backgroundColor: "rgba(96,165,250,0.95)",
                        }}
                      >
                        <Text style={{ color: "rgba(0,0,0,0.85)", fontWeight: "900" }}>
                          Déplacer ici
                        </Text>
                      </Pressable>

                      <Pressable
                        onPress={() => loadMoveFolders(folder.id)}
                        style={{
                          flex: 1,
                          paddingVertical: 10,
                          borderRadius: 12,
                          alignItems: "center",
                          backgroundColor: "rgba(255,255,255,0.06)",
                          borderWidth: 1,
                          borderColor: "rgba(255,255,255,0.10)",
                        }}
                      >
                        <Text style={{ color: theme.colors.text, fontWeight: "700" }}>Ouvrir</Text>
                      </Pressable>
                    </View>
                  </Panel>
                ))}
              </ScrollView>
            )}

            <Pressable
              onPress={closeMoveModal}
              style={{
                marginTop: 14,
                paddingVertical: 12,
                borderRadius: 12,
                alignItems: "center",
                backgroundColor: "rgba(255,255,255,0.06)",
              }}
            >
              <Text style={{ color: theme.colors.text, fontWeight: "700" }}>Fermer</Text>
            </Pressable>
          </Panel>
        </View>
      </Modal>

      <Modal visible={previewOpen} transparent={false} animationType="slide" onRequestClose={closePreview}>
        <Screen>
          <View style={{ flex: 1 }}>
            <View
              style={{
                paddingHorizontal: 16,
                paddingTop: 10,
                paddingBottom: 12,
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <View style={{ flex: 1, paddingRight: 10 }}>
                <Text
                  style={{ color: theme.colors.text, fontSize: 22, fontWeight: "900" }}
                  numberOfLines={1}
                >
                  {previewItem ? decodeName(previewItem.originalName) : "Prévisualisation"}
                </Text>
              </View>

              <Pressable
                onPress={closePreview}
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 10,
                  borderRadius: 12,
                  backgroundColor: "rgba(255,255,255,0.06)",
                  borderWidth: 1,
                  borderColor: "rgba(255,255,255,0.10)",
                }}
              >
                <Text style={{ color: theme.colors.text, fontWeight: "800" }}>Fermer</Text>
              </Pressable>
            </View>

            <View style={{ flex: 1, paddingHorizontal: 16, paddingBottom: 16 }}>
              <Panel style={{ flex: 1, padding: 12 }}>
                {previewLoading ? (
                  <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
                    <ActivityIndicator />
                    <Text style={{ color: theme.colors.muted, marginTop: 10 }}>Chargement...</Text>
                  </View>
                ) : previewItem && isTextFile(previewItem) ? (
                  <ScrollView
                    style={{ flex: 1 }}
                    contentContainerStyle={{ paddingBottom: 24 }}
                    showsVerticalScrollIndicator={false}
                  >
                    <Text style={{ color: theme.colors.text, fontSize: 15, lineHeight: 22 }}>
                      {previewTextContent}
                    </Text>
                  </ScrollView>
                ) : previewItem && previewToken && isVideoFile(previewItem) ? (
                  <Video
                    source={{
                      uri: getPreviewUrl(previewItem.id),
                      headers: {
                        Authorization: `Bearer ${previewToken}`,
                      },
                    }}
                    useNativeControls
                    resizeMode={ResizeMode.CONTAIN}
                    style={{ width: "100%", height: 300 }}
                  />
                ) : previewItem && previewToken && isAudioFile(previewItem) ? (
                  <Video
                    source={{
                      uri: getPreviewUrl(previewItem.id),
                      headers: {
                        Authorization: `Bearer ${previewToken}`,
                      },
                    }}
                    useNativeControls
                    style={{ width: "100%", height: 100 }}
                  />
                ) : previewItem && previewToken ? (
                  <WebView
                    source={{
                      uri: getPreviewUrl(previewItem.id),
                      headers: {
                        Authorization: `Bearer ${previewToken}`,
                      },
                    }}
                    style={{ flex: 1, backgroundColor: "transparent" }}
                    allowsInlineMediaPlayback
                    mediaPlaybackRequiresUserAction={false}
                    startInLoadingState
                  />
                ) : (
                  <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
                    <Text style={{ color: theme.colors.muted }}>Impossible d’afficher ce fichier.</Text>
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

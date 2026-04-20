import React, { useEffect, useMemo, useState } from "react";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { getDownloadUrl, getFolderDownloadUrl } from "../services/files";
import { uploadFile } from "../services/files";
import { WebView } from "react-native-webview";
import { getAccessToken } from "../services/secureStore";
import { getPreviewText, getPreviewUrl } from "../services/files";
import { Video, ResizeMode } from "expo-av";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import Screen from "../components/Screen";
import Panel from "../components/Panel";
import { theme } from "../theme/theme";
import {
  BreadcrumbItem,
  FileItem,
  createFolder,
  getBreadcrumbs,
  listFiles,
  renameItem,
  softDeleteItem,
} from "../services/files";

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

  const [downloading, setDownloading] = useState(false);

  const [uploading, setUploading] = useState(false);

  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) => {
      if (a.type === "folder" && b.type !== "folder") return -1;
      if (a.type !== "folder" && b.type === "folder") return 1;
      return a.originalName.localeCompare(b.originalName);
    });
  }, [items]);

  async function handleDownload(item: FileItem) {
    try {
      setDownloading(true);

      const token = await getAccessToken();
      if (!token) {
        Alert.alert("Erreur", "Session expirée. Reconnecte-toi.");
        return;
      }

      const safeName = decodeName(item.originalName).replace(/[\\/:*?"<>|]+/g, "_");
      const fileName =
        item.type === "folder"
          ? `${safeName}.zip`
          : safeName || `download-${item.id}`;

      const downloadUrl =
        item.type === "folder"
          ? getFolderDownloadUrl(item.id)
          : getDownloadUrl(item.id);

      const targetUri = `${FileSystem.cacheDirectory}${fileName}`;

      const result = await FileSystem.downloadAsync(downloadUrl, targetUri, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const canShare = await Sharing.isAvailableAsync();

      if (canShare) {
        await Sharing.shareAsync(result.uri, {
          mimeType:
            item.type === "folder"
              ? "application/zip"
              : item.mimeType || "application/octet-stream",
          dialogTitle: decodeName(item.originalName),
        });
      } else {
        Alert.alert("Téléchargement terminé", `Fichier enregistré : ${result.uri}`);
      }
    } catch (e: any) {
      Alert.alert(
        "Erreur",
        e?.message || "Téléchargement impossible."
      );
    } finally {
      setDownloading(false);
    }
  }

  function isTextFile(item: FileItem) {
    return (
      item.mimeType?.startsWith("text/") ||
      item.mimeType === "application/json"
    );
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

      await uploadFile(
        {
          uri: picked.uri,
          name: picked.name,
          mimeType: picked.mimeType,
        },
        currentParentId
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
    }
  }

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
      setError(
        e?.response?.data?.error ||
          e?.response?.data?.message ||
          e?.message ||
          "Impossible de charger les fichiers."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadFolder(null);
  }, []);

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

   function decodeName(name: string) {
     try {
       return decodeURIComponent(name);
     } catch {
       return name;
     }
   }

  async function handleDelete(item: FileItem) {
    Alert.alert(
      "Supprimer",
      `Voulez-vous supprimer "${decodeName(item.originalName)}" ?`,
      [
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
      ]
    );
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
          <Text style={{ color: theme.colors.muted }}>
            Gère tes dossiers et fichiers.
          </Text>

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
                  <Text style={{ color: theme.colors.text, fontWeight: "700" }}>
                    {crumb.name}
                  </Text>
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
        </View>

        {loading ? (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
            <ActivityIndicator />
          </View>
        ) : (
          <FlatList
            data={sortedItems}
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
                  Aucun fichier ou dossier ici.
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
              <Panel style={{ padding: 14, marginBottom: 12 }}>
                <Pressable onPress={() => handleOpen(item)}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                    <Text style={{ fontSize: 24 }}>{getEmoji(item)}</Text>

                    <View style={{ flex: 1 }}>
                      <Text
                        style={{ color: theme.colors.text, fontWeight: "800", fontSize: 16 }}
                        numberOfLines={1}
                      >
                        {decodeName(item.originalName)}
                      </Text>

                      <Text style={{ color: theme.colors.muted, marginTop: 4 }}>
                        {item.type === "folder"
                          ? "Dossier"
                          : `${item.mimeType || "Fichier"} • ${formatSize(item.size)}`}
                      </Text>
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
      </View>

      <Modal
        visible={previewOpen}
        transparent={false}
        animationType="slide"
        onRequestClose={closePreview}
      >
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
                    <Text style={{ color: theme.colors.muted, marginTop: 10 }}>
                      Chargement...
                    </Text>
                  </View>
                ) : previewItem && isTextFile(previewItem) ? (
                  <ScrollView
                    style={{ flex: 1 }}
                    contentContainerStyle={{ paddingBottom: 24 }}
                    showsVerticalScrollIndicator={false}
                  >
                    <Text
                      style={{
                        color: theme.colors.text,
                        fontSize: 15,
                        lineHeight: 22,
                      }}
                    >
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
                    <Text style={{ color: theme.colors.muted }}>
                      Impossible d’afficher ce fichier.
                    </Text>
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
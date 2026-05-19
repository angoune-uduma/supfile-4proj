import { useFocusEffect } from "@react-navigation/native";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  Text,
  View,
} from "react-native";

import Screen from "../components/Screen";
import Panel from "../components/Panel";
import { theme } from "../theme/theme";

import {
  FileItem,
  emptyTrash,
  hardDeleteItem,
  listTrash,
  restoreItem,
} from "../services/files";

function formatSize(bytes: number) {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

function getEmoji(item: FileItem) {
  if (item.type === "folder") return "🗂️";
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

function getApiError(e: any, fallback: string) {
  return (
    e?.response?.data?.error ||
    e?.response?.data?.message ||
    e?.message ||
    fallback
  );
}

function showFriendlyError(error: string, fallback: string) {
  if (error === "INVALID_TOKEN") {
    Alert.alert(
      "Session expirée",
      "Ta session n’est plus valide. Déconnecte-toi puis reconnecte-toi."
    );
    return;
  }

  if (error === "NOT_FOUND" || error === "NOT_FOUND_IN_TRASH") {
    Alert.alert(
      "Élément introuvable",
      "Cet élément n’est plus disponible dans la corbeille. La liste va être actualisée."
    );
    return;
  }

  Alert.alert("Erreur", error || fallback);
}

export default function TrashScreen() {
  const [items, setItems] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionItemId, setActionItemId] = useState<string | null>(null);
  const [emptying, setEmptying] = useState(false);

  async function loadTrash(isRefresh = false) {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const data = await listTrash();
      setItems(data.items || []);
    } catch (e: any) {
      const error = getApiError(e, "Impossible de charger la corbeille.");
      showFriendlyError(error, "Impossible de charger la corbeille.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useFocusEffect(
    useCallback(() => {
      loadTrash();
    }, [])
  );

  async function handleRestore(item: FileItem) {
    if (actionItemId) return;

    try {
      setActionItemId(item.id);

      await restoreItem(item.id);

      setItems((currentItems) =>
        currentItems.filter((currentItem) => currentItem.id !== item.id)
      );

      await loadTrash();

      Alert.alert("Succès", "Élément restauré.");
    } catch (e: any) {
      const error = getApiError(e, "Restauration impossible.");

      if (error === "NOT_FOUND" || error === "NOT_FOUND_IN_TRASH") {
        setItems((currentItems) =>
          currentItems.filter((currentItem) => currentItem.id !== item.id)
        );

        await loadTrash();

        Alert.alert(
          "Élément déjà traité",
          "Cet élément n’est plus dans la corbeille. La liste a été actualisée."
        );

        return;
      }

      showFriendlyError(error, "Restauration impossible.");
    } finally {
      setActionItemId(null);
    }
  }

  async function handleHardDelete(item: FileItem) {
    if (actionItemId) return;

    Alert.alert(
      "Suppression définitive",
      `Supprimer définitivement "${decodeName(item.originalName)}" ?`,
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Supprimer",
          style: "destructive",
          onPress: async () => {
            try {
              setActionItemId(item.id);

              await hardDeleteItem(item.id);

              setItems((currentItems) =>
                currentItems.filter((currentItem) => currentItem.id !== item.id)
              );

              await loadTrash();
            } catch (e: any) {
              const error = getApiError(e, "Suppression définitive impossible.");

              if (error === "NOT_FOUND" || error === "NOT_FOUND_IN_TRASH") {
                setItems((currentItems) =>
                  currentItems.filter((currentItem) => currentItem.id !== item.id)
                );

                await loadTrash();

                Alert.alert(
                  "Élément déjà traité",
                  "Cet élément n’est plus dans la corbeille. La liste a été actualisée."
                );

                return;
              }

              showFriendlyError(error, "Suppression définitive impossible.");
            } finally {
              setActionItemId(null);
            }
          },
        },
      ]
    );
  }

  async function handleEmptyTrash() {
    if (emptying) return;

    Alert.alert(
      "Vider la corbeille",
      "Supprimer définitivement tous les éléments ?",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Vider",
          style: "destructive",
          onPress: async () => {
            try {
              setEmptying(true);

              await emptyTrash();

              setItems([]);

              await loadTrash();

              Alert.alert("Succès", "Corbeille vidée.");
            } catch (e: any) {
              const error = getApiError(e, "Impossible de vider la corbeille.");
              showFriendlyError(error, "Impossible de vider la corbeille.");
            } finally {
              setEmptying(false);
            }
          },
        },
      ]
    );
  }

  return (
    <Screen>
      <View style={{ flex: 1 }}>
        <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8, gap: 10 }}>
          <Text style={{ color: theme.colors.text, fontSize: 32, fontWeight: "900" }}>
            Corbeille
          </Text>

          <Text style={{ color: theme.colors.muted }}>
            Éléments supprimés récemment.
          </Text>

          <Pressable
            onPress={handleEmptyTrash}
            disabled={emptying || items.length === 0}
            style={{
              paddingVertical: 12,
              borderRadius: 14,
              alignItems: "center",
              backgroundColor: "rgba(255,107,107,0.18)",
              borderWidth: 1,
              borderColor: "rgba(255,107,107,0.35)",
              opacity: emptying || items.length === 0 ? 0.45 : 1,
            }}
          >
            <Text style={{ color: "#ffd4d4", fontWeight: "800" }}>
              {emptying ? "Vidage..." : "Vider la corbeille"}
            </Text>
          </Pressable>
        </View>

        {loading ? (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
            <ActivityIndicator />
          </View>
        ) : (
          <FlatList
            data={items}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => loadTrash(true)}
              />
            }
            ListEmptyComponent={
              <Panel style={{ padding: 16 }}>
                <Text style={{ color: theme.colors.muted }}>
                  La corbeille est vide.
                </Text>
              </Panel>
            }
            renderItem={({ item }) => {
              const isActing = actionItemId === item.id;

              return (
                <Panel style={{ padding: 14, marginBottom: 12 }}>
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

                  <View style={{ flexDirection: "row", gap: 8, marginTop: 14 }}>
                    <Pressable
                      onPress={() => handleRestore(item)}
                      disabled={isActing}
                      style={{
                        flex: 1,
                        paddingVertical: 10,
                        borderRadius: 12,
                        alignItems: "center",
                        backgroundColor: "rgba(96,165,250,0.18)",
                        borderWidth: 1,
                        borderColor: "rgba(96,165,250,0.35)",
                        opacity: isActing ? 0.5 : 1,
                      }}
                    >
                      <Text style={{ color: theme.colors.text, fontWeight: "700" }}>
                        {isActing ? "..." : "Restaurer"}
                      </Text>
                    </Pressable>

                    <Pressable
                      onPress={() => handleHardDelete(item)}
                      disabled={isActing}
                      style={{
                        flex: 1,
                        paddingVertical: 10,
                        borderRadius: 12,
                        alignItems: "center",
                        backgroundColor: "rgba(255,107,107,0.18)",
                        borderWidth: 1,
                        borderColor: "rgba(255,107,107,0.35)",
                        opacity: isActing ? 0.5 : 1,
                      }}
                    >
                      <Text style={{ color: "#ffd4d4", fontWeight: "700" }}>
                        {isActing ? "..." : "Supprimer"}
                      </Text>
                    </Pressable>
                  </View>
                </Panel>
              );
            }}
          />
        )}
      </View>
    </Screen>
  );
}
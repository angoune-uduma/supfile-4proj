import { useFocusEffect } from "@react-navigation/native";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator, Alert, FlatList, Pressable,
  RefreshControl, Text, View,
} from "react-native";
import Screen from "../components/Screen";
import Panel from "../components/Panel";
import { useThemeMode } from "../theme/ThemeContext";
import { buildTheme } from "../theme/theme";
import { FileItem, emptyTrash, hardDeleteItem, listTrash, restoreItem } from "../services/files";

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
  try { return decodeURIComponent(name); } catch { return name; }
}
function getApiError(e: any, fallback: string) {
  return e?.response?.data?.error || e?.response?.data?.message || e?.message || fallback;
}

export default function TrashScreen() {
  const { mode } = useThemeMode();
  const theme = buildTheme(mode);
  const c = theme.colors;

  const [items, setItems] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionItemId, setActionItemId] = useState<string | null>(null);
  const [emptying, setEmptying] = useState(false);

  async function loadTrash(isRefresh = false) {
    try {
      isRefresh ? setRefreshing(true) : setLoading(true);
      const data = await listTrash();
      setItems(data.items || []);
    } catch (e: any) {
      Alert.alert("Erreur", getApiError(e, "Impossible de charger la corbeille."));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useFocusEffect(useCallback(() => { loadTrash(); }, []));

  async function handleRestore(item: FileItem) {
    if (actionItemId) return;
    try {
      setActionItemId(item.id);
      await restoreItem(item.id);
      await loadTrash();
      Alert.alert("Succès", "Élément restauré.");
    } catch (e: any) {
      Alert.alert("Erreur", getApiError(e, "Restauration impossible."));
    } finally {
      setActionItemId(null);
    }
  }

  async function handleHardDelete(item: FileItem) {
    if (actionItemId) return;
    Alert.alert("Suppression définitive", `Supprimer définitivement "${decodeName(item.originalName)}" ?`, [
      { text: "Annuler", style: "cancel" },
      {
        text: "Supprimer", style: "destructive",
        onPress: async () => {
          try {
            setActionItemId(item.id);
            await hardDeleteItem(item.id);
            await loadTrash();
          } catch (e: any) {
            Alert.alert("Erreur", getApiError(e, "Suppression définitive impossible."));
          } finally {
            setActionItemId(null);
          }
        },
      },
    ]);
  }

  async function handleEmptyTrash() {
    if (emptying) return;
    Alert.alert("Vider la corbeille", "Supprimer définitivement tous les éléments ?", [
      { text: "Annuler", style: "cancel" },
      {
        text: "Vider", style: "destructive",
        onPress: async () => {
          try {
            setEmptying(true);
            await emptyTrash();
            setItems([]);
            Alert.alert("Succès", "Corbeille vidée.");
          } catch (e: any) {
            Alert.alert("Erreur", getApiError(e, "Impossible de vider la corbeille."));
          } finally {
            setEmptying(false);
          }
        },
      },
    ]);
  }

  return (
    <Screen>
      <View style={{ flex: 1 }}>
        <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8, gap: 10 }}>
          <Text style={{ color: c.text, fontSize: 32, fontWeight: "900" }}>Corbeille</Text>
          <Text style={{ color: c.textSecondary }}>Éléments supprimés récemment.</Text>
          <Pressable
            onPress={handleEmptyTrash}
            disabled={emptying || items.length === 0}
            style={{
              paddingVertical: 12, borderRadius: 14, alignItems: "center",
              backgroundColor: "#e53e3e22", borderWidth: 1, borderColor: "#e53e3e",
              opacity: emptying || items.length === 0 ? 0.45 : 1,
            }}
          >
            <Text style={{ color: "#e53e3e", fontWeight: "800" }}>
              {emptying ? "Vidage..." : "Vider la corbeille"}
            </Text>
          </Pressable>
        </View>

        {loading ? (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
            <ActivityIndicator color={c.primary} />
          </View>
        ) : (
          <FlatList
            data={items}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadTrash(true)} />}
            ListEmptyComponent={
              <Panel style={{ padding: 16 }}>
                <Text style={{ color: c.textSecondary }}>La corbeille est vide.</Text>
              </Panel>
            }
            renderItem={({ item }) => {
              const isActing = actionItemId === item.id;
              return (
                <Panel style={{ padding: 14, marginBottom: 12 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                    <Text style={{ fontSize: 24 }}>{getEmoji(item)}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: c.text, fontWeight: "800", fontSize: 16 }} numberOfLines={1}>
                        {decodeName(item.originalName)}
                      </Text>
                      <Text style={{ color: c.textSecondary, marginTop: 4 }}>
                        {item.type === "folder" ? "Dossier" : `${item.mimeType || "Fichier"} • ${formatSize(item.size)}`}
                      </Text>
                    </View>
                  </View>
                  <View style={{ flexDirection: "row", gap: 8, marginTop: 14 }}>
                    <Pressable
                      onPress={() => handleRestore(item)}
                      disabled={isActing}
                      style={{ flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: "center", backgroundColor: c.surface, borderWidth: 1, borderColor: c.primary, opacity: isActing ? 0.5 : 1 }}
                    >
                      <Text style={{ color: c.primary, fontWeight: "700" }}>
                        {isActing ? "..." : "Restaurer"}
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={() => handleHardDelete(item)}
                      disabled={isActing}
                      style={{ flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: "center", backgroundColor: "#e53e3e22", borderWidth: 1, borderColor: "#e53e3e", opacity: isActing ? 0.5 : 1 }}
                    >
                      <Text style={{ color: "#e53e3e", fontWeight: "700" }}>
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
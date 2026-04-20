import { useFocusEffect } from "@react-navigation/native";
import React, { useCallback, useEffect, useState } from "react";
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
export default function TrashScreen() {
 const [items, setItems] = useState<FileItem[]>([]);
 const [loading, setLoading] = useState(true);
 const [refreshing, setRefreshing] = useState(false);
 async function loadTrash(isRefresh = false) {
   try {
     if (isRefresh) setRefreshing(true);
     else setLoading(true);
     const data = await listTrash();
     setItems(data.items || []);
   } catch (e: any) {
     Alert.alert(
       "Erreur",
       e?.response?.data?.error || e?.response?.data?.message || "Impossible de charger la corbeille."
     );
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
   try {
     await restoreItem(item.id);
     await loadTrash();
     Alert.alert("Succès", "Élément restauré.");
   } catch (e: any) {
     Alert.alert(
       "Erreur",
       e?.response?.data?.error || e?.response?.data?.message || "Restauration impossible."
     );
   }
 }
 async function handleHardDelete(item: FileItem) {
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
             await hardDeleteItem(item.id);
             await loadTrash();
           } catch (e: any) {
             Alert.alert(
               "Erreur",
               e?.response?.data?.error || e?.response?.data?.message || "Suppression définitive impossible."
             );
           }
         },
       },
     ]
   );
 }
 async function handleEmptyTrash() {
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
             await emptyTrash();
             await loadTrash();
             Alert.alert("Succès", "Corbeille vidée.");
           } catch (e: any) {
             Alert.alert(
               "Erreur",
               e?.response?.data?.error || e?.response?.data?.message || "Impossible de vider la corbeille."
             );
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
           style={{
             paddingVertical: 12,
             borderRadius: 14,
             alignItems: "center",
             backgroundColor: "rgba(255,107,107,0.18)",
             borderWidth: 1,
             borderColor: "rgba(255,107,107,0.35)",
           }}
>
<Text style={{ color: "#ffd4d4", fontWeight: "800" }}>Vider la corbeille</Text>
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
           renderItem={({ item }) => (
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
                   style={{
                     flex: 1,
                     paddingVertical: 10,
                     borderRadius: 12,
                     alignItems: "center",
                     backgroundColor: "rgba(96,165,250,0.18)",
                     borderWidth: 1,
                     borderColor: "rgba(96,165,250,0.35)",
                   }}
>
<Text style={{ color: theme.colors.text, fontWeight: "700" }}>Restaurer</Text>
</Pressable>
<Pressable
                   onPress={() => handleHardDelete(item)}
                   style={{
                     flex: 1,
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
</Screen>
 );
}
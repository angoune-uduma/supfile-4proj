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
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import Screen from "../components/Screen";
import Panel from "../components/Panel";
import { theme } from "../theme/theme";
import { getAccessToken } from "../services/secureStore";
import {
 getInternalShareFileUrl,
 getSharesWithMe,
 ShareWithMe,
} from "../services/shares";
function formatDate(value?: string) {
 if (!value) return "—";
 const date = new Date(value);
 if (Number.isNaN(date.getTime())) return value;
 return date.toLocaleString();
}
function safeName(name: string) {
 return name.replace(/[\\/:*?"<>|]+/g, "_");
}
export default function SharedScreen() {
 const navigation = useNavigation<any>();
 const [items, setItems] = useState<ShareWithMe[]>([]);
 const [loading, setLoading] = useState(true);
 const [refreshing, setRefreshing] = useState(false);
 const [downloadingId, setDownloadingId] = useState<string | null>(null);
 const [error, setError] = useState("");
 async function load(isRefresh = false) {
   try {
     setError("");
     if (isRefresh) {
       setRefreshing(true);
     } else {
       setLoading(true);
     }
     const data = await getSharesWithMe();
     setItems(data);
   } catch (e: any) {
     setError(e?.message || "Impossible de charger les partages.");
     setItems([]);
   } finally {
     setLoading(false);
     setRefreshing(false);
   }
 }
 useFocusEffect(
   useCallback(() => {
     load(false);
   }, [])
 );
 async function handleDownloadFile(share: ShareWithMe) {
   if (share.nodeType === "folder") {
     Alert.alert(
       "Dossier partagé",
       "Ce dossier apparaît dans la racine de la page Fichiers. Ouvre l’onglet Fichiers pour le parcourir."
     );
     return;
   }
   try {
     setDownloadingId(share.id);
     const token = await getAccessToken();
     if (!token) {
       Alert.alert("Erreur", "Session expirée. Reconnecte-toi.");
       return;
     }
     const url = getInternalShareFileUrl(share.id, "attachment");
     const fileName = safeName(share.name || `shared-${share.id}`);
     const targetUri = `${FileSystem.cacheDirectory}${fileName}`;
     const result = await FileSystem.downloadAsync(url, targetUri, {
       headers: {
         Authorization: `Bearer ${token}`,
       },
     });
     const canShare = await Sharing.isAvailableAsync();
     if (canShare) {
       await Sharing.shareAsync(result.uri, {
         dialogTitle: share.name,
       });
     } else {
       Alert.alert("Téléchargement terminé", `Fichier enregistré : ${result.uri}`);
     }
   } catch (e: any) {
     Alert.alert("Erreur", e?.message || "Impossible de télécharger le fichier partagé.");
   } finally {
     setDownloadingId(null);
   }
 }
 function openSharedFolder() {
   navigation.navigate("Files");
 }
 return (
<Screen>
<View style={{ flex: 1 }}>
<View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8, gap: 8 }}>
<Text style={{ color: theme.colors.text, fontSize: 32, fontWeight: "900" }}>
           Partagés
</Text>
<Text style={{ color: theme.colors.muted }}>
           Consulte les fichiers et dossiers partagés avec toi.
</Text>
</View>
       {loading ? (
<View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
<ActivityIndicator />
</View>
       ) : (
<FlatList
           data={items}
           keyExtractor={(item) => item.id}
           contentContainerStyle={{ padding: 16, paddingBottom: 120, gap: 12 }}
           refreshControl={
<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />
           }
           ListHeaderComponent={
             error ? (
<Panel style={{ marginBottom: 12, padding: 14 }}>
<Text style={{ color: theme.colors.danger, fontWeight: "700" }}>
                   {error}
</Text>
</Panel>
             ) : null
           }
           ListEmptyComponent={
<Panel style={{ padding: 16 }}>
<Text style={{ color: theme.colors.muted }}>
                 Aucun élément partagé pour le moment.
</Text>
</Panel>
           }
           renderItem={({ item }) => {
             const isFolder = item.nodeType === "folder";
             const isDownloading = downloadingId === item.id;
             return (
<Panel style={{ padding: 14 }}>
<View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
<Text style={{ fontSize: 26 }}>{isFolder ? "📁" : "📄"}</Text>
<View style={{ flex: 1 }}>
<Text
                       style={{
                         color: theme.colors.text,
                         fontWeight: "900",
                         fontSize: 16,
                       }}
                       numberOfLines={1}
>
                       {item.name}
</Text>
<Text style={{ color: theme.colors.muted, marginTop: 4 }}>
                       {isFolder ? "Dossier partagé" : "Fichier partagé"}
</Text>
<Text style={{ color: theme.colors.muted, marginTop: 4 }}>
                       Par : {item.fromUser?.email || "—"}
</Text>
<Text style={{ color: theme.colors.muted, marginTop: 4 }}>
                       Date : {formatDate(item.createdAt)}
</Text>
</View>
</View>
<View style={{ flexDirection: "row", gap: 8, marginTop: 14 }}>
                   {isFolder ? (
<Pressable
                       onPress={openSharedFolder}
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
<Text style={{ color: theme.colors.text, fontWeight: "800" }}>
                         Voir dans Fichiers
</Text>
</Pressable>
                   ) : (
<Pressable
                       onPress={() => handleDownloadFile(item)}
                       disabled={isDownloading}
                       style={{
                         flex: 1,
                         paddingVertical: 10,
                         borderRadius: 12,
                         alignItems: "center",
                         backgroundColor: "rgba(96,165,250,0.18)",
                         borderWidth: 1,
                         borderColor: "rgba(96,165,250,0.35)",
                         opacity: isDownloading ? 0.6 : 1,
                       }}
>
<Text style={{ color: theme.colors.text, fontWeight: "800" }}>
                         {isDownloading ? "Téléchargement..." : "Télécharger"}
</Text>
</Pressable>
                   )}
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
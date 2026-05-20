import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";

import Screen from "../components/Screen";
import Panel from "../components/Panel";
import { useThemeMode } from "../theme/ThemeContext";
import { buildTheme } from "../theme/theme";
import { useAuth } from "../store/AuthContext";

import {
  DashboardRecentFile,
  DashboardUsage,
  fetchActiveSharesCount,
  fetchDashboardRecent,
  fetchDashboardUsage,
  fetchTrashCount,
} from "../services/dashboard";

function formatGb(n: number) {
  return `${n.toFixed(1)} Go`;
}

function formatBytes(bytes: number) {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

function formatDate(value?: string) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function getItemTypeLabel(item: DashboardRecentFile) {
  return item.type === "folder" ? "Dossier" : "Fichier";
}

function Pill({ text, colors }: { text: string; colors: any }) {
  return (
    <View
      style={{
        paddingHorizontal: 10,
        paddingVertical: 7,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.card,
      }}
    >
      <Text style={{ color: colors.text, fontWeight: "700", fontSize: 12 }}>
        {text}
      </Text>
    </View>
  );
}

function StatCard({
  title,
  value,
  subtitle,
  colors,
}: {
  title: string;
  value: string;
  subtitle?: string;
  colors: any;
}) {
  return (
    <Panel style={{ padding: 16, gap: 10 }}>
      <Text style={{ color: colors.textSecondary, fontWeight: "700" }}>{title}</Text>
      <Text style={{ color: colors.text, fontSize: 32, fontWeight: "900" }}>{value}</Text>
      {subtitle ? (
        <Text style={{ color: colors.textSecondary, fontWeight: "700" }}>{subtitle}</Text>
      ) : null}
    </Panel>
  );
}

function SectionTitle({
  title,
  subtitle,
  rightAction,
  colors,
}: {
  title: string;
  subtitle?: string;
  rightAction?: React.ReactNode;
  colors: any;
}) {
  return (
    <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
      <View style={{ flex: 1 }}>
        <Text style={{ color: colors.text, fontWeight: "900", fontSize: 18 }}>{title}</Text>
        {subtitle ? (
          <Text style={{ color: colors.textSecondary, marginTop: 3 }}>{subtitle}</Text>
        ) : null}
      </View>
      {rightAction ?? null}
    </View>
  );
}

export default function DashboardScreen() {
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const { mode } = useThemeMode();
  const theme = buildTheme(mode);
  const c = theme.colors;

  const [usage, setUsage] = useState<DashboardUsage | null>(null);
  const [recentFiles, setRecentFiles] = useState<DashboardRecentFile[]>([]);
  const [activeSharesCount, setActiveSharesCount] = useState(0);
  const [trashCount, setTrashCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  async function loadDashboard(isRefresh = false) {
    try {
      setError("");
      isRefresh ? setRefreshing(true) : setLoading(true);
      const [usageData, recentData, sharesCount, trashData] = await Promise.all([
        fetchDashboardUsage(),
        fetchDashboardRecent(5),
        fetchActiveSharesCount(),
        fetchTrashCount(),
      ]);
      setUsage(usageData);
      setRecentFiles(recentData);
      setActiveSharesCount(sharesCount);
      setTrashCount(trashData);
    } catch (e: any) {
      const apiError =
        e?.response?.data?.error ||
        e?.response?.data?.message ||
        e?.message ||
        "Impossible de charger le dashboard.";
      setError(apiError === "INVALID_TOKEN" ? "Session expirée. Déconnecte-toi puis reconnecte-toi." : apiError);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useFocusEffect(useCallback(() => { loadDashboard(); }, []));

  const breakdown = useMemo(() => {
    if (!usage) return [];
    return [
      { label: "Vidéos",    bytes: usage.byCategory.video },
      { label: "Images",    bytes: usage.byCategory.image },
      { label: "Documents", bytes: usage.byCategory.document },
      { label: "Audio",     bytes: usage.byCategory.audio },
      { label: "Autres",    bytes: usage.byCategory.other },
    ];
  }, [usage]);

  if (loading) {
    return (
      <Screen>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color={c.primary} />
          <Text style={{ color: c.textSecondary, marginTop: 10 }}>
            Chargement du dashboard...
          </Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 18, paddingBottom: 120, gap: 14 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadDashboard(true)} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={{ gap: 6, marginBottom: 6 }}>
          <Text style={{ color: c.text, fontSize: 40, fontWeight: "900" }}>Dashboard</Text>
          <Text style={{ color: c.textSecondary }}>
            Vue rapide de votre espace de stockage et de vos fichiers récents.
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 8, marginTop: 10 }}>
            {user?.email ? <Pill text={user.email} colors={c} /> : null}
            <Pill text="Quota : 30 Go" colors={c} />
          </View>
        </View>

        {/* Erreur */}
        {error ? (
          <Panel style={{ padding: 14 }}>
            <Text style={{ color: c.primary, fontWeight: "800" }}>{error}</Text>
          </Panel>
        ) : null}

        {/* Espace utilisé */}
        <Panel style={{ padding: 16, gap: 14 }}>
          <Text style={{ color: c.textSecondary, fontWeight: "700" }}>Espace utilisé</Text>

          <Text style={{ color: c.text, fontSize: 42, fontWeight: "900" }}>
            {formatGb(usage?.usedGb || 0)}{" "}
            <Text style={{ color: c.textSecondary, fontSize: 24 }}>
              / {formatGb(usage?.quotaGb || 30)}
            </Text>
          </Text>

          <View style={{ height: 12, borderRadius: 999, borderWidth: 1, borderColor: c.border, backgroundColor: c.surface, overflow: "hidden" }}>
            <View style={{ height: "100%", width: `${usage?.usedPercent || 0}%`, backgroundColor: c.primary }} />
          </View>

          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <Text style={{ color: c.textSecondary, fontWeight: "700" }}>Utilisé : {formatGb(usage?.usedGb || 0)}</Text>
            <Text style={{ color: c.textSecondary, fontWeight: "700" }}>Libre : {formatGb(usage?.freeGb || 0)}</Text>
          </View>

          <Text style={{ color: c.text, fontWeight: "900", fontSize: 20, marginTop: 6 }}>Répartition</Text>

          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
            {breakdown.map((item) => (
              <View
                key={item.label}
                style={{ width: "47%", borderRadius: 18, borderWidth: 1, borderColor: c.border, backgroundColor: c.surface, padding: 14, gap: 6 }}
              >
                <Text style={{ color: c.textSecondary, fontWeight: "800", fontSize: 16 }}>{item.label}</Text>
                <Text style={{ color: c.text, fontWeight: "900", fontSize: 24 }}>{formatBytes(item.bytes)}</Text>
              </View>
            ))}
          </View>

          <View style={{ flexDirection: "row", gap: 10, marginTop: 4 }}>
            <Pressable
              onPress={() => navigation.navigate("Files")}
              style={{ flex: 1, paddingVertical: 12, borderRadius: 14, alignItems: "center", backgroundColor: c.primary }}
            >
              <Text style={{ color: "#fff", fontWeight: "900" }}>Mes fichiers</Text>
            </Pressable>

            <Pressable
              onPress={() => navigation.navigate("Trash")}
              style={{ flex: 1, paddingVertical: 12, borderRadius: 14, alignItems: "center", backgroundColor: c.surface, borderWidth: 1, borderColor: c.border }}
            >
              <Text style={{ color: c.text, fontWeight: "800" }}>Corbeille</Text>
            </Pressable>
          </View>
        </Panel>

        {/* Stat cards */}
        <StatCard title="Stockage libre"           value={formatGb(usage?.freeGb || 0)}   subtitle={`Sur ${formatGb(usage?.quotaGb || 30)}`}              colors={c} />
        <StatCard title="Fichiers récents"         value={`${recentFiles.length}`}         subtitle="Dernières modifications"                              colors={c} />
        <StatCard title="Liens de partage actifs"  value={`${activeSharesCount}`}          subtitle="Liens publics et partages créés"                      colors={c} />
        <StatCard title="Corbeille"                value={`${trashCount}`}                 subtitle={trashCount > 1 ? "éléments supprimés" : "élément supprimé"} colors={c} />

        {/* Fichiers récents */}
        <Panel style={{ padding: 16, gap: 12 }}>
          <SectionTitle
            title="Derniers fichiers"
            subtitle="Les 5 derniers fichiers modifiés ou uploadés."
            colors={c}
            rightAction={
              <Pressable onPress={() => navigation.navigate("Files")}>
                <Text style={{ color: c.primary, fontWeight: "800" }}>Tout voir</Text>
              </Pressable>
            }
          />

          {recentFiles.length === 0 ? (
            <Text style={{ color: c.textSecondary }}>Aucun fichier récent pour le moment.</Text>
          ) : (
            <View style={{ gap: 10 }}>
              {recentFiles.map((file) => (
                <View key={file.id} style={{ borderRadius: 16, borderWidth: 1, borderColor: c.border, backgroundColor: c.surface, padding: 12, gap: 6 }}>
                  <Text style={{ color: c.text, fontWeight: "900" }} numberOfLines={1}>{file.name}</Text>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 10 }}>
                    <Text style={{ color: c.textSecondary, fontWeight: "700" }}>{getItemTypeLabel(file)} • {formatBytes(file.sizeBytes)}</Text>
                    <Text style={{ color: c.textSecondary, fontWeight: "700" }} numberOfLines={1}>{formatDate(file.updatedAt)}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </Panel>
      </ScrollView>
    </Screen>
  );
}
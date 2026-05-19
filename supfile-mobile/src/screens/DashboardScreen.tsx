import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useNavigation } from "@react-navigation/native";

import Screen from "../components/Screen";
import Panel from "../components/Panel";
import { theme } from "../theme/theme";
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
  if (bytes < 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

function formatDate(value?: string) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function getItemTypeLabel(item: DashboardRecentFile) {
  if (item.type === "folder") return "Dossier";
  return "Fichier";
}

function Pill({ text }: { text: string }) {
  return (
    <View
      style={{
        paddingHorizontal: 10,
        paddingVertical: 7,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.10)",
        backgroundColor: "rgba(255,255,255,0.06)",
      }}
    >
      <Text
        style={{
          color: "rgba(255,255,255,0.85)",
          fontWeight: "700",
          fontSize: 12,
        }}
      >
        {text}
      </Text>
    </View>
  );
}

function StatCard({
  title,
  value,
  subtitle,
}: {
  title: string;
  value: string;
  subtitle?: string;
}) {
  return (
    <Panel style={{ padding: 16, gap: 10 }}>
      <Text style={{ color: "rgba(255,255,255,0.70)", fontWeight: "700" }}>
        {title}
      </Text>

      <Text style={{ color: theme.colors.text, fontSize: 32, fontWeight: "900" }}>
        {value}
      </Text>

      {subtitle ? (
        <Text style={{ color: "rgba(255,255,255,0.55)", fontWeight: "700" }}>
          {subtitle}
        </Text>
      ) : null}
    </Panel>
  );
}

function SectionTitle({
  title,
  subtitle,
  rightAction,
}: {
  title: string;
  subtitle?: string;
  rightAction?: React.ReactNode;
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "flex-start",
        justifyContent: "space-between",
        gap: 12,
      }}
    >
      <View style={{ flex: 1 }}>
        <Text style={{ color: theme.colors.text, fontWeight: "900", fontSize: 18 }}>
          {title}
        </Text>

        {subtitle ? (
          <Text style={{ color: "rgba(255,255,255,0.60)", marginTop: 3 }}>
            {subtitle}
          </Text>
        ) : null}
      </View>

      {rightAction ?? null}
    </View>
  );
}

export default function DashboardScreen() {
  const navigation = useNavigation<any>();
  const { user } = useAuth();

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

      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

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

      if (apiError === "INVALID_TOKEN") {
        setError("Session expirée. Déconnecte-toi puis reconnecte-toi.");
      } else {
        setError(apiError);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  const breakdown = useMemo(() => {
    if (!usage) return [];

    return [
      { label: "Vidéos", bytes: usage.byCategory.video },
      { label: "Images", bytes: usage.byCategory.image },
      { label: "Documents", bytes: usage.byCategory.document },
      { label: "Audio", bytes: usage.byCategory.audio },
      { label: "Autres", bytes: usage.byCategory.other },
    ];
  }, [usage]);

  if (loading) {
    return (
      <Screen>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator />
          <Text style={{ color: theme.colors.muted, marginTop: 10 }}>
            Chargement du dashboard...
          </Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 18,
          paddingBottom: 120,
          gap: 14,
        }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadDashboard(true)}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={{ gap: 6, marginBottom: 6 }}>
          <Text style={{ color: theme.colors.text, fontSize: 40, fontWeight: "900" }}>
            Dashboard
          </Text>

          <Text style={{ color: "rgba(255,255,255,0.60)" }}>
            Vue rapide de votre espace de stockage et de vos fichiers récents.
          </Text>

          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              alignItems: "center",
              gap: 8,
              marginTop: 10,
            }}
          >
            {user?.email ? <Pill text={user.email} /> : null}
            <Pill text="Quota : 30 Go" />
          </View>
        </View>

        {error ? (
          <Panel style={{ padding: 14 }}>
            <Text style={{ color: theme.colors.danger, fontWeight: "800" }}>
              {error}
            </Text>
          </Panel>
        ) : null}

        <Panel style={{ padding: 16, gap: 14 }}>
          <Text style={{ color: "rgba(255,255,255,0.65)", fontWeight: "700" }}>
            Espace utilisé
          </Text>

          <Text style={{ color: theme.colors.text, fontSize: 42, fontWeight: "900" }}>
            {formatGb(usage?.usedGb || 0)}{" "}
            <Text style={{ color: "rgba(255,255,255,0.65)", fontSize: 24 }}>
              / {formatGb(usage?.quotaGb || 30)}
            </Text>
          </Text>

          <View
            style={{
              height: 12,
              borderRadius: 999,
              borderWidth: 1,
              borderColor: "rgba(255,255,255,0.10)",
              backgroundColor: "rgba(255,255,255,0.06)",
              overflow: "hidden",
            }}
          >
            <View
              style={{
                height: "100%",
                width: `${usage?.usedPercent || 0}%`,
                backgroundColor: "rgba(96,165,250,0.95)",
              }}
            />
          </View>

          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <Text style={{ color: "rgba(255,255,255,0.55)", fontWeight: "700" }}>
              Utilisé : {formatGb(usage?.usedGb || 0)}
            </Text>

            <Text style={{ color: "rgba(255,255,255,0.55)", fontWeight: "700" }}>
              Libre : {formatGb(usage?.freeGb || 0)}
            </Text>
          </View>

          <Text
            style={{
              color: "rgba(255,255,255,0.70)",
              fontWeight: "900",
              fontSize: 20,
              marginTop: 6,
            }}
          >
            Répartition
          </Text>

          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
            {breakdown.map((item) => (
              <View
                key={item.label}
                style={{
                  width: "47%",
                  borderRadius: 18,
                  borderWidth: 1,
                  borderColor: "rgba(255,255,255,0.10)",
                  backgroundColor: "rgba(255,255,255,0.06)",
                  padding: 14,
                  gap: 6,
                }}
              >
                <Text
                  style={{
                    color: "rgba(255,255,255,0.75)",
                    fontWeight: "800",
                    fontSize: 16,
                  }}
                >
                  {item.label}
                </Text>

                <Text style={{ color: theme.colors.text, fontWeight: "900", fontSize: 24 }}>
                  {formatBytes(item.bytes)}
                </Text>
              </View>
            ))}
          </View>

          <View style={{ flexDirection: "row", gap: 10, marginTop: 4 }}>
            <Pressable
              onPress={() => navigation.navigate("Files")}
              style={{
                flex: 1,
                paddingVertical: 12,
                borderRadius: 14,
                alignItems: "center",
                backgroundColor: "rgba(96,165,250,0.95)",
              }}
            >
              <Text style={{ color: "rgba(0,0,0,0.85)", fontWeight: "900" }}>
                Mes fichiers
              </Text>
            </Pressable>

            <Pressable
              onPress={() => navigation.navigate("Trash")}
              style={{
                flex: 1,
                paddingVertical: 12,
                borderRadius: 14,
                alignItems: "center",
                backgroundColor: "rgba(255,255,255,0.06)",
                borderWidth: 1,
                borderColor: "rgba(255,255,255,0.10)",
              }}
            >
              <Text style={{ color: theme.colors.text, fontWeight: "800" }}>
                Corbeille
              </Text>
            </Pressable>
          </View>
        </Panel>

        <StatCard
          title="Stockage libre"
          value={formatGb(usage?.freeGb || 0)}
          subtitle={`Sur ${formatGb(usage?.quotaGb || 30)}`}
        />

        <StatCard
          title="Fichiers récents"
          value={`${recentFiles.length}`}
          subtitle="Dernières modifications"
        />

        <StatCard
          title="Liens de partage actifs"
          value={`${activeSharesCount}`}
          subtitle="Liens publics et partages créés"
        />

        <StatCard
          title="Corbeille"
          value={`${trashCount}`}
          subtitle={trashCount > 1 ? "éléments supprimés" : "élément supprimé"}
        />

        <Panel style={{ padding: 16, gap: 12 }}>
          <SectionTitle
            title="Derniers fichiers"
            subtitle="Les 5 derniers fichiers modifiés ou uploadés."
            rightAction={
              <Pressable onPress={() => navigation.navigate("Files")}>
                <Text style={{ color: "rgba(96,165,250,0.95)", fontWeight: "800" }}>
                  Tout voir
                </Text>
              </Pressable>
            }
          />

          {recentFiles.length === 0 ? (
            <Text style={{ color: theme.colors.muted }}>
              Aucun fichier récent pour le moment.
            </Text>
          ) : (
            <View style={{ gap: 10 }}>
              {recentFiles.map((file) => (
                <View
                  key={file.id}
                  style={{
                    borderRadius: 16,
                    borderWidth: 1,
                    borderColor: "rgba(255,255,255,0.10)",
                    backgroundColor: "rgba(255,255,255,0.06)",
                    padding: 12,
                    gap: 6,
                  }}
                >
                  <Text
                    style={{ color: theme.colors.text, fontWeight: "900" }}
                    numberOfLines={1}
                  >
                    {file.name}
                  </Text>

                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      gap: 10,
                    }}
                  >
                    <Text style={{ color: "rgba(255,255,255,0.65)", fontWeight: "700" }}>
                      {getItemTypeLabel(file)} • {formatBytes(file.sizeBytes)}
                    </Text>

                    <Text
                      style={{ color: "rgba(255,255,255,0.55)", fontWeight: "700" }}
                      numberOfLines={1}
                    >
                      {formatDate(file.updatedAt)}
                    </Text>
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
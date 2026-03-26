import React, { useMemo } from "react";
import {
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import Screen from "../components/Screen";
import Panel from "../components/Panel";
import { theme } from "../theme/theme";
import { useAuth } from "../store/AuthContext";

// ---- Mock data (comme la web)
const QUOTA_GB = 30;

const usage = {
  used: 12.4,
  breakdown: [
    { label: "Vidéos", gb: 6.2 },
    { label: "Images", gb: 3.1 },
    { label: "Documents", gb: 2.4 },
    { label: "Audio", gb: 0.5 },
    { label: "Autres", gb: 0.2 },
  ],
};

const recentFiles = [
  { name: "Cours-SUPFILE.pdf", type: "PDF", size: "4.2 MB", modified: "Aujourd’hui 12:41" },
  { name: "maquette-dashboard.png", type: "Image", size: "1.1 MB", modified: "Hier 18:03" },
  { name: "brief-projet.md", type: "Texte", size: "24 KB", modified: "Hier 16:20" },
  { name: "video-demo.mp4", type: "Vidéo", size: "310 MB", modified: "02/12/2025" },
  { name: "notes.txt", type: "Texte", size: "3 KB", modified: "01/12/2025" },
];

const recentShares = [
  { target: "Lien public", item: "Cours-SUPFILE.pdf", expires: "Expire dans 3 jours" },
  { target: "Partagé avec", item: "Dossier: Projet M1", expires: "—" },
  { target: "Lien public", item: "video-demo.mp4", expires: "Protégé par mot de passe" },
];

function formatGb(n: number) {
  return `${n.toFixed(1)} Go`;
}

function clampPct(n: number) {
  return Math.max(0, Math.min(100, n));
}

function percent(used: number, total: number) {
  return clampPct((used / total) * 100);
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
      <Text style={{ color: "rgba(255,255,255,0.85)", fontWeight: "700", fontSize: 12 }}>
        {text}
      </Text>
    </View>
  );
}

function StatCard({
  title,
  value,
  pill,
}: {
  title: string;
  value: string;
  pill?: string;
}) {
  return (
    <Panel style={{ padding: 16, gap: 10 }}>
      <Text style={{ color: "rgba(255,255,255,0.70)", fontWeight: "700" }}>{title}</Text>
      <Text style={{ color: theme.colors.text, fontSize: 34, fontWeight: "900" }}>{value}</Text>
      {pill ? (
        <Text style={{ color: "rgba(255,255,255,0.55)", fontWeight: "700" }}>{pill}</Text>
      ) : null}
    </Panel>
  );
}

function SectionTitle({ title, subtitle, rightAction }: { title: string; subtitle?: string; rightAction?: React.ReactNode }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
      <View style={{ flex: 1 }}>
        <Text style={{ color: theme.colors.text, fontWeight: "900", fontSize: 18 }}>{title}</Text>
        {subtitle ? (
          <Text style={{ color: "rgba(255,255,255,0.60)", marginTop: 3 }}>{subtitle}</Text>
        ) : null}
      </View>
      {rightAction ?? null}
    </View>
  );
}

export default function DashboardScreen() {
  const { user } = useAuth();

  const usedPct = useMemo(() => percent(usage.used, QUOTA_GB), []);

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 18,
          paddingBottom: 28,
          gap: 14,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={{ gap: 6, marginBottom: 6 }}>
          <Text style={{ color: theme.colors.text, fontSize: 44, fontWeight: "900" }}>
            Dashboard
          </Text>

          <Text style={{ color: "rgba(255,255,255,0.60)" }}>
            Vue rapide de votre espace de stockage et de l’activité récente.
          </Text>

          {/* mini row actions (version mobile) */}
          <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 8, marginTop: 10 }}>
            {user?.email ? <Pill text={user.email} /> : null}
            <Pill text="Rechercher" />
            <Pill text="Upload" />
          </View>
        </View>

        {/* HERO (Espace utilisé + répartition + actions) */}
        <Panel style={{ padding: 16, gap: 14 }}>
          <Text style={{ color: "rgba(255,255,255,0.65)", fontWeight: "700" }}>
            Espace utilisé
          </Text>

          <Text style={{ color: theme.colors.text, fontSize: 46, fontWeight: "900" }}>
            {formatGb(usage.used)} <Text style={{ color: "rgba(255,255,255,0.65)", fontSize: 26 }}>/ {QUOTA_GB} Go</Text>
          </Text>

          {/* progress bar */}
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
                width: `${usedPct}%`,
                backgroundColor: "rgba(96,165,250,0.95)",
              }}
            />
          </View>

          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <Text style={{ color: "rgba(255,255,255,0.55)", fontWeight: "700" }}>
              Utilisé: {formatGb(usage.used)}
            </Text>
            <Text style={{ color: "rgba(255,255,255,0.55)", fontWeight: "700" }}>
              Libre: {formatGb(QUOTA_GB - usage.used)}
            </Text>
          </View>

          <Text style={{ color: "rgba(255,255,255,0.70)", fontWeight: "900", fontSize: 20, marginTop: 6 }}>
            Répartition
          </Text>

          {/* breakdown grid */}
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
            {usage.breakdown.map((b) => (
              <View
                key={b.label}
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
                <Text style={{ color: "rgba(255,255,255,0.75)", fontWeight: "800", fontSize: 18 }}>
                  {b.label}
                </Text>
                <Text style={{ color: theme.colors.text, fontWeight: "900", fontSize: 26 }}>
                  {formatGb(b.gb)}
                </Text>
              </View>
            ))}
          </View>

          {/* pills */}
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 4 }}>
            <Pill text="Quota: 30 Go" />
            <Pill text="Sync: Activée" />
          </View>

          {/* actions row */}
          <View style={{ flexDirection: "row", gap: 10, marginTop: 2 }}>
            <Pressable
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
              <Text style={{ color: "rgba(255,255,255,0.85)", fontWeight: "800" }}>
                Nouveau dossier
              </Text>
            </Pressable>

            <Pressable
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
              <Text style={{ color: "rgba(255,255,255,0.85)", fontWeight: "800" }}>
                Partager
              </Text>
            </Pressable>
          </View>
        </Panel>

        {/* Right metrics (en mobile: empilé) */}
        <StatCard title="Stockage libre" value={formatGb(QUOTA_GB - usage.used)} pill="Sur 30 Go" />
        <StatCard title="Fichiers récents" value="5" pill="Dernières modifications" />
        <StatCard title="Liens de partage actifs" value="3" />
        <StatCard title="Corbeille" value="0 élément" />

        {/* Derniers fichiers */}
        <Panel style={{ padding: 16, gap: 12 }}>
          <SectionTitle
            title="Derniers fichiers"
            subtitle="Les 5 derniers fichiers modifiés ou uploadés."
            rightAction={<Text style={{ color: "rgba(96,165,250,0.95)", fontWeight: "800" }}>Tout voir</Text>}
          />

          <View style={{ gap: 10 }}>
            {recentFiles.map((f) => (
              <View
                key={f.name}
                style={{
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: "rgba(255,255,255,0.10)",
                  backgroundColor: "rgba(255,255,255,0.06)",
                  padding: 12,
                  gap: 6,
                }}
              >
                <Text style={{ color: theme.colors.text, fontWeight: "900" }} numberOfLines={1}>
                  {f.name}
                </Text>

                <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 10 }}>
                  <Text style={{ color: "rgba(255,255,255,0.65)", fontWeight: "700" }}>
                    {f.type} • {f.size}
                  </Text>
                  <Text style={{ color: "rgba(255,255,255,0.55)", fontWeight: "700" }} numberOfLines={1}>
                    {f.modified}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </Panel>

        {/* Partages */}
        <Panel style={{ padding: 16, gap: 12 }}>
          <SectionTitle
            title="Partages"
            subtitle="Liens publics et dossiers partagés récemment."
            rightAction={<Text style={{ color: "rgba(255,255,255,0.70)", fontWeight: "900" }}>🔗</Text>}
          />

          <View style={{ gap: 10 }}>
            {recentShares.map((s) => (
              <View
                key={`${s.item}-${s.target}`}
                style={{
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: "rgba(255,255,255,0.10)",
                  backgroundColor: "rgba(255,255,255,0.06)",
                  padding: 12,
                  gap: 6,
                }}
              >
                <Text style={{ color: theme.colors.text, fontWeight: "900" }} numberOfLines={1}>
                  {s.item}
                </Text>
                <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 10 }}>
                  <Text style={{ color: "rgba(255,255,255,0.60)", fontWeight: "700" }} numberOfLines={1}>
                    {s.target}
                  </Text>
                  <Text style={{ color: "rgba(255,255,255,0.55)", fontWeight: "700" }} numberOfLines={1}>
                    {s.expires}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </Panel>
      </ScrollView>
    </Screen>
  );
}
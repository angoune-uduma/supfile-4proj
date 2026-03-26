// src/services/dashboard.ts
import { api } from "./api";

export type DashboardStats = {
  quotaGb: number;     // ex: 30
  usedGb: number;      // ex: 12.4
  freeGb: number;      // ex: 17.6
  byTypeGb: {
    videos?: number;
    images?: number;
    documents?: number;
    audio?: number;
    other?: number;
  };
};

function toNumber(v: any, fallback = 0) {
  const n = typeof v === "string" ? Number(v) : v;
  return Number.isFinite(n) ? n : fallback;
}

/**
 * ✅ IMPORTANT:
 * Mets ici le vrai endpoint de ton backend.
 * Sur le web, tu as sûrement un truc du style:
 *  - GET /stats/usage
 *  - GET /dashboard/summary
 *  - GET /storage/usage
 *
 * Change JUSTE la ligne ci-dessous si besoin.
 */
const ENDPOINT = "/stats/usage";

export async function fetchDashboardStats(): Promise<DashboardStats> {
  const res = await api.get(ENDPOINT);
  const d = res.data || {};

  // ✅ Mapping flexible (au cas où ton backend renvoie d'autres noms)
  const quotaGb = toNumber(d.quotaGb ?? d.quota ?? d.totalQuotaGb ?? 30);
  const usedGb = toNumber(d.usedGb ?? d.used ?? d.usedStorageGb ?? 0);
  const freeGb = toNumber(d.freeGb ?? d.free ?? d.freeStorageGb ?? (quotaGb - usedGb));

  const by = d.byTypeGb ?? d.breakdownGb ?? d.byType ?? {};

  return {
    quotaGb,
    usedGb,
    freeGb,
    byTypeGb: {
      videos: toNumber(by.videos ?? by.video ?? 0),
      images: toNumber(by.images ?? by.image ?? 0),
      documents: toNumber(by.documents ?? by.docs ?? 0),
      audio: toNumber(by.audio ?? 0),
      other: toNumber(by.other ?? by.others ?? 0),
    },
  };
}
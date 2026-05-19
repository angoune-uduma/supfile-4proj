import { api } from "./api";

export type DashboardUsage = {
  quotaBytes: number;
  usedBytes: number;
  freeBytes: number;
  quotaGb: number;
  usedGb: number;
  freeGb: number;
  usedPercent: number;
  byCategory: {
    video: number;
    image: number;
    audio: number;
    document: number;
    other: number;
  };
};

export type DashboardRecentFile = {
  id: string;
  name: string;
  type: "file" | "folder";
  sizeBytes: number;
  updatedAt: string;
};

export type DashboardActiveShares = {
  count: number;
};

export type DashboardTrashCount = {
  count: number;
};

function toNumber(value: any, fallback = 0) {
  const numberValue = typeof value === "string" ? Number(value) : value;
  return Number.isFinite(numberValue) ? numberValue : fallback;
}

function bytesToGb(bytes: number) {
  return bytes / (1024 * 1024 * 1024);
}

function normalizeUsage(data: any): DashboardUsage {
  const quotaBytes = toNumber(data?.quotaBytes, 30 * 1024 * 1024 * 1024);
  const usedBytes = toNumber(data?.usedBytes, 0);
  const freeBytes = Math.max(0, quotaBytes - usedBytes);

  const byCategoryArray = Array.isArray(data?.byCategory)
    ? data.byCategory
    : [];

  const byCategory = {
    video: 0,
    image: 0,
    audio: 0,
    document: 0,
    other: 0,
  };

  for (const item of byCategoryArray) {
    const key = item?.key;
    const bytes = toNumber(item?.bytes, 0);

    if (
      key === "video" ||
      key === "image" ||
      key === "audio" ||
      key === "document" ||
      key === "other"
    ) {
      byCategory[key] = bytes;
    }
  }

  const quotaGb = bytesToGb(quotaBytes);
  const usedGb = bytesToGb(usedBytes);
  const freeGb = bytesToGb(freeBytes);

  const usedPercent =
    quotaBytes > 0
      ? Math.max(0, Math.min(100, (usedBytes / quotaBytes) * 100))
      : 0;

  return {
    quotaBytes,
    usedBytes,
    freeBytes,
    quotaGb,
    usedGb,
    freeGb,
    usedPercent,
    byCategory,
  };
}

export async function fetchDashboardUsage(): Promise<DashboardUsage> {
  const res = await api.get("/dashboard/usage");
  return normalizeUsage(res.data);
}

export async function fetchDashboardRecent(limit = 5): Promise<DashboardRecentFile[]> {
  const res = await api.get(`/dashboard/recent?limit=${limit}`);
  const data = res.data;

  if (Array.isArray(data?.items)) {
    return data.items.map((item: any) => ({
      id: String(item.id),
      name: item.name || "Sans nom",
      type: item.type === "folder" ? "folder" : "file",
      sizeBytes: toNumber(item.sizeBytes, 0),
      updatedAt: item.updatedAt,
    }));
  }

  return [];
}

export async function fetchActiveSharesCount(): Promise<number> {
  const res = await api.get("/dashboard/active-shares");
  return Number(res.data?.count || 0);
}

export async function fetchTrashCount(): Promise<number> {
  const res = await api.get("/dashboard/trash-count");
  return Number(res.data?.count || 0);
}
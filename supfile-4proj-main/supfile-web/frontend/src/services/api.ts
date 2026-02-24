const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

// ---- tokens helpers
export function getAccessToken() {
  return localStorage.getItem("accessToken");
}

export function getRefreshToken() {
  return localStorage.getItem("refreshToken");
}

export function setTokens(accessToken: string, refreshToken?: string) {
  localStorage.setItem("accessToken", accessToken);
  if (refreshToken) localStorage.setItem("refreshToken", refreshToken);
}

export function clearTokens() {
  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");
}

// ---- refresh call
async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;

  const res = await fetch(`${API_URL}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken }),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok || !data?.accessToken) {
    return null;
  }

  setTokens(data.accessToken, data.refreshToken);
  return data.accessToken as string;
}

// ---- apiFetch wrapper (auto attach bearer + auto refresh on 401)
export async function apiFetch(path: string, options: RequestInit = {}) {
  const token = getAccessToken();

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      ...(options.headers || {}),
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  // if expired -> refresh -> retry once
  if (res.status === 401) {
    const newToken = await refreshAccessToken();

    if (newToken) {
      const retry = await fetch(`${API_URL}${path}`, {
        ...options,
        headers: {
          ...(options.headers || {}),
          "Content-Type": "application/json",
          Authorization: `Bearer ${newToken}`,
        },
      });

      const retryData = await retry.json().catch(() => ({}));
      return { res: retry, data: retryData };
    }
  }

  const data = await res.json().catch(() => ({}));
  return { res, data };
}
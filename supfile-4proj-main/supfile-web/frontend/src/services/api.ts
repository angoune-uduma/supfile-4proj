const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

// ---- token helpers
export function getAccessToken() {
  return localStorage.getItem("accessToken");
}

export function getRefreshToken() {
  return localStorage.getItem("refreshToken");
}

export function setTokens(accessToken: string, refreshToken?: string) {
  localStorage.setItem("accessToken", accessToken);
  if (refreshToken) {
    localStorage.setItem("refreshToken", refreshToken);
  }
}

export function clearTokens() {
  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");
}

// ---- single refresh shared by concurrent requests
let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    const refreshToken = getRefreshToken();
    if (!refreshToken) return null;

    try {
      const res = await fetch(`${API_URL}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data?.accessToken) {
        clearTokens();
        return null;
      }

      setTokens(data.accessToken, data.refreshToken);
      return data.accessToken as string;
    } catch {
      clearTokens();
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

function buildHeaders(options: RequestInit = {}, token?: string) {
  const headers = new Headers(options.headers || {});

  // On met le Bearer si on a un token
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  // On ne force Content-Type JSON que si body simple JSON
  const hasBody = options.body !== undefined && options.body !== null;
  const isFormData = typeof FormData !== "undefined" && options.body instanceof FormData;

  if (hasBody && !isFormData && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  return headers;
}

// ---- apiFetch wrapper
export async function apiFetch(path: string, options: RequestInit = {}) {
  const token = getAccessToken();

  let res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: buildHeaders(options, token || undefined),
  });

  // Access token expiré -> refresh -> retry 1 fois
  if (res.status === 401) {
    const newToken = await refreshAccessToken();

    if (newToken) {
      res = await fetch(`${API_URL}${path}`, {
        ...options,
        headers: buildHeaders(options, newToken),
      });
    } else {
      clearTokens();
      window.location.href = "/login";
      return { res, data: {} };
    }
  }

  const contentType = res.headers.get("content-type") || "";
  const isJson = contentType.includes("application/json");

  const data = isJson ? await res.json().catch(() => ({})) : await res.text().catch(() => "");

  return { res, data };
}
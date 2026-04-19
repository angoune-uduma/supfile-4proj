const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

// ---- token helpers
export function getAccessToken() {
  return localStorage.getItem("accessToken");
}

export function getRefreshToken() {
  return localStorage.getItem("refreshToken");
}

export function setTokens(accessToken, refreshToken) {
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
let refreshPromise = null;

// ---- refresh call
async function refreshAccessToken() {
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
      return data.accessToken;
    } catch {
      clearTokens();
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

// ---- helper pour construire les headers
function buildHeaders(options = {}, token = null) {
  const headers = new Headers(options.headers || {});

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  // très important pour l'upload :
  // ne pas forcer Content-Type si on envoie du FormData
  if (!options.isFormData && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  return headers;
}

// ---- apiFetch wrapper (auto attach bearer + auto refresh on 401)
export async function apiFetch(path, options = {}) {
  const token = getAccessToken();

  let res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: buildHeaders(options, token),
  });

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

  const data = isJson
    ? await res.json().catch(() => ({}))
    : await res.text().catch(() => "");

  return { res, data };
}

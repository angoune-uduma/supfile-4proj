const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

// ---- token helpers
export function getAccessToken(): string | null {
  return localStorage.getItem("accessToken");
}

export function getRefreshToken(): string | null {
  return localStorage.getItem("refreshToken");
}

export function setTokens(accessToken: string, refreshToken?: string | null): void {
  localStorage.setItem("accessToken", accessToken);
  if (refreshToken) {
    localStorage.setItem("refreshToken", refreshToken);
  }
}

export function clearTokens(): void {
  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");
}

// ---- single refresh shared by concurrent requests
let refreshPromise: Promise<string | null> | null = null;

// ---- refresh call
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

// ---- types
interface ApiFetchOptions extends RequestInit {
  isFormData?: boolean;
}

// ---- helper pour construire les headers
function buildHeaders(options: ApiFetchOptions = {}, token: string | null = null): Headers {
  const headers = new Headers((options.headers as HeadersInit) || {});

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
export async function apiFetch(
  path: string,
  options: ApiFetchOptions = {}
): Promise<{ res: Response; data: any }> {
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
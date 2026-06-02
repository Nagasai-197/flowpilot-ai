import { supabase } from "./supabase";

const API_BASE_URL =
  import.meta.env.VITE_API_URL || (import.meta.env.DEV ? "http://localhost:5000/api" : "/api");

export class APIError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "APIError";
    this.status = status;
  }
}

function decodeJWT(token: string) {
  try {
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join(""),
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

function isTokenExpired(token: string): boolean {
  const payload = decodeJWT(token);
  if (!payload || !payload.exp) return true;
  const expiry = payload.exp * 1000;
  // If it expires in less than 30 seconds, treat it as expired to avoid race condition with network flight
  return Date.now() >= expiry - 30000;
}

let refreshPromise: Promise<string | null> | null = null;

async function getOrRefreshAccessToken(): Promise<string | null> {
  try {
    const { data } = await supabase.auth.getSession();
    let token = data.session?.access_token ?? null;

    if (token && isTokenExpired(token)) {
      if (!refreshPromise) {
        refreshPromise = (async () => {
          try {
            const { data: refreshData, error } = await supabase.auth.refreshSession();
            if (error) {
              console.error("Failed to refresh session:", error);
              return null;
            }
            return refreshData.session?.access_token ?? null;
          } catch (err) {
            console.error("Error during session refresh:", err);
            return null;
          } finally {
            refreshPromise = null;
          }
        })();
      }
      return await refreshPromise;
    }

    return token;
  } catch (err) {
    console.error("Error retrieving session:", err);
    return null;
  }
}

export const api = {
  async request(endpoint: string, options: RequestInit = {}) {
    // Retrieve a fresh token using our race-condition-safe helper
    const token = await getOrRefreshAccessToken();

    const headers = {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    };

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      let errorMessage = "An unknown server error occurred";
      try {
        const errBody = await response.json();
        errorMessage = errBody.message || errBody.error || errorMessage;
      } catch {
        try {
          const textBody = await response.text();
          if (textBody) errorMessage = textBody;
        } catch {
          errorMessage = errorMessage || "Unable to parse server error response";
        }
      }
      throw new APIError(errorMessage, response.status);
    }

    // Return JSON data or empty object if there is no response body (like on DELETE or 204 No Content)
    if (response.status === 204) {
      return {};
    }

    try {
      return await response.json();
    } catch {
      return {};
    }
  },

  async get(endpoint: string, headers?: Record<string, string>) {
    return this.request(endpoint, { method: "GET", headers });
  },

  async post(endpoint: string, body?: any, headers?: Record<string, string>) {
    return this.request(endpoint, {
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
      headers,
    });
  },

  async put(endpoint: string, body?: any, headers?: Record<string, string>) {
    return this.request(endpoint, {
      method: "PUT",
      body: body ? JSON.stringify(body) : undefined,
      headers,
    });
  },

  async delete(endpoint: string, headers?: Record<string, string>) {
    return this.request(endpoint, { method: "DELETE", headers });
  },
};

// HTTP client.
//
// One place that knows about the base URL, the bearer token, and what an API
// error looks like. Screens never call fetch directly, so behaviour like "a
// 401 means the session is gone, sign the operator out" is decided once.

const BASE = (import.meta.env.VITE_API_URL ?? "http://localhost:4000").replace(/\/+$/, "");

const TOKEN_KEY = "golden-one.token";

/**
 * The token lives in localStorage so a reload does not sign the operator out
 * mid-shift. That trades some XSS exposure for usability; the API keeps
 * sessions short and can revoke them instantly by bumping the token version.
 */
export const tokenStore = {
  get(): string | null {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  },
  set(token: string): void {
    try {
      localStorage.setItem(TOKEN_KEY, token);
    } catch {
      /* private mode — the session simply won't survive a reload */
    }
  },
  clear(): void {
    try {
      localStorage.removeItem(TOKEN_KEY);
    } catch {
      /* ignore */
    }
  },
};

/** Raised for every non-2xx response, carrying the API's own error code. */
export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }

  /** The session is gone or was revoked — the operator has to sign in again. */
  get isAuthError(): boolean {
    return this.status === 401;
  }
}

type Listener = () => void;
const unauthorizedListeners = new Set<Listener>();

/** App-level hook for "the session died"; used to bounce back to the login screen. */
export function onUnauthorized(listener: Listener): () => void {
  unauthorizedListeners.add(listener);
  return () => unauthorizedListeners.delete(listener);
}

export interface RequestOptions {
  method?: string;
  body?: unknown;
  /** Sent as Idempotency-Key so a retry cannot double-send a device command. */
  idempotencyKey?: string;
  signal?: AbortSignal;
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const token = tokenStore.get();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (options.idempotencyKey) headers["Idempotency-Key"] = options.idempotencyKey;

  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      method: options.method ?? "GET",
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: options.signal,
    });
  } catch (cause) {
    // fetch only rejects when the request never completed — the operator needs
    // to know this is a connectivity problem, not a refusal by the server.
    throw new ApiError(
      `Не удалось связаться с сервером (${BASE})`,
      0,
      "NETWORK_ERROR",
      cause,
    );
  }

  if (res.status === 204) return undefined as T;

  const payload = await res.json().catch(() => null);

  if (!res.ok) {
    const code = (payload?.error as string) ?? "ERROR";
    const message = (payload?.message as string) ?? `${res.status} ${res.statusText}`;

    if (res.status === 401) {
      tokenStore.clear();
      for (const listener of unauthorizedListeners) listener();
    }
    throw new ApiError(message, res.status, code, payload?.details);
  }

  return payload as T;
}

export function query(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") search.set(key, String(value));
  }
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

export const apiBaseUrl = BASE;

import {
  getAccessToken,
  getStoredRefreshToken,
  notifySessionExpired,
  setAccessToken,
  setStoredRefreshToken,
} from './tokenStore';

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000/api/v1';

export class ApiError extends Error {
  status: number;
  code?: string;

  constructor(status: number, message: string, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

// Deduped across all callers (the 401-retry path below and AuthProvider's boot-time
// silent refresh both go through this): the refresh token is single-use and rotates
// on every call, so two concurrent calls would otherwise race — the second one would
// hit an already-rotated token and trip reuse-detection, revoking the whole session.
let refreshInFlight: Promise<RefreshResult | null> | null = null;

export interface RefreshResult {
  accessToken: string;
  refreshToken?: string;
  user: unknown;
}

export function refreshSession(): Promise<RefreshResult | null> {
  if (!refreshInFlight) {
    // Send the persisted refresh token in the body (cross-domain: the httpOnly cookie is a
    // blocked third-party cookie). credentials:'include' is kept so same-site local dev can
    // still fall back to the cookie when no token is stored yet.
    const stored = getStoredRefreshToken();
    refreshInFlight = fetch(`${BASE_URL}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: stored }),
    })
      .then(async (res) => {
        if (!res.ok) {
          // Only a 401 means the token itself is dead (expired / rotated / revoked) — drop it
          // so we stop replaying it. A 5xx / cold-start failure is transient: keep the token so
          // a later attempt (once Render's free instance wakes) can still restore the session.
          if (res.status === 401) setStoredRefreshToken(null);
          return null;
        }
        const data = (await res.json()) as RefreshResult;
        setAccessToken(data.accessToken);
        if (data.refreshToken) setStoredRefreshToken(data.refreshToken);
        return data;
      })
      .catch(() => null)
      .finally(() => {
        refreshInFlight = null;
      });
  }
  return refreshInFlight;
}

interface RequestOptions {
  method?: string;
  body?: unknown;
  skipAuthRetry?: boolean;
}

export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, skipAuthRetry } = options;

  const doFetch = () =>
    fetch(`${BASE_URL}${path}`, {
      method,
      credentials: 'include',
      headers: {
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(getAccessToken() ? { Authorization: `Bearer ${getAccessToken()}` } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

  let res = await doFetch();

  if (res.status === 401 && !skipAuthRetry) {
    const refreshed = await refreshSession();
    if (refreshed) {
      res = await doFetch();
    } else {
      notifySessionExpired();
    }
  }

  if (res.status === 204) {
    return undefined as T;
  }

  const isJson = res.headers.get('content-type')?.includes('application/json');
  const data = isJson ? await res.json() : undefined;

  if (!res.ok) {
    throw new ApiError(res.status, data?.error?.message ?? res.statusText, data?.error?.code);
  }

  return data as T;
}

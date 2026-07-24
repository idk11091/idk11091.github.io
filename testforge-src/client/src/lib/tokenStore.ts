// The short-lived (~15 min) access token is in-memory only, so it can't be lifted by an XSS
// payload. Session survival across page loads relies on the refresh token.
//
// The refresh token is persisted in localStorage rather than an httpOnly cookie: the frontend
// (GitHub Pages) and API (Render) are on different domains, so the refresh cookie is a
// third-party cookie that modern browsers block or evict — which silently broke session
// persistence (a reload/navigation bounced the user back to login). Storing it client-side and
// sending it in the /auth/refresh body works in every browser. Trade-off: it's reachable by
// JS, so it relies on the app being XSS-free rather than on httpOnly; acceptable for this
// single-owner tool, and the token still rotates on every use with server-side reuse-detection.
const REFRESH_TOKEN_KEY = 'testforge:refresh';

let accessToken: string | null = null;
let onSessionExpired: (() => void) | null = null;

export function getAccessToken() {
  return accessToken;
}

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export function getStoredRefreshToken(): string | null {
  try {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setStoredRefreshToken(token: string | null) {
  try {
    if (token) localStorage.setItem(REFRESH_TOKEN_KEY, token);
    else localStorage.removeItem(REFRESH_TOKEN_KEY);
  } catch {
    /* localStorage unavailable (private mode / disabled) — session just won't persist across reloads */
  }
}

export function setSessionExpiredHandler(handler: (() => void) | null) {
  onSessionExpired = handler;
}

export function notifySessionExpired() {
  onSessionExpired?.();
}

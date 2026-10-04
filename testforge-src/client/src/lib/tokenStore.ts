let accessToken: string | null = null;
let onSessionExpired: (() => void) | null = null;

// Remove the refresh token written by older versions of the client.
try {
  localStorage.removeItem('testforge:refresh');
} catch {
  // localStorage can be unavailable in restricted browser contexts.
}

export function getAccessToken() {
  return accessToken;
}

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export function setSessionExpiredHandler(handler: (() => void) | null) {
  onSessionExpired = handler;
}

export function notifySessionExpired() {
  onSessionExpired?.();
}

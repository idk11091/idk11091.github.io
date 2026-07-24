import { signInWithEmailAndPassword, signOut, type AuthError } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { apiFetch, refreshSession } from '../lib/apiClient';
import { getStoredRefreshToken, setStoredRefreshToken } from '../lib/tokenStore';
import type { User } from './types';

const FIREBASE_ERROR_MESSAGES: Record<string, string> = {
  'auth/invalid-email': "That email address doesn't look right.",
  'auth/missing-password': 'Please enter your password.',
  'auth/invalid-credential': 'Email or password is incorrect.',
  'auth/wrong-password': 'Email or password is incorrect.',
  'auth/user-not-found': 'Email or password is incorrect.',
  'auth/user-disabled': 'This account has been disabled.',
  'auth/too-many-requests': 'Too many attempts. Please wait a moment and try again.',
  'auth/network-request-failed': 'Network error — check your connection.',
};

function isFirebaseError(err: unknown): err is AuthError {
  return typeof err === 'object' && err !== null && 'code' in err && typeof (err as AuthError).code === 'string';
}

/**
 * Login now goes through Firebase Auth (the SAME account as the portfolio journal): the
 * email/password is verified by Firebase, and the resulting ID token is exchanged for a
 * TestForge session at POST /auth/firebase. The password never reaches TestForge's own
 * server. Everything after login (apiFetch, silent refresh) is unchanged.
 */
export async function login(email: string, password: string): Promise<{ accessToken: string; user: User }> {
  let idToken: string;
  try {
    const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
    idToken = await cred.user.getIdToken();
  } catch (err) {
    if (isFirebaseError(err)) {
      throw new Error(FIREBASE_ERROR_MESSAGES[err.code] ?? "Couldn't sign in. Please try again.");
    }
    throw err;
  }
  const result = await apiFetch<{ accessToken: string; refreshToken?: string; user: User }>('/auth/firebase', {
    method: 'POST',
    body: { idToken },
    skipAuthRetry: true,
  });
  // Persist the refresh token client-side so the session survives reloads across the
  // frontend/API domain split (the httpOnly cookie is a blocked third-party cookie).
  setStoredRefreshToken(result.refreshToken ?? null);
  return { accessToken: result.accessToken, user: result.user };
}

export async function refresh(): Promise<{ accessToken: string; user: User }> {
  const result = await refreshSession();
  if (!result) {
    throw new Error('Session refresh failed');
  }
  return result as { accessToken: string; user: User };
}

export async function logout() {
  // End both sessions: the TestForge session (server-side) and the Firebase session. Send the
  // stored refresh token so the server can revoke that token family, then drop it locally.
  await apiFetch<void>('/auth/logout', {
    method: 'POST',
    body: { refreshToken: getStoredRefreshToken() },
    skipAuthRetry: true,
  }).catch(() => undefined);
  setStoredRefreshToken(null);
  await signOut(auth).catch(() => undefined);
}

export function me() {
  return apiFetch<{ user: User }>('/auth/me');
}

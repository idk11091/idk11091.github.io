import { sendEmailVerification, signInWithEmailAndPassword, signOut, type AuthError } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { apiFetch, refreshSession } from '../lib/apiClient';
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

export class EmailVerificationRequiredError extends Error {
  readonly emailSent: boolean;

  constructor(emailSent: boolean) {
    super(emailSent
      ? 'Your email is not verified. Firebase sent a fresh verification link.'
      : 'Your email is not verified.');
    this.name = 'EmailVerificationRequiredError';
    this.emailSent = emailSent;
  }
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
    await cred.user.reload();
    if (!cred.user.emailVerified) {
      // Send a fresh link on the initial unverified login attempt as well as
      // offering the explicit resend action on the login page.
      try {
        await sendEmailVerification(cred.user);
        throw new EmailVerificationRequiredError(true);
      } catch (err) {
        if (err instanceof EmailVerificationRequiredError) throw err;
        if (isFirebaseError(err)) {
          throw new Error(FIREBASE_ERROR_MESSAGES[err.code] ?? 'Could not send the verification email. Please try again later.');
        }
        throw err;
      }
    }
    idToken = await cred.user.getIdToken(true);
  } catch (err) {
    if (isFirebaseError(err)) {
      throw new Error(FIREBASE_ERROR_MESSAGES[err.code] ?? "Couldn't sign in. Please try again.");
    }
    throw err;
  }
  const result = await apiFetch<{ accessToken: string; user: User }>('/auth/firebase', {
    method: 'POST',
    body: { idToken },
    skipAuthRetry: true,
  });
  return { accessToken: result.accessToken, user: result.user };
}

export async function resendVerificationEmail() {
  const user = auth.currentUser;
  if (!user) throw new Error('Sign in again before requesting a verification email.');
  try {
    await sendEmailVerification(user);
    await signOut(auth).catch(() => undefined);
  } catch (err) {
    if (isFirebaseError(err)) {
      throw new Error(FIREBASE_ERROR_MESSAGES[err.code] ?? 'Could not send the verification email. Please try again later.');
    }
    throw err;
  }
}

export async function refresh(): Promise<{ accessToken: string; user: User }> {
  const result = await refreshSession();
  if (!result) {
    throw new Error('Session refresh failed');
  }
  return result as { accessToken: string; user: User };
}

export async function logout() {
  // The HttpOnly cookie identifies the refresh-token family to revoke.
  await apiFetch<void>('/auth/logout', {
    method: 'POST',
    skipAuthRetry: true,
  }).catch(() => undefined);
  await signOut(auth).catch(() => undefined);
}

export function me() {
  return apiFetch<{ user: User }>('/auth/me');
}

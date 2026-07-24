// Verifies a Firebase ID token WITHOUT the Firebase Admin SDK or a service-account key.
//
// A Firebase ID token is an RS256-signed JWT. Google publishes the matching PUBLIC
// certificates (keyed by the token header's `kid`) at the URL below — verifying the
// signature against those, plus checking issuer/audience/expiry, is all that's needed to
// trust the token. This is exactly what the Admin SDK does internally; doing it directly
// means the server needs no private credential, only the public project id (which is not a
// secret — it ships in the client bundle and the journal's public config already).
//
// The whole point: TestForge and the portfolio journal share the same Firebase project, so
// a token minted by signing into either is verifiable here — one identity across both.
import jwt, { type JwtPayload } from 'jsonwebtoken';
import { UnauthorizedError } from './errors';
import { env } from '../config/env';

// Google's public X.509 certs for Firebase ID tokens (kid -> PEM cert string).
const CERTS_URL =
  'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com';

let cache: { certs: Record<string, string>; expiresAt: number } | null = null;

async function getCerts(): Promise<Record<string, string>> {
  if (cache && cache.expiresAt > Date.now()) return cache.certs;
  const res = await fetch(CERTS_URL);
  if (!res.ok) throw new UnauthorizedError('Could not fetch Firebase signing keys');
  const certs = (await res.json()) as Record<string, string>;
  // Respect Google's Cache-Control max-age so keys are refreshed before rotation; fall back
  // to 1h. Keys rotate roughly daily, so caching avoids a fetch on every single login.
  const maxAge = Number(/max-age=(\d+)/.exec(res.headers.get('cache-control') ?? '')?.[1] ?? 3600);
  cache = { certs, expiresAt: Date.now() + maxAge * 1000 };
  return certs;
}

export interface FirebaseIdentity {
  uid: string;
  email: string;
  name?: string;
}

export async function verifyFirebaseIdToken(idToken: string): Promise<FirebaseIdentity> {
  const projectId = env.firebaseProjectId;
  if (!projectId) throw new UnauthorizedError('Firebase login is not configured');

  const decoded = jwt.decode(idToken, { complete: true });
  const kid = decoded && typeof decoded !== 'string' ? decoded.header.kid : undefined;
  if (!kid) throw new UnauthorizedError('Malformed Firebase token');

  const certs = await getCerts();
  const cert = certs[kid];
  if (!cert) throw new UnauthorizedError('Firebase token signed with an unknown key');

  let payload: JwtPayload;
  try {
    payload = jwt.verify(idToken, cert, {
      algorithms: ['RS256'],
      audience: projectId,
      issuer: `https://securetoken.google.com/${projectId}`,
    }) as JwtPayload;
  } catch {
    throw new UnauthorizedError('Invalid or expired Firebase token');
  }

  const email = typeof payload.email === 'string' ? payload.email.toLowerCase() : '';
  if (!email) throw new UnauthorizedError('Firebase token has no email');
  // `sub` is the Firebase UID.
  return { uid: String(payload.sub), email, name: typeof payload.name === 'string' ? payload.name : undefined };
}

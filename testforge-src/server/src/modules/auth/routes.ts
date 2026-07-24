import { Router } from 'express';
import { asyncHandler } from '../../lib/asyncHandler';
import { requireAuth } from '../../middleware/requireAuth';
import { loginRateLimiter } from '../../middleware/rateLimit';
import { prisma } from '../../config/prisma-client';
import { UnauthorizedError } from '../../lib/errors';
import { loginSchema } from './schema';
import * as authService from './service';

export const authRouter = Router();

function toPublicUser(user: { id: string; email: string; name: string; role: string; isActive: boolean }) {
  return { id: user.id, email: user.email, name: user.name, role: user.role, isActive: user.isActive };
}

// The cross-domain client sends its persisted refresh token in the request body (the httpOnly
// cookie is a third-party cookie that browsers block); pull it out when present.
function bodyRefreshToken(body: unknown): string | undefined {
  if (body && typeof body === 'object' && 'refreshToken' in body) {
    const value = (body as { refreshToken?: unknown }).refreshToken;
    if (typeof value === 'string' && value.length > 0) return value;
  }
  return undefined;
}

authRouter.post(
  '/login',
  loginRateLimiter,
  asyncHandler(async (req, res) => {
    const { email, password } = loginSchema.parse(req.body);
    const { user, accessToken, refreshToken } = await authService.login(email, password, res, req.ip);
    res.json({ accessToken, refreshToken, user: toPublicUser(user) });
  }),
);

authRouter.post(
  '/firebase',
  loginRateLimiter,
  asyncHandler(async (req, res) => {
    const idToken = typeof req.body?.idToken === 'string' ? req.body.idToken : '';
    if (!idToken) throw new UnauthorizedError('Missing Firebase token');
    const { user, accessToken, refreshToken } = await authService.loginWithFirebase(idToken, res, req.ip);
    res.json({ accessToken, refreshToken, user: toPublicUser(user) });
  }),
);

authRouter.post(
  '/refresh',
  asyncHandler(async (req, res) => {
    // Prefer the body token (cross-domain client), fall back to the cookie (same-site local dev).
    const rawToken = bodyRefreshToken(req.body) ?? authService.getRefreshCookie(req.cookies);
    const { accessToken, refreshToken, user } = await authService.refresh(rawToken, res, req.ip);
    res.json({ accessToken, refreshToken, user: toPublicUser(user) });
  }),
);

authRouter.post(
  '/logout',
  asyncHandler(async (req, res) => {
    const rawToken = bodyRefreshToken(req.body) ?? authService.getRefreshCookie(req.cookies);
    await authService.logout(rawToken, res);
    res.status(204).send();
  }),
);

authRouter.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!user) {
      throw new UnauthorizedError();
    }
    res.json({ user: toPublicUser(user) });
  }),
);

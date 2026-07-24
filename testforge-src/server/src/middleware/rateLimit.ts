import rateLimit from 'express-rate-limit';

// Skipped entirely under Jest — rate limiting is a production/deployment concern, and the
// in-memory per-process store would otherwise make test files that legitimately log in many
// times in quick succession (exercising multiple users/roles, or the concurrent-refresh
// regression test) flaky or artificially slow for no real security benefit in a test run.
const isTest = !!process.env.JEST_WORKER_ID;

// A generous ceiling on the whole API — catches a runaway script or scraper without getting in
// the way of legitimate bursts (a CSV import's follow-up requests, a bulk operation, a page that
// fires several queries on load).
export const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => isTest,
});

// A real anti-brute-force measure for the one endpoint that actually needs it — bcrypt's own
// cost is only a mild natural throttle on its own (see the login-timing-side-channel fix in
// auth/service.ts, a related but distinct finding from the same audit that flagged this gap).
export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => isTest,
  message: { error: { code: 'TOO_MANY_REQUESTS', message: 'Too many login attempts. Try again later.' } },
});

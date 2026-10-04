import crypto from 'crypto';
import http from 'http';
import https from 'https';
import type { LookupAddress } from 'dns';
import { prisma } from '../config/prisma-client';
import { resolvePublicHttpUrl } from './urlSafety';

export type WebhookEvent = 'RUN_COMPLETED' | 'RUN_CREATED' | 'CASE_CREATED';

function sign(secret: string, timestamp: string, body: string): string {
  // The timestamp is part of the signed content, not just an extra header — a signature computed
  // over the body alone never expires, so anyone who captures one legitimate (body, signature)
  // pair could replay it to the receiver indefinitely. Binding the timestamp into the HMAC input
  // (Stripe/GitHub-style) means a receiver that also checks "is this timestamp recent" can reject
  // a replayed delivery outright, since replaying an old timestamp+signature pair verifies fine
  // cryptographically but fails the freshness check, and forging a fresh one requires the secret.
  return crypto.createHmac('sha256', secret).update(`${timestamp}.${body}`).digest('hex');
}

// Preserve the underlying network cause when a request error wraps it, so DNS failures and
// connection failures remain distinguishable in the delivery log. Kept standalone for unit tests.
export function formatDeliveryError(err: unknown): string {
  if (!(err instanceof Error)) return 'Request failed';
  const cause = err.cause;
  const causeMessage = cause instanceof Error ? cause.message : undefined;
  return causeMessage ? `${err.message}: ${causeMessage}` : err.message;
}

function createPinnedLookup(addresses: LookupAddress[]): NonNullable<http.RequestOptions['lookup']> {
  return (_hostname, options, callback) => {
    const candidates = options.family
      ? addresses.filter((entry) => entry.family === options.family)
      : addresses;
    if (candidates.length === 0) {
      const error = Object.assign(new Error('No validated address matches the requested IP family'), { code: 'ENOTFOUND' });
      callback(error, '', 0);
      return;
    }

    if (options.all) {
      callback(null, candidates);
      return;
    }

    callback(null, candidates[0].address, candidates[0].family);
  };
}

function postJson(
  url: URL,
  addresses: LookupAddress[],
  headers: Record<string, string>,
  body: string,
): Promise<{ statusCode: number | null; responseBody: string }> {
  return new Promise((resolve, reject) => {
    const requestOptions: http.RequestOptions = {
      method: 'POST',
      headers,
      lookup: createPinnedLookup(addresses),
      // Do not reuse a socket whose peer was selected for a previous DNS resolution.
      agent: false,
      signal: AbortSignal.timeout(5000),
    };

    const onResponse = (response: http.IncomingMessage) => {
      const chunks: Buffer[] = [];
      let remaining = 2000;

      response.on('data', (chunk: Buffer | string) => {
        if (remaining <= 0) return;
        const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
        const kept = bytes.subarray(0, remaining);
        chunks.push(kept);
        remaining -= kept.length;
      });
      response.once('error', reject);
      response.once('end', () => {
        resolve({
          statusCode: response.statusCode ?? null,
          responseBody: Buffer.concat(chunks).toString('utf8').slice(0, 2000),
        });
      });
    };
    const request = url.protocol === 'https:'
      ? https.request(url, requestOptions, onResponse)
      : http.request(url, requestOptions, onResponse);

    request.once('error', reject);
    request.end(body);
  });
}

async function deliver(webhook: { id: string; url: string; secret: string }, payload: unknown) {
  const body = JSON.stringify(payload);
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const signature = sign(webhook.secret, timestamp, body);

  let statusCode: number | null = null;
  let success = false;
  let responseBody: string | null = null;

  try {
    // Resolve and validate immediately before connecting, then pin the socket to one of those
    // validated addresses. The original hostname remains for Host and TLS verification, and
    // Node's HTTP client does not follow redirects.
    const target = await resolvePublicHttpUrl(webhook.url);
    const response = await postJson(target.url, target.addresses, {
      'Content-Type': 'application/json',
      'X-TestForge-Signature': signature,
      'X-TestForge-Timestamp': timestamp,
    }, body);
    statusCode = response.statusCode;
    success = statusCode !== null && statusCode >= 200 && statusCode < 300;
    responseBody = response.responseBody;
  } catch (err) {
    responseBody = formatDeliveryError(err);
  }

  await prisma.webhookDelivery.create({
    data: { webhookId: webhook.id, statusCode, success, requestBody: body, responseBody },
  });
}

export async function dispatchWebhookEvent(projectId: string, event: WebhookEvent, payload: Record<string, unknown>) {
  const webhooks = await prisma.webhook.findMany({ where: { projectId, event, isActive: true } });
  const fullPayload = { event, ...payload };
  await Promise.allSettled(webhooks.map((webhook) => deliver(webhook, fullPayload)));
}

// Delivers to exactly the one webhook being tested — deliberately not routed through
// dispatchWebhookEvent, which matches by project+event and would otherwise fan a "test this one
// webhook" action out to every other active webhook sharing the same project and event type.
export async function deliverTestPing(webhook: { id: string; url: string; secret: string }, triggeredBy: string) {
  await deliver(webhook, { event: 'ping', ping: true, triggeredBy });
}

import { formatDeliveryError } from './webhook-dispatcher';

// Preserve transport error causes when a request wrapper supplies both an outer message and a
// more specific cause. Test synthetic errors so the formatting check does not depend on live DNS.
describe('formatDeliveryError', () => {
  it('surfaces a DNS-failure cause distinctly from a connection-refused cause', () => {
    const dnsErr = new TypeError('fetch failed');
    Object.assign(dnsErr, { cause: Object.assign(new Error('getaddrinfo ENOTFOUND this-host-does-not-exist.invalid'), { code: 'ENOTFOUND' }) });

    const refusedErr = new TypeError('fetch failed');
    Object.assign(refusedErr, { cause: Object.assign(new Error('connect ECONNREFUSED 127.0.0.1:1'), { code: 'ECONNREFUSED' }) });

    const dnsMessage = formatDeliveryError(dnsErr);
    const refusedMessage = formatDeliveryError(refusedErr);

    expect(dnsMessage).toMatch(/ENOTFOUND/);
    expect(refusedMessage).toMatch(/ECONNREFUSED/);
    expect(dnsMessage).not.toBe(refusedMessage);
  });

  it('falls back to the outer error message when there is no cause', () => {
    expect(formatDeliveryError(new Error('fetch failed'))).toBe('fetch failed');
  });

  it('falls back to a generic message for a non-Error throw', () => {
    expect(formatDeliveryError('not an error')).toBe('Request failed');
  });
});

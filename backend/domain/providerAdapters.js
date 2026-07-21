'use strict';

const ALLOWED = {
  crm: ['case.upsert', 'stage.update'], clm: ['agreement.create', 'agreement.status'],
  erp: ['revenue.reserve', 'revenue.release'], notification: ['approval.requested', 'case.completed'],
};

async function dispatch({ connector, operation, payload, idempotencyKey, fetchImpl = fetch }) {
  if (!ALLOWED[connector]?.includes(operation)) throw Object.assign(new Error('unsupported provider operation'), { retryable: false });
  if (!idempotencyKey || idempotencyKey.length < 8) throw Object.assign(new Error('provider idempotency key required'), { retryable: false });
  const prefix = `ALLIANCE_${connector.toUpperCase()}_PROVIDER`;
  const endpoint = process.env[`${prefix}_URL`];
  const token = process.env[`${prefix}_TOKEN`];
  if (!endpoint || !token) throw Object.assign(new Error(`${connector} provider is not configured`), { retryable: false });
  const url = new URL(endpoint);
  if (url.protocol !== 'https:' && process.env.ALLOW_INSECURE_PROVIDER_HTTP !== 'true') throw Object.assign(new Error('provider URL must use HTTPS'), { retryable: false });
  let last;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const response = await fetchImpl(`${endpoint.replace(/\/$/, '')}/${operation}`, {
        method: 'POST', signal: AbortSignal.timeout(10000), headers: {
          authorization: `Bearer ${token}`, 'content-type': 'application/json', 'idempotency-key': idempotencyKey,
        }, body: JSON.stringify(payload),
      });
      if (response.ok) {
        const receipt = await response.json();
        if (!receipt.id || receipt.payloadHash !== payload.payloadHash) throw Object.assign(new Error('provider receipt mismatch'), { retryable: false });
        return receipt;
      }
      last = Object.assign(new Error(`provider HTTP ${response.status}`), { retryable: [408, 425, 429, 500, 502, 503, 504].includes(response.status) });
      if (!last.retryable) throw last;
    } catch (error) {
      last = error;
      if (error.retryable === false || attempt === 2) throw error;
    }
  }
  throw last;
}

module.exports = { dispatch, ALLOWED };

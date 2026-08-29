'use strict';
const correlationMiddleware = require('../../services/api/src/middleware/correlation');

describe('MarketHub Core Telemetry Correlation Middleware', () => {
  test('injects and preserves correlation identifiers on HTTP headers', () => {
    const req = {
      headers: { 'x-correlation-id': 'markethub-trace-501' }
    };
    const headersSent = {};
    const res = {
      setHeader: (k, v) => { headersSent[k] = v; },
      on: () => {}
    };

    let nextCalled = false;
    correlationMiddleware(req, res, () => { nextCalled = true; });

    expect(nextCalled).toBe(true);
    expect(req.correlationId).toBe('markethub-trace-501');
    expect(headersSent['X-Correlation-ID']).toBe('markethub-trace-501');
    expect(headersSent['X-Request-ID']).toBeDefined();
  });

  test('generates a new correlation ID when request header is absent', () => {
    const req = { headers: {} };
    const headersSent = {};
    const res = {
      setHeader: (k, v) => { headersSent[k] = v; },
      on: () => {}
    };

    correlationMiddleware(req, res, () => {});
    expect(req.correlationId).toBeDefined();
    expect(req.correlationId.length).toBeGreaterThan(10);
    expect(headersSent['X-Correlation-ID']).toBe(req.correlationId);
  });
});

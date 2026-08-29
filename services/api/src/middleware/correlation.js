'use strict';
const crypto = require('crypto');

function correlationMiddleware(req, res, next) {
  const correlationId = (req.headers['x-correlation-id'] || req.headers['x-request-id'] || crypto.randomUUID()).trim();
  const requestId = crypto.randomUUID();

  req.correlationId = correlationId;
  req.requestId = requestId;

  res.setHeader('X-Correlation-ID', correlationId);
  res.setHeader('X-Request-ID', requestId);

  const startHrTime = process.hrtime.bigint();

  res.on('finish', () => {
    const elapsedMs = Number(process.hrtime.bigint() - startHrTime) / 1e6;
    req.durationMs = Number(elapsedMs.toFixed(2));
  });

  next();
}

module.exports = correlationMiddleware;

'use strict';

function errorHandler(err, _req, res, _next) {
  const status = err.status || 500;
  const message = err.expose ? err.message : (status === 500 ? 'Internal server error' : err.message);
  if (status >= 500) console.error(JSON.stringify({ ts: new Date().toISOString(), level: 'error', msg: err.message }));
  res.status(status).json({ error: message, code: err.code || 'ERROR' });
}

function createError(status, message, code) {
  const err = new Error(message);
  err.status = status;
  err.expose = status < 500;
  err.code = code;
  return err;
}

module.exports = { errorHandler, createError };

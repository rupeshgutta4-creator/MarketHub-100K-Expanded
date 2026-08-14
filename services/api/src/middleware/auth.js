'use strict';
const jwt = require('jsonwebtoken');
const { createError } = require('./errorHandler');
const JWT_SECRET = process.env.JWT_SECRET || 'markethub-dev-secret';

function signToken(payload, expiresIn = '12h') {
  return jwt.sign(payload, JWT_SECRET, { expiresIn });
}

function authenticate(req, _res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return next(createError(401, 'Authentication required', 'AUTH_REQUIRED'));
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    next(createError(401, 'Invalid or expired token', 'AUTH_INVALID'));
  }
}

function requireRoles(...roles) {
  return (req, _res, next) => {
    if (!req.user) return next(createError(401, 'Authentication required', 'AUTH_REQUIRED'));
    if (!roles.includes(req.user.role) && req.user.role !== 'admin') {
      return next(createError(403, 'Insufficient permissions', 'FORBIDDEN'));
    }
    next();
  };
}

function optionalAuth(req, _res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (token) {
    try { req.user = jwt.verify(token, JWT_SECRET); } catch { /* ignore */ }
  }
  next();
}

module.exports = { signToken, authenticate, requireRoles, optionalAuth };

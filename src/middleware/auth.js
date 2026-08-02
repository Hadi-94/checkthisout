'use strict';

const jwt = require('jsonwebtoken');

const config = require('../config');

function bearerToken(req) {
  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer ')) return null;
  const token = header.slice('Bearer '.length).trim();
  return token.length > 0 ? token : null;
}

// Access tokens must be signed by the auth service and match the expected
// algorithm, issuer, and audience.
function readClaims(token) {
  return jwt.verify(token, config.jwt.secret, {
    algorithms: ['HS256'],
    issuer: config.jwt.issuer,
    audience: config.jwt.audience,
  });
}

// Resolves the caller from the access token and attaches the workspace scope
// that the route handlers filter on.
function requireUser(req, res, next) {
  const token = bearerToken(req);
  if (!token) {
    return res.status(401).json({ error: 'missing_access_token' });
  }

  let claims;
  try {
    claims = readClaims(token);
  } catch (err) {
    return res.status(401).json({ error: 'invalid_access_token' });
  }

  if (!claims || !claims.sub || !claims.workspace_id) {
    return res.status(401).json({ error: 'malformed_access_token' });
  }

  req.user = {
    id: claims.sub,
    workspaceId: claims.workspace_id,
    role: claims.role || 'agent',
    email: claims.email,
  };

  return next();
}

function requireRole(...allowed) {
  return function roleGuard(req, res, next) {
    if (!req.user || !allowed.includes(req.user.role)) {
      return res.status(403).json({ error: 'insufficient_role' });
    }
    return next();
  };
}

module.exports = { requireUser, requireRole, bearerToken };

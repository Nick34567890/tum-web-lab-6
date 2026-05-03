import jwt from 'jsonwebtoken';
import { JWT_SECRET, JWT_EXPIRES_IN, ROLES } from './config.js';

export function buildPermissions({ role, permissions }) {
  if (Array.isArray(permissions) && permissions.length) {
    return [...new Set(permissions.map((p) => String(p).toUpperCase()))];
  }
  if (role && ROLES[String(role).toUpperCase()]) {
    return ROLES[String(role).toUpperCase()];
  }
  return ROLES.VISITOR;
}

export function issueToken({ role, permissions, subject = 'demo-user' }) {
  const perms = buildPermissions({ role, permissions });
  const resolvedRole = role ? String(role).toUpperCase() : null;
  const payload = {
    sub: subject,
    role: resolvedRole,
    permissions: perms,
  };
  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
  const decoded = jwt.decode(token);
  return {
    token,
    tokenType: 'Bearer',
    expiresIn: JWT_EXPIRES_IN,
    expiresAt: decoded?.exp ? decoded.exp * 1000 : null,
    permissions: perms,
    role: resolvedRole,
  };
}

export function authenticate(req, res, next) {
  const header = req.headers.authorization || '';
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) {
    return res.status(401).json({ error: 'Missing or malformed Authorization header.' });
  }
  try {
    req.auth = jwt.verify(match[1], JWT_SECRET);
    next();
  } catch (err) {
    const reason = err.name === 'TokenExpiredError' ? 'Token expired.' : 'Invalid token.';
    return res.status(401).json({ error: reason });
  }
}

export function requirePermission(...required) {
  return (req, res, next) => {
    const granted = req.auth?.permissions || [];
    const ok = required.every((p) => granted.includes(p));
    if (!ok) {
      return res.status(403).json({
        error: 'Insufficient permissions.',
        required,
        granted,
      });
    }
    next();
  };
}

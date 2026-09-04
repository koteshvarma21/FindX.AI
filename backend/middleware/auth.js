const jwt = require('jsonwebtoken');

function getUserId(req) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) return null;
  try {
    return jwt.verify(header.slice(7), process.env.JWT_SECRET).id;
  } catch (_err) {
    return null;
  }
}

function optionalAuth(req, _res, next) {
  req.userId = getUserId(req) || undefined;
  next();
}

function requireAuth(req, res, next) {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ message: 'Invalid or missing token' });
  req.userId = userId;
  next();
}

module.exports = { optionalAuth, requireAuth };
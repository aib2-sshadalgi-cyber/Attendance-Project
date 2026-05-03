const jwt = require('jsonwebtoken');
const User = require('../models/User');

function attachUser() {
  return async (req, res, next) => {
    try {
      const header = req.headers.authorization || '';
      const token = header.startsWith('Bearer ') ? header.slice(7) : null;
      if (!token) {
        req.user = null;
        return next();
      }
      const secret = process.env.JWT_SECRET;
      if (!secret) {
        return res.status(500).json({ message: 'Server misconfiguration' });
      }
      const payload = jwt.verify(token, secret);
      const user = await User.findById(payload.sub).select('-passwordHash').lean();
      req.user = user;
      next();
    } catch {
      req.user = null;
      next();
    }
  };
}

function requireAuth(roles) {
  const allowed = Array.isArray(roles) ? roles : [roles];
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    if (allowed.length && !allowed.includes(req.user.role)) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    next();
  };
}

module.exports = { attachUser, requireAuth };

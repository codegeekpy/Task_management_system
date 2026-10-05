const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const JWT_SECRET = process.env.JWT_SECRET || 'taskflow-super-secure-jwt-secret-key-2026';
const TOKEN_EXPIRY = '7d';

function generateToken(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role
    },
    JWT_SECRET,
    { expiresIn: TOKEN_EXPIRY }
  );
}

function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return null;
  }
}

function comparePassword(plain, hashed) {
  return bcrypt.compareSync(plain, hashed);
}

function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Access token required. Please log in.' });
  }

  const token = authHeader.split(' ')[1];
  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(401).json({ error: 'Invalid or expired session. Please log in again.' });
  }

  req.user = decoded;
  next();
}

function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    if (!allowedRoles.includes(req.user.role) && !allowedRoles.includes('*')) {
      return res.status(403).json({ error: 'You do not have permission to perform this action' });
    }
    next();
  };
}

module.exports = {
  JWT_SECRET,
  generateToken,
  verifyToken,
  comparePassword,
  authenticate,
  requireRole
};

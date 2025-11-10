const jwt = require('jsonwebtoken');

// In production, store this in environment variables
const JWT_SECRET = 'jaimebeltran0610';
const JWT_EXPIRY = '1h';

function generateToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRY });
}

function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

module.exports = {
  JWT_SECRET,
  JWT_EXPIRY,
  generateToken,
  verifyToken
};
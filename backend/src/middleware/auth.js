/**
 * Authentication Middleware
 * Validates JWT tokens and protects routes
 */

const jwt = require('jsonwebtoken');
const { query } = require('../database');
const config = require('../config');

/**
 * Main authentication middleware
 * Validates JWT token from Authorization header
 */
async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];

    // Verify the token
    const decoded = jwt.verify(token, config.jwt.secret);

    // Get user from database
    const result = await query(
      'SELECT id, email, name, role FROM users WHERE id = $1',
      [decoded.userId]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'User not found' });
    }

    // Add user info to request
    req.user = result.rows[0];

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    return res.status(401).json({ error: 'Authentication failed' });
  }
}

/**
 * Role-based authorization middleware
 * Checks if user has required role
 */
function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    next();
  };
}

/**
 * Optional authentication middleware
 * Attaches user if token is valid, but doesn't require authentication
 */
async function optionalAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, config.jwt.secret);

    const result = await query(
      'SELECT id, email, name, role FROM users WHERE id = $1',
      [decoded.userId]
    );

    if (result.rows.length > 0) {
      req.user = result.rows[0];
    }

    next();
  } catch (error) {
    // Ignore errors and continue without user
    next();
  }
}

module.exports = {
  authenticate,
  authorize,
  optionalAuth
};

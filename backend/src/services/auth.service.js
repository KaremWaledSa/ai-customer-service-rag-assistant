/**
 * Authentication Service
 * Handles user authentication and token management
 */

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('../database');
const config = require('../config');

const SALT_ROUNDS = 10;

/**
 * Authenticate user with email and password
 */
async function login(email, password) {
  const result = await query(
    'SELECT id, email, password_hash, name, role FROM users WHERE email = $1',
    [email]
  );

  if (result.rows.length === 0) {
    throw new Error('Invalid credentials');
  }

  const user = result.rows[0];
  const isValid = await bcrypt.compare(password, user.password_hash);

  if (!isValid) {
    throw new Error('Invalid credentials');
  }

  const token = generateToken(user);

  // Remove password from user object
  const { password_hash, ...userWithoutPassword } = user;

  return {
    token,
    user: userWithoutPassword
  };
}

/**
 * Generate JWT token for user
 */
function generateToken(user) {
  return jwt.sign(
    {
      userId: user.id,
      email: user.email,
      role: user.role
    },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn }
  );
}

/**
 * Verify JWT token
 */
function verifyToken(token) {
  return jwt.verify(token, config.jwt.secret);
}

/**
 * Hash a password
 */
async function hashPassword(password) {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Compare password with hash
 */
async function comparePassword(password, hash) {
  return bcrypt.compare(password, hash);
}

/**
 * Create a new user
 */
async function createUser({ email, password, name, phone, role = 'doctor' }) {
  // Check if email exists
  const existing = await query(
    'SELECT id FROM users WHERE email = $1',
    [email]
  );

  if (existing.rows.length > 0) {
    throw new Error('Email already exists');
  }

  const passwordHash = await hashPassword(password);

  const result = await query(
    `INSERT INTO users (email, password_hash, name, phone, role)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, email, name, phone, role, created_at`,
    [email, passwordHash, name, phone, role]
  );

  return result.rows[0];
}

/**
 * Get user by ID
 */
async function getUserById(id) {
  const result = await query(
    'SELECT id, email, name, phone, role, created_at FROM users WHERE id = $1',
    [id]
  );

  if (result.rows.length === 0) {
    return null;
  }

  return result.rows[0];
}

/**
 * Get user by email
 */
async function getUserByEmail(email) {
  const result = await query(
    'SELECT id, email, name, phone, role, created_at FROM users WHERE email = $1',
    [email]
  );

  if (result.rows.length === 0) {
    return null;
  }

  return result.rows[0];
}

/**
 * Update user password
 */
async function updatePassword(userId, newPassword) {
  const passwordHash = await hashPassword(newPassword);

  await query(
    'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
    [passwordHash, userId]
  );

  return true;
}

module.exports = {
  login,
  generateToken,
  verifyToken,
  hashPassword,
  comparePassword,
  createUser,
  getUserById,
  getUserByEmail,
  updatePassword
};

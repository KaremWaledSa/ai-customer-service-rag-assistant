/**
 * Auth Service Unit Tests
 */

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Create mock functions
const mockQuery = jest.fn();

// Mock dependencies BEFORE requiring the service
jest.mock('../../src/config/database', () => ({
  query: mockQuery,
  initDatabase: jest.fn().mockResolvedValue(true),
  getPool: jest.fn()
}));

jest.mock('../../src/config', () => ({
  jwt: {
    secret: 'test_jwt_secret_key_for_testing',
    expiresIn: '24h'
  },
  whatsapp: {
    phoneNumberId: 'test_phone_id',
    token: 'test_token',
    verifyToken: 'test_verify_token'
  }
}));

// Now require the service
const authService = require('../../src/services/auth.service');

describe('Auth Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockQuery.mockResolvedValue({ rows: [], rowCount: 0 });
  });

  describe('login', () => {
    it('should authenticate valid user and return token', async () => {
      const hashedPassword = await bcrypt.hash('password123', 10);

      mockQuery.mockResolvedValue({
        rows: [{
          id: 1,
          email: 'doctor@nutrition.sa',
          password_hash: hashedPassword,
          name: 'دكتور التغذية',
          role: 'doctor'
        }],
        rowCount: 1
      });

      const result = await authService.login('doctor@nutrition.sa', 'password123');

      expect(result).toHaveProperty('token');
      expect(result).toHaveProperty('user');
      expect(result.user).not.toHaveProperty('password_hash');
      expect(result.user.email).toBe('doctor@nutrition.sa');
    });

    it('should return valid JWT token', async () => {
      const hashedPassword = await bcrypt.hash('password123', 10);

      mockQuery.mockResolvedValue({
        rows: [{
          id: 1,
          email: 'doctor@nutrition.sa',
          password_hash: hashedPassword,
          name: 'دكتور التغذية',
          role: 'doctor'
        }],
        rowCount: 1
      });

      const result = await authService.login('doctor@nutrition.sa', 'password123');

      // Verify the token can be decoded
      const decoded = jwt.verify(result.token, 'test_jwt_secret_key_for_testing');
      expect(decoded).toHaveProperty('userId', 1);
      expect(decoded).toHaveProperty('email', 'doctor@nutrition.sa');
    });

    it('should reject invalid email', async () => {
      mockQuery.mockResolvedValue({ rows: [], rowCount: 0 });

      await expect(
        authService.login('invalid@email.com', 'password')
      ).rejects.toThrow('Invalid credentials');
    });

    it('should reject invalid password', async () => {
      const hashedPassword = await bcrypt.hash('correctpassword', 10);

      mockQuery.mockResolvedValue({
        rows: [{
          id: 1,
          email: 'doctor@nutrition.sa',
          password_hash: hashedPassword,
          name: 'دكتور',
          role: 'doctor'
        }],
        rowCount: 1
      });

      await expect(
        authService.login('doctor@nutrition.sa', 'wrongpassword')
      ).rejects.toThrow('Invalid credentials');
    });
  });

  describe('verifyToken', () => {
    it('should verify valid token', () => {
      const token = jwt.sign(
        { userId: 1, email: 'doctor@test.com', role: 'doctor' },
        'test_jwt_secret_key_for_testing',
        { expiresIn: '24h' }
      );

      const result = authService.verifyToken(token);

      expect(result).toHaveProperty('userId', 1);
      expect(result).toHaveProperty('email', 'doctor@test.com');
    });

    it('should reject expired token', () => {
      const token = jwt.sign(
        { userId: 1 },
        'test_jwt_secret_key_for_testing',
        { expiresIn: '-1h' }
      );

      expect(() => authService.verifyToken(token)).toThrow();
    });

    it('should reject invalid token', () => {
      expect(() => authService.verifyToken('invalid_token')).toThrow();
    });

    it('should reject token with wrong secret', () => {
      const token = jwt.sign(
        { userId: 1 },
        'wrong_secret',
        { expiresIn: '24h' }
      );

      expect(() => authService.verifyToken(token)).toThrow();
    });
  });

  describe('generateToken', () => {
    it('should generate valid JWT token', () => {
      const user = { id: 1, email: 'doctor@test.com', role: 'doctor' };

      const token = authService.generateToken(user);

      expect(typeof token).toBe('string');
      expect(token.split('.').length).toBe(3); // JWT format

      // Verify the token is valid
      const decoded = jwt.verify(token, 'test_jwt_secret_key_for_testing');
      expect(decoded.userId).toBe(1);
      expect(decoded.email).toBe('doctor@test.com');
    });

    it('should include role in token', () => {
      const user = { id: 1, email: 'doctor@test.com', role: 'admin' };

      const token = authService.generateToken(user);
      const decoded = jwt.verify(token, 'test_jwt_secret_key_for_testing');

      expect(decoded.role).toBe('admin');
    });
  });

  describe('hashPassword', () => {
    it('should hash password securely', async () => {
      const password = 'mySecurePassword123';

      const hash = await authService.hashPassword(password);

      expect(hash).not.toBe(password);
      expect(hash.length).toBeGreaterThan(50);

      // Verify the hash
      const isValid = await bcrypt.compare(password, hash);
      expect(isValid).toBe(true);
    });

    it('should generate different hashes for same password', async () => {
      const password = 'testPassword';

      const hash1 = await authService.hashPassword(password);
      const hash2 = await authService.hashPassword(password);

      expect(hash1).not.toBe(hash2);
    });
  });

  describe('comparePassword', () => {
    it('should return true for matching password', async () => {
      const password = 'myPassword123';
      const hash = await bcrypt.hash(password, 10);

      const result = await authService.comparePassword(password, hash);

      expect(result).toBe(true);
    });

    it('should return false for non-matching password', async () => {
      const hash = await bcrypt.hash('correctPassword', 10);

      const result = await authService.comparePassword('wrongPassword', hash);

      expect(result).toBe(false);
    });
  });

  describe('createUser', () => {
    it('should create new user with hashed password', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // Check existing
        .mockResolvedValueOnce({
          rows: [{
            id: 1,
            email: 'newdoctor@nutrition.sa',
            name: 'دكتور جديد',
            role: 'doctor'
          }],
          rowCount: 1
        });

      const result = await authService.createUser({
        email: 'newdoctor@nutrition.sa',
        password: 'securePassword123',
        name: 'دكتور جديد',
        role: 'doctor'
      });

      expect(result).toHaveProperty('id');
      expect(result).not.toHaveProperty('password');
      expect(result).not.toHaveProperty('password_hash');
    });

    it('should reject duplicate email', async () => {
      mockQuery.mockResolvedValue({
        rows: [{ id: 1 }],
        rowCount: 1
      });

      await expect(
        authService.createUser({
          email: 'existing@test.com',
          password: 'password',
          name: 'Test'
        })
      ).rejects.toThrow('Email already exists');
    });

    it('should hash password before storing', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [], rowCount: 0 })
        .mockResolvedValueOnce({ rows: [{ id: 1 }], rowCount: 1 });

      await authService.createUser({
        email: 'test@test.com',
        password: 'password123',
        name: 'Test'
      });

      // Check that the second query (INSERT) was called with a hashed password
      const insertCall = mockQuery.mock.calls[1];
      expect(insertCall[1][1]).not.toBe('password123'); // Should be hashed
      expect(insertCall[1][1].length).toBeGreaterThan(50); // Bcrypt hash length
    });
  });

  describe('getUserById', () => {
    it('should return user without password', async () => {
      mockQuery.mockResolvedValue({
        rows: [{
          id: 1,
          email: 'doctor@test.com',
          name: 'Doctor',
          role: 'doctor'
        }],
        rowCount: 1
      });

      const result = await authService.getUserById(1);

      expect(result).toHaveProperty('id', 1);
      expect(result).not.toHaveProperty('password_hash');
    });

    it('should return null for non-existent user', async () => {
      mockQuery.mockResolvedValue({ rows: [], rowCount: 0 });

      const result = await authService.getUserById(999);

      expect(result).toBeNull();
    });
  });

  describe('getUserByEmail', () => {
    it('should return user by email', async () => {
      mockQuery.mockResolvedValue({
        rows: [{
          id: 1,
          email: 'doctor@test.com',
          name: 'Doctor',
          role: 'doctor'
        }],
        rowCount: 1
      });

      const result = await authService.getUserByEmail('doctor@test.com');

      expect(result).toHaveProperty('email', 'doctor@test.com');
    });

    it('should return null for non-existent email', async () => {
      mockQuery.mockResolvedValue({ rows: [], rowCount: 0 });

      const result = await authService.getUserByEmail('notfound@test.com');

      expect(result).toBeNull();
    });
  });

  describe('updatePassword', () => {
    it('should update user password', async () => {
      mockQuery.mockResolvedValue({ rows: [], rowCount: 1 });

      const result = await authService.updatePassword(1, 'newPassword123');

      expect(result).toBe(true);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE users'),
        expect.any(Array)
      );
    });

    it('should hash new password before storing', async () => {
      mockQuery.mockResolvedValue({ rows: [], rowCount: 1 });

      await authService.updatePassword(1, 'newPassword123');

      const updateCall = mockQuery.mock.calls[0];
      expect(updateCall[1][0]).not.toBe('newPassword123');
      expect(updateCall[1][0].length).toBeGreaterThan(50);
    });
  });
});

describe('Auth Middleware', () => {
  const authMiddleware = require('../../src/middleware/auth');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('authenticate', () => {
    it('should reject request without token', async () => {
      const req = { headers: {} };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();

      await authMiddleware.authenticate(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject invalid token format', async () => {
      const req = {
        headers: { authorization: 'InvalidFormat token123' }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();

      await authMiddleware.authenticate(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('should reject expired token', async () => {
      const token = jwt.sign(
        { userId: 1 },
        'test_jwt_secret_key_for_testing',
        { expiresIn: '-1h' }
      );

      const req = {
        headers: { authorization: `Bearer ${token}` }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();

      await authMiddleware.authenticate(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: 'Token expired' })
      );
    });

    it('should reject invalid JWT token', async () => {
      const req = {
        headers: { authorization: 'Bearer invalid.jwt.token' }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();

      await authMiddleware.authenticate(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
    });
  });
});

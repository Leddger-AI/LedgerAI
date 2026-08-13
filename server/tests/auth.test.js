/**
 * Auth Middleware Tests
 * Tests Supabase JWT verification and dev bypass mode
 */
const path = require('path');

// Mock supabase before requiring auth middleware
jest.mock('@supabase/supabase-js', () => {
  const mockAuth = {
    getUser: jest.fn(),
  };
  const mockClient = {
    auth: mockAuth,
  };
  return {
    createClient: jest.fn(() => mockClient),
    __mockAuth: mockAuth,
    __mockClient: mockClient,
  };
});

// We need to set env vars before requiring the module
const originalEnv = { ...process.env };

describe('Auth Middleware', () => {
  let verifyToken;
  let mockAuth;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  describe('without Supabase env vars (dev bypass mode)', () => {
    beforeEach(() => {
      delete process.env.SUPABASE_URL;
      delete process.env.SUPABASE_SERVICE_ROLE_KEY;
      jest.resetModules();
      verifyToken = require('../middleware/auth');
    });

    test('A1: rejects request without Authorization header', async () => {
      const req = { headers: {} };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const next = jest.fn();

      await verifyToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: expect.stringContaining('Missing') });
      expect(next).not.toHaveBeenCalled();
    });

    test('A2: rejects request with malformed Authorization header', async () => {
      const req = { headers: { authorization: 'Token abc123' } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const next = jest.fn();

      await verifyToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });

    test('A3: dev bypass creates mock user from token prefix', async () => {
      const req = { headers: { authorization: 'Bearer test-token-12345' } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const next = jest.fn();

      await verifyToken(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.user).toBeDefined();
      expect(req.user.uid).toContain('DEV_MOCK_UID_');
      expect(req.user.email).toBe('dev@localhost');
    });
  });

  describe('with Supabase env vars', () => {
    beforeEach(() => {
      process.env.SUPABASE_URL = 'https://test.supabase.co';
      process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';
      jest.resetModules();
      const supabaseLib = require('@supabase/supabase-js');
      mockAuth = supabaseLib.__mockAuth;
      mockAuth.getUser.mockReset();
      verifyToken = require('../middleware/auth');
    });

    test('A4: rejects request without Authorization header', async () => {
      const req = { headers: {} };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const next = jest.fn();

      await verifyToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });

    test('A5: rejects request with invalid token', async () => {
      mockAuth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Invalid JWT' },
      });

      const req = { headers: { authorization: 'Bearer invalid-token' } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const next = jest.fn();

      await verifyToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: expect.stringContaining('Invalid token') });
      expect(next).not.toHaveBeenCalled();
    });

    test('A6: accepts request with valid token and sets req.user', async () => {
      const mockUser = { id: 'user-uuid-123', email: 'test@leddger.ai' };
      mockAuth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const req = { headers: { authorization: 'Bearer valid-jwt-token' } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const next = jest.fn();

      await verifyToken(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.user).toBeDefined();
      expect(req.user.uid).toBe('user-uuid-123');
      expect(req.user.email).toBe('test@leddger.ai');
    });

    test('A7: handles supabase auth.getUser throwing an error', async () => {
      mockAuth.getUser.mockRejectedValue(new Error('Network error'));

      const req = { headers: { authorization: 'Bearer some-token' } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const next = jest.fn();

      await verifyToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });

    test('A8: extracts Bearer token correctly from header', async () => {
      const mockUser = { id: 'user-uuid-456', email: 'test2@leddger.ai' };
      mockAuth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const req = { headers: { authorization: 'Bearer my-exact-token' } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const next = jest.fn();

      await verifyToken(req, res, next);

      expect(mockAuth.getUser).toHaveBeenCalledWith('my-exact-token');
    });
  });
});

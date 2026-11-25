const request = require('supertest');
const { pingSupabase } = require('../utils/supabaseKeepAlive');

describe('Supabase Keep-Alive Hook', () => {
  test('returns ok:true and latencyMs when Supabase profiles query succeeds', async () => {
    const mockClient = {
      from: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue({ error: null }),
        }),
      }),
    };

    const res = await pingSupabase(mockClient);
    expect(res.ok).toBe(true);
    expect(res.status).toBe('active');
    expect(typeof res.latencyMs).toBe('number');
    expect(res.timestamp).toBeTruthy();
    expect(mockClient.from).toHaveBeenCalledWith('profiles');
  });

  test('returns ok:false and status:unconfigured when client is null', async () => {
    const res = await pingSupabase(null);
    expect(res.ok).toBe(false);
    expect(res.status).toBe('unconfigured');
    expect(res.error).toMatch(/not configured/i);
  });

  test('returns ok:false and status:error when Supabase returns a query error', async () => {
    const mockClient = {
      from: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue({ error: { message: 'connection refused' } }),
        }),
      }),
    };

    const res = await pingSupabase(mockClient);
    expect(res.ok).toBe(false);
    expect(res.status).toBe('error');
    expect(res.error).toBe('connection refused');
  });

  test('catches thrown network exceptions gracefully', async () => {
    const mockClient = {
      from: jest.fn().mockImplementation(() => {
        throw new Error('ECONNRESET');
      }),
    };

    const res = await pingSupabase(mockClient);
    expect(res.ok).toBe(false);
    expect(res.status).toBe('error');
    expect(res.error).toBe('ECONNRESET');
  });
});

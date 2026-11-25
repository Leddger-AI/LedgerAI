const defaultSupabase = require('../supabaseClient');

/**
 * Lightweight keep-alive ping to Supabase so free-tier projects never pause
 * due to 7-day inactivity. Performs a minimal 1-row head/limit query on
 * `profiles` (falls back to auth admin listUsers if profiles fails).
 *
 * @param {object} [client] Optional Supabase client (for testing)
 * @returns {Promise<{ok: boolean, status: string, latencyMs: number, error?: string, timestamp: string}>}
 */
async function pingSupabase(client = defaultSupabase) {
  const timestamp = new Date().toISOString();
  if (!client) {
    return {
      ok: false,
      status: 'unconfigured',
      latencyMs: 0,
      error: 'Supabase client is not configured',
      timestamp,
    };
  }

  const start = Date.now();
  try {
    const { error } = await client
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .limit(1);

    const latencyMs = Date.now() - start;
    if (error) {
      return {
        ok: false,
        status: 'error',
        latencyMs,
        error: error.message || 'Supabase query failed',
        timestamp,
      };
    }

    return {
      ok: true,
      status: 'active',
      latencyMs,
      timestamp,
    };
  } catch (err) {
    return {
      ok: false,
      status: 'error',
      latencyMs: Date.now() - start,
      error: err.message || 'Unexpected error pinging Supabase',
      timestamp,
    };
  }
}

module.exports = { pingSupabase };

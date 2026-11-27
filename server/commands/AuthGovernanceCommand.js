const SubCommandCenter = require('../core/SubCommandCenter');
const { pingSupabase } = require('../utils/supabaseKeepAlive');

class AuthGovernanceCommand extends SubCommandCenter {
  constructor() {
    super({
      name: 'AuthGovernance',
      description: 'User profiles, OTP destructive gates, Cloudinary avatars, audit logs, and Supabase keep-alive',
      prefixes: ['/api/user', '/api/cloudinary', '/api/keep-alive', '/api/audit-log'],
    });
  }

  async runResearch() {
    const ping = await pingSupabase();
    return {
      domain: this.name,
      status: ping.ok ? 'healthy' : 'degraded',
      supabaseStatus: ping.status,
      latencyMs: ping.latencyMs,
      cloudinaryConfigured: !!(process.env.CLOUDINARY_CLOUDNAME && process.env.CLOUDINARY_API_KEY),
    };
  }
}

module.exports = AuthGovernanceCommand;

const SubCommandCenter = require('../core/SubCommandCenter');
const supabase = require('../supabaseClient');
const Interview = require('../models/Interview');

class FormsSourcingCommand extends SubCommandCenter {
  constructor() {
    super({
      name: 'FormsSourcing',
      description: 'Form drafts, scheduling, public form submissions, candidate sourcing, and Jitsi/ICS interviews',
      prefixes: ['/api/drafts', '/api/forms', '/api/submissions', '/api/candidates', '/api/interviews'],
    });
  }

  async runResearch(ownerUid) {
    const [draftsRes, candidatesRes, scheduledInterviews] = await Promise.all([
      supabase ? supabase.from('form_drafts').select('status').eq('user_id', ownerUid) : Promise.resolve({ data: [] }),
      supabase ? supabase.from('candidates').select('status').eq('user_id', ownerUid) : Promise.resolve({ data: [] }),
      Interview.countDocuments({ ownerUid, status: 'scheduled' }).catch(() => 0),
    ]);

    const drafts = draftsRes?.data || [];
    const candidates = candidatesRes?.data || [];

    return {
      domain: this.name,
      status: 'healthy',
      totalDrafts: drafts.length,
      activeForms: drafts.filter((d) => d.status === 'active').length,
      totalCandidates: candidates.length,
      scheduledInterviews,
    };
  }
}

module.exports = FormsSourcingCommand;

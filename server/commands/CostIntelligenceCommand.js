const SubCommandCenter = require('../core/SubCommandCenter');
const supabase = require('../supabaseClient');
const Project = require('../models/Project');
const TeamMember = require('../models/TeamMember');
const ProjectBudget = require('../models/ProjectBudget');

class CostIntelligenceCommand extends SubCommandCenter {
  constructor() {
    super({
      name: 'CostIntelligence',
      description: 'Meetings, Gemini AI attribution, cost splits, projects, team rates, budgets, and alerts',
      prefixes: ['/api/meetings', '/api/rates', '/api/budgets', '/api/projects', '/api/team-members', '/api/alerts'],
    });
  }

  async runResearch(ownerUid) {
    const [projectsCount, membersCount, budgetsCount, meetingsRes] = await Promise.all([
      Project.countDocuments({ ownerUid }).catch(() => 0),
      TeamMember.countDocuments({ ownerUid }).catch(() => 0),
      ProjectBudget.countDocuments({ ownerUid }).catch(() => 0),
      supabase
        ? supabase.from('meetings').select('id,requires_human_review', { count: 'exact' }).eq('user_id', ownerUid)
        : Promise.resolve({ data: [], count: 0 }),
    ]);

    const meetings = meetingsRes?.data || [];
    const needsReview = meetings.filter((m) => m.requires_human_review).length;

    return {
      domain: this.name,
      status: 'healthy',
      geminiConfigured: !!process.env.GEMINI_API_KEY,
      projectsCount,
      membersCount,
      budgetsCount,
      meetingsCount: meetingsRes?.count ?? meetings.length,
      needsReview,
    };
  }
}

module.exports = CostIntelligenceCommand;

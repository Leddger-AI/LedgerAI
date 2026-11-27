const SubCommandCenter = require('../core/SubCommandCenter');
const EmailDraft = require('../models/EmailDraft');
const EmailCampaign = require('../models/EmailCampaign');
const { isAgendaReady } = require('../scheduler');

class EmailCampaignsCommand extends SubCommandCenter {
  constructor() {
    super({
      name: 'EmailCampaigns',
      description: 'Email drafts, multi-account SMTP/OAuth2, Agenda scheduled campaigns, suppressions, and send logs',
      prefixes: ['/api/email'],
    });
  }

  async runResearch(ownerUid) {
    const [draftsCount, scheduledCount, sentCount] = await Promise.all([
      EmailDraft.countDocuments({ ownerUid }).catch(() => 0),
      EmailCampaign.countDocuments({ ownerUid, status: 'scheduled' }).catch(() => 0),
      EmailCampaign.countDocuments({ ownerUid, status: 'sent' }).catch(() => 0),
    ]);

    return {
      domain: this.name,
      status: 'healthy',
      agendaReady: isAgendaReady(),
      draftsCount,
      scheduledCount,
      sentCount,
    };
  }
}

module.exports = EmailCampaignsCommand;

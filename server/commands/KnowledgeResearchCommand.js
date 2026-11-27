const SubCommandCenter = require('../core/SubCommandCenter');
const KnowledgeDocument = require('../models/KnowledgeDocument');
const Collaborator = require('../models/Collaborator');

class KnowledgeResearchCommand extends SubCommandCenter {
  constructor() {
    super({
      name: 'KnowledgeResearch',
      description: 'Knowledge Base ingestion, recursive chunking, Gemini RAG Q&A, and Octokit Collaborator Network',
      prefixes: ['/api/kb', '/api/collaborators'],
    });
  }

  async runResearch(ownerUid) {
    const [docsCount, collaboratorsCount] = await Promise.all([
      KnowledgeDocument.countDocuments({ ownerUid }).catch(() => 0),
      Collaborator.countDocuments({}).catch(() => 0),
    ]);

    return {
      domain: this.name,
      status: 'healthy',
      knowledgeDocsCount: docsCount,
      collaboratorsCount,
      githubTokenConfigured: !!process.env.GITHUB_TOKEN,
    };
  }
}

module.exports = KnowledgeResearchCommand;

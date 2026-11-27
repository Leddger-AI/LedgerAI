const express = require('express');
const request = require('supertest');
const MainCommandCenter = require('../core/MainCommandCenter');
const AuthGovernanceCommand = require('../commands/AuthGovernanceCommand');
const CostIntelligenceCommand = require('../commands/CostIntelligenceCommand');
const FormsSourcingCommand = require('../commands/FormsSourcingCommand');
const EmailCampaignsCommand = require('../commands/EmailCampaignsCommand');
const AnalyticsExportCommand = require('../commands/AnalyticsExportCommand');
const KnowledgeResearchCommand = require('../commands/KnowledgeResearchCommand');

describe('MainCommandCenter -> SubCommandCenter Tree Architecture', () => {
  function buildTestApp() {
    const app = express();
    const mcc = new MainCommandCenter()
      .register(new AuthGovernanceCommand())
      .register(new CostIntelligenceCommand())
      .register(new FormsSourcingCommand())
      .register(new EmailCampaignsCommand())
      .register(new AnalyticsExportCommand())
      .register(new KnowledgeResearchCommand());

    const mockAuth = (req, _res, next) => {
      req.user = { uid: 'test-uid', email: 'test@example.com' };
      next();
    };

    app.use(mcc.dispatchMiddleware());
    mcc.mountAll(app, mockAuth);
    app.get('/api/projects', (_req, res) => res.json({ projects: [] }));
    app.get('/api/kb/documents', (_req, res) => res.json([]));
    return { app, mcc };
  }

  test('routes requests through MainCommandCenter and tags Sub-Command headers', async () => {
    const { app, mcc } = buildTestApp();

    const r1 = await request(app).get('/api/projects');
    expect(r1.status).toBe(200);
    expect(r1.headers['x-command-center']).toBe('CostIntelligence');
    expect(r1.headers['x-task-id']).toMatch(/^cmd_/);

    const r2 = await request(app).get('/api/kb/documents');
    expect(r2.status).toBe(200);
    expect(r2.headers['x-command-center']).toBe('KnowledgeResearch');

    const overview = mcc.getOverview();
    expect(overview.subCentersCount).toBe(6);
    expect(overview.totals.totalRequests).toBe(2);
    expect(overview.totals.completed).toBe(2);
    expect(overview.recentTasks[0].domain).toBe('KnowledgeResearch');
  });

  test('GET /api/command-center/overview & /tasks return live tree telemetry', async () => {
    const { app } = buildTestApp();
    await request(app).get('/api/projects');

    const ov = await request(app).get('/api/command-center/overview');
    expect(ov.status).toBe(200);
    expect(ov.body.mainCommandCenter).toBe('LedgerAI-MainCommandCenter');
    expect(ov.body.subCenters.map((s) => s.name)).toEqual([
      'AuthGovernance',
      'CostIntelligence',
      'FormsSourcing',
      'EmailCampaigns',
      'AnalyticsExport',
      'KnowledgeResearch',
    ]);

    const tasks = await request(app).get('/api/command-center/tasks?domain=CostIntelligence');
    expect(tasks.status).toBe(200);
    expect(tasks.body.tasks.every((t) => t.domain === 'CostIntelligence')).toBe(true);
  });

  test('POST /api/command-center/research executes parallel multi-domain diagnostics', async () => {
    const { app } = buildTestApp();
    const res = await request(app).post('/api/command-center/research');
    expect(res.status).toBe(200);
    expect(res.body.orchestrator).toBe('MainCommandCenter');
    expect(res.body.domains).toHaveLength(6);
    expect(res.body.domains.map((d) => d.domain)).toContain('CostIntelligence');
    expect(res.body.domains.map((d) => d.domain)).toContain('KnowledgeResearch');
  });
});

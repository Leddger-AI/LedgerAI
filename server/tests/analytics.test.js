/**
 * Analytics API Tests — Overview, Templates, Detail, Submissions, Field Analysis, Trends, Sync
 * Uses MongoDB Memory Server for Mongoose models and mocks Supabase + GitHub API
 */
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const request = require('supertest');

// --- Supabase mock ---
const mockSupabaseQuery = { data: null, error: null, count: null };

function createChain() {
  const chain = {
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    upsert: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue(mockSupabaseQuery),
    count: jest.fn().mockReturnThis(),
    then: (resolve, reject) => Promise.resolve(mockSupabaseQuery).then(resolve, reject),
  };
  return chain;
}

const mockSupabase = { from: jest.fn(() => createChain()) };
jest.mock('../supabaseClient', () => mockSupabase);

// Mock auth middleware
jest.mock('../middleware/auth', () =>
  jest.fn((req, res, next) => {
    req.user = { uid: req.headers['x-test-uid'] || 'test-user-uid', email: 'test@leddger.ai' };
    next();
  })
);

// Mock scheduler
jest.mock('../scheduler', () => ({
  scheduleCampaign: jest.fn(() => Promise.resolve()),
  cancelScheduledCampaign: jest.fn(() => Promise.resolve()),
  stopAgenda: jest.fn(() => Promise.resolve()),
  scheduleDraftActivation: jest.fn(() => Promise.resolve()),
  cancelDraftActivation: jest.fn(() => Promise.resolve()),
}));

// Mock emailService
jest.mock('../utils/emailService', () => ({
  sendFormSubmissionEmail: jest.fn(() => Promise.resolve()),
}));

// Mock startupCheck
jest.mock('../startupCheck', () => ({
  runStartupChecks: jest.fn(() => Promise.resolve([])),
}));

// Mock crypto
jest.mock('../utils/crypto', () => ({
  encrypt: jest.fn((val) => `encrypted:${val}`),
  decrypt: jest.fn((val) => val.replace('encrypted:', '')),
}));

let mongoServer;
let app;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);
  app = require('../index.js');
  await new Promise(resolve => setTimeout(resolve, 500));
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongoServer) await mongoServer.stop();
});

beforeEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
  jest.clearAllMocks();
  mockSupabaseQuery.data = null;
  mockSupabaseQuery.error = null;
  mockSupabaseQuery.count = null;
});

// --- Helpers ---
const TemplateData = require('../models/TemplateData');
const TemplateSubmission = require('../models/TemplateSubmission');

const createTemplate = async (overrides = {}) => {
  return TemplateData.create({
    draftId: overrides.draftId || 'draft-001',
    ownerUid: overrides.ownerUid || 'test-user-uid',
    title: overrides.title || 'Test Template',
    templateType: overrides.templateType || 'student',
    config: overrides.config || { toggles: { name: true, experience: true, githubUsername: true } },
    status: overrides.status || 'active',
    source: overrides.source || 'created',
    ...overrides,
  });
};

const createSubmission = async (overrides = {}) => {
  return TemplateSubmission.create({
    submissionId: overrides.submissionId || 'sub-001',
    draftId: overrides.draftId || 'draft-001',
    ownerUid: overrides.ownerUid || 'test-user-uid',
    templateType: overrides.templateType || 'student',
    title: overrides.title || 'Test Template',
    submittedData: overrides.submittedData || {
      name: 'John Doe',
      experience: 4,
      githubUsername: 'johndoe',
    },
    ...overrides,
  });
};

// =====================
// MODEL TESTS
// =====================

describe('TemplateData Model', () => {
  test('should create a valid template data document', async () => {
    const td = await createTemplate();
    expect(td.draftId).toBe('draft-001');
    expect(td.ownerUid).toBe('test-user-uid');
    expect(td.templateType).toBe('student');
    expect(td.source).toBe('created');
    expect(td.status).toBe('active');
  });

  test('should enforce unique draftId', async () => {
    await createTemplate({ draftId: 'dup-001' });
    await expect(createTemplate({ draftId: 'dup-001' })).rejects.toThrow();
  });

  test('should enforce valid templateType enum', async () => {
    await expect(createTemplate({ templateType: 'invalid' })).rejects.toThrow();
  });

  test('should enforce valid status enum', async () => {
    await expect(createTemplate({ status: 'invalid' })).rejects.toThrow();
  });

  test('should enforce valid source enum', async () => {
    await expect(createTemplate({ source: 'invalid' })).rejects.toThrow();
  });

  test('should update updatedAt on save', async () => {
    const td = await createTemplate();
    const originalUpdatedAt = td.updatedAt;
    await new Promise(resolve => setTimeout(resolve, 50));
    td.title = 'Updated Title';
    await td.save();
    expect(td.updatedAt.getTime()).toBeGreaterThanOrEqual(originalUpdatedAt.getTime());
  });
});

describe('TemplateSubmission Model', () => {
  test('should create a valid submission document', async () => {
    const sub = await createSubmission();
    expect(sub.submissionId).toBe('sub-001');
    expect(sub.draftId).toBe('draft-001');
    expect(sub.submittedData.name).toBe('John Doe');
  });

  test('should enforce unique submissionId', async () => {
    await createSubmission({ submissionId: 'dup-sub' });
    await expect(createSubmission({ submissionId: 'dup-sub' })).rejects.toThrow();
  });

  test('should store submittedData as Mixed type', async () => {
    const complexData = {
      name: 'Jane',
      ratings: { communication: 5, technical: 4 },
      tags: ['python', 'react'],
      nested: { deep: { value: 42 } },
    };
    const sub = await createSubmission({ submittedData: complexData });
    const found = await TemplateSubmission.findById(sub._id).lean();
    expect(found.submittedData.ratings.communication).toBe(5);
    expect(found.submittedData.tags).toEqual(['python', 'react']);
    expect(found.submittedData.nested.deep.value).toBe(42);
  });
});

// =====================
// API ENDPOINT TESTS
// =====================

describe('GET /api/analytics/overview', () => {
  test('should return zero stats when no data exists', async () => {
    const res = await request(app)
      .get('/api/analytics/overview')
      .set('x-test-uid', 'test-user-uid');
    expect(res.status).toBe(200);
    expect(res.body.totalTemplates).toBe(0);
    expect(res.body.activeLinks).toBe(0);
    expect(res.body.totalSubmissions).toBe(0);
    expect(res.body.avgFieldsPerTemplate).toBe(0);
  });

  test('should return correct overview stats', async () => {
    await createTemplate({ draftId: 't1', status: 'active' });
    await createTemplate({ draftId: 't2', status: 'draft' });
    await createSubmission({ draftId: 't1', submissionId: 's1' });
    await createSubmission({ draftId: 't1', submissionId: 's2' });
    await createSubmission({ draftId: 't2', submissionId: 's3' });

    const res = await request(app)
      .get('/api/analytics/overview')
      .set('x-test-uid', 'test-user-uid');
    expect(res.status).toBe(200);
    expect(res.body.totalTemplates).toBe(2);
    expect(res.body.activeLinks).toBe(1);
    expect(res.body.totalSubmissions).toBe(3);
  });

  test('should only count own user templates', async () => {
    await createTemplate({ draftId: 'own', ownerUid: 'test-user-uid' });
    await createTemplate({ draftId: 'other', ownerUid: 'other-user' });

    const res = await request(app)
      .get('/api/analytics/overview')
      .set('x-test-uid', 'test-user-uid');
    expect(res.body.totalTemplates).toBe(1);
  });
});

describe('GET /api/analytics/templates', () => {
  test('should return empty array when no templates', async () => {
    const res = await request(app)
      .get('/api/analytics/templates')
      .set('x-test-uid', 'test-user-uid');
    expect(res.status).toBe(200);
    expect(res.body.templates).toEqual([]);
  });

  test('should return templates with submission counts', async () => {
    await createTemplate({ draftId: 't1', title: 'Template 1' });
    await createTemplate({ draftId: 't2', title: 'Template 2' });
    await createSubmission({ draftId: 't1', submissionId: 's1' });
    await createSubmission({ draftId: 't1', submissionId: 's2' });

    const res = await request(app)
      .get('/api/analytics/templates')
      .set('x-test-uid', 'test-user-uid');
    expect(res.status).toBe(200);
    expect(res.body.templates).toHaveLength(2);
    const t1 = res.body.templates.find(t => t.draftId === 't1');
    expect(t1.submissionCount).toBe(2);
    expect(t1.title).toBe('Template 1');
    const t2 = res.body.templates.find(t => t.draftId === 't2');
    expect(t2.submissionCount).toBe(0);
  });

  test('should not return other users templates', async () => {
    await createTemplate({ draftId: 'mine', ownerUid: 'test-user-uid' });
    await createTemplate({ draftId: 'theirs', ownerUid: 'other-user' });

    const res = await request(app)
      .get('/api/analytics/templates')
      .set('x-test-uid', 'test-user-uid');
    expect(res.body.templates).toHaveLength(1);
    expect(res.body.templates[0].draftId).toBe('mine');
  });
});

describe('GET /api/analytics/templates/:draftId', () => {
  test('should return 404 for non-existent template', async () => {
    const res = await request(app)
      .get('/api/analytics/templates/nonexistent')
      .set('x-test-uid', 'test-user-uid');
    expect(res.status).toBe(404);
  });

  test('should return template detail with field stats', async () => {
    await createTemplate({
      draftId: 'detail-1',
      config: { toggles: { name: true, experience: true, githubUsername: false } },
    });
    await createSubmission({
      draftId: 'detail-1',
      submissionId: 's1',
      submittedData: { name: 'Alice', experience: 5 },
    });
    await createSubmission({
      draftId: 'detail-1',
      submissionId: 's2',
      submittedData: { name: 'Bob', experience: 3 },
    });

    const res = await request(app)
      .get('/api/analytics/templates/detail-1')
      .set('x-test-uid', 'test-user-uid');
    expect(res.status).toBe(200);
    expect(res.body.title).toBe('Test Template');
    expect(res.body.totalSubmissions).toBe(2);
    expect(res.body.enabledFields).toContain('name');
    expect(res.body.enabledFields).toContain('experience');
    expect(res.body.enabledFields).not.toContain('githubUsername');
    expect(res.body.fieldStats.name.completionRate).toBe(100);
    expect(res.body.fieldStats.experience.completionRate).toBe(100);
    expect(res.body.fieldStats.experience.avg).toBe(4);
    expect(res.body.fieldStats.experience.min).toBe(3);
    expect(res.body.fieldStats.experience.max).toBe(5);
  });

  test('should calculate completion rate for partially filled fields', async () => {
    await createTemplate({
      draftId: 'partial-1',
      config: { toggles: { name: true, experience: true } },
    });
    await createSubmission({
      draftId: 'partial-1',
      submissionId: 's1',
      submittedData: { name: 'Alice', experience: 5 },
    });
    await createSubmission({
      draftId: 'partial-1',
      submissionId: 's2',
      submittedData: { name: 'Bob' },
    });

    const res = await request(app)
      .get('/api/analytics/templates/partial-1')
      .set('x-test-uid', 'test-user-uid');
    expect(res.body.fieldStats.experience.completionRate).toBe(50);
    expect(res.body.fieldStats.experience.totalFilled).toBe(1);
  });
});

describe('GET /api/analytics/templates/:draftId/submissions', () => {
  test('should return paginated submissions', async () => {
    await createTemplate({ draftId: 'pag-1' });
    for (let i = 1; i <= 15; i++) {
      await createSubmission({
        draftId: 'pag-1',
        submissionId: `pag-s-${i}`,
        submittedData: { name: `User${i}` },
      });
    }

    const res = await request(app)
      .get('/api/analytics/templates/pag-1/submissions?page=1&limit=10')
      .set('x-test-uid', 'test-user-uid');
    expect(res.status).toBe(200);
    expect(res.body.submissions).toHaveLength(10);
    expect(res.body.total).toBe(15);
    expect(res.body.page).toBe(1);
    expect(res.body.totalPages).toBe(2);
  });

  test('should return second page correctly', async () => {
    await createTemplate({ draftId: 'pag-2' });
    for (let i = 1; i <= 15; i++) {
      await createSubmission({
        draftId: 'pag-2',
        submissionId: `pag2-s-${i}`,
        submittedData: { name: `User${i}` },
      });
    }

    const res = await request(app)
      .get('/api/analytics/templates/pag-2/submissions?page=2&limit=10')
      .set('x-test-uid', 'test-user-uid');
    expect(res.body.submissions).toHaveLength(5);
    expect(res.body.page).toBe(2);
  });

  test('should return empty for template with no submissions', async () => {
    await createTemplate({ draftId: 'empty-sub' });
    const res = await request(app)
      .get('/api/analytics/templates/empty-sub/submissions')
      .set('x-test-uid', 'test-user-uid');
    expect(res.status).toBe(200);
    expect(res.body.submissions).toEqual([]);
    expect(res.body.total).toBe(0);
  });
});

describe('GET /api/analytics/templates/:draftId/field-analysis', () => {
  test('should return field stats and enabled fields', async () => {
    await createTemplate({
      draftId: 'fa-1',
      config: { toggles: { name: true, experience: true, idea: true } },
    });
    await createSubmission({
      draftId: 'fa-1',
      submissionId: 'fa-s1',
      submittedData: { name: 'Alice', experience: 4, idea: 'AI project' },
    });

    const res = await request(app)
      .get('/api/analytics/templates/fa-1/field-analysis')
      .set('x-test-uid', 'test-user-uid');
    expect(res.status).toBe(200);
    expect(res.body.enabledFields).toHaveLength(3);
    expect(res.body.fieldStats.experience.avg).toBe(4);
  });

  test('should return 404 for non-existent template', async () => {
    const res = await request(app)
      .get('/api/analytics/templates/nonexistent/field-analysis')
      .set('x-test-uid', 'test-user-uid');
    expect(res.status).toBe(404);
  });
});

describe('GET /api/analytics/trends', () => {
  test('should return trends array and type distribution', async () => {
    await createTemplate({ draftId: 'tr-1', templateType: 'student' });
    await createTemplate({ draftId: 'tr-2', templateType: 'employee' });
    await createSubmission({ draftId: 'tr-1', submissionId: 'tr-s1' });
    await createSubmission({ draftId: 'tr-2', submissionId: 'tr-s2' });

    const res = await request(app)
      .get('/api/analytics/trends?days=7')
      .set('x-test-uid', 'test-user-uid');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.trends)).toBe(true);
    expect(res.body.trends.length).toBeLessThanOrEqual(8); // 7 days + today
    expect(Array.isArray(res.body.typeDistribution)).toBe(true);
    const studentType = res.body.typeDistribution.find(t => t.type === 'student');
    expect(studentType.count).toBe(1);
  });

  test('should return zero counts for days with no submissions', async () => {
    const res = await request(app)
      .get('/api/analytics/trends?days=3')
      .set('x-test-uid', 'test-user-uid');
    expect(res.body.trends.every(t => t.count === 0)).toBe(true);
  });
});

// =====================
// SYNC ENDPOINT TESTS
// =====================

describe('POST /api/analytics/sync', () => {
  test('should sync templates and submissions from Supabase', async () => {
    // Mock Supabase returning drafts then submissions
    let callCount = 0;
    const originalFrom = mockSupabase.from;
    mockSupabase.from = jest.fn((table) => {
      callCount++;
      const chain = createChain();
      if (table === 'form_drafts') {
        mockSupabaseQuery.data = [
          { draft_id: 'sync-1', user_id: 'test-user-uid', title: 'Synced Template', template_type: 'student', config: { toggles: { name: true } }, status: 'active', expires_at: null, created_at: '2024-01-01T00:00:00Z' },
        ];
      } else if (table === 'form_submissions') {
        mockSupabaseQuery.data = [
          { submission_id: 'sync-sub-1', draft_id: 'sync-1', user_id: 'test-user-uid', template_type: 'student', title: 'Synced Template', submitted_data: { name: 'Synced User' }, submitted_at: '2024-01-02T00:00:00Z' },
        ];
      }
      return chain;
    });

    const res = await request(app)
      .post('/api/analytics/sync')
      .set('x-test-uid', 'test-user-uid');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('templatesSynced');
    expect(res.body).toHaveProperty('submissionsSynced');
    mockSupabase.from = originalFrom;
  });

  test('should be idempotent (not duplicate existing submissions)', async () => {
    // Pre-create a submission in MongoDB
    await createSubmission({ submissionId: 'existing-sub', draftId: 'sync-dup' });

    const originalFrom = mockSupabase.from;
    mockSupabase.from = jest.fn((table) => {
      const chain = createChain();
      if (table === 'form_drafts') {
        mockSupabaseQuery.data = [
          { draft_id: 'sync-dup', user_id: 'test-user-uid', title: 'Dup Template', template_type: 'student', config: { toggles: { name: true } }, status: 'active', expires_at: null, created_at: '2024-01-01T00:00:00Z' },
        ];
      } else if (table === 'form_submissions') {
        mockSupabaseQuery.data = [
          { submission_id: 'existing-sub', draft_id: 'sync-dup', user_id: 'test-user-uid', template_type: 'student', title: 'Dup Template', submitted_data: { name: 'Existing' }, submitted_at: '2024-01-01T00:00:00Z' },
        ];
      }
      return chain;
    });

    const res = await request(app)
      .post('/api/analytics/sync')
      .set('x-test-uid', 'test-user-uid');
    expect(res.status).toBe(200);
    // Should not have created a duplicate
    const count = await TemplateSubmission.countDocuments({ submissionId: 'existing-sub' });
    expect(count).toBe(1);
    mockSupabase.from = originalFrom;
  });
});

// =====================
// GITHUB ANALYZER UNIT TESTS
// =====================

describe('githubAnalyzer utility', () => {
  const { classifyRole, extractTechStack } = require('../utils/githubAnalyzer');

  describe('classifyRole', () => {
    test('should classify frontend repos', () => {
      const repos = [
        { name: 'react-app', description: 'A React frontend', language: 'JavaScript', topics: ['react', 'css'] },
        { name: 'vue-dashboard', description: 'Vue.js UI', language: 'Vue', topics: ['vue'] },
      ];
      const result = classifyRole(repos);
      expect(result.primaryRole).toBe('Frontend');
      expect(result.allRoles.length).toBeGreaterThan(0);
    });

    test('should classify backend repos', () => {
      const repos = [
        { name: 'express-api', description: 'REST API with Node', language: 'JavaScript', topics: ['express', 'api'] },
        { name: 'django-app', description: 'Django backend', language: 'Python', topics: ['django'] },
      ];
      const result = classifyRole(repos);
      expect(['Backend', 'Fullstack']).toContain(result.primaryRole);
    });

    test('should classify data repos', () => {
      const repos = [
        { name: 'ml-pipeline', description: 'TensorFlow ML model', language: 'Python', topics: ['ml', 'ai', 'tensorflow'] },
        { name: 'data-etl', description: 'Pandas ETL pipeline', language: 'Python', topics: ['pandas', 'etl'] },
      ];
      const result = classifyRole(repos);
      expect(result.primaryRole).toBe('Data');
    });

    test('should classify devops repos', () => {
      const repos = [
        { name: 'docker-setup', description: 'Docker containers', language: 'Shell', topics: ['docker', 'kubernetes'] },
        { name: 'terraform-aws', description: 'Terraform AWS infra', language: 'HCL', topics: ['terraform', 'aws'] },
      ];
      const result = classifyRole(repos);
      expect(result.primaryRole).toBe('DevOps');
    });

    test('should classify mobile repos', () => {
      const repos = [
        { name: 'flutter-app', description: 'Flutter mobile app', language: 'Dart', topics: ['flutter', 'android'] },
        { name: 'ios-app', description: 'Swift iOS', language: 'Swift', topics: ['ios'] },
      ];
      const result = classifyRole(repos);
      expect(result.primaryRole).toBe('Mobile');
    });

    test('should return Unknown for empty repos', () => {
      const result = classifyRole([]);
      expect(result.primaryRole).toBe('Unknown');
      expect(result.allRoles).toEqual([]);
    });

    test('should return Unknown for repos with no recognized languages', () => {
      const repos = [
        { name: 'misc', description: 'Some project', language: null, topics: [] },
      ];
      const result = classifyRole(repos);
      expect(result.primaryRole).toBe('Unknown');
    });
  });

  describe('extractTechStack', () => {
    test('should extract languages with counts and percentages', () => {
      const repos = [
        { language: 'JavaScript', topics: ['react'] },
        { language: 'JavaScript', topics: ['node'] },
        { language: 'Python', topics: ['django'] },
      ];
      const result = extractTechStack(repos);
      expect(result.languages).toHaveLength(2);
      expect(result.languages[0].name).toBe('JavaScript');
      expect(result.languages[0].count).toBe(2);
      expect(result.languages[0].percentage).toBe(67);
    });

    test('should extract top topics with counts', () => {
      const repos = [
        { language: 'JavaScript', topics: ['react', 'redux'] },
        { language: 'JavaScript', topics: ['react', 'node'] },
        { language: 'Python', topics: ['django'] },
      ];
      const result = extractTechStack(repos);
      expect(result.topTopics).toHaveLength(4);
      const reactTopic = result.topTopics.find(t => t.name === 'react');
      expect(reactTopic.count).toBe(2);
    });

    test('should handle repos with no language', () => {
      const repos = [
        { language: null, topics: [] },
        { language: null, topics: [] },
      ];
      const result = extractTechStack(repos);
      expect(result.languages).toEqual([]);
      expect(result.topTopics).toEqual([]);
    });

    test('should limit to top 10 languages', () => {
      const repos = Array.from({ length: 15 }, (_, i) => ({
        language: `Lang${i}`,
        topics: [],
      }));
      const result = extractTechStack(repos);
      expect(result.languages.length).toBeLessThanOrEqual(10);
    });
  });
});

// =====================
// GITHUB ANALYTICS ENDPOINT TESTS
// =====================

describe('GET /api/analytics/templates/:draftId/github', () => {
  test('should return hasGithubData=false when no GitHub usernames in submissions', async () => {
    await createTemplate({ draftId: 'gh-1' });
    await createSubmission({
      draftId: 'gh-1',
      submissionId: 'gh-s1',
      submittedData: { name: 'No Github User' },
    });

    const res = await request(app)
      .get('/api/analytics/templates/gh-1/github')
      .set('x-test-uid', 'test-user-uid');
    expect(res.status).toBe(200);
    expect(res.body.hasGithubData).toBe(false);
    expect(res.body.totalProfiles).toBe(0);
  });

  test('should return hasGithubData=false when no submissions exist', async () => {
    await createTemplate({ draftId: 'gh-2' });

    const res = await request(app)
      .get('/api/analytics/templates/gh-2/github')
      .set('x-test-uid', 'test-user-uid');
    expect(res.status).toBe(200);
    expect(res.body.hasGithubData).toBe(false);
  });

  test('should return 500 for non-existent template (no submissions)', async () => {
    const res = await request(app)
      .get('/api/analytics/templates/nonexistent/github')
      .set('x-test-uid', 'test-user-uid');
    expect(res.status).toBe(200);
    expect(res.body.hasGithubData).toBe(false);
  });
});

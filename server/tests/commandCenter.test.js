const { getCommandCenterSnapshot } = require('../utils/commandCenter');

function fixture({ failTable } = {}) {
  const calls = [];
  const supabase = { from: jest.fn(table => {
    const call = { table, filters: [] };
    calls.push(call);
    const query = {
      select: jest.fn(() => query),
      eq: jest.fn((key, value) => { call.filters.push([key, value]); return query; }),
      gt: jest.fn(() => query),
      order: jest.fn(() => query), limit: jest.fn(() => query),
      then: resolve => Promise.resolve(table === failTable
        ? { error: new Error('source unavailable') }
        : { count: table === 'candidates' ? 2 : 1, data: table === 'candidates'
          ? [{ id: 'c1', name: 'Ada', status: 'needs_contact_review' }]
          : [{ submission_id: 's1', title: 'Application' }] }).then(resolve),
    };
    return query;
  }) };
  const mongoCalls = [];
  const EmailCampaign = {
    countDocuments: jest.fn(filter => { mongoCalls.push(filter); return Promise.resolve(1); }),
    find: jest.fn(filter => {
      mongoCalls.push(filter);
      const chain = { select: () => chain, sort: () => chain, limit: () => chain,
        lean: () => Promise.resolve([{ _id: 'campaign1', name: 'Hello', status: 'queued' }]) };
      return chain;
    }),
  };
  const EmailAccount = { countDocuments: jest.fn(filter => { mongoCalls.push(filter); return Promise.resolve(1); }) };
  const Spreadsheet = { countDocuments: jest.fn(filter => { mongoCalls.push(filter); return Promise.resolve(1); }) };
  return { supabase, models: { EmailCampaign, EmailAccount, Spreadsheet }, calls, mongoCalls };
}

test('returns one owner-scoped snapshot of forms, candidates, and campaigns', async () => {
  const inputs = fixture();
  const result = await getCommandCenterSnapshot({ uid: 'owner-a', supabase: inputs.supabase,
    models: inputs.models, workerReady: true });
  expect(result.sources).toEqual({ forms: 'ready', campaigns: 'ready', worker: 'ready' });
  expect(result.counts.candidates).toBe(2);
  expect(result.queues.campaigns[0].id).toBe('campaign1');
  expect(inputs.calls.every(call => call.filters.some(([key, value]) => key === 'user_id' && value === 'owner-a'))).toBe(true);
  expect(inputs.mongoCalls.every(filter => filter.ownerUid === 'owner-a')).toBe(true);
});

test('reports a failed source as unavailable without inventing zero records', async () => {
  const inputs = fixture({ failTable: 'candidates' });
  const result = await getCommandCenterSnapshot({ uid: 'owner-b', supabase: inputs.supabase,
    models: inputs.models, workerReady: false });
  expect(result.sources.forms).toBe('unavailable');
  expect(result.sources.campaigns).toBe('ready');
  expect(result.sources.worker).toBe('starting');
  expect(result.counts.candidates).toBeNull();
  expect(result.counts.queuedCampaigns).toBe(1);
});

test('keeps campaign counts unknown when MongoDB is unavailable', async () => {
  const inputs = fixture();
  inputs.models.EmailCampaign.countDocuments.mockRejectedValue(new Error('database offline'));
  const result = await getCommandCenterSnapshot({ uid: 'owner-c', supabase: inputs.supabase,
    models: inputs.models, workerReady: false });
  expect(result.sources.forms).toBe('ready');
  expect(result.sources.campaigns).toBe('unavailable');
  expect(result.counts.queuedCampaigns).toBeNull();
  expect(result.counts.candidates).toBe(2);
});

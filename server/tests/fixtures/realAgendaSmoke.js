const assert = require('node:assert/strict');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { MongoClient } = require('mongodb');

async function main() {
  const memory = await MongoMemoryServer.create();
  let scheduler;
  let client;
  try {
    process.env.MONGODB_URI = memory.getUri();
    const flowPath = require.resolve('../../utils/emailCampaignFlow');
    let calledWith;
    require.cache[flowPath] = {
      id: flowPath,
      filename: flowPath,
      loaded: true,
      exports: { processCampaign: async id => { calledWith = id; } },
    };
    scheduler = require('../../scheduler');
    const agenda = await scheduler.getAgenda();
    for (const name of ['send email campaign', 'activate form draft', 'send analytics report']) {
      assert.equal(typeof agenda.definitions[name].fn, 'function', name);
    }
    assert.equal(scheduler.isAgendaReady(), true);
    await agenda.create('send email campaign', { campaignId: 'real-agenda-test' }).runJob();
    assert.equal(calledWith, 'real-agenda-test');
    const future = new Date(Date.now() + 3600000);
    await scheduler.scheduleCampaign('first', future);
    await scheduler.scheduleCampaign('second', future);
    client = new MongoClient(memory.getUri());
    await client.connect();
    const jobs = client.db().collection('agendaJobs');
    assert.equal(await jobs.countDocuments({ name: 'send email campaign', nextRunAt: future }), 2);
    await scheduler.cancelScheduledCampaign('first');
    assert.equal(await jobs.countDocuments({ name: 'send email campaign', 'data.campaignId': 'first' }), 0);
    assert.equal(await jobs.countDocuments({ name: 'send email campaign', 'data.campaignId': 'second' }), 1);
    process.stdout.write('REAL_AGENDA_OK\n');
  } finally {
    if (client) await client.close();
    if (scheduler) await scheduler.stopAgenda();
    await memory.stop();
  }
}

main().catch(err => { console.error(err); process.exitCode = 1; });

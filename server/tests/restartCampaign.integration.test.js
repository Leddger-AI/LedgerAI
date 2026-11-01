const { execFileSync } = require('child_process');
const path = require('path');

test('a scheduled campaign survives an API restart with frozen content', () => {
  const output = execFileSync(process.execPath, [path.join(__dirname, 'fixtures', 'restartCampaignSmoke.js')], {
    cwd: path.join(__dirname, '..'),
    encoding: 'utf8',
    timeout: 70000,
  });
  expect(output).toContain('RESTART_CAMPAIGN_OK');
}, 75000);

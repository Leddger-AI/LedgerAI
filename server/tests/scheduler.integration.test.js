const { execFileSync } = require('child_process');
const path = require('path');

test('the installed Agenda executes a registered campaign processor', () => {
  const output = execFileSync(process.execPath, [path.join(__dirname, 'fixtures', 'realAgendaSmoke.js')], {
    cwd: path.join(__dirname, '..'),
    encoding: 'utf8',
    timeout: 30000,
  });
  expect(output).toContain('REAL_AGENDA_OK');
}, 35000);

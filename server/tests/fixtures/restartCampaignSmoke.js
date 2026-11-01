const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const { once } = require('node:events');
const net = require('node:net');
const { MongoMemoryServer } = require('mongodb-memory-server');

const pause = ms => new Promise(resolve => setTimeout(resolve, ms));

async function freePort() {
  const server = net.createServer();
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const port = server.address().port;
  server.close();
  await once(server, 'close');
  return port;
}

async function main() {
  const memory = await MongoMemoryServer.create();
  const messages = [];
  const smtp = net.createServer(socket => {
    socket.write('220 localhost ESMTP\r\n');
    let buffer = '';
    let data = false;
    let message = '';
    socket.on('data', chunk => {
      buffer += chunk.toString();
      const lines = buffer.split(/\r?\n/);
      buffer = lines.pop();
      for (const line of lines) {
        if (data) {
          if (line === '.') {
            messages.push(message);
            message = '';
            data = false;
            socket.write('250 2.0.0 accepted\r\n');
          } else message += `${line}\n`;
          continue;
        }
        const command = line.toUpperCase();
        if (command.startsWith('EHLO') || command.startsWith('HELO')) socket.write('250-localhost\r\n250-AUTH PLAIN LOGIN\r\n250 SIZE 10000000\r\n');
        else if (command.startsWith('AUTH PLAIN')) socket.write('235 authenticated\r\n');
        else if (command.startsWith('AUTH LOGIN')) socket.write('334 VXNlcm5hbWU6\r\n');
        else if (command.startsWith('MAIL FROM') || command.startsWith('RCPT TO')) socket.write('250 ok\r\n');
        else if (command === 'DATA') { data = true; socket.write('354 End data\r\n'); }
        else if (command === 'QUIT') { socket.write('221 bye\r\n'); socket.end(); }
        else socket.write('235 authenticated\r\n');
      }
    });
  });
  smtp.listen(0, '127.0.0.1');
  await once(smtp, 'listening');
  const smtpPort = smtp.address().port;
  const apiPort = await freePort();
  const base = `http://127.0.0.1:${apiPort}`;
  const headers = { Authorization: 'Bearer restart-test', 'Content-Type': 'application/json' };
  let child;
  let logs = '';

  async function startApi() {
    const env = {
      ...process.env, MONGODB_URI: memory.getUri(), PORT: String(apiPort), NODE_ENV: 'development',
      ENCRYPTION_KEY: '00'.repeat(32), AGENDA_PROCESS_EVERY: '1 second',
      SUPABASE_URL: '', SUPABASE_SERVICE_ROLE_KEY: '', REDIS_URL: '',
      CLOUDINARY_CLOUD_NAME: '', CLOUDINARY_API_KEY: '', CLOUDINARY_API_SECRET: '',
      GOOGLE_EMAIL: '', GOOGLE_CLIENT_ID: '', GOOGLE_CLIENT_SECRET: '', GOOGLE_REFRESH_TOKEN: '',
    };
    child = spawn(process.execPath, ['index.js'], { cwd: process.cwd(), env, stdio: ['ignore', 'pipe', 'pipe'] });
    child.stdout.on('data', data => { logs = (logs + data.toString()).slice(-12000); });
    child.stderr.on('data', data => { logs = (logs + data.toString()).slice(-12000); });
    await waitFor(async () => {
      const response = await fetch(`${base}/api/email/worker-health`).catch(() => null);
      return response?.ok;
    }, 20000, 'API worker did not become ready');
  }

  async function stopApi() {
    if (!child || child.exitCode !== null) return;
    const stopped = once(child, 'exit');
    child.kill('SIGTERM');
    await Promise.race([stopped, pause(5000)]);
    if (child.exitCode === null) { child.kill('SIGKILL'); await stopped; }
    child = null;
  }

  async function request(method, path, body) {
    const response = await fetch(`${base}${path}`, {
      method, headers, ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    const result = await response.json();
    assert.ok(response.ok, `${method} ${path}: ${response.status} ${JSON.stringify(result)}`);
    return result;
  }

  try {
    await startApi();
    const { account } = await request('POST', '/api/email/accounts', {
      email: 'sender@example.invalid', authMethod: 'app_password', smtpHost: '127.0.0.1',
      smtpPort, appPassword: 'local-only',
    });
    const { draft } = await request('POST', '/api/email/drafts', {
      subject: 'Original {{First Name}}', bodyHtml: '<p>Hello {{First Name}}</p>',
      variables: [{ id: 'first_name', label: '{{first_name}}' }],
    });
    const { campaignId } = await request('POST', '/api/email/schedule', {
      draftId: draft._id, accountId: account.id, requestId: 'restart-campaign-smoke',
      scheduledAt: new Date(Date.now() + 20000).toISOString(),
      recipients: [{ email: 'recipient@example.invalid', variables: { first_name: 'Ada' } }],
    });
    await request('PUT', `/api/email/drafts/${draft._id}`, {
      subject: 'Changed subject', bodyHtml: '<p>Changed body</p>',
    });
    assert.equal(messages.length, 0, 'campaign sent before the restart');
    await stopApi();
    await startApi();
    let campaign;
    await waitFor(async () => {
      ({ campaign } = await request('GET', `/api/email/campaigns/${campaignId}`));
      return ['sent', 'partial', 'failed', 'needs_review'].includes(campaign.status);
    }, 40000, 'scheduled campaign did not finish after restart');
    assert.equal(campaign.status, 'sent', JSON.stringify(campaign));
    assert.equal(campaign.sentCount, 1);
    assert.equal(messages.length, 1);
    assert.match(messages[0], /Hello Ada/);
    assert.doesNotMatch(messages[0], /Changed body/);
    process.stdout.write('RESTART_CAMPAIGN_OK\n');
  } catch (err) {
    console.error(logs);
    throw err;
  } finally {
    await stopApi();
    smtp.close();
    await once(smtp, 'close');
    await memory.stop();
  }
}

async function waitFor(check, timeout, message) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    if (await check()) return;
    await pause(250);
  }
  throw new Error(message);
}

main().catch(err => { console.error(err); process.exitCode = 1; });

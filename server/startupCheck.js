const mongoose = require('mongoose');
const supabase = require('./supabaseClient');

async function checkMongoDB() {
  try {
    if (mongoose.connection.readyState === 1) {
      const dbName = mongoose.connection.db?.databaseName || 'unknown';
      return { ok: true, msg: `Connected (${dbName})` };
    }
    return { ok: false, msg: 'Not connected (readyState: ' + mongoose.connection.readyState + ')' };
  } catch (e) {
    return { ok: false, msg: e.message };
  }
}

async function checkSupabase() {
  try {
    if (!supabase) {
      return { ok: false, msg: 'Client not initialized (env vars missing)' };
    }
    const { error } = await supabase.from('profiles').select('id').limit(1);
    if (error) {
      return { ok: false, msg: 'Query failed: ' + error.message };
    }
    return { ok: true, msg: 'Connected (profiles table accessible)' };
  } catch (e) {
    return { ok: false, msg: e.message };
  }
}

async function checkRedis() {
  let client = null;
  try {
    const redisUrl = process.env.REDIS_URL;
    if (!redisUrl) {
      return { ok: false, msg: 'REDIS_URL not set' };
    }
    const redis = require('redis');
    client = redis.createClient({ url: redisUrl });
    client.on('error', (err) => {});
    await client.connect();
    const pong = await client.ping();
    await client.quit();
    return { ok: true, msg: `Connected (PING response: ${pong})` };
  } catch (e) {
    if (client) { try { await client.quit(); } catch (_) {} }
    return { ok: false, msg: e.message };
  }
}

async function checkCloudinary() {
  try {
    const cloudName = process.env.CLOUDINARY_CLOUDNAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECREAT;
    if (!cloudName || !apiKey || !apiSecret) {
      return { ok: false, msg: 'Missing CLOUDINARY_CLOUDNAME/API_KEY/API_SECREAT env vars' };
    }
    const cloudinary = require('cloudinary').v2;
    cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret });
    const result = await cloudinary.api.ping();
    return { ok: true, msg: `Connected (cloud: ${cloudName}, status: ${result.status})` };
  } catch (e) {
    return { ok: false, msg: e.message };
  }
}

async function checkGmailOAuth2() {
  try {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;
    const email = process.env.GOOGLE_EMAIL;
    if (!clientId || !clientSecret || !refreshToken) {
      return { ok: false, msg: 'Missing GOOGLE_CLIENT_ID/CLIENT_SECRET/REFRESH_TOKEN env vars' };
    }
    const { google } = require('googleapis');
    const oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      'https://developers.google.com/oauthplayground'
    );
    oauth2Client.setCredentials({ refresh_token: refreshToken });
    const accessToken = await new Promise((resolve, reject) => {
      oauth2Client.getAccessToken((err, token) => {
        if (err) reject(err);
        else resolve(token);
      });
    });
    if (accessToken) {
      return { ok: true, msg: `Token valid (email: ${email || 'not set'})` };
    }
    return { ok: false, msg: 'No token returned' };
  } catch (e) {
    return { ok: false, msg: e.message };
  }
}

async function checkAgenda() {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      return { ok: false, msg: 'MONGODB_URI not set (Agenda depends on MongoDB)' };
    }
    if (mongoose.connection.readyState !== 1) {
      return { ok: false, msg: 'MongoDB not connected (Agenda requires MongoDB)' };
    }
    return { ok: true, msg: 'Ready (uses MongoDB backend)' };
  } catch (e) {
    return { ok: false, msg: e.message };
  }
}

function checkCorsConfig() {
  const corsOrigins = process.env.CORS_ORIGINS;
  if (!corsOrigins) {
    return { ok: true, msg: 'CORS_ORIGINS not set — all origins allowed (dev mode)' };
  }
  const count = corsOrigins.split(',').length;
  return { ok: true, msg: `CORS_ORIGINS set (${count} origin(s))` };
}

function checkEnvVars() {
  const required = [
    'MONGODB_URI',
    'SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET',
    'GOOGLE_REFRESH_TOKEN',
    'GOOGLE_EMAIL',
    'REDIS_URL',
    'CLOUDINARY_CLOUDNAME',
    'CLOUDINARY_API_KEY',
    'CLOUDINARY_API_SECREAT',
  ];
  const missing = required.filter(k => !process.env[k]);
  if (missing.length === 0) {
    return { ok: true, msg: `${required.length}/${required.length} required vars present` };
  }
  return { ok: false, msg: `Missing: ${missing.join(', ')}` };
}

async function runStartupChecks() {
  const checks = [
    { name: 'MongoDB', fn: checkMongoDB },
    { name: 'Supabase', fn: checkSupabase },
    { name: 'Redis', fn: checkRedis },
    { name: 'Cloudinary', fn: checkCloudinary },
    { name: 'Gmail OAuth2', fn: checkGmailOAuth2 },
    { name: 'Agenda.js', fn: checkAgenda },
    { name: 'CORS Config', fn: checkCorsConfig },
    { name: 'Env Vars', fn: checkEnvVars },
  ];

  const results = [];
  for (const check of checks) {
    try {
      const result = await check.fn();
      results.push({ name: check.name, ...result });
    } catch (e) {
      results.push({ name: check.name, ok: false, msg: e.message });
    }
  }

  const border = '='.repeat(55);
  console.log('\n' + border);
  console.log('  STARTUP DIAGNOSTIC CHECKS');
  console.log(border);
  for (const r of results) {
    const icon = r.ok ? '\u2705' : '\u274C';
    const namePadded = r.name.padEnd(16);
    console.log(`${icon} ${namePadded} ${r.msg}`);
  }
  const allOk = results.every(r => r.ok);
  if (allOk) {
    console.log(border);
    console.log('  All checks passed!');
  } else {
    const failed = results.filter(r => !r.ok).map(r => r.name);
    console.log(border);
    console.log(`  \u26A0\uFE0F  ${failed.length} check(s) failed: ${failed.join(', ')}`);
  }
  console.log(border + '\n');

  return results;
}

module.exports = { runStartupChecks };

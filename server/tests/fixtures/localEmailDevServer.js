const { MongoMemoryServer } = require('mongodb-memory-server');
const { spawn } = require('node:child_process');

async function main() {
  const mongo = await MongoMemoryServer.create();
  const env = { ...process.env,
    MONGODB_URI: mongo.getUri(),
    NODE_ENV: 'development',
    PORT: '5000',
    ENCRYPTION_KEY: '00'.repeat(32),
    AGENDA_PROCESS_EVERY: '1 second',
    FRONTEND_URL: 'http://127.0.0.1:5173',
    SUPABASE_URL: '',
    SUPABASE_SERVICE_ROLE_KEY: '',
    REDIS_URL: '',
    CLOUDINARY_CLOUD_NAME: '',
    CLOUDINARY_API_KEY: '',
    CLOUDINARY_API_SECRET: '',
    GOOGLE_EMAIL: '',
    GOOGLE_CLIENT_ID: '',
    GOOGLE_CLIENT_SECRET: '',
    GOOGLE_REFRESH_TOKEN: '',
  };
  const child = spawn(process.execPath, ['index.js'], { cwd: require('node:path').join(__dirname, '../..'), env, stdio: 'inherit' });
  const shutdown = async () => { child.kill('SIGTERM'); await mongo.stop(); process.exit(0); };
  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
  child.once('exit', async code => { await mongo.stop(); process.exit(code || 0); });
  console.log('Local email test API uses temporary in-memory MongoDB.');
}

main().catch(error => { console.error(error); process.exit(1); });

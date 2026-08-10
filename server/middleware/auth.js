const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

let supabaseAdmin = null;

if (supabaseUrl && supabaseServiceRoleKey) {
  supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
  console.log("✅ Supabase Admin client initialized successfully via .env.");
} else {
  console.warn("⚠️ WARNING: Supabase environment variables not found in server/.env. Skipping Supabase Admin initialization.");
  console.warn("⚠️ WARNING: API requests will bypass authentication. THIS IS FOR LOCAL DEV ONLY.");
}

const verifyToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing or invalid token format' });
  }

  const token = authHeader.split('Bearer ')[1];

  if (!supabaseAdmin) {
    // Development bypass if no Supabase credentials are provided
    req.user = { uid: "DEV_MOCK_UID_" + token.substring(0, 5), email: "dev@localhost" };
    return next();
  }

  try {
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !user) {
      console.error('Error verifying Supabase token:', error?.message || 'No user found');
      return res.status(401).json({ error: 'Unauthorized: Invalid token' });
    }
    req.user = { uid: user.id, email: user.email, ...user };
    next();
  } catch (error) {
    console.error('Error verifying Supabase token:', error.message);
    return res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }
};

module.exports = verifyToken;

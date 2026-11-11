import { supabase } from './supabaseClient';

// Opt-in local UI testing against the API's development auth bypass.
// Vite removes this branch from production builds because DEV is false.
const localEmailTest = import.meta.env.DEV && import.meta.env.VITE_LOCAL_EMAIL_TEST === 'true';
const localTestToken = 'demo-access-token';
const localTestUser = {
  id: 'local-email-test',
  email: 'local-email-test@example.invalid',
  user_metadata: { full_name: 'Local Email Test' },
};

/**
 * Google OAuth login.
 * @returns {Promise<{user: any, accessToken: string, providerToken: string|null}>}
 */
export const loginWithGoogleAndCalendar = async () => {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/dashboard`,
    },
  });

  if (error) {
    console.error('Google/Supabase login error:', error);
    throw error;
  }

  return data;
};

/**
 * GitHub OAuth login.
 * @returns {Promise<{user: any, accessToken: string, providerToken: string|null}>}
 */
export const loginWithGitHub = async () => {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'github',
    options: {
      redirectTo: `${window.location.origin}/dashboard`,
    },
  });

  if (error) {
    console.error('GitHub/Supabase login error:', error);
    throw error;
  }

  return data;
};

/**
 * Email/Password login.
 * @returns {Promise<{user: any, accessToken: string}>}
 */
export const loginWithEmail = async (email, password) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    console.error('Email/Password login error:', error);
    throw error;
  }

  return {
    user: data.user,
    accessToken: data.session?.access_token,
  };
};

/**
 * Email/Password sign-up.
 * @returns {Promise<{user: any, accessToken: string|null}>}
 */
export const signUpWithEmail = async (email, password) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) {
    console.error('Sign-up error:', error);
    throw error;
  }

  return {
    user: data.user,
    accessToken: data.session?.access_token || null,
  };
};

/**
 * Sign out the current user.
 */
export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) {
    console.error('Sign-out error:', error);
    throw error;
  }
};

/**
 * Get the current session (user + access token).
 * Returns null if no active session.
 */
export const getCurrentSession = async () => {
  if (localEmailTest) return { user: localTestUser, accessToken: localTestToken, providerToken: null };
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return null;

  return {
    user: session.user,
    accessToken: session.access_token,
    providerToken: session.provider_token || null,
  };
};

/**
 * Get the current user's access token for API calls.
 * Replaces auth.currentUser.getIdToken() from Firebase.
 * @returns {Promise<string|null>}
 */
export const getAuthToken = async () => {
  if (localEmailTest) return localTestToken;
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token || null;
};

/**
 * Get the current user object.
 * Replaces auth.currentUser from Firebase.
 * @returns {Promise<object|null>}
 */
export const getCurrentUser = async () => {
  if (localEmailTest) return localTestUser;
  const { data: { user } } = await supabase.auth.getUser();
  return user;
};

/**
 * Subscribe to auth state changes.
 * @param {(event: string, session: any) => void} callback
 * @returns {{unsubscribe: () => void}} subscription
 */
export const onAuthChange = (callback) => {
  if (localEmailTest) {
    const timer = setTimeout(() => callback('INITIAL_SESSION', { user: localTestUser, access_token: localTestToken }), 0);
    return { unsubscribe: () => clearTimeout(timer) };
  }
  const { data: { subscription } } = supabase.auth.onAuthStateChange(callback);
  return subscription;
};

/**
 * Get the current user's linked OAuth identities.
 * @returns {Promise<Array>} Array of identity objects with provider info
 */
export const getUserIdentities = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.identities || [];
};

/**
 * Unlink an OAuth provider from the current user.
 * @param {string} provider - e.g. 'github', 'google'
 * @returns {Promise<{error: string|null}>}
 */
export const unlinkProvider = async (provider) => {
  const { error } = await supabase.auth.unlinkIdentity({ provider });
  if (error) {
    console.error(`Failed to unlink ${provider}:`, error);
    return { error: error.message };
  }
  return { error: null };
};

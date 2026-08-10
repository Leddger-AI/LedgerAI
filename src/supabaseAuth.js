import { supabase } from './supabaseClient';

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
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token || null;
};

/**
 * Get the current user object.
 * Replaces auth.currentUser from Firebase.
 * @returns {Promise<object|null>}
 */
export const getCurrentUser = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
};

/**
 * Subscribe to auth state changes.
 * @param {(event: string, session: any) => void} callback
 * @returns {{unsubscribe: () => void}} subscription
 */
export const onAuthChange = (callback) => {
  const { data: { subscription } } = supabase.auth.onAuthStateChange(callback);
  return subscription;
};

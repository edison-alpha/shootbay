/**
 * Authentication Service
 * 
 * Handles user signup, login, logout, and session management via Supabase Auth.
 * Uses real email addresses for auth, username as the game identity.
 */
import { supabase } from './supabase';
import type { Profile, ProfileInsert } from './database.types';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AuthUser {
  id: string;
  email: string;
  username: string;
  gameUserId: string;
  displayName: string;
  role: 'player' | 'admin';
  avatarUrl: string | null;
  characterId: string;
}

export interface SignupResult {
  success: boolean;
  user?: AuthUser;
  error?: string;
  message?: string;
  pendingConfirmation?: boolean;
}

export interface LoginResult {
  success: boolean;
  user?: AuthUser;
  error?: string;
}

// ─── Signup ───────────────────────────────────────────────────────────────────

export async function signup(
  username: string,
  email: string,
  password: string,
  displayName?: string,
): Promise<SignupResult> {
  const trimmedUsername = username.trim().toLowerCase();
  const trimmedEmail = email.trim().toLowerCase();

  // Quick local validations (no network)
  if (trimmedUsername.length < 3) {
    return { success: false, error: 'Username must be at least 3 characters' };
  }
  if (trimmedUsername.length > 20) {
    return { success: false, error: 'Username must be 20 characters or less' };
  }
  if (!/^[a-z0-9_]+$/.test(trimmedUsername)) {
    return { success: false, error: 'Username can only contain letters, numbers, and underscores' };
  }
  if (trimmedUsername === 'admin') {
    return {
      success: false,
      error: 'Username "admin" is reserved. Use Admin Access to create or sign in as admin.',
    };
  }

  // Validate email
  if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
    return { success: false, error: 'Please enter a valid email address' };
  }

  // Validate password
  if (password.length < 6) {
    return { success: false, error: 'Password must be at least 6 characters' };
  }

  // Timeout guard: signup has multiple network calls, cap at 15s
  const SIGNUP_TIMEOUT = 15_000;
  return Promise.race([
    _signupInner(trimmedUsername, trimmedEmail, password, displayName),
    new Promise<SignupResult>((resolve) =>
      setTimeout(() => {
        console.warn('signup: timed out after', SIGNUP_TIMEOUT, 'ms');
        resolve({ success: false, error: 'Signup timed out. Please check your connection and try again.' });
      }, SIGNUP_TIMEOUT),
    ),
  ]);
}

async function _signupInner(
  trimmedUsername: string,
  trimmedEmail: string,
  password: string,
  displayName?: string,
): Promise<SignupResult> {
  try {
    // Check if username already exists
    const { data: existingUser, error: checkError } = await supabase
      .from('profiles')
      .select('username')
      .eq('username', trimmedUsername)
      .maybeSingle();

    if (checkError) {
      console.warn('Username check error (non-fatal):', checkError.message);
    }

    if (existingUser) {
      return { success: false, error: 'Username already taken' };
    }

    // Sign up with Supabase Auth using real email
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: trimmedEmail,
      password,
      options: {
        data: {
          username: trimmedUsername,
          display_name: displayName || trimmedUsername,
        },
      },
    });

    if (authError) {
      if (authError.message.includes('already registered') || authError.message.includes('already been registered')) {
        return { success: false, error: 'This email is already registered. Try logging in instead.' };
      }
      if (authError.message.includes('rate limit') || authError.message.includes('Email rate limit exceeded') || authError.status === 429) {
        return { 
          success: false, 
          error: 'Rate limit exceeded. Please wait 1 hour or contact admin to increase the limit. For development, disable email confirmation in Supabase Dashboard → Authentication → Providers → Email.' 
        };
      }
      if (authError.message.includes('Database error')) {
        return { success: false, error: 'Database error. Please ensure all migrations are applied correctly.' };
      }
      return { success: false, error: authError.message };
    }

    if (!authData.user) {
      return { success: false, error: 'Signup failed. Please try again.' };
    }

    // Supabase returns an empty identities array when the email already exists.
    if (authData.user.identities && authData.user.identities.length === 0) {
      return { success: false, error: 'This email is already registered. Try logging in instead.' };
    }

    // If no session after signup, email confirmation may be enabled.
    if (!authData.session) {
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password,
      });

      if (signInError) {
        console.warn('Post-signup sign-in failed (email confirmation may be required):', signInError.message);
        return {
          success: true,
          pendingConfirmation: true,
          message: 'Account created. Please confirm your email before logging in.',
        };
      }

      // Sign in succeeded — use this session
      if (signInData?.user) {
        authData.user = signInData.user;
        authData.session = signInData.session;
      }
    }

    const profile = await fetchProfileWithRetry(authData.user.id);

    if (profile) {
      return {
        success: true,
        user: profileToAuthUser(profile, trimmedEmail),
      };
    }

    // Fallback if trigger is missing or delayed.
    console.warn('Profile not found after signup, attempting manual creation...');
    const createdProfile = await ensureProfileForAuthenticatedUser(authData.user.id, {
      username: trimmedUsername,
      display_name: displayName || trimmedUsername,
    });

    if (!createdProfile) {
      return { success: false, error: 'Account created but profile setup failed. Please try logging in.' };
    }

    return {
      success: true,
      user: profileToAuthUser(createdProfile, trimmedEmail),
    };
  } catch (err) {
    console.error('Signup error:', err);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

// ─── Login ────────────────────────────────────────────────────────────────────

export async function login(email: string, password: string): Promise<LoginResult> {
  const trimmedEmail = email.trim().toLowerCase();

  if (!trimmedEmail || !password) {
    return { success: false, error: 'Email and password are required' };
  }

  // Timeout guard: if anything hangs for 10s, fail gracefully
  const LOGIN_TIMEOUT = 10_000;
  return Promise.race([
    _loginInner(trimmedEmail, password),
    new Promise<LoginResult>((resolve) =>
      setTimeout(() => {
        console.warn('login: timed out after', LOGIN_TIMEOUT, 'ms');
        resolve({ success: false, error: 'Login timed out. Please check your connection and try again.' });
      }, LOGIN_TIMEOUT),
    ),
  ]);
}

async function _loginInner(trimmedEmail: string, password: string): Promise<LoginResult> {
  try {
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: trimmedEmail,
      password,
    });

    if (authError) {
      if (authError.message.includes('Invalid login credentials')) {
        return { success: false, error: 'Invalid email or password' };
      }
      if (authError.message.includes('Email not confirmed')) {
        return { success: false, error: 'Please check your email to confirm your account, or disable email confirmation in Supabase Dashboard.' };
      }
      return { success: false, error: authError.message };
    }

    if (!authData.user) {
      return { success: false, error: 'Login failed. Please try again.' };
    }

    const profile = await fetchProfileFastThenRetry(authData.user.id);

    if (!profile) {
      const username = sanitizeUsername(authData.user.user_metadata?.username) || trimmedEmail.split('@')[0];
      const newProfile = await ensureProfileForAuthenticatedUser(authData.user.id, {
        username,
        display_name: authData.user.user_metadata?.display_name || username,
      });

      if (!newProfile) {
        return { success: false, error: 'Profile not found. Please sign up first.' };
      }

      return {
        success: true,
        user: profileToAuthUser(newProfile, trimmedEmail),
      };
    }

    return {
      success: true,
      user: profileToAuthUser(profile, trimmedEmail),
    };
  } catch (err) {
    console.error('Login error:', err);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

// ─── Admin Login ──────────────────────────────────────────────────────────────

export async function adminLogin(email: string, password: string): Promise<LoginResult> {
  const result = await login(email, password);

  if (result.success) {
    if (result.user?.role === 'admin') {
      return result;
    }

    const bootstrapResult = await bootstrapFirstAdmin(result.user!.id);
    if (bootstrapResult) {
      const promotedProfile = await fetchProfileWithRetry(result.user!.id);
      if (promotedProfile?.role === 'admin') {
        return {
          success: true,
          user: profileToAuthUser(promotedProfile, result.user!.email),
        };
      }
    }

    await supabase.auth.signOut();
    return { success: false, error: 'Access denied. Admin privileges required.' };
  }

  const trimmedEmail = email.trim().toLowerCase();
  if (result.error?.includes('Invalid email or password') || result.error?.includes('Profile not found')) {
    const signupResult = await signupAdmin(trimmedEmail, password);
    if (signupResult.success && signupResult.user) {
      return signupResult;
    }
    if (signupResult.pendingConfirmation) {
      return {
        success: false,
        error: signupResult.message || 'Admin account created. Please confirm the email first, then log in again.',
      };
    }
    return { success: false, error: signupResult.error || 'Failed to create admin account. Check your credentials.' };
  }

  return result;
}

// ─── Google OAuth Login ───────────────────────────────────────────────────────

/**
 * Initiates Google OAuth login flow via Supabase.
 *
 * Prerequisites (Supabase Dashboard → Authentication → Providers → Google):
 * 1. Enable Google provider
 * 2. Set Google Client ID and Secret from Google Cloud Console
 * 3. Add your site URL + `/auth/v1/callback` as Authorized redirect URI in Google Cloud Console
 * 4. Add your site URL to Supabase → URL Configuration → Site URL
 *
 * The flow:
 * 1. User clicks "Sign in with Google"
 * 2. Browser redirects to Google consent screen
 * 3. Google redirects back with tokens in the URL hash
 * 4. Supabase client picks up tokens (detectSessionInUrl: true)
 * 5. onAuthStateChange fires → profile is auto-created if needed
 * 6. User lands on main menu or onboarding
 */
export async function loginWithGoogle(): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        // Redirect back to the current page origin after Google auth
        redirectTo: window.location.origin,
        queryParams: {
          // Request profile + email scopes
          access_type: 'offline',
          prompt: 'select_account',
        },
      },
    });

    if (error) {
      console.error('Google OAuth error:', error);
      return { success: false, error: error.message };
    }

    // signInWithOAuth triggers a full-page redirect — this code only runs
    // if the redirect didn't happen (e.g., popup mode or error).
    return { success: true };
  } catch (err) {
    console.error('Google login error:', err);
    return { success: false, error: 'Failed to initiate Google login' };
  }
}

// ─── Logout ───────────────────────────────────────────────────────────────────

export async function logout(): Promise<void> {
  await supabase.auth.signOut();
}

// ─── Get Current User ─────────────────────────────────────────────────────────

export async function getCurrentUser(): Promise<AuthUser | null> {
  try {
    // getSession() reads from local storage — instant, no network call.
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user) return null;

    let { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .maybeSingle();

    // OAuth users (Google) may not have a profile yet — auto-create one
    if (!profile) {
      const meta = session.user.user_metadata || {};
      const username = sanitizeUsername(meta.full_name || meta.name)
        || sanitizeUsername(meta.preferred_username)
        || session.user.email?.split('@')[0]
        || `player_${session.user.id.substring(0, 6)}`;

      const created = await ensureProfileForAuthenticatedUser(session.user.id, {
        username,
        display_name: meta.full_name || meta.name || username,
      });
      profile = created as typeof profile;
    }

    if (!profile) return null;

    return profileToAuthUser(profile, session.user.email || '');
  } catch {
    return null;
  }
}

// ─── Update Profile ───────────────────────────────────────────────────────────

export async function updateProfile(
  userId: string,
  updates: {
    displayName?: string;
    avatarUrl?: string | null;
    characterId?: string;
    totalDimsum?: number;
    totalStars?: number;
    levelsCompleted?: number;
    tickets?: number;
    ticketsUsed?: number;
  },
): Promise<Profile | null> {
  const dbUpdates: Record<string, unknown> = {};
  if (updates.displayName !== undefined) dbUpdates.display_name = updates.displayName;
  if (updates.avatarUrl !== undefined) dbUpdates.avatar_url = updates.avatarUrl;
  if (updates.characterId !== undefined) dbUpdates.character_id = updates.characterId;
  if (updates.totalDimsum !== undefined) dbUpdates.total_dimsum = updates.totalDimsum;
  if (updates.totalStars !== undefined) dbUpdates.total_stars = updates.totalStars;
  if (updates.levelsCompleted !== undefined) dbUpdates.levels_completed = updates.levelsCompleted;
  if (updates.tickets !== undefined) dbUpdates.tickets = updates.tickets;
  if (updates.ticketsUsed !== undefined) dbUpdates.tickets_used = updates.ticketsUsed;

  const { data, error } = await supabase
    .from('profiles')
    .update(dbUpdates as never)
    .eq('id', userId)
    .select()
    .single();

  if (error) {
    console.error('Update profile error:', error);
    return null;
  }
  return data;
}

// ─── Get All Players (Admin) ──────────────────────────────────────────────────

export async function getAllPlayers(): Promise<Profile[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Get all players error:', error);
    return [];
  }
  return data || [];
}

// ─── Session Listener ─────────────────────────────────────────────────────────

export function onAuthStateChange(callback: (user: AuthUser | null) => void) {
  return supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_OUT' || !session?.user) {
      callback(null);
      return;
    }

    // Fire-and-forget: don't await inside onAuthStateChange to avoid deadlocks
    supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .maybeSingle()
      .then(async ({ data: profile }) => {
        if (profile) {
          callback(profileToAuthUser(profile, session.user.email || ''));
          return;
        }

        // OAuth user without profile (first Google sign-in) — auto-create
        try {
          const meta = session.user.user_metadata || {};
          const username = sanitizeUsername(meta.full_name || meta.name)
            || sanitizeUsername(meta.preferred_username)
            || session.user.email?.split('@')[0]
            || `player_${session.user.id.substring(0, 6)}`;

          const newProfile = await ensureProfileForAuthenticatedUser(session.user.id, {
            username,
            display_name: meta.full_name || meta.name || username,
          });

          if (newProfile) {
            callback(profileToAuthUser(newProfile, session.user.email || ''));
          } else {
            callback(null);
          }
        } catch {
          callback(null);
        }
      }, () => {
        callback(null);
      });
  });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function profileToAuthUser(profile: Profile, email: string = ''): AuthUser {
  return {
    id: profile.id,
    email,
    username: profile.username,
    gameUserId: profile.game_user_id,
    displayName: profile.display_name,
    role: profile.role as 'player' | 'admin',
    avatarUrl: profile.avatar_url,
    characterId: profile.character_id,
  };
}

function sanitizeUsername(username: string | undefined): string {
  return (username || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '')
    .slice(0, 20);
}

async function fetchProfileWithRetry(userId: string, attempts = 5, delayMs = 400): Promise<Profile | null> {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (data) {
      return data;
    }

    if (error) {
      console.warn('Profile fetch retry failed:', error.message);
    }

    if (attempt < attempts - 1) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  return null;
}

async function fetchProfileFastThenRetry(userId: string): Promise<Profile | null> {
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (data) return data;

  // Retry only if first read misses (e.g. profile trigger still propagating)
  return fetchProfileWithRetry(userId, 3, 220);
}

async function ensureProfileForAuthenticatedUser(
  userId: string,
  profile: Pick<ProfileInsert, 'username' | 'display_name'>,
): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .insert({
      id: userId,
      username: profile.username,
      display_name: profile.display_name,
    } as never)
    .select()
    .maybeSingle();

  if (data) {
    return data;
  }

  if (error) {
    console.warn('Profile creation fallback failed:', error.message);
  }

  return fetchProfileWithRetry(userId, 3, 250);
}

async function bootstrapFirstAdmin(userId: string): Promise<boolean> {
  const rpc = (supabase as unknown as {
    rpc: (
      fn: string,
      args?: Record<string, unknown>,
    ) => Promise<{ data: unknown; error: { message: string } | null }>;
  }).rpc;

  const { data, error } = await rpc('bootstrap_first_admin', {
    target_user_id: userId,
  });

  if (error) {
    console.warn('Bootstrap first admin failed:', error.message);
    return false;
  }

  return Boolean(data);
}

async function signupAdmin(email: string, password: string): Promise<SignupResult> {
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        username: 'admin',
        display_name: 'Administrator',
      },
    },
  });

  if (authError) {
    if (authError.message.includes('already registered') || authError.message.includes('already been registered')) {
      return { success: false, error: 'This admin email is already registered. Try logging in instead.' };
    }
    if (authError.message.includes('rate limit') || authError.message.includes('Email rate limit exceeded') || authError.status === 429) {
      return { 
        success: false, 
        error: 'Rate limit exceeded. Please wait 1 hour or contact admin to increase the limit.' 
      };
    }
    if (authError.message.includes('Database error')) {
      return { success: false, error: 'Database error. Please ensure all migrations are applied correctly.' };
    }
    return { success: false, error: authError.message };
  }

  if (!authData.user) {
    return { success: false, error: 'Failed to create admin account.' };
  }

  if (authData.user.identities && authData.user.identities.length === 0) {
    return { success: false, error: 'This admin email is already registered. Try logging in instead.' };
  }

  if (!authData.session) {
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (signInError) {
      return {
        success: true,
        pendingConfirmation: true,
        message: 'Admin account created. Please confirm the email before logging in.',
      };
    }
  }

  const profile = await fetchProfileWithRetry(authData.user.id);
  if (!profile) {
    const createdProfile = await ensureProfileForAuthenticatedUser(authData.user.id, {
      username: 'admin',
      display_name: 'Administrator',
    });

    if (!createdProfile) {
      return { success: false, error: 'Admin account created but profile setup failed.' };
    }
  }

  const promoted = await bootstrapFirstAdmin(authData.user.id);
  if (!promoted) {
    await supabase.auth.signOut();
    return { success: false, error: 'Admin account exists, but this account is not allowed to become admin.' };
  }

  const adminProfile = await fetchProfileWithRetry(authData.user.id);
  if (!adminProfile) {
    return { success: false, error: 'Admin account created but could not load profile.' };
  }

  return {
    success: true,
    user: profileToAuthUser(adminProfile, email),
  };
}

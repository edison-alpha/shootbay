import React, { useState } from 'react';
import { signup } from '../../lib/auth';
import type { AuthUser } from '../../lib/auth';
import arenaBg from '../../assets/arena_background.webp';

interface SignupScreenProps {
  onSignupSuccess: (user: AuthUser) => void;
  onGoToLogin: () => void;
  onGoToAdminLogin: () => void;
}

export const SignupScreen: React.FC<SignupScreenProps> = ({
  onSignupSuccess,
  onGoToLogin,
  onGoToAdminLogin,
}) => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [signedUpUser, setSignedUpUser] = useState<AuthUser | null>(null);
  const [successInfo, setSuccessInfo] = useState<{ gameUserId: string; username: string } | null>(null);
  const [successMessage, setSuccessMessage] = useState('');

  const handleSignup = async () => {
    setError('');
    setSuccessMessage('');

    if (!username.trim()) {
      setError('Username is required');
      return;
    }
    if (!email.trim()) {
      setError('Email is required');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    const result = await signup(username, email, password);
    setLoading(false);

    if (!result.success) {
      setError(result.error || 'Signup failed');
      return;
    }

    if (result.user) {
      setSignedUpUser(result.user);
      setSuccessMessage(result.message || 'Account created successfully.');
      setSuccessInfo({
        gameUserId: result.user.gameUserId,
        username: result.user.username,
      });
      return;
    }

    if (result.success && result.pendingConfirmation) {
      setSuccessMessage(result.message || 'Account created. Please confirm your email before logging in.');
      setSuccessInfo({
        gameUserId: 'CHECK EMAIL',
        username: username.trim().toLowerCase(),
      });
    }
  };

  const handleContinue = () => {
    if (signedUpUser) {
      // User is already signed in from the initial signup — navigate to game
      onSignupSuccess(signedUpUser);
    } else {
      onGoToLogin();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSignup();
  };

  return (
    <div
      className="absolute inset-0 z-[100] flex flex-col items-center justify-center overflow-hidden"
      style={{
        backgroundImage: `url(${arenaBg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <div className="absolute inset-0 bg-black/60 pointer-events-none" />

      {successInfo ? (
        /* ─── Success Screen ─── */
        <div className="relative z-10 w-full max-w-xs mx-auto px-4">
          <div
            className="rounded-2xl p-6 text-center"
            style={{
              background: 'linear-gradient(135deg, rgba(16,185,129,0.15) 0%, rgba(6,95,70,0.2) 100%)',
              border: '2px solid rgba(16,185,129,0.4)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
              backdropFilter: 'blur(12px)',
            }}
          >
            <div className="text-5xl mb-3">🎮</div>
            <h2
              className="text-xl font-black text-emerald-300 mb-2"
              style={{ textShadow: '0 2px 8px rgba(0,0,0,0.5)' }}
            >
              Account Created!
            </h2>

            <div
              className="rounded-xl p-4 mb-4"
              style={{
                background: 'rgba(0,0,0,0.3)',
                border: '1px solid rgba(16,185,129,0.2)',
              }}
            >
              <p className="text-[10px] text-emerald-500/70 uppercase tracking-wider font-bold mb-1">
                Your Game ID
              </p>
              <p
                className="text-2xl font-black text-emerald-400 tracking-[0.15em]"
                style={{ textShadow: '0 0 12px rgba(16,185,129,0.4)' }}
              >
                {successInfo.gameUserId}
              </p>
              <p className="text-[10px] text-emerald-500/50 mt-2">
                {signedUpUser
                  ? "Save this ID! You'll need it to receive rewards."
                  : 'Check your inbox and confirm your email before logging in.'}
              </p>
            </div>

            <div
              className="rounded-lg p-3 mb-4"
              style={{
                background: 'rgba(0,0,0,0.2)',
                border: '1px solid rgba(16,185,129,0.15)',
              }}
            >
              <p className="text-xs text-emerald-400/80">
                <span className="font-bold">Username:</span> {successInfo.username}
              </p>
            </div>

            {successMessage && (
              <p className="text-xs text-emerald-200/90 mb-4">
                {successMessage}
              </p>
            )}

            <button
              onClick={handleContinue}
              className="w-full py-3 rounded-xl text-sm font-black uppercase tracking-widest transition active:scale-[0.97]"
              style={{
                background: 'linear-gradient(180deg, #059669 0%, #047857 100%)',
                border: '2px solid rgba(16,185,129,0.5)',
                boxShadow: '0 4px 12px rgba(5,150,105,0.3), inset 0 1px 0 rgba(255,255,255,0.1)',
                color: '#ecfdf5',
                textShadow: '0 2px 4px rgba(0,0,0,0.3)',
              }}
            >
              {signedUpUser ? 'Start Playing →' : 'Go to Login →'}
            </button>
          </div>
        </div>
      ) : (
        /* ─── Signup Form ─── */
        <div className="relative z-10 w-full max-w-xs mx-auto px-4">
          <div
            className="rounded-2xl p-6"
            style={{
              background: 'linear-gradient(135deg, rgba(62,40,20,0.92) 0%, rgba(40,26,12,0.95) 100%)',
              border: '2px solid rgba(180,140,60,0.4)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
              backdropFilter: 'blur(12px)',
            }}
          >
            {/* Header */}
            <div className="text-center mb-4">
              <div className="text-4xl mb-2">🥟</div>
              <h1
                className="text-xl font-black text-amber-200 tracking-wide"
                style={{ textShadow: '0 2px 8px rgba(0,0,0,0.5)' }}
              >
                DIMSUM DASH
              </h1>
              <p className="text-[10px] text-amber-500/60 uppercase tracking-widest font-bold mt-1">
                Create Account
              </p>
            </div>

            {/* Username */}
            <div className="mb-2.5">
              <label className="text-[9px] font-bold text-amber-500/70 uppercase tracking-wider mb-1 block">
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                onKeyDown={handleKeyDown}
                placeholder="choose_username"
                maxLength={20}
                className="w-full px-3 py-2 rounded-lg text-sm font-bold text-amber-200 placeholder-amber-800/40 outline-none"
                style={{
                  background: 'rgba(0,0,0,0.4)',
                  border: '1px solid rgba(180,140,60,0.2)',
                }}
                autoComplete="username"
              />
              <p className="text-[9px] text-amber-600/40 mt-0.5">Letters, numbers, underscores only</p>
            </div>

            {/* Email */}
            <div className="mb-2.5">
              <label className="text-[9px] font-bold text-amber-500/70 uppercase tracking-wider mb-1 block">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="your.email@gmail.com"
                className="w-full px-3 py-2 rounded-lg text-sm font-bold text-amber-200 placeholder-amber-800/40 outline-none"
                style={{
                  background: 'rgba(0,0,0,0.4)',
                  border: '1px solid rgba(180,140,60,0.2)',
                }}
                autoComplete="email"
              />
            </div>

            {/* Password */}
            <div className="mb-2.5">
              <label className="text-[9px] font-bold text-amber-500/70 uppercase tracking-wider mb-1 block">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="••••••••"
                className="w-full px-3 py-2 rounded-lg text-sm font-bold text-amber-200 placeholder-amber-800/40 outline-none"
                style={{
                  background: 'rgba(0,0,0,0.4)',
                  border: '1px solid rgba(180,140,60,0.2)',
                }}
                autoComplete="new-password"
              />
            </div>

            {/* Confirm Password */}
            <div className="mb-3">
              <label className="text-[9px] font-bold text-amber-500/70 uppercase tracking-wider mb-1 block">
                Confirm Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="••••••••"
                className="w-full px-3 py-2 rounded-lg text-sm font-bold text-amber-200 placeholder-amber-800/40 outline-none"
                style={{
                  background: 'rgba(0,0,0,0.4)',
                  border: '1px solid rgba(180,140,60,0.2)',
                }}
                autoComplete="new-password"
              />
            </div>

            {/* Error */}
            {error && (
              <div
                className="rounded-lg px-3 py-2 mb-3"
                style={{ background: 'rgba(220,38,38,0.15)', border: '1px solid rgba(220,38,38,0.3)' }}
              >
                <p className="text-xs text-red-400 text-center font-bold">{error}</p>
              </div>
            )}

            {/* Submit */}
            <button
              onClick={handleSignup}
              disabled={loading}
              className="w-full py-2.5 rounded-xl text-sm font-black uppercase tracking-widest transition active:scale-[0.97] mb-3"
              style={{
                background: loading
                  ? 'rgba(60,40,20,0.5)'
                  : 'linear-gradient(180deg, #b45309 0%, #78350f 100%)',
                border: `2px solid ${loading ? 'rgba(80,60,30,0.2)' : 'rgba(251,191,36,0.4)'}`,
                boxShadow: loading ? 'none' : '0 4px 12px rgba(180,100,10,0.3), inset 0 1px 0 rgba(255,215,0,0.15)',
                color: loading ? 'rgba(180,140,60,0.3)' : '#fef3c7',
                textShadow: loading ? 'none' : '0 2px 4px rgba(0,0,0,0.5)',
              }}
            >
              {loading ? 'Creating...' : 'Sign Up'}
            </button>

            {/* Links */}
            <div className="text-center space-y-2">
              <button
                onClick={onGoToLogin}
                className="text-xs text-amber-400/70 hover:text-amber-300 transition"
              >
                Already have an account? <span className="font-bold underline">Login</span>
              </button>
              <br />
              <button
                onClick={onGoToAdminLogin}
                className="text-[10px] text-amber-600/40 hover:text-amber-500/60 transition"
              >
                Admin Access →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

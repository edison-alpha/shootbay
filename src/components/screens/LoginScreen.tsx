import React, { useState } from 'react';
import { login } from '../../lib/auth';
import type { AuthUser } from '../../lib/auth';
import arenaBg from '../../assets/arena_background.webp';

interface LoginScreenProps {
  onLoginSuccess: (user: AuthUser) => void;
  onGoToSignup: () => void;
  onGoToAdminLogin: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  onLoginSuccess,
  onGoToSignup,
  onGoToAdminLogin,
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setError('');

    if (!email.trim()) {
      setError('Email is required');
      return;
    }
    if (!password) {
      setError('Password is required');
      return;
    }

    setLoading(true);
    const result = await login(email, password);
    setLoading(false);

    if (!result.success) {
      setError(result.error || 'Login failed');
      return;
    }

    if (result.user) {
      onLoginSuccess(result.user);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleLogin();
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
          <div className="text-center mb-5">
            <div className="text-4xl mb-2">🥟</div>
            <h1
              className="text-xl font-black text-amber-200 tracking-wide"
              style={{ textShadow: '0 2px 8px rgba(0,0,0,0.5)' }}
            >
              DIMSUM DASH
            </h1>
            <p className="text-[10px] text-amber-500/60 uppercase tracking-widest font-bold mt-1">
              Welcome Back
            </p>
          </div>

          {/* Email */}
          <div className="mb-3">
            <label className="text-[9px] font-bold text-amber-500/70 uppercase tracking-wider mb-1 block">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="your.email@gmail.com"
              className="w-full px-3 py-2.5 rounded-lg text-sm font-bold text-amber-200 placeholder-amber-800/40 outline-none"
              style={{
                background: 'rgba(0,0,0,0.4)',
                border: '1px solid rgba(180,140,60,0.2)',
              }}
              autoComplete="email"
            />
          </div>

          {/* Password */}
          <div className="mb-4">
            <label className="text-[9px] font-bold text-amber-500/70 uppercase tracking-wider mb-1 block">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="••••••••"
              className="w-full px-3 py-2.5 rounded-lg text-sm font-bold text-amber-200 placeholder-amber-800/40 outline-none"
              style={{
                background: 'rgba(0,0,0,0.4)',
                border: '1px solid rgba(180,140,60,0.2)',
              }}
              autoComplete="current-password"
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
            onClick={handleLogin}
            disabled={loading}
            className="w-full py-3 rounded-xl text-sm font-black uppercase tracking-widest transition active:scale-[0.97] mb-3"
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
            {loading ? 'Logging in...' : 'Login'}
          </button>

          {/* Links */}
          <div className="text-center space-y-2">
            <button
              onClick={onGoToSignup}
              className="text-xs text-amber-400/70 hover:text-amber-300 transition"
            >
              Don't have an account? <span className="font-bold underline">Sign Up</span>
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
    </div>
  );
};

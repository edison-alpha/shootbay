import React, { useState } from 'react';
import { loginWithGoogle } from '../../lib/auth';
import arenaBg from '../../assets/arena_background.webp';

interface LoginScreenProps {
  onGoToAdminLogin: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  onGoToAdminLogin,
}) => {
  const [error, setError] = useState('');
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleGoogleLogin = async () => {
    setError('');
    setGoogleLoading(true);
    const result = await loginWithGoogle();
    if (!result.success) {
      setGoogleLoading(false);
      setError(result.error || 'Google login failed');
    }
    // If successful, the page redirects to Google — no further action needed.
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
          <div className="text-center mb-6">
            <div className="text-5xl mb-2">🥟</div>
            <h1
              className="text-2xl font-black text-amber-200 tracking-wide"
              style={{ textShadow: '0 2px 8px rgba(0,0,0,0.5)' }}
            >
              DIMSUM DASH
            </h1>
            <p className="text-[10px] text-amber-500/60 uppercase tracking-widest font-bold mt-1">
              The Ultimate Dimsum Adventure
            </p>
          </div>

          {/* Error */}
          {error && (
            <div
              className="rounded-lg px-3 py-2 mb-4"
              style={{ background: 'rgba(220,38,38,0.15)', border: '1px solid rgba(220,38,38,0.3)' }}
            >
              <p className="text-xs text-red-400 text-center font-bold">{error}</p>
            </div>
          )}

          {/* Google Sign-In Button */}
          <button
            onClick={handleGoogleLogin}
            disabled={googleLoading}
            className="w-full py-3 rounded-xl text-sm font-bold transition active:scale-[0.97] mb-4 flex items-center justify-center gap-3"
            style={{
              background: googleLoading ? 'rgba(60,60,60,0.5)' : 'rgba(255,255,255,0.95)',
              border: '2px solid rgba(200,200,200,0.3)',
              boxShadow: googleLoading ? 'none' : '0 4px 16px rgba(0,0,0,0.25)',
              color: googleLoading ? '#999' : '#333',
            }}
          >
            {!googleLoading && (
              <svg width="20" height="20" viewBox="0 0 48 48">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
              </svg>
            )}
            {googleLoading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Redirecting to Google...
              </span>
            ) : (
              'Continue with Google'
            )}
          </button>

          {/* Info text */}
          <p className="text-[10px] text-amber-600/40 text-center mb-4 leading-relaxed">
            Sign in or create an account instantly with your Google account.
            No passwords needed!
          </p>

          {/* Admin Access */}
          <div className="text-center pt-2 border-t" style={{ borderColor: 'rgba(180,140,60,0.15)' }}>
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

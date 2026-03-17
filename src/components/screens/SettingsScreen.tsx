import React, { useState } from 'react';
import type { GameStoreData } from '../../store/gameStore';
import { updateSettings, resetAllProgress, saveGameData } from '../../store/gameStore';
import magicIcon from '../../assets/water-fire-sprite-magic/Icons/PNG/Icons_Fire Spell.webp';
import waterIcon from '../../assets/water-fire-sprite-magic/Icons/PNG/Icons_Water Spell.webp';
import swordIcon from '../../assets/water-fire-sprite-magic/Icons/PNG/Icons_Fire Arrow.webp';
import shieldImg from '../../assets/underwater/Bonus/Shield.webp';
import heartImg from '../../assets/underwater/Bonus/Heart.webp';
import arenaBg from '../../assets/arena_background.webp';

interface SettingsScreenProps {
  storeData: GameStoreData;
  onBack: () => void;
  onDataChange: (data: GameStoreData) => void;
  onResetComplete: () => void;
  onLogout?: () => void;
  gameUserId?: string;
  playerName?: string;
  profilePhoto?: string | null;
  onEditProfile?: () => void;
  onEditPhoto?: () => void;
  onReplayTutorial?: () => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  storeData,
  onBack,
  onDataChange,
  onResetComplete,
  onLogout,
  gameUserId,
  playerName,
  profilePhoto,
  onEditProfile,
  onEditPhoto,
  onReplayTutorial,
}) => {
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const settings = storeData.settings;

  const toggleMap = {
    musicEnabled: 'musicVolume' as const,
    sfxEnabled: 'sfxVolume' as const,
    vibrationEnabled: 'vibration' as const,
  };

  const handleToggle = (key: 'musicEnabled' | 'sfxEnabled' | 'vibrationEnabled') => {
    const settingsKey = toggleMap[key];
    const currentVal = settings[settingsKey];
    const newVal = settingsKey === 'vibration' ? !currentVal : (currentVal === 0 ? 1 : 0);
    const updated = updateSettings(storeData, { [settingsKey]: newVal });
    saveGameData(updated);
    onDataChange(updated);
  };

  const handleLanguage = (lang: 'id' | 'en' | 'zh') => {
    const updated = updateSettings(storeData, { language: lang });
    saveGameData(updated);
    onDataChange(updated);
  };

  const handleReset = () => {
    const fresh = resetAllProgress();
    onDataChange(fresh);
    onResetComplete();
  };

  const langOptions = [
    { code: 'en' as const, label: 'English', icon: '🇺🇸' },
    { code: 'id' as const, label: 'Bahasa', icon: '🇮🇩' },
    { code: 'zh' as const, label: '中文', icon: '🇨🇳' },
  ];

  return (
    <div className="absolute inset-0 z-50 flex flex-col overflow-hidden"
      style={{
        backgroundImage: `url(${arenaBg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        paddingTop: 'max(8px, env(safe-area-inset-top, 8px))',
        paddingBottom: 'max(8px, env(safe-area-inset-bottom, 8px))',
      }}
    >
      <div className="absolute inset-0 bg-black/45 pointer-events-none" />

      {/* ── Header ── */}
      <div className="relative z-10 flex items-center gap-2 px-3 py-2 mx-2 mb-2"
        style={{
          paddingLeft: 'max(8px, env(safe-area-inset-left, 8px))',
          paddingRight: 'max(8px, env(safe-area-inset-right, 8px))',
          background: 'linear-gradient(180deg, rgba(62,40,20,0.92) 0%, rgba(40,26,12,0.95) 100%)',
          borderRadius: '12px',
          border: '2px solid rgba(180,140,60,0.5)',
          boxShadow: '0 3px 10px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,215,0,0.15)',
        }}
      >
        <button onClick={onBack}
          aria-label="Back"
          className="w-11 h-11 rounded-lg flex items-center justify-center transition active:scale-95"
          style={{
            background: 'linear-gradient(180deg, rgba(80,50,20,0.8) 0%, rgba(50,30,10,0.9) 100%)',
            border: '1px solid rgba(180,140,60,0.4)',
          }}
        >
          <span className="text-amber-400 text-lg font-black">‹</span>
        </button>
        <div className="flex items-center gap-2 flex-1">
          <img src={magicIcon} alt="" className="w-6 h-6" style={{ filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.4))' }} />
          <h1 className="text-sm font-black text-amber-100 tracking-wide"
            style={{ textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}
          >SETTINGS</h1>
        </div>
      </div>

      {/* ── Content ── */}
      <div className="relative z-10 flex-1 overflow-y-auto scroll-native px-3 pb-4 space-y-2.5">

        {/* ─ Audio Section ─ */}
        <SettingsSection title="Audio" icon={waterIcon}>
          <ToggleRow icon={heartImg} label="Music" value={settings.musicVolume > 0} onChange={() => handleToggle('musicEnabled')} />
          <ToggleRow icon={swordIcon} label="Sound FX" value={settings.sfxVolume > 0} onChange={() => handleToggle('sfxEnabled')} />
          <ToggleRow icon={shieldImg} label="Vibration" value={settings.vibration} onChange={() => handleToggle('vibrationEnabled')} />
        </SettingsSection>

        {/* ─ Language Section ─ */}
        <SettingsSection title="Language" icon={magicIcon}>
          <div className="grid grid-cols-3 gap-1.5">
            {langOptions.map(lang => (
              <button key={lang.code}
                onClick={() => handleLanguage(lang.code)}
                className="py-2 rounded-lg text-center transition"
                style={{
                  background: settings.language === lang.code
                    ? 'linear-gradient(180deg, rgba(180,140,60,0.2) 0%, rgba(62,40,20,0.8) 100%)'
                    : 'rgba(0,0,0,0.2)',
                  border: `1.5px solid ${settings.language === lang.code ? 'rgba(180,140,60,0.5)' : 'rgba(80,60,30,0.2)'}`,
                  boxShadow: settings.language === lang.code ? 'inset 0 1px 0 rgba(255,215,0,0.1)' : 'none',
                }}
              >
                <p className="text-lg">{lang.icon}</p>
                <p className={`text-[9px] font-bold ${settings.language === lang.code ? 'text-amber-300' : 'text-amber-700'}`}>{lang.label}</p>
              </button>
            ))}
          </div>
        </SettingsSection>

        {/* ─ About Section ─ */}
        <SettingsSection title="About" icon={shieldImg}>
          <div className="space-y-1">
            <InfoRow label="Version" value="1.0.0" />
            <InfoRow label="Engine" value="React + Canvas" />
            <InfoRow label="Made with" value="❤️ Dimsum Quest" />
          </div>
        </SettingsSection>

        {/* ─ Profile Section ─ */}
        <SettingsSection title="Profile" icon={heartImg}>
          <div className="space-y-2">
            {/* Current profile info */}
            <div className="flex items-center gap-3 px-2 py-2 rounded-lg" style={{ background: 'rgba(0,0,0,0.15)' }}>
              {profilePhoto ? (
                <img src={profilePhoto} alt="Profile" className="w-10 h-10 rounded-full object-cover border-2 border-amber-500/40" />
              ) : (
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-lg" style={{ background: 'rgba(180,140,60,0.2)', border: '1px solid rgba(180,140,60,0.3)' }}>👤</div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-amber-200 truncate">{playerName || 'Player'}</p>
                <p className="text-[9px] text-amber-500/50">Tap below to edit</p>
              </div>
            </div>
            {onEditProfile && (
              <button
                onClick={onEditProfile}
                className="w-full py-2.5 rounded-lg text-xs font-bold transition active:scale-[0.97]"
                style={{
                  background: 'rgba(180,140,60,0.1)',
                  border: '1px solid rgba(180,140,60,0.3)',
                  color: '#d4a547',
                }}
              >
                ✏️ Edit Username
              </button>
            )}
            {onEditPhoto && (
              <button
                onClick={onEditPhoto}
                className="w-full py-2.5 rounded-lg text-xs font-bold transition active:scale-[0.97]"
                style={{
                  background: 'rgba(180,140,60,0.1)',
                  border: '1px solid rgba(180,140,60,0.3)',
                  color: '#d4a547',
                }}
              >
                📸 Change Profile Photo
              </button>
            )}
          </div>
        </SettingsSection>

        {/* ─ Tutorial Section ─ */}
        {onReplayTutorial && (
          <SettingsSection title="Help" icon={magicIcon}>
            <button
              onClick={onReplayTutorial}
              className="w-full py-2.5 rounded-lg text-xs font-bold transition active:scale-[0.97]"
              style={{
                background: 'rgba(180,140,60,0.1)',
                border: '1px solid rgba(180,140,60,0.3)',
                color: '#d4a547',
              }}
            >
              📖 Replay Tutorial
            </button>
          </SettingsSection>
        )}

        {/* ─ Account Section ─ */}
        <SettingsSection title="Account" icon={heartImg}>
          <div className="space-y-2">
            {gameUserId && (
              <div className="flex items-center justify-between px-2 py-1.5 rounded-lg"
                style={{ background: 'rgba(0,0,0,0.15)' }}
              >
                <span className="text-[10px] text-amber-500/60">Game ID</span>
                <span className="text-[10px] font-black text-emerald-400 tracking-wider">{gameUserId}</span>
              </div>
            )}
            {onLogout && (
              <button
                onClick={onLogout}
                className="w-full py-2.5 rounded-lg text-xs font-bold transition active:scale-[0.97]"
                style={{
                  background: 'rgba(180,140,60,0.1)',
                  border: '1px solid rgba(180,140,60,0.3)',
                  color: '#d4a547',
                }}
              >
                🚪 Logout
              </button>
            )}
          </div>
        </SettingsSection>

        {/* ─ Danger Zone ─ */}
        <div className="rounded-xl overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, rgba(50,15,15,0.85) 0%, rgba(30,10,10,0.9) 100%)',
            border: '2px solid rgba(220,38,38,0.25)',
          }}
        >
          <div className="flex items-center gap-2 px-3 py-2"
            style={{ background: 'rgba(220,38,38,0.08)', borderBottom: '1px solid rgba(220,38,38,0.15)' }}
          >
            <span className="text-sm">⚠️</span>
            <span className="text-[10px] font-black text-red-400/70 uppercase tracking-wider">Danger Zone</span>
          </div>
          <div className="p-3">
            <p className="text-[10px] text-red-400/50 mb-2">This will permanently delete all your progress, items, and rewards.</p>
            {!showResetConfirm ? (
              <button onClick={() => setShowResetConfirm(true)}
                className="w-full py-2.5 rounded-lg text-xs font-bold transition active:scale-[0.97]"
                style={{
                  background: 'rgba(220,38,38,0.15)',
                  border: '1px solid rgba(220,38,38,0.3)',
                  color: '#f87171',
                }}
              >Reset All Progress</button>
            ) : (
              <div className="space-y-2">
                <p className="text-[10px] font-bold text-red-400 text-center">Are you sure? This cannot be undone!</p>
                <div className="flex gap-2">
                  <button onClick={() => setShowResetConfirm(false)}
                    className="flex-1 py-2 rounded-lg text-xs font-bold"
                    style={{
                      background: 'rgba(80,50,20,0.6)',
                      border: '1px solid rgba(180,140,60,0.3)',
                      color: '#d4a547',
                    }}
                  >Cancel</button>
                  <button onClick={handleReset}
                    className="flex-1 py-2 rounded-lg text-xs font-bold"
                    style={{
                      background: 'linear-gradient(180deg, #dc2626, #991b1b)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      color: '#fecaca',
                    }}
                  >Yes, Reset</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

/* ─── Sub Components ─────────────────────────────────────────────────────── */

const SettingsSection: React.FC<{ title: string; icon: string; children: React.ReactNode }> = ({ title, icon, children }) => (
  <div className="rounded-xl overflow-hidden"
    style={{
      background: 'linear-gradient(135deg, rgba(62,40,20,0.85) 0%, rgba(40,26,12,0.9) 100%)',
      border: '2px solid rgba(180,140,60,0.25)',
    }}
  >
    <div className="flex items-center gap-2 px-3 py-2"
      style={{ background: 'rgba(180,140,60,0.1)', borderBottom: '1px solid rgba(180,140,60,0.15)' }}
    >
      <img src={icon} alt="" className="w-4 h-4" />
      <span className="text-[10px] font-black text-amber-400 uppercase tracking-wider">{title}</span>
    </div>
    <div className="p-3">{children}</div>
  </div>
);

const ToggleRow: React.FC<{ icon: string; label: string; value: boolean; onChange: () => void }> = ({ icon, label, value, onChange }) => (
  <div className="flex items-center justify-between py-1.5">
    <div className="flex items-center gap-2">
      <img src={icon} alt="" className="w-4 h-4" style={{ filter: value ? 'brightness(1.2)' : 'brightness(0.5) grayscale(0.5)' }} />
      <span className="text-xs text-amber-300">{label}</span>
    </div>
    <button onClick={onChange} className="relative w-10 h-5 rounded-full transition-all"
      style={{
        background: value
          ? 'linear-gradient(90deg, #b45309, #f59e0b)'
          : 'rgba(0,0,0,0.4)',
        border: `1px solid ${value ? 'rgba(251,191,36,0.3)' : 'rgba(80,60,30,0.3)'}`,
      }}
    >
      <div className="absolute top-0.5 w-4 h-4 rounded-full transition-all"
        style={{
          left: value ? '22px' : '2px',
          background: value ? '#fef3c7' : 'rgba(180,140,60,0.4)',
          boxShadow: value ? '0 0 6px rgba(251,191,36,0.3)' : 'none',
        }}
      />
    </button>
  </div>
);

const InfoRow: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="flex items-center justify-between px-2 py-1.5 rounded-lg"
    style={{ background: 'rgba(0,0,0,0.15)' }}
  >
    <span className="text-[10px] text-amber-500/60">{label}</span>
    <span className="text-[10px] font-bold text-amber-300">{value}</span>
  </div>
);

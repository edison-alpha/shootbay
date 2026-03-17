import React, { useCallback, useEffect, useRef, useState } from 'react';
import { adminLogin, logout } from '../../lib/auth';
import type { AuthUser } from '../../lib/auth';
import { supabase } from '../../lib/supabase';
import {
  createPrize,
  updatePrize,
  deletePrize,
  getAllPrizes,
  createGreetingCard,
  updateGreetingCard,
  deleteGreetingCard,
  getAllGreetingCards,
  createMysteryBox,
  createMysteryBoxesBulk,
  updateMysteryBox,
  deleteMysteryBox,
  getAllMysteryBoxes,
  getAllPlayers,
  getDashboardStats,
  getAllSpinWheelPrizes,
  createSpinWheelPrize,
  updateSpinWheelPrize,
  deleteSpinWheelPrize,
  grantTicketsToAllPlayers,
  grantTicketsToPlayer,
} from '../../lib/adminService';
import type { DashboardStats } from '../../lib/adminService';
import type { Prize, GreetingCard, MysteryBox, Profile, SpinWheelPrize } from '../../lib/database.types';

// ─── Types ────────────────────────────────────────────────────────────────────

type AdminTab = 'dashboard' | 'prizes' | 'cards' | 'mystery_boxes' | 'spin_wheel' | 'players';

interface AdminDashboardProps {
  onBack: () => void;
}

// ═══════════════════════════════════════════════════════════════════════════════
// AdminDashboard — Full admin panel with login gate
// ═══════════════════════════════════════════════════════════════════════════════

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onBack }) => {
  const [adminUser, setAdminUser] = useState<AuthUser | null>(null);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [sessionChecked, setSessionChecked] = useState(false);

  // Check existing Supabase session on mount — restore admin session after page reload
  useEffect(() => {
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .maybeSingle();

          if (profile && (profile as { role: string }).role === 'admin') {
            const p = profile as {
              id: string;
              username: string;
              game_user_id: string;
              display_name: string;
              role: string;
              avatar_url: string | null;
              character_id: string;
            };
            setAdminUser({
              id: p.id,
              email: user.email || '',
              username: p.username,
              gameUserId: p.game_user_id,
              displayName: p.display_name,
              role: 'admin',
              avatarUrl: p.avatar_url,
              characterId: p.character_id,
            });
          }
        }
      } catch {
        // Session check failed — show login gate
      }
      setSessionChecked(true);
    })();
  }, []);

  const handleAdminLogin = async () => {
    setLoginError('');
    setLoginLoading(true);
    const result = await adminLogin(loginEmail, loginPassword);
    setLoginLoading(false);

    if (!result.success) {
      setLoginError(result.error || 'Login failed');
      return;
    }
    setAdminUser(result.user || null);
  };

  const handleLogout = async () => {
    await logout();
    setAdminUser(null);
    onBack();
  };

  // Show loading while checking existing session
  if (!sessionChecked) {
    return (
      <div className="fixed inset-0 z-[200] flex items-center justify-center bg-gradient-to-b from-gray-900 to-gray-800">
        <div className="text-white text-lg animate-pulse">Checking admin session...</div>
      </div>
    );
  }

  if (!adminUser) {
    return (
      <AdminLoginGate
        email={loginEmail}
        password={loginPassword}
        error={loginError}
        loading={loginLoading}
        onEmailChange={setLoginEmail}
        onPasswordChange={setLoginPassword}
        onLogin={handleAdminLogin}
        onBack={onBack}
      />
    );
  }

  return <AdminPanel admin={adminUser} onLogout={handleLogout} />;
};

// ═══════════════════════════════════════════════════════════════════════════════
// AdminLoginGate — Login screen for admin access
// ═══════════════════════════════════════════════════════════════════════════════

const AdminLoginGate: React.FC<{
  email: string;
  password: string;
  error: string;
  loading: boolean;
  onEmailChange: (v: string) => void;
  onPasswordChange: (v: string) => void;
  onLogin: () => void;
  onBack: () => void;
}> = ({ email, password, error, loading, onEmailChange, onPasswordChange, onLogin, onBack }) => (
  <div className="absolute inset-0 z-[200] flex flex-col items-center justify-center bg-gray-950">
    <div className="w-full max-w-sm mx-auto px-6">
      <div className="rounded-2xl p-8 bg-gray-900 border border-gray-800 shadow-2xl">
        <div className="text-center mb-6">
          <div className="text-3xl mb-2">🛡️</div>
          <h1 className="text-xl font-black text-white">Admin Panel</h1>
          <p className="text-xs text-gray-500 mt-1">Restricted Access</p>
        </div>

        <div className="mb-4">
          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 block">Admin Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => onEmailChange(e.target.value)}
            placeholder="admin@gmail.com"
            className="w-full px-4 py-3 rounded-lg bg-gray-800 border border-gray-700 text-white text-sm font-medium outline-none focus:border-blue-500 transition"
            autoComplete="email"
          />
        </div>

        <div className="mb-5">
          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 block">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => onPasswordChange(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && onLogin()}
            placeholder="••••••••"
            className="w-full px-4 py-3 rounded-lg bg-gray-800 border border-gray-700 text-white text-sm font-medium outline-none focus:border-blue-500 transition"
            autoComplete="current-password"
          />
        </div>

        {error && (
          <div className="rounded-lg px-3 py-2 mb-4 bg-red-900/30 border border-red-800/50">
            <p className="text-xs text-red-400 text-center font-bold">{error}</p>
          </div>
        )}

        <button
          onClick={onLogin}
          disabled={loading}
          className="w-full py-3 rounded-xl text-sm font-bold uppercase tracking-wider transition active:scale-[0.98] bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Authenticating...' : 'Login as Admin'}
        </button>

        <button
          onClick={onBack}
          className="w-full mt-3 py-2 text-xs text-gray-500 hover:text-gray-300 transition"
        >
          ← Back to Game
        </button>
      </div>
    </div>
  </div>
);

// ═══════════════════════════════════════════════════════════════════════════════
// AdminPanel — Main admin dashboard content
// ═══════════════════════════════════════════════════════════════════════════════

const AdminPanel: React.FC<{ admin: AuthUser; onLogout: () => void }> = ({ admin, onLogout }) => {
  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [prizes, setPrizes] = useState<Prize[]>([]);
  const [cards, setCards] = useState<GreetingCard[]>([]);
  const [boxes, setBoxes] = useState<MysteryBox[]>([]);
  const [players, setPlayers] = useState<Profile[]>([]);
  const [spinPrizes, setSpinPrizes] = useState<SpinWheelPrize[]>([]);
  const [loading, setLoading] = useState(true);
  const refreshTimeoutRef = useRef<number | null>(null);

  const refreshData = useCallback(async () => {
    setLoading(true);
    const [s, p, c, b, pl, sp] = await Promise.all([
      getDashboardStats(),
      getAllPrizes(),
      getAllGreetingCards(),
      getAllMysteryBoxes(),
      getAllPlayers(),
      getAllSpinWheelPrizes(),
    ]);
    setStats(s);
    setPrizes(p);
    setCards(c);
    setBoxes(b);
    setPlayers(pl);
    setSpinPrizes(sp);
    setLoading(false);
  }, []);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  useEffect(() => {
    const scheduleRefresh = () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }

      refreshTimeoutRef.current = window.setTimeout(() => {
        refreshData().catch(console.error);
      }, 250);
    };

    // Fallback polling so admin data still refreshes when realtime events are delayed/missed.
    const POLL_INTERVAL_MS = 10000;
    const pollInterval = window.setInterval(() => {
      refreshData().catch(console.error);
    }, POLL_INTERVAL_MS);

    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === 'visible') {
        refreshData().catch(console.error);
      }
    };

    window.addEventListener('focus', handleVisibilityOrFocus);
    window.addEventListener('online', handleVisibilityOrFocus);
    document.addEventListener('visibilitychange', handleVisibilityOrFocus);

    const channel = supabase
      .channel('admin-dashboard-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'mystery_boxes' }, scheduleRefresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'prizes' }, scheduleRefresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'greeting_cards' }, scheduleRefresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, scheduleRefresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'spin_wheel_prizes' }, scheduleRefresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'level_progress' }, scheduleRefresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inventory' }, scheduleRefresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'voucher_redemptions' }, scheduleRefresh)
      .subscribe();

    return () => {
      clearInterval(pollInterval);
      window.removeEventListener('focus', handleVisibilityOrFocus);
      window.removeEventListener('online', handleVisibilityOrFocus);
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
        refreshTimeoutRef.current = null;
      }
      supabase.removeChannel(channel);
    };
  }, [refreshData]);

  const tabs: { id: AdminTab; label: string; icon: string }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'prizes', label: 'Prizes', icon: '🎁' },
    { id: 'cards', label: 'Cards', icon: '💌' },
    { id: 'mystery_boxes', label: 'Boxes', icon: '📦' },
    { id: 'spin_wheel', label: 'Spin', icon: '🎰' },
    { id: 'players', label: 'Players', icon: '👥' },
  ];

  return (
    <div className="absolute inset-0 z-[200] flex flex-col bg-gray-950 text-white overflow-hidden">
      {/* ── Top Bar ── */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-900 border-b border-gray-800">
        <div className="flex items-center gap-2">
          <span className="text-lg">🛡️</span>
          <div>
            <h1 className="text-sm font-bold text-white">Admin Panel</h1>
            <p className="text-[10px] text-gray-500">{admin.username} • {admin.gameUserId}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={refreshData}
            className="px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-xs font-bold text-gray-300 transition"
          >
            🔄 Refresh
          </button>
          <button
            onClick={onLogout}
            className="px-3 py-1.5 rounded-lg bg-red-900/30 hover:bg-red-900/50 text-xs font-bold text-red-400 transition"
          >
            Logout
          </button>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="flex gap-1 px-4 py-2 bg-gray-900/50 border-b border-gray-800 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-blue-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* ── Content ── */}
      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="text-gray-500 text-sm animate-pulse">Loading...</div>
          </div>
        ) : (
          <>
            {activeTab === 'dashboard' && stats && <DashboardTab stats={stats} />}
            {activeTab === 'prizes' && (
              <PrizesTab prizes={prizes} adminId={admin.id} onRefresh={refreshData} />
            )}
            {activeTab === 'cards' && (
              <CardsTab cards={cards} adminId={admin.id} onRefresh={refreshData} />
            )}
            {activeTab === 'mystery_boxes' && (
              <MysteryBoxTab
                boxes={boxes}
                prizes={prizes}
                cards={cards}
                players={players}
                adminId={admin.id}
                onRefresh={refreshData}
              />
            )}
            {activeTab === 'spin_wheel' && (
              <SpinWheelTab spinPrizes={spinPrizes} adminId={admin.id} onRefresh={refreshData} />
            )}
            {activeTab === 'players' && <PlayersTab players={players} onRefresh={refreshData} />}
          </>
        )}
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// Dashboard Tab
// ═══════════════════════════════════════════════════════════════════════════════

const DashboardTab: React.FC<{ stats: DashboardStats }> = ({ stats }) => (
  <div className="grid grid-cols-2 gap-3">
    <StatCard icon="👥" label="Players" value={stats.totalPlayers} color="blue" />
    <StatCard icon="🎁" label="Prizes" value={stats.totalPrizes} color="amber" />
    <StatCard icon="💌" label="Greeting Cards" value={stats.totalGreetingCards} color="purple" />
    <StatCard icon="📦" label="Mystery Boxes" value={stats.totalMysteryBoxes} color="emerald" />
    <StatCard icon="⏳" label="Pending Boxes" value={stats.pendingBoxes} color="orange" />
    <StatCard icon="✅" label="Opened Boxes" value={stats.openedBoxes} color="green" />
  </div>
);

const StatCard: React.FC<{ icon: string; label: string; value: number; color: string }> = ({
  icon,
  label,
  value,
  color,
}) => {
  const colors: Record<string, string> = {
    blue: 'border-blue-800/50 bg-blue-900/20',
    amber: 'border-amber-800/50 bg-amber-900/20',
    purple: 'border-purple-800/50 bg-purple-900/20',
    emerald: 'border-emerald-800/50 bg-emerald-900/20',
    orange: 'border-orange-800/50 bg-orange-900/20',
    green: 'border-green-800/50 bg-green-900/20',
  };

  return (
    <div className={`rounded-xl border p-4 ${colors[color] || colors.blue}`}>
      <div className="text-2xl mb-1">{icon}</div>
      <p className="text-2xl font-black text-white">{value}</p>
      <p className="text-[10px] text-gray-400 uppercase tracking-wider font-bold">{label}</p>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// Prizes Tab
// ═══════════════════════════════════════════════════════════════════════════════

const PrizesTab: React.FC<{ prizes: Prize[]; adminId: string; onRefresh: () => void }> = ({
  prizes,
  adminId,
  onRefresh,
}) => {
  const [showForm, setShowForm] = useState(false);
  const [editingPrize, setEditingPrize] = useState<Prize | null>(null);
  const [form, setForm] = useState({
    name: '',
    description: '',
    icon: '🎁',
    type: 'inventory_item' as Prize['type'],
    value: '',
    is_active: true,
  });

  const resetForm = () => {
    setForm({ name: '', description: '', icon: '🎁', type: 'inventory_item', value: '', is_active: true });
    setEditingPrize(null);
    setShowForm(false);
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;

    if (editingPrize) {
      await updatePrize(editingPrize.id, {
        name: form.name,
        description: form.description,
        icon: form.icon,
        type: form.type,
        value: form.value ? parseInt(form.value) : null,
        is_active: form.is_active,
      });
    } else {
      await createPrize({
        name: form.name,
        description: form.description,
        icon: form.icon,
        type: form.type,
        value: form.value ? parseInt(form.value) : null,
        is_active: form.is_active,
      }, adminId);
    }
    resetForm();
    onRefresh();
  };

  const handleEdit = (prize: Prize) => {
    setForm({
      name: prize.name,
      description: prize.description,
      icon: prize.icon,
      type: prize.type as Prize['type'],
      value: prize.value?.toString() || '',
      is_active: prize.is_active,
    });
    setEditingPrize(prize);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Delete this prize?')) {
      await deletePrize(id);
      onRefresh();
    }
  };

  const prizeTypes = [
    'birthday_card', 'inventory_item', 'dimsum_bonus', 'cosmetic', 'spin_ticket', 'physical_gift',
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold">🎁 Prizes ({prizes.length})</h2>
        <button
          onClick={() => { resetForm(); setShowForm(true); }}
          className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-xs font-bold transition"
        >
          + New Prize
        </button>
      </div>

      {showForm && (
        <div className="rounded-xl bg-gray-900 border border-gray-800 p-4 mb-4">
          <h3 className="text-sm font-bold mb-3">{editingPrize ? 'Edit Prize' : 'Create Prize'}</h3>
          <div className="space-y-3">
            <div className="grid grid-cols-4 gap-2">
              <div className="col-span-3">
                <label className="text-[10px] font-bold text-gray-400 block mb-1">Name</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white text-sm outline-none"
                  placeholder="Golden Chopstick"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-400 block mb-1">Icon</label>
                <input
                  value={form.icon}
                  onChange={(e) => setForm({ ...form, icon: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white text-sm text-center outline-none"
                  placeholder="🎁"
                />
              </div>
            </div>
            <div>
              <label className="text-[10px] font-bold text-gray-400 block mb-1">Description</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white text-sm outline-none resize-none"
                rows={2}
                placeholder="A rare golden chopstick..."
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-bold text-gray-400 block mb-1">Type</label>
                <select
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value as Prize['type'] })}
                  className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white text-sm outline-none"
                >
                  {prizeTypes.map((t) => (
                    <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-400 block mb-1">Value (optional)</label>
                <input
                  type="number"
                  value={form.value}
                  onChange={(e) => setForm({ ...form, value: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white text-sm outline-none"
                  placeholder="0"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                className="rounded"
              />
              <label className="text-xs text-gray-300">Active</label>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleSave}
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-xs font-bold transition"
              >
                {editingPrize ? 'Update' : 'Create'}
              </button>
              <button
                onClick={resetForm}
                className="px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-xs font-bold text-gray-300 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {prizes.map((prize) => (
          <div key={prize.id} className="rounded-xl bg-gray-900 border border-gray-800 p-3 flex items-center gap-3">
            <span className="text-2xl">{prize.icon}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-white truncate">{prize.name}</p>
              <p className="text-[10px] text-gray-500 truncate">{prize.description}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[9px] px-2 py-0.5 rounded bg-gray-800 text-gray-400">
                  {prize.type.replace(/_/g, ' ')}
                </span>
                {prize.value && <span className="text-[9px] text-amber-400">val: {prize.value}</span>}
                {!prize.is_active && <span className="text-[9px] text-red-400">inactive</span>}
              </div>
            </div>
            <div className="flex gap-1">
              <button onClick={() => handleEdit(prize)} className="p-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-xs transition">✏️</button>
              <button onClick={() => handleDelete(prize.id)} className="p-1.5 rounded-lg bg-red-900/20 hover:bg-red-900/40 text-xs transition">🗑️</button>
            </div>
          </div>
        ))}
        {prizes.length === 0 && <p className="text-center text-gray-600 text-sm py-8">No prizes yet</p>}
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// Greeting Cards Tab
// ═══════════════════════════════════════════════════════════════════════════════

const CardsTab: React.FC<{ cards: GreetingCard[]; adminId: string; onRefresh: () => void }> = ({
  cards,
  adminId,
  onRefresh,
}) => {
  const DEFAULT_BIRTHDAY_MESSAGE = 'Selamat Ulang Tahun! 🎉🎂\n\nSemoga di hari yang spesial ini, semua harapan dan impianmu terwujud. Kamu adalah orang yang luar biasa dan dunia beruntung memilikimu.\n\nTerus bersinar dan jangan pernah berhenti bermimpi! ✨\n\nWith love and warm wishes! 💝';
  const [showForm, setShowForm] = useState(false);
  const [editingCard, setEditingCard] = useState<GreetingCard | null>(null);
  const [form, setForm] = useState({
    title: '🎂 Birthday Card',
    message: DEFAULT_BIRTHDAY_MESSAGE,
    icon: '🎂',
    template_style: 'birthday',
    background_color: '#1a1a2e',
    text_color: '#ffffff',
  });

  const resetForm = () => {
    setForm({
      title: '🎂 Birthday Card',
      message: DEFAULT_BIRTHDAY_MESSAGE,
      icon: '🎂',
      template_style: 'birthday',
      background_color: '#1a1a2e',
      text_color: '#ffffff',
    });
    setEditingCard(null);
    setShowForm(false);
  };

  const handleSave = async () => {
    if (!form.title.trim() || !form.message.trim()) return;

    if (editingCard) {
      await updateGreetingCard(editingCard.id, form);
    } else {
      await createGreetingCard(form, adminId);
    }
    resetForm();
    onRefresh();
  };

  const handleEdit = (card: GreetingCard) => {
    setForm({
      title: card.title,
      message: card.message,
      icon: card.icon,
      template_style: card.template_style,
      background_color: card.background_color,
      text_color: card.text_color,
    });
    setEditingCard(card);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Delete this greeting card?')) {
      await deleteGreetingCard(id);
      onRefresh();
    }
  };

  const templateStyles = ['default', 'birthday', 'celebration', 'elegant', 'fun'];

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold">💌 Greeting Cards ({cards.length})</h2>
        <button
          onClick={() => { resetForm(); setShowForm(true); }}
          className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-xs font-bold transition"
        >
          + New Card
        </button>
      </div>

      {showForm && (
        <div className="rounded-xl bg-gray-900 border border-gray-800 p-4 mb-4">
          <h3 className="text-sm font-bold mb-3">{editingCard ? 'Edit Card' : 'Create Card'}</h3>
          <div className="space-y-3">
            <div className="grid grid-cols-4 gap-2">
              <div className="col-span-3">
                <label className="text-[10px] font-bold text-gray-400 block mb-1">Title</label>
                <input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white text-sm outline-none"
                  placeholder="Happy Birthday!"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-400 block mb-1">Icon</label>
                <input
                  value={form.icon}
                  onChange={(e) => setForm({ ...form, icon: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white text-sm text-center outline-none"
                />
              </div>
            </div>
            <div>
              <label className="text-[10px] font-bold text-gray-400 block mb-1">Message</label>
              <textarea
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white text-sm outline-none resize-none"
                rows={4}
                placeholder="Selamat ulang tahun! Semoga semua harapanmu terwujud..."
              />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-[10px] font-bold text-gray-400 block mb-1">Style</label>
                <select
                  value={form.template_style}
                  onChange={(e) => setForm({ ...form, template_style: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white text-sm outline-none"
                >
                  {templateStyles.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-400 block mb-1">BG Color</label>
                <input
                  type="color"
                  value={form.background_color}
                  onChange={(e) => setForm({ ...form, background_color: e.target.value })}
                  className="w-full h-9 rounded-lg bg-gray-800 border border-gray-700 outline-none cursor-pointer"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-400 block mb-1">Text Color</label>
                <input
                  type="color"
                  value={form.text_color}
                  onChange={(e) => setForm({ ...form, text_color: e.target.value })}
                  className="w-full h-9 rounded-lg bg-gray-800 border border-gray-700 outline-none cursor-pointer"
                />
              </div>
            </div>

            {/* Preview */}
            <div>
              <label className="text-[10px] font-bold text-gray-400 block mb-1">Preview</label>
              <div
                className="rounded-xl p-4 text-center"
                style={{ backgroundColor: form.background_color, color: form.text_color }}
              >
                <div className="text-3xl mb-2">{form.icon}</div>
                <h4 className="text-sm font-bold mb-1">{form.title || 'Title'}</h4>
                <p className="text-xs whitespace-pre-wrap">{form.message || 'Message...'}</p>
              </div>
            </div>

            <div className="flex gap-2">
              <button onClick={handleSave} className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-xs font-bold transition">
                {editingCard ? 'Update' : 'Create'}
              </button>
              <button onClick={resetForm} className="px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-xs font-bold text-gray-300 transition">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {cards.map((card) => (
          <div key={card.id} className="rounded-xl bg-gray-900 border border-gray-800 p-3 flex items-start gap-3">
            <div
              className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 text-xl"
              style={{ backgroundColor: card.background_color }}
            >
              {card.icon}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-white truncate">{card.title}</p>
              <p className="text-[10px] text-gray-500 line-clamp-2">{card.message}</p>
              <span className="text-[9px] px-2 py-0.5 rounded bg-gray-800 text-gray-400 mt-1 inline-block">
                {card.template_style}
              </span>
            </div>
            <div className="flex gap-1 flex-shrink-0">
              <button onClick={() => handleEdit(card)} className="p-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-xs transition">✏️</button>
              <button onClick={() => handleDelete(card.id)} className="p-1.5 rounded-lg bg-red-900/20 hover:bg-red-900/40 text-xs transition">🗑️</button>
            </div>
          </div>
        ))}
        {cards.length === 0 && <p className="text-center text-gray-600 text-sm py-8">No greeting cards yet</p>}
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// Mystery Box Tab
// ═══════════════════════════════════════════════════════════════════════════════

const MysteryBoxTab: React.FC<{
  boxes: MysteryBox[];
  prizes: Prize[];
  cards: GreetingCard[];
  players: Profile[];
  adminId: string;
  onRefresh: () => void;
}> = ({ boxes, prizes, cards, players, adminId, onRefresh }) => {
  const [showForm, setShowForm] = useState(false);
  const [editingBox, setEditingBox] = useState<MysteryBox | null>(null);
  const [recipientMode, setRecipientMode] = useState<'single' | 'selected' | 'all'>('single');
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([]);
  const [form, setForm] = useState({
    name: '',
    description: '',
    prize_id: '',
    greeting_card_id: '',
    include_spin_wheel: false,
    spin_count: '1',
    assigned_to: '',
    custom_message: '',
  });

  const resetForm = () => {
    setForm({
      name: '',
      description: '',
      prize_id: '',
      greeting_card_id: '',
      include_spin_wheel: false,
      spin_count: '1',
      assigned_to: '',
      custom_message: '',
    });
    setRecipientMode('single');
    setSelectedPlayerIds([]);
    setEditingBox(null);
    setShowForm(false);
  };

  const toggleSelectedPlayer = (playerId: string) => {
    setSelectedPlayerIds((current) => (
      current.includes(playerId)
        ? current.filter((id) => id !== playerId)
        : [...current, playerId]
    ));
  };

  const handleCreate = async () => {
    if (!form.name.trim()) return;

    if (editingBox) {
      const updated = await updateMysteryBox(editingBox.id, {
        name: form.name,
        description: form.description,
        prize_id: form.prize_id || null,
        greeting_card_id: form.greeting_card_id || null,
        include_spin_wheel: form.include_spin_wheel,
        spin_count: form.include_spin_wheel ? Math.max(1, parseInt(form.spin_count || '1', 10) || 1) : 0,
        assigned_to: form.assigned_to || null,
        custom_message: form.custom_message || null,
        status: form.assigned_to ? 'delivered' : 'pending',
        updated_at: new Date().toISOString(),
      });
      if (!updated) {
        alert('Gagal update mystery box. Pastikan box belum opened dan policy Supabase mengizinkan update.');
        return;
      }
      resetForm();
      onRefresh();
      return;
    }

    const allPlayerIds = activePlayers.map((p) => p.id);

    if (recipientMode === 'all') {
      const created = await createMysteryBoxesBulk({
        name: form.name,
        description: form.description,
        prize_id: form.prize_id || null,
        greeting_card_id: form.greeting_card_id || null,
        include_spin_wheel: form.include_spin_wheel,
        spin_count: form.include_spin_wheel ? Math.max(1, parseInt(form.spin_count || '1', 10) || 1) : 0,
        custom_message: form.custom_message || null,
      }, allPlayerIds, adminId);

      if (created.length > 0) {
        alert(`Created ${created.length} mystery boxes.\n\nCodes:\n${created.map((box) => `${getPlayerName(box.assigned_to)} → ${box.redemption_code}`).join('\n')}`);
      }

      resetForm();
      onRefresh();
      return;
    }

    if (recipientMode === 'selected') {
      const created = await createMysteryBoxesBulk({
        name: form.name,
        description: form.description,
        prize_id: form.prize_id || null,
        greeting_card_id: form.greeting_card_id || null,
        include_spin_wheel: form.include_spin_wheel,
        spin_count: form.include_spin_wheel ? Math.max(1, parseInt(form.spin_count || '1', 10) || 1) : 0,
        custom_message: form.custom_message || null,
      }, selectedPlayerIds, adminId);

      if (created.length > 0) {
        alert(`Created ${created.length} mystery boxes.\n\nCodes:\n${created.map((box) => `${getPlayerName(box.assigned_to)} → ${box.redemption_code}`).join('\n')}`);
      }

      resetForm();
      onRefresh();
      return;
    }

    if (!form.assigned_to) return;

    const created = await createMysteryBox({
      name: form.name,
      description: form.description,
      prize_id: form.prize_id || null,
      greeting_card_id: form.greeting_card_id || null,
      include_spin_wheel: form.include_spin_wheel,
      spin_count: form.include_spin_wheel ? Math.max(1, parseInt(form.spin_count || '1', 10) || 1) : 0,
      assigned_to: form.assigned_to || null,
      custom_message: form.custom_message || null,
    }, adminId);
    if (!created) {
      alert('Gagal membuat mystery box. Cek policy/permission di Supabase.');
      return;
    }
    resetForm();
    onRefresh();
  };

  const handleDelete = async (id: string) => {
    const target = boxes.find((b) => b.id === id);
    if (target?.status === 'opened') {
      alert('Opened box tidak bisa dihapus. Hanya box delivered/pending/expired yang bisa dihapus.');
      return;
    }

    if (confirm('Delete this mystery box?')) {
      const ok = await deleteMysteryBox(id);
      if (!ok) {
        alert('Gagal menghapus mystery box. Cek policy/permission di Supabase.');
        return;
      }
      onRefresh();
    }
  };

  const handleEdit = (box: MysteryBox) => {
    setForm({
      name: box.name || '',
      description: box.description || '',
      prize_id: box.prize_id || '',
      greeting_card_id: box.greeting_card_id || '',
      include_spin_wheel: !!box.include_spin_wheel,
      spin_count: String(Math.max(1, box.spin_count || 1)),
      assigned_to: box.assigned_to || '',
      custom_message: box.custom_message || '',
    });
    setRecipientMode('single');
    setSelectedPlayerIds([]);
    setEditingBox(box);
    setShowForm(true);
  };

  const handleToggleActive = async (box: MysteryBox) => {
    if (box.status === 'opened') return;
    const nextStatus = box.status === 'expired'
      ? (box.assigned_to ? 'delivered' : 'pending')
      : 'expired';
    const updated = await updateMysteryBox(box.id, {
      status: nextStatus,
      updated_at: new Date().toISOString(),
    });
    if (!updated) {
      alert('Gagal mengubah status box. Cek policy/permission di Supabase.');
      return;
    }
    onRefresh();
  };

  const getPlayerName = (userId: string | null) => {
    if (!userId) return 'Unassigned';
    const player = players.find((p) => p.id === userId);
    return player ? `${player.display_name || player.username} (${player.game_user_id})` : userId.slice(0, 8);
  };

  const getPrizeName = (prizeId: string | null) => {
    if (!prizeId) return 'None';
    const prize = prizes.find((p) => p.id === prizeId);
    return prize ? `${prize.icon} ${prize.name}` : 'Unknown';
  };

  const getCardName = (cardId: string | null) => {
    if (!cardId) return 'None';
    const card = cards.find((c) => c.id === cardId);
    return card ? `${card.icon} ${card.title}` : 'Unknown';
  };

  const statusColors: Record<string, string> = {
    pending: 'bg-amber-900/30 text-amber-400',
    delivered: 'bg-blue-900/30 text-blue-400',
    opened: 'bg-emerald-900/30 text-emerald-400',
    expired: 'bg-red-900/30 text-red-400',
  };

  const activePlayers = players.filter((p) => p.role === 'player');

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold">📦 Mystery Boxes ({boxes.length})</h2>
        <button
          onClick={() => { resetForm(); setShowForm(true); }}
          className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-bold transition"
        >
          + New Box
        </button>
      </div>

      {showForm && (
        <div className="rounded-xl bg-gray-900 border border-gray-800 p-4 mb-4">
          <h3 className="text-sm font-bold mb-3">{editingBox ? 'Edit Mystery Box' : 'Create Mystery Box'}</h3>
          <div className="space-y-3">
            <div>
              <label className="text-[10px] font-bold text-gray-400 block mb-1">Box Name</label>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white text-sm outline-none"
                placeholder="Birthday Surprise Box"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-gray-400 block mb-1">Description</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white text-sm outline-none resize-none"
                rows={2}
                placeholder="A special mystery box for..."
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-bold text-gray-400 block mb-1">Prize</label>
                <select
                  value={form.prize_id}
                  onChange={(e) => setForm({ ...form, prize_id: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white text-sm outline-none"
                >
                  <option value="">No Prize</option>
                  {prizes.filter((p) => p.is_active).map((p) => (
                    <option key={p.id} value={p.id}>{p.icon} {p.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-400 block mb-1">Greeting Card</label>
                <select
                  value={form.greeting_card_id}
                  onChange={(e) => setForm({ ...form, greeting_card_id: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white text-sm outline-none"
                >
                  <option value="">No Card</option>
                  {cards.filter((c) => c.is_active).map((c) => (
                    <option key={c.id} value={c.id}>{c.icon} {c.title}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Box Contents: Spin Wheel */}
            <div className="rounded-lg border border-purple-800/40 bg-purple-950/20 p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-purple-300">🎰 Include Spin Wheel Reward</p>
                  <p className="text-[10px] text-purple-400/70">Box bisa isi card + prize + spin wheel sekaligus</p>
                </div>
                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.include_spin_wheel}
                    onChange={(e) => setForm({ ...form, include_spin_wheel: e.target.checked })}
                  />
                  <span className="text-[10px] text-purple-300 font-bold">Enable</span>
                </label>
              </div>

              {form.include_spin_wheel && (
                <div className="mt-2 w-full sm:w-40">
                  <label className="text-[10px] font-bold text-gray-400 block mb-1">Spin Count</label>
                  <input
                    type="number"
                    min={1}
                    value={form.spin_count}
                    onChange={(e) => setForm({ ...form, spin_count: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white text-sm outline-none"
                    placeholder="1"
                  />
                </div>
              )}
            </div>

            {/* Content summary */}
            <div className="rounded-lg border border-gray-700 bg-gray-800/40 px-3 py-2">
              <p className="text-[10px] text-gray-400 mb-1">Content in this mystery box:</p>
              <div className="flex flex-wrap gap-1.5">
                {form.greeting_card_id && <span className="text-[9px] px-2 py-0.5 rounded bg-purple-900/30 text-purple-300">💌 Card</span>}
                {form.prize_id && <span className="text-[9px] px-2 py-0.5 rounded bg-amber-900/30 text-amber-300">🎁 Prize</span>}
                {form.include_spin_wheel && <span className="text-[9px] px-2 py-0.5 rounded bg-emerald-900/30 text-emerald-300">🎰 Spin x{Math.max(1, parseInt(form.spin_count || '1', 10) || 1)}</span>}
                {!form.greeting_card_id && !form.prize_id && !form.include_spin_wheel && (
                  <span className="text-[9px] px-2 py-0.5 rounded bg-red-900/30 text-red-300">No content selected</span>
                )}
              </div>
            </div>
            {!editingBox && (
            <div>
              <label className="text-[10px] font-bold text-gray-400 block mb-1">Send To</label>
              <div className="grid grid-cols-3 gap-2 mb-2">
                <button
                  type="button"
                  onClick={() => setRecipientMode('single')}
                  className={`px-2 py-2 rounded-lg text-[10px] font-bold border transition ${recipientMode === 'single' ? 'bg-emerald-600/20 border-emerald-500 text-emerald-300' : 'bg-gray-800 border-gray-700 text-gray-400'}`}
                >
                  One User
                </button>
                <button
                  type="button"
                  onClick={() => setRecipientMode('selected')}
                  className={`px-2 py-2 rounded-lg text-[10px] font-bold border transition ${recipientMode === 'selected' ? 'bg-emerald-600/20 border-emerald-500 text-emerald-300' : 'bg-gray-800 border-gray-700 text-gray-400'}`}
                >
                  Several Users
                </button>
                <button
                  type="button"
                  onClick={() => setRecipientMode('all')}
                  className={`px-2 py-2 rounded-lg text-[10px] font-bold border transition ${recipientMode === 'all' ? 'bg-emerald-600/20 border-emerald-500 text-emerald-300' : 'bg-gray-800 border-gray-700 text-gray-400'}`}
                >
                  All Users
                </button>
              </div>

              {recipientMode === 'single' && (
                <select
                  value={form.assigned_to}
                  onChange={(e) => setForm({ ...form, assigned_to: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white text-sm outline-none"
                >
                  <option value="">Select one player</option>
                  {activePlayers.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.display_name || p.username} ({p.game_user_id})
                    </option>
                  ))}
                </select>
              )}

              {recipientMode === 'selected' && (
                <div className="rounded-lg border border-gray-700 bg-gray-800/70 max-h-40 overflow-y-auto p-2 space-y-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] text-gray-400">Selected: {selectedPlayerIds.length}</span>
                    <button
                      type="button"
                      onClick={() => setSelectedPlayerIds(activePlayers.map((p) => p.id))}
                      className="text-[10px] text-emerald-400"
                    >
                      Select all
                    </button>
                  </div>
                  {activePlayers.map((p) => {
                    const checked = selectedPlayerIds.includes(p.id);
                    return (
                      <label key={p.id} className="flex items-center gap-2 rounded px-2 py-1.5 hover:bg-gray-700/40 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleSelectedPlayer(p.id)}
                        />
                        <span className="text-xs text-gray-200">
                          {p.display_name || p.username} ({p.game_user_id})
                        </span>
                      </label>
                    );
                  })}
                </div>
              )}

              {recipientMode === 'all' && (
                <div className="rounded-lg border border-emerald-800 bg-emerald-950/20 px-3 py-2 text-[10px] text-emerald-300">
                  This mystery box will be generated for all active players ({activePlayers.length} users). Each user gets a different random redemption code.
                </div>
              )}
            </div>
            )}

            {editingBox && (
              <div>
                <label className="text-[10px] font-bold text-gray-400 block mb-1">Assigned To</label>
                <select
                  value={form.assigned_to}
                  onChange={(e) => setForm({ ...form, assigned_to: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white text-sm outline-none"
                >
                  <option value="">Unassigned</option>
                  {activePlayers.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.display_name || p.username} ({p.game_user_id})
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <label className="text-[10px] font-bold text-gray-400 block mb-1">Custom Message (optional)</label>
              <textarea
                value={form.custom_message}
                onChange={(e) => setForm({ ...form, custom_message: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white text-sm outline-none resize-none"
                rows={2}
                placeholder="A personal message for the recipient..."
              />
            </div>
            <div className="flex gap-2">
              <button onClick={handleCreate} className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-bold transition">
                {editingBox ? 'Update Box' : 'Generate Code & Send'}
              </button>
              <button onClick={resetForm} className="px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-xs font-bold text-gray-300 transition">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {boxes.map((box) => (
          <div key={box.id} className="rounded-xl bg-gray-900 border border-gray-800 p-3">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-white truncate">📦 {box.name}</p>
                <p className="text-[10px] text-gray-500 truncate">{box.description}</p>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <span className={`text-[9px] px-2 py-0.5 rounded font-bold ${statusColors[box.status] || ''}`}>
                  {box.status}
                </span>
                <button
                  onClick={() => handleToggleActive(box)}
                  disabled={box.status === 'opened'}
                  className={`p-1 rounded text-xs transition ${
                    box.status === 'opened'
                      ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
                      : box.status === 'expired'
                      ? 'bg-emerald-900/20 hover:bg-emerald-900/40'
                      : 'bg-yellow-900/20 hover:bg-yellow-900/40'
                  }`}
                  title={box.status === 'opened' ? 'Opened box cannot be toggled' : box.status === 'expired' ? 'Activate box' : 'Deactivate box'}
                >
                  {box.status === 'expired' ? '▶️' : '⏸️'}
                </button>
                <button onClick={() => handleEdit(box)} className="p-1 rounded bg-gray-800 hover:bg-gray-700 text-xs transition">✏️</button>
                <button onClick={() => handleDelete(box.id)} className="p-1 rounded bg-red-900/20 hover:bg-red-900/40 text-xs transition">🗑️</button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-1 text-[10px]">
              <div className="text-gray-500">👤 {getPlayerName(box.assigned_to)}</div>
              <div className="text-gray-500">🎁 {getPrizeName(box.prize_id)}</div>
              <div className="text-gray-500">💌 {getCardName(box.greeting_card_id)}</div>
              <div className="text-amber-400 font-bold">🔑 {box.redemption_code || 'N/A'}</div>
            </div>
            <div className="flex flex-wrap gap-1 mt-2">
              {box.greeting_card_id && <span className="text-[9px] px-2 py-0.5 rounded bg-purple-900/30 text-purple-300">💌 Card</span>}
              {box.prize_id && <span className="text-[9px] px-2 py-0.5 rounded bg-amber-900/30 text-amber-300">🎁 Prize</span>}
              {box.include_spin_wheel && <span className="text-[9px] px-2 py-0.5 rounded bg-emerald-900/30 text-emerald-300">🎰 Spin x{box.spin_count}</span>}
            </div>
            {box.custom_message && (
              <div className="mt-1.5 rounded-lg bg-gray-800/50 px-2 py-1">
                <p className="text-[10px] text-gray-400 italic">"{box.custom_message}"</p>
              </div>
            )}
          </div>
        ))}
        {boxes.length === 0 && <p className="text-center text-gray-600 text-sm py-8">No mystery boxes yet</p>}
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// Spin Wheel Tab — CRUD for spin wheel prizes
// ═══════════════════════════════════════════════════════════════════════════════

const PRIZE_TYPES = ['physical', 'dimsum_bonus', 'cosmetic', 'special'] as const;
const DEFAULT_COLORS = [
  { color: '#f59e0b', dark: '#b45309' },
  { color: '#10b981', dark: '#047857' },
  { color: '#ef4444', dark: '#b91c1c' },
  { color: '#3b82f6', dark: '#1d4ed8' },
  { color: '#fbbf24', dark: '#92400e' },
  { color: '#8b5cf6', dark: '#6d28d9' },
  { color: '#ec4899', dark: '#be185d' },
  { color: '#14b8a6', dark: '#0d9488' },
];

const SpinWheelTab: React.FC<{
  spinPrizes: SpinWheelPrize[];
  adminId: string;
  onRefresh: () => void;
}> = ({ spinPrizes, adminId, onRefresh }) => {
  const [showForm, setShowForm] = useState(false);
  const [editingPrize, setEditingPrize] = useState<SpinWheelPrize | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '',
    label: '',
    description: '',
    icon: '🎁',
    color: '#f59e0b',
    dark_color: '#b45309',
    image_url: '',
    prize_type: 'physical' as SpinWheelPrize['prize_type'],
    value: '0',
    weight: '1',
    is_active: true,
    sort_order: '0',
  });

  const resetForm = () => {
    setForm({
      name: '', label: '', description: '', icon: '🎁',
      color: '#f59e0b', dark_color: '#b45309', image_url: '',
      prize_type: 'physical', value: '0', weight: '1',
      is_active: true, sort_order: '0',
    });
    setEditingPrize(null);
    setShowForm(false);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.label.trim()) return;
    setSaving(true);

    if (editingPrize) {
      await updateSpinWheelPrize(editingPrize.id, {
        name: form.name,
        label: form.label,
        description: form.description,
        icon: form.icon,
        color: form.color,
        dark_color: form.dark_color,
        image_url: form.image_url || null,
        prize_type: form.prize_type,
        value: parseInt(form.value) || 0,
        weight: parseInt(form.weight) || 1,
        is_active: form.is_active,
        sort_order: parseInt(form.sort_order) || 0,
      });
    } else {
      await createSpinWheelPrize({
        name: form.name,
        label: form.label,
        description: form.description,
        icon: form.icon,
        color: form.color,
        dark_color: form.dark_color,
        image_url: form.image_url || null,
        prize_type: form.prize_type,
        value: parseInt(form.value) || 0,
        weight: parseInt(form.weight) || 1,
        is_active: form.is_active,
        sort_order: parseInt(form.sort_order) || 0,
      }, adminId);
    }

    setSaving(false);
    resetForm();
    onRefresh();
  };

  const handleEdit = (prize: SpinWheelPrize) => {
    setForm({
      name: prize.name,
      label: prize.label,
      description: prize.description,
      icon: prize.icon,
      color: prize.color,
      dark_color: prize.dark_color,
      image_url: prize.image_url || '',
      prize_type: prize.prize_type,
      value: prize.value.toString(),
      weight: prize.weight.toString(),
      is_active: prize.is_active,
      sort_order: prize.sort_order.toString(),
    });
    setEditingPrize(prize);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Delete this spin wheel prize?')) {
      await deleteSpinWheelPrize(id);
      onRefresh();
    }
  };

  const handleToggleActive = async (prize: SpinWheelPrize) => {
    await updateSpinWheelPrize(prize.id, { is_active: !prize.is_active });
    onRefresh();
  };

  const activePrizes = spinPrizes.filter(p => p.is_active);
  const inactivePrizes = spinPrizes.filter(p => !p.is_active);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-bold">🎰 Spin Wheel Prizes ({spinPrizes.length})</h2>
          <p className="text-[10px] text-gray-500">
            {activePrizes.length} active • {inactivePrizes.length} inactive • Min 3 active needed for wheel
          </p>
        </div>
        <button
          onClick={() => { resetForm(); setShowForm(true); }}
          className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-xs font-bold transition"
        >
          + New Prize
        </button>
      </div>

      {/* Wheel Preview */}
      {activePrizes.length >= 3 && (
        <div className="rounded-xl bg-gray-900 border border-gray-800 p-4 mb-4">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Wheel Preview</p>
          <div className="flex items-center gap-2 overflow-x-auto pb-2">
            {activePrizes.sort((a, b) => a.sort_order - b.sort_order).map((p) => (
              <div key={p.id} className="flex-shrink-0 w-16 h-16 rounded-xl flex flex-col items-center justify-center text-center"
                style={{ background: p.color, border: `2px solid ${p.dark_color}` }}
              >
                {p.image_url ? (
                  <img src={p.image_url} alt="" className="w-8 h-8 object-contain" />
                ) : (
                  <span className="text-xl">{p.icon}</span>
                )}
                <span className="text-[8px] font-bold text-white mt-0.5 leading-none">{p.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Form */}
      {showForm && (
        <div className="rounded-xl bg-gray-900 border border-gray-800 p-4 mb-4">
          <h3 className="text-sm font-bold mb-3">{editingPrize ? '✏️ Edit Prize' : '➕ Create Prize'}</h3>
          <div className="space-y-3">
            {/* Name + Label + Icon */}
            <div className="grid grid-cols-6 gap-2">
              <div className="col-span-3">
                <label className="text-[10px] font-bold text-gray-400 block mb-1">Name (full)</label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white text-sm outline-none"
                  placeholder="Golden Watch" />
              </div>
              <div className="col-span-2">
                <label className="text-[10px] font-bold text-gray-400 block mb-1">Label (wheel)</label>
                <input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white text-sm outline-none"
                  placeholder="Jam" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-400 block mb-1">Icon</label>
                <input value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white text-sm text-center outline-none"
                  placeholder="⌚" />
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="text-[10px] font-bold text-gray-400 block mb-1">Description</label>
              <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white text-sm outline-none resize-none" rows={2}
                placeholder="A luxury golden watch from the lucky spin!" />
            </div>

            {/* Image URL */}
            <div>
              <label className="text-[10px] font-bold text-gray-400 block mb-1">Image URL (optional — for wheel display)</label>
              <input value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white text-sm outline-none"
                placeholder="https://example.com/watch.png" />
              {form.image_url && (
                <div className="mt-2 flex items-center gap-2">
                  <img src={form.image_url} alt="preview" className="w-10 h-10 object-contain rounded bg-gray-700 p-1"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                  <span className="text-[9px] text-gray-500">Image preview</span>
                </div>
              )}
            </div>

            {/* Colors */}
            <div>
              <label className="text-[10px] font-bold text-gray-400 block mb-1">Colors (segment + dark border)</label>
              <div className="flex gap-2 items-center flex-wrap">
                <input type="color" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })}
                  className="w-10 h-10 rounded cursor-pointer border border-gray-700" />
                <input type="color" value={form.dark_color} onChange={(e) => setForm({ ...form, dark_color: e.target.value })}
                  className="w-10 h-10 rounded cursor-pointer border border-gray-700" />
                <div className="flex gap-1 ml-2">
                  {DEFAULT_COLORS.map(({ color, dark }, i) => (
                    <button key={i}
                      onClick={() => setForm({ ...form, color, dark_color: dark })}
                      className="w-6 h-6 rounded-full border-2 transition"
                      style={{
                        background: color,
                        borderColor: form.color === color ? '#fff' : 'rgba(75,85,99,0.5)',
                      }}
                    />
                  ))}
                </div>
              </div>
              {/* Preview chip */}
              <div className="mt-2 inline-flex items-center gap-2 rounded-lg px-3 py-1.5"
                style={{ background: form.color, border: `2px solid ${form.dark_color}` }}
              >
                <span className="text-lg">{form.icon}</span>
                <span className="text-xs font-bold text-white">{form.label || 'Label'}</span>
              </div>
            </div>

            {/* Type + Value + Weight + Sort */}
            <div className="grid grid-cols-4 gap-2">
              <div>
                <label className="text-[10px] font-bold text-gray-400 block mb-1">Type</label>
                <select value={form.prize_type}
                  onChange={(e) => setForm({ ...form, prize_type: e.target.value as SpinWheelPrize['prize_type'] })}
                  className="w-full px-2 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white text-[11px] outline-none"
                >
                  {PRIZE_TYPES.map(t => (
                    <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-400 block mb-1">Value</label>
                <input type="number" value={form.value}
                  onChange={(e) => setForm({ ...form, value: e.target.value })}
                  className="w-full px-2 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white text-sm outline-none"
                  placeholder="0" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-400 block mb-1">Weight</label>
                <input type="number" value={form.weight}
                  onChange={(e) => setForm({ ...form, weight: e.target.value })}
                  className="w-full px-2 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white text-sm outline-none"
                  placeholder="1" />
                <p className="text-[8px] text-gray-600 mt-0.5">Higher = more common</p>
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-400 block mb-1">Sort</label>
                <input type="number" value={form.sort_order}
                  onChange={(e) => setForm({ ...form, sort_order: e.target.value })}
                  className="w-full px-2 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white text-sm outline-none"
                  placeholder="0" />
              </div>
            </div>

            {/* Active */}
            <div className="flex items-center gap-2">
              <input type="checkbox" checked={form.is_active}
                onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                className="rounded" />
              <label className="text-xs text-gray-300">Active (shown on wheel)</label>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <button onClick={handleSave} disabled={saving}
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-xs font-bold transition"
              >
                {saving ? 'Saving...' : editingPrize ? 'Update' : 'Create'}
              </button>
              <button onClick={resetForm}
                className="px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-xs font-bold text-gray-300 transition"
              >Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Prize list */}
      <div className="space-y-2">
        {spinPrizes.sort((a, b) => a.sort_order - b.sort_order).map((prize) => (
          <div key={prize.id}
            className={`rounded-xl bg-gray-900 border p-3 flex items-center gap-3 ${
              prize.is_active ? 'border-gray-800' : 'border-red-900/30 opacity-60'
            }`}
          >
            {/* Color preview */}
            <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: prize.color, border: `2px solid ${prize.dark_color}` }}
            >
              {prize.image_url ? (
                <img src={prize.image_url} alt="" className="w-8 h-8 object-contain" />
              ) : (
                <span className="text-xl">{prize.icon}</span>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-bold text-white truncate">{prize.name}</p>
                <span className="text-[8px] px-1.5 py-0.5 rounded bg-gray-800 text-gray-400 font-bold">{prize.label}</span>
              </div>
              <p className="text-[10px] text-gray-500 truncate">{prize.description}</p>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className="text-[9px] px-2 py-0.5 rounded bg-gray-800 text-gray-400">
                  {prize.prize_type.replace(/_/g, ' ')}
                </span>
                {prize.value > 0 && <span className="text-[9px] text-amber-400">val: {prize.value}</span>}
                <span className="text-[9px] text-gray-600">wt: {prize.weight}</span>
                <span className="text-[9px] text-gray-600">#{prize.sort_order}</span>
                {!prize.is_active && <span className="text-[9px] text-red-400 font-bold">INACTIVE</span>}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-1 flex-shrink-0">
              <button onClick={() => handleToggleActive(prize)}
                className={`p-1.5 rounded-lg text-xs transition ${
                  prize.is_active
                    ? 'bg-yellow-900/20 hover:bg-yellow-900/40'
                    : 'bg-green-900/20 hover:bg-green-900/40'
                }`}
                title={prize.is_active ? 'Deactivate' : 'Activate'}
              >
                {prize.is_active ? '⏸️' : '▶️'}
              </button>
              <button onClick={() => handleEdit(prize)}
                className="p-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-xs transition"
              >✏️</button>
              <button onClick={() => handleDelete(prize.id)}
                className="p-1.5 rounded-lg bg-red-900/20 hover:bg-red-900/40 text-xs transition"
              >🗑️</button>
            </div>
          </div>
        ))}
        {spinPrizes.length === 0 && (
          <p className="text-center text-gray-600 text-sm py-8">No spin wheel prizes yet. Add at least 3 for the wheel to work!</p>
        )}
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// Players Tab
// ═══════════════════════════════════════════════════════════════════════════════

const PlayersTab: React.FC<{ players: Profile[]; onRefresh: () => void }> = ({ players, onRefresh }) => {
  const [bulkAmount, setBulkAmount] = useState('1');
  const [grantingAll, setGrantingAll] = useState(false);
  const [grantingPlayerId, setGrantingPlayerId] = useState<string | null>(null);

  const playerOnly = players.filter((p) => p.role === 'player');

  const handleGrantAll = async () => {
    const amount = Math.max(1, parseInt(bulkAmount || '1', 10) || 1);
    setGrantingAll(true);
    await grantTicketsToAllPlayers(amount);
    setGrantingAll(false);
    onRefresh();
  };

  const handleGrantOne = async (playerId: string, amount: number) => {
    setGrantingPlayerId(playerId);
    await grantTicketsToPlayer(playerId, amount);
    setGrantingPlayerId(null);
    onRefresh();
  };

  return (
    <div>
      <h2 className="text-lg font-bold mb-4">👥 Players ({players.length})</h2>

      <div className="rounded-xl bg-gray-900 border border-gray-800 p-3 mb-4">
        <p className="text-xs font-bold text-purple-300 mb-2">🎫 Gift Ticket to All Players</p>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={1}
            value={bulkAmount}
            onChange={(e) => setBulkAmount(e.target.value)}
            className="w-24 px-2 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white text-sm outline-none"
          />
          <button
            onClick={handleGrantAll}
            disabled={grantingAll || playerOnly.length === 0}
            className="px-3 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-xs font-black transition"
          >
            {grantingAll ? 'Sending...' : `Gift to All (${playerOnly.length})`}
          </button>
        </div>
      </div>

      <div className="space-y-2">
        {players.map((player) => (
          <div key={player.id} className="rounded-xl bg-gray-900 border border-gray-800 p-3 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center text-lg flex-shrink-0">
              {player.avatar_url ? (
                <img src={player.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
              ) : (
                '👤'
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-bold text-white truncate">{player.display_name || player.username}</p>
                {player.role === 'admin' && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-900/30 text-blue-400 font-bold">ADMIN</span>
                )}
              </div>
              <p className="text-[10px] text-gray-500">@{player.username} • {player.game_user_id}</p>
              <div className="flex items-center gap-3 mt-1 text-[10px] text-gray-500">
                <span>🥟 {player.total_dimsum}</span>
                <span>⭐ {player.total_stars}</span>
                <span>🎫 {player.tickets}</span>
                <span>🏆 Lv.{player.levels_completed}</span>
              </div>
            </div>

            {player.role === 'player' && (
              <div className="flex gap-1.5">
                {[1, 3, 5].map((amt) => (
                  <button
                    key={amt}
                    onClick={() => handleGrantOne(player.id, amt)}
                    disabled={grantingPlayerId === player.id || grantingAll}
                    className="px-2 py-1 rounded-md bg-emerald-700/50 hover:bg-emerald-600/60 disabled:opacity-50 text-[10px] font-bold"
                  >
                    +{amt} 🎫
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
        {players.length === 0 && <p className="text-center text-gray-600 text-sm py-8">No players yet</p>}
      </div>
    </div>
  );
};

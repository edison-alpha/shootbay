import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

// ─── Types ──────────────────────────────────────────────────────────────────
import type { ActivePowerUp, CharacterId, DialogueMessage, GameState } from './types/game';

// ─── Constants ──────────────────────────────────────────────────────────────
import { GAME_CONFIG } from './constants/config';
import { CHARACTER_OPTIONS } from './constants/characters';
import { buildOpeningDialogues, buildMilestoneDialogues } from './constants/dialogues';
import { LEVELS, getLevelById } from './constants/levels';
import type { LevelConfig } from './constants/levels';

// ─── Engine / Entities ──────────────────────────────────────────────────────
import { createInitialGameSnapshot, resetGameSnapshot } from './engine/entities';

// ─── Store ──────────────────────────────────────────────────────────────────
import {
  createDefaultGameData,
  loadGameData,
  saveProfile,
  saveLevelProgress,
  addToLeaderboard,
  addBirthdayReward,
  getTotalStars,
  getCompletedLevels,
  getTicketProgress,
  saveSessionState,
  loadSessionState,
  clearSessionState,
  setActiveStorageUser,
} from './store/gameStore';
import type { GameStoreData } from './store/gameStore';

// ─── Custom Hooks ───────────────────────────────────────────────────────────
import { useCamera } from './hooks/useCamera';
import { useGameLoop } from './hooks/useGameLoop';
import { useAudioManager } from './hooks/useAudioManager';
import { useIntroLoader } from './hooks/useIntroLoader';

// ─── Screen Components ─────────────────────────────────────────────────────
import { IntroScreen } from './components/screens/IntroScreen';
import { NameEntryScreen } from './components/screens/NameEntryScreen';
import { PhotoCaptureScreen } from './components/screens/PhotoCaptureScreen';
import { CharacterSelectScreen } from './components/screens/CharacterSelectScreen';
import { TutorialScreen } from './components/screens/TutorialScreen';
import { DialogueScreen } from './components/screens/DialogueScreen';
import { GameHUD } from './components/screens/GameHUD';
import { WishScreen } from './components/screens/WishScreen';
import { GameOverScreen } from './components/screens/GameOverScreen';
import { BirthdayScreen } from './components/screens/BirthdayScreen';
import { MainMenuScreen } from './components/screens/MainMenuScreen';
import { LevelSelectScreen } from './components/screens/LevelSelectScreen';
import { LeaderboardScreen } from './components/screens/LeaderboardScreen';
import { InventoryScreen } from './components/screens/InventoryScreen';
import { MysteryBoxScreen } from './components/screens/MysteryBoxScreen';
import { LevelCompleteScreen } from './components/screens/LevelCompleteScreen';
import { SettingsScreen } from './components/screens/SettingsScreen';
import { SpinWheelScreen } from './components/screens/SpinWheelScreen';
import { GamePauseMenu } from './components/screens/GamePauseMenu';
import { BattleLoadingScreen } from './components/screens/BattleLoadingScreen';

// ─── Auth / Backend ─────────────────────────────────────────────────────────
import { getCurrentUser, logout, onAuthStateChange } from './lib/auth';
import type { AuthUser } from './lib/auth';
import {
  loadGameDataFromSupabase,
  saveFullGameDataToSupabase,
} from './lib/gameService';
import { SignupScreen } from './components/screens/SignupScreen';
import { LoginScreen } from './components/screens/LoginScreen';
import { AdminDashboard } from './components/screens/AdminDashboard';
import { supabase } from './lib/supabase';

// ─── Helpers ────────────────────────────────────────────────────────────────
import { playSoundEffect } from './utils/audio';
import { playClickSound } from './utils/uiAudio';
import { hapticLight, hapticMedium, hapticSuccess } from './utils/haptics';
import { ScreenTransition } from './components/ui/ScreenTransition';

// ═══════════════════════════════════════════════════════════════════════════
// App — thin orchestrator; all heavy lifting lives in hooks / engine
// ═══════════════════════════════════════════════════════════════════════════
export default function App() {
  // ── Global click sound + haptic for all buttons/links ───────────────
  useEffect(() => {
    const handler = (e: Event) => {
      const target = e.target as HTMLElement;
      if (target.closest('button') || target.closest('a') || target.closest('[role="button"]')) {
        playClickSound();
        hapticLight();
      }
    };
    document.addEventListener('pointerdown', handler, true);
    return () => document.removeEventListener('pointerdown', handler, true);
  }, []);

  // ── Auth State ────────────────────────────────────────────────────
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [introReady, setIntroReady] = useState(false);

  // ── Persistent Store ──────────────────────────────────────────────
  const [storeData, setStoreData] = useState<GameStoreData>(() => loadGameData());

  // ── State machine ────────────────────────────────────────────────────
  const [gameState, setGameState] = useState<GameState>('intro');
  const [score, setScore] = useState(0);
  const [health, setHealth] = useState<number>(GAME_CONFIG.playerMaxHealth);
  const [lives, setLives] = useState<number>(GAME_CONFIG.playerLives);
  const [weapon, setWeapon] = useState<string>('default');
  const [powerUps, setPowerUps] = useState<ActivePowerUp[]>([]);
  const [playerName, setPlayerName] = useState('');
  const [currentWishMilestone, setCurrentWishMilestone] = useState(0);
  const [wishInput, setWishInput] = useState('');
  const [wishes, setWishes] = useState<string[]>([]);
  const [dialogueIndex, setDialogueIndex] = useState(0);
  const [milestoneDialogueIndex, setMilestoneDialogueIndex] = useState(0);
  const [milestoneDialogues, setMilestoneDialogues] = useState<DialogueMessage[]>([]);
  const [selectedCharacterId, setSelectedCharacterId] = useState<CharacterId>('agree');

  // ── Level / Dimsum State ──────────────────────────────────────────
  const [currentLevelId, setCurrentLevelId] = useState(1);
  const [dimsumCollected, setDimsumCollected] = useState(0);
  const [dimsumTotal, setDimsumTotal] = useState(0);
  const [levelStartTime, setLevelStartTime] = useState(0);
  const [levelTimeElapsed, setLevelTimeElapsed] = useState(0);
  const [previousTickets, setPreviousTickets] = useState(0);
  const [gamePaused, setGamePaused] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [musicEnabled, setMusicEnabled] = useState(true);

  const realtimeSyncTimeoutRef = useRef<number | null>(null);
  const userRealtimeReloadingRef = useRef(false);
  const storeDataRef = useRef(storeData);

  // ── Refs ─────────────────────────────────────────────────────────────
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef(createInitialGameSnapshot());

  // ── Derived ──────────────────────────────────────────────────────────
  const dialogueMessages = useMemo(() => buildOpeningDialogues(playerName.trim()), [playerName]);
  const selectedCharacter = CHARACTER_OPTIONS.find((c) => c.id === selectedCharacterId) ?? CHARACTER_OPTIONS[0];
  const currentLevel = useMemo(() => getLevelById(currentLevelId), [currentLevelId]);

  // ── Hooks ────────────────────────────────────────────────────────────
  const camera = useCamera(gameState);
  const audio = useAudioManager(gameRef);

  const resetForFreshOnboarding = useCallback(() => {
    const empty = createDefaultGameData();
    setStoreData(empty);
    setSelectedCharacterId('agree');
    camera.setProfilePhoto(null);
    camera.setCameraError('');
  }, [camera]);

  // ── Auth session check on mount ──────────────────────────────────
  useEffect(() => {
    getCurrentUser().then((user) => {
      if (user) setAuthUser(user);
      setAuthChecked(true);
    });
    const { data: { subscription } } = onAuthStateChange((user) => {
      setAuthUser(user);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    setActiveStorageUser(authUser?.id ?? null);
  }, [authUser]);

  useEffect(() => {
    if (!authChecked || !introReady || gameState !== 'intro') return;

    if (authUser) {
      // Admin session: if user is admin and last state was adminDashboard, restore it
      const lastState = loadSessionState();
      if (authUser.role === 'admin' && lastState === 'adminDashboard') {
        setGameState('adminDashboard' as GameState);
        gameRef.current.state = 'adminDashboard';
        return;
      }

      // Try loading from Supabase first
      const cachedData = loadGameData();
      if (cachedData.profile) {
        setPlayerName(cachedData.profile.name);
        setSelectedCharacterId((cachedData.profile.characterId || 'agree') as CharacterId);
        camera.setProfilePhoto(cachedData.profile.profilePhoto || null);
        setStoreData(cachedData);

        const savedState = loadSessionState();
        const resumeState = (savedState ?? 'mainMenu') as GameState;
        setGameState(resumeState);
        gameRef.current.state = resumeState;
      }

      loadGameDataFromSupabase(authUser.id)
        .then((supaData) => {
          const data = supaData;

          if (data.profile) {
            setPlayerName(data.profile.name);
            setSelectedCharacterId((data.profile.characterId || 'agree') as CharacterId);
            camera.setProfilePhoto(data.profile.profilePhoto || null);
            setStoreData(data);

            // Restore last resumable state or default to mainMenu
            const savedState = loadSessionState();
            const resumeState = (savedState ?? 'mainMenu') as GameState;
            // Admin can resume to adminDashboard, players to menu screens
            setGameState(resumeState);
            gameRef.current.state = resumeState;
          } else {
            resetForFreshOnboarding();
            setPlayerName(authUser.displayName || authUser.username);
            setGameState('nameEntry');
            gameRef.current.state = 'nameEntry';
          }
        })
        .catch(() => {
          resetForFreshOnboarding();
          setPlayerName(authUser.displayName || authUser.username);
          setGameState('nameEntry');
          gameRef.current.state = 'nameEntry';
        });
      return;
    }

    setActiveStorageUser(null);
    setGameState('login');
    gameRef.current.state = 'login';
  }, [authChecked, authUser, gameState, introReady, resetForFreshOnboarding]);

  const { loadingProgress, introFading } = useIntroLoader(gameState, gameRef, () => {
    setIntroReady(true);
  });

  // ── Sync game-ref state on every React state change ──────────────────
  useEffect(() => {
    gameRef.current.state = gameState;
    // Persist resumable states so the user returns to the same screen on reload
    saveSessionState(gameState);
    if (gameState !== 'playing') {
      gameRef.current.mouse.down = false;
      gameRef.current.keys = {};
      gameRef.current.joysticks.left.active = false;
      gameRef.current.joysticks.left.id = null;
      gameRef.current.joysticks.left.dx = 0;
      gameRef.current.joysticks.left.dy = 0;
      gameRef.current.joysticks.right.active = false;
      gameRef.current.joysticks.right.id = null;
    }
  }, [gameState]);

  // ── Sync dimsum from gameRef to React state ──────────────────────────
  useEffect(() => {
    if (gameState !== 'playing') return;
    const interval = setInterval(() => {
      setDimsumCollected(gameRef.current.dimsumCollected);
      setWeapon(gameRef.current.weapon);
      setPowerUps([...gameRef.current.powerUps]);
    }, 200);
    return () => clearInterval(interval);
  }, [gameState]);

  // ── Physics event handlers (stable refs via useCallback) ────────────
  const onScoreChange = useCallback((s: number) => setScore(s), []);
  const onHealthChange = useCallback((h: number) => setHealth(h), []);
  const onLivesChange = useCallback((l: number) => setLives(l), []);

  const onGameOver = useCallback(() => {
    setGameState('gameover');
    audio.stopBackgroundMusic();
  }, [audio]);

  const onMilestone = useCallback(
    (milestone: number) => {
      // Check if all dimsum collected → level complete
      if (gameRef.current.dimsumCollected >= gameRef.current.dimsumTotal) {
        const timeElapsed = (performance.now() - levelStartTime) / 1000;
        setLevelTimeElapsed(timeElapsed);
        setDimsumCollected(gameRef.current.dimsumCollected);

        // Save progress
        const ticketsBefore = storeData.tickets;
        setPreviousTickets(ticketsBefore);
        const updated = saveLevelProgress(
          storeData,
          currentLevelId,
          gameRef.current.dimsumCollected,
          gameRef.current.dimsumTotal,
          timeElapsed,
        );

        // Add to leaderboard
        const finalData = addToLeaderboard(updated, {
          playerName: playerName.trim(),
          profilePhoto: camera.profilePhoto,
          totalDimsum: updated.totalDimsum,
          levelsCompleted: getCompletedLevels(updated),
          totalStars: getTotalStars(updated),
        });

        setStoreData(finalData);
        setGameState('levelComplete');
        audio.stopBackgroundMusic();
        playSoundEffect(gameRef.current.audio['victory_music']);
        return;
      }

      // Otherwise, standard milestone behavior
      setCurrentWishMilestone(milestone);
      setMilestoneDialogues(buildMilestoneDialogues(playerName.trim(), milestone));
      setMilestoneDialogueIndex(0);
      setGameState('milestoneDialogue');
      audio.stopBackgroundMusic();
    },
    [playerName, audio, levelStartTime, storeData, currentLevelId, camera.profilePhoto],
  );

  const onBirthday = useCallback(() => {
    // Save level progress first
    const timeElapsed = (performance.now() - levelStartTime) / 1000;
    setLevelTimeElapsed(timeElapsed);
    setDimsumCollected(gameRef.current.dimsumCollected);

    const ticketsBefore = storeData.tickets;
    setPreviousTickets(ticketsBefore);
    const updated = saveLevelProgress(
      storeData,
      currentLevelId,
      gameRef.current.dimsumCollected,
      gameRef.current.dimsumTotal,
      timeElapsed,
    );

    const withLeaderboard = addToLeaderboard(updated, {
      playerName: playerName.trim(),
      profilePhoto: camera.profilePhoto,
      totalDimsum: updated.totalDimsum,
      levelsCompleted: getCompletedLevels(updated),
      totalStars: getTotalStars(updated),
    });

    // Save birthday greeting as a reward in mysteryBoxRewards
    const finalData = addBirthdayReward(withLeaderboard, playerName.trim(), wishes);

    setStoreData(finalData);
    setGameState('birthday');
    audio.stopBackgroundMusic();
    playSoundEffect(gameRef.current.audio['victory_music']);
  }, [audio, levelStartTime, storeData, currentLevelId, playerName, camera.profilePhoto, wishes]);

  const onDimsumCollected = useCallback(
    (collected: number, total: number) => {
      setDimsumCollected(collected);
      setDimsumTotal(total);
    },
    [],
  );

  const onLevelComplete = useCallback(() => {
    const timeElapsed = (performance.now() - levelStartTime) / 1000;
    setLevelTimeElapsed(timeElapsed);
    setDimsumCollected(gameRef.current.dimsumCollected);

    const ticketsBefore = storeData.tickets;
    setPreviousTickets(ticketsBefore);
    const updated = saveLevelProgress(
      storeData,
      currentLevelId,
      gameRef.current.dimsumCollected,
      gameRef.current.dimsumTotal,
      timeElapsed,
    );

    const finalData = addToLeaderboard(updated, {
      playerName: playerName.trim(),
      profilePhoto: camera.profilePhoto,
      totalDimsum: updated.totalDimsum,
      levelsCompleted: getCompletedLevels(updated),
      totalStars: getTotalStars(updated),
    });

    setStoreData(finalData);
    setGameState('levelComplete');
    audio.stopBackgroundMusic();
    playSoundEffect(gameRef.current.audio['victory_music']);
  }, [audio, levelStartTime, storeData, currentLevelId, playerName, camera.profilePhoto]);

  // ── Game loop ────────────────────────────────────────────────────────
  useGameLoop(canvasRef, gameRef, {
    onScoreChange,
    onHealthChange,
    onLivesChange,
    onGameOver,
    onMilestone,
    onBirthday,
    onDimsumCollected,
    onLevelComplete,
  });

  // ── Transition helpers ───────────────────────────────────────────────
  const continueFromName = () => {
    const trimmed = playerName.trim();
    if (!trimmed) return;
    if (trimmed !== playerName) setPlayerName(trimmed);

    // If editing from settings (profile already exists), save and go back to menu
    if (storeData.profile) {
      const updated = saveProfile(storeData, {
        ...storeData.profile,
        name: trimmed,
      });
      setStoreData(updated);
      if (authUser) {
        saveFullGameDataToSupabase(authUser.id, updated).catch(console.error);
      }
      setGameState('mainMenu');
      gameRef.current.state = 'mainMenu';
      return;
    }

    setGameState('photoCapture');
    gameRef.current.state = 'photoCapture';
  };

  const startGame = () => {
    if (!playerName.trim()) return;
    if (!camera.profilePhoto) {
      camera.setCameraError('Take a photo before continuing.');
      return;
    }

    // If editing photo from settings (profile already exists), save and return to menu
    if (storeData.profile) {
      const updated = saveProfile(storeData, {
        ...storeData.profile,
        profilePhoto: camera.profilePhoto,
      });
      setStoreData(updated);
      if (authUser) {
        saveFullGameDataToSupabase(authUser.id, updated).catch(console.error);
      }
      setGameState('mainMenu');
      gameRef.current.state = 'mainMenu';
      return;
    }

    setGameState('characterSelect');
    gameRef.current.state = 'characterSelect';
  };

  const goToMainMenu = () => {
    // Save profile to localStorage
    const updated = saveProfile(storeData, {
      name: playerName.trim(),
      profilePhoto: camera.profilePhoto,
      characterId: selectedCharacterId,
      createdAt: Date.now(),
    });
    setStoreData(updated);
    setGameState('mainMenu');
    gameRef.current.state = 'mainMenu';

    // Immediately persist to Supabase (profile + avatar + all game data)
    if (authUser) {
      saveFullGameDataToSupabase(authUser.id, updated).catch(console.error);
    }
  };

  const startLevel = (levelId: number) => {
    const level = getLevelById(levelId);
    if (!level) return;

    setCurrentLevelId(levelId);
    setDimsumCollected(0);
    setDimsumTotal(level.dimsumCount);
    setScore(0);
    setHealth(GAME_CONFIG.playerMaxHealth);
    setLives(GAME_CONFIG.playerLives);
    setWeapon('default');
    setPowerUps([]);
    setCurrentWishMilestone(0);
    setWishes([]);

    // Configure game snapshot for this level
    resetGameSnapshot(gameRef.current);
    gameRef.current.dimsumCollected = 0;
    gameRef.current.dimsumTotal = level.dimsumCount;
    gameRef.current.currentLevelId = levelId;

    // Set player at map centre
    gameRef.current.player.x = level.mapWidth / 2;
    gameRef.current.player.y = level.mapHeight / 2;

    // Set character sprite
    const charFrontKey = `char_${selectedCharacterId}_front`;
    if (gameRef.current.images[charFrontKey]) {
      gameRef.current.images.trooper_character = gameRef.current.images[charFrontKey];
    }

    setLevelStartTime(performance.now());
    gameRef.current.levelStartTime = performance.now();

    // Go to battle loading screen first (countdown before gameplay)
    setGameState('battleLoading');
  };

  const onBattleReady = useCallback(() => {
    setGameState('playing');
    gameRef.current.state = 'playing';
    audio.startBackgroundMusic();
  }, [audio]);

  const beginGameplay = () => {
    const trimmed = playerName.trim();
    if (!trimmed) return;
    if (trimmed !== playerName) setPlayerName(trimmed);
    startLevel(currentLevelId);
  };

  const nextDialogue = () => {
    if (dialogueIndex < dialogueMessages.length - 1) {
      setDialogueIndex((i) => i + 1);
      return;
    }
    beginGameplay();
  };

  const nextMilestoneDialogue = () => {
    if (milestoneDialogueIndex < milestoneDialogues.length - 1) {
      setMilestoneDialogueIndex((i) => i + 1);
      return;
    }
    setGameState('wish');
    gameRef.current.state = 'wish';
  };

  const submitWish = () => {
    const trimmed = wishInput.trim();
    if (trimmed.length < 3) return;
    setWishes((prev) => [...prev, trimmed]);
    setWishInput('');
    setGameState('playing');
    gameRef.current.state = 'playing';
    audio.startBackgroundMusic();
  };

  const handleLevelComplete_NextLevel = () => {
    const nextId = currentLevelId + 1;
    if (nextId <= LEVELS.length) {
      startLevel(nextId);
    } else {
      setGameState('mainMenu');
    }
  };

  const handleLevelComplete_Retry = () => {
    startLevel(currentLevelId);
  };

  const handleLevelComplete_Menu = () => {
    setGameState('mainMenu');
    gameRef.current.state = 'mainMenu';
    audio.stopBackgroundMusic();
  };

  const restartGame = () => {
    resetGameSnapshot(gameRef.current);
    setScore(0);
    setHealth(GAME_CONFIG.playerMaxHealth);
    setLives(GAME_CONFIG.playerLives);
    setWeapon('default');
    setPowerUps([]);
    setCurrentWishMilestone(0);
    setWishes([]);
    setWishInput('');
    setDialogueIndex(0);
    setMilestoneDialogueIndex(0);
    setMilestoneDialogues([]);
    setDimsumCollected(0);
    setDimsumTotal(0);

    if (storeData.profile) {
      setGameState('mainMenu');
    } else {
      setSelectedCharacterId('agree');
      setGameState('nameEntry');
      camera.setProfilePhoto(null);
      camera.setCameraError('');
    }

    audio.stopBackgroundMusic();
    audio.stopVictoryMusic();
  };

  const fullRestart = () => {
    setSelectedCharacterId('agree');
    setPlayerName('');
    camera.setProfilePhoto(null);
    camera.setCameraError('');
    setGameState('nameEntry');
    gameRef.current.state = 'nameEntry';
    audio.stopBackgroundMusic();
    audio.stopVictoryMusic();
  };

  // ── Auth handlers ──────────────────────────────────────────────────
  const handleLoginSuccess = (user: AuthUser) => {
    setAuthUser(user);
    setActiveStorageUser(user.id);

    // Fast path: show user-scoped cached data instantly (if available)
    const cachedData = loadGameData();
    if (cachedData.profile) {
      setPlayerName(cachedData.profile.name);
      setSelectedCharacterId((cachedData.profile.characterId || 'agree') as CharacterId);
      camera.setProfilePhoto(cachedData.profile.profilePhoto || null);
      setStoreData(cachedData);
      setGameState('mainMenu');
      gameRef.current.state = 'mainMenu';
    }

    // Load data from Supabase first
    loadGameDataFromSupabase(user.id)
      .then((supaData) => {
        const data = supaData;
        if (data.profile) {
          setPlayerName(data.profile.name);
          setSelectedCharacterId((data.profile.characterId || 'agree') as CharacterId);
          camera.setProfilePhoto(data.profile.profilePhoto || null);
          setStoreData(data);
          setGameState('mainMenu');
          gameRef.current.state = 'mainMenu';
        } else {
          resetForFreshOnboarding();
          setPlayerName(user.displayName || user.username);
          setGameState('nameEntry');
          gameRef.current.state = 'nameEntry';
        }
      })
      .catch(() => {
        resetForFreshOnboarding();
        setPlayerName(user.displayName || user.username);
        setGameState('nameEntry');
        gameRef.current.state = 'nameEntry';
      });
  };

  // Signup always goes through onboarding: nameEntry → photoCapture → tutorial → mainMenu
  const handleSignupSuccess = (user: AuthUser) => {
    setAuthUser(user);
    setActiveStorageUser(user.id);
    resetForFreshOnboarding();
    setPlayerName(user.displayName || user.username);
    setGameState('nameEntry');
    gameRef.current.state = 'nameEntry';
  };

  // Settings: edit profile handlers
  const handleEditProfile = () => {
    setGameState('nameEntry');
    gameRef.current.state = 'nameEntry';
  };

  const handleEditPhoto = () => {
    setGameState('photoCapture');
    gameRef.current.state = 'photoCapture';
  };

  const handleReplayTutorial = () => {
    setGameState('tutorial');
    gameRef.current.state = 'tutorial';
  };

  const handleLogout = async () => {
    await logout();
    clearSessionState();
    setActiveStorageUser(null);
    setAuthUser(null);
    resetForFreshOnboarding();
    setPlayerName('');
    setGameState('login');
    gameRef.current.state = 'login';
  };

  // ── Sync full game data to Supabase (debounced — longer debounce reduces battery/network) ──
  useEffect(() => {
    if (!authUser || !storeData.profile) return;

    // Debounce 800ms: faster than user can navigate away, but reduces write frequency
    const syncTimeout = setTimeout(() => {
      saveFullGameDataToSupabase(authUser.id, storeData).catch(console.error);
    }, 800);

    return () => clearTimeout(syncTimeout);
  }, [authUser, storeData]);

  useEffect(() => {
    storeDataRef.current = storeData;
  }, [storeData]);

  // ── Lightweight change detection (avoids full JSON.stringify on every poll) ──
  const storeHashRef = useRef('');
  useEffect(() => {
    // Cheap hash: concatenate key scalar values instead of full serialization
    const d = storeData;
    storeHashRef.current = `${d.totalDimsum}|${d.tickets}|${d.ticketsUsed}|${d.inventory.length}|${d.mysteryBoxRewards.length}|${d.redeemedCodes.length}|${Object.keys(d.levels).length}|${d.profile?.name ?? ''}|${d.profile?.characterId ?? ''}`;
  }, [storeData]);

  // ── Realtime user data sync (profile, stats, boxes, inventory, vouchers) ──
  useEffect(() => {
    if (!authUser) return;

    const scheduleReload = () => {
      if (realtimeSyncTimeoutRef.current) {
        clearTimeout(realtimeSyncTimeoutRef.current);
      }

      realtimeSyncTimeoutRef.current = window.setTimeout(() => {
        if (userRealtimeReloadingRef.current) return;
        userRealtimeReloadingRef.current = true;
        loadGameDataFromSupabase(authUser.id)
          .then((fresh) => {
            if (!fresh?.profile) return;

            // Cheap hash comparison — avoids full JSON.stringify per sync
            const freshHash = `${fresh.totalDimsum}|${fresh.tickets}|${fresh.ticketsUsed}|${fresh.inventory.length}|${fresh.mysteryBoxRewards.length}|${fresh.redeemedCodes.length}|${Object.keys(fresh.levels).length}|${fresh.profile?.name ?? ''}|${fresh.profile?.characterId ?? ''}`;
            if (freshHash === storeHashRef.current) return;

            setStoreData(fresh);
            setPlayerName(fresh.profile.name);
            setSelectedCharacterId((fresh.profile.characterId || 'agree') as CharacterId);
            camera.setProfilePhoto(fresh.profile.profilePhoto || null);
          })
          .catch(() => {
            // Keep current in-memory state on transient failures
          })
          .finally(() => {
            userRealtimeReloadingRef.current = false;
          });
      }, 150);
    };

    // Fallback polling — 15s (reduced from 7s to save battery/network on mobile)
    // Realtime channel handles most updates; polling is just a safety net.
    const POLL_INTERVAL_MS = 15000;
    const pollInterval = window.setInterval(() => {
      scheduleReload();
    }, POLL_INTERVAL_MS);

    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === 'visible') {
        scheduleReload();
      }
    };

    window.addEventListener('focus', handleVisibilityOrFocus);
    window.addEventListener('online', handleVisibilityOrFocus);
    document.addEventListener('visibilitychange', handleVisibilityOrFocus);

    // Initial background sync after auth is ready.
    scheduleReload();

    const channel = supabase
      .channel(`user-realtime:${authUser.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'profiles',
        filter: `id=eq.${authUser.id}`,
      }, scheduleReload)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'level_progress',
        filter: `user_id=eq.${authUser.id}`,
      }, scheduleReload)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'inventory',
        filter: `user_id=eq.${authUser.id}`,
      }, scheduleReload)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'mystery_boxes',
        filter: `assigned_to=eq.${authUser.id}`,
      }, scheduleReload)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'voucher_redemptions',
        filter: `user_id=eq.${authUser.id}`,
      }, scheduleReload)
      .subscribe();

    return () => {
      clearInterval(pollInterval);
      window.removeEventListener('focus', handleVisibilityOrFocus);
      window.removeEventListener('online', handleVisibilityOrFocus);
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
      if (realtimeSyncTimeoutRef.current) {
        clearTimeout(realtimeSyncTimeoutRef.current);
        realtimeSyncTimeoutRef.current = null;
      }
      supabase.removeChannel(channel);
    };
  }, [authUser, camera]);

  // ── Render ───────────────────────────────────────────────────────────
  return (
    <div className="relative w-full h-[100dvh] overflow-hidden bg-black text-white font-sans touch-none">
      {/* Canvas (always mounted so the game loop ref stays alive) */}
      <canvas ref={canvasRef} className="absolute inset-0 block" />

      {/* ── Intro (no transition — has own fade) ──────────────────────── */}
      {gameState === 'intro' && (
        <IntroScreen loadingProgress={loadingProgress} fading={introFading} />
      )}

      {/* ── Signup ────────────────────────────────────────────────────── */}
      <ScreenTransition show={gameState === 'signup'} type="fade" duration={200}>
        <SignupScreen
          onSignupSuccess={handleSignupSuccess}
          onGoToLogin={() => {
            setGameState('login');
            gameRef.current.state = 'login';
          }}
          onGoToAdminLogin={() => {
            setGameState('adminDashboard');
            gameRef.current.state = 'adminDashboard';
          }}
        />
      </ScreenTransition>

      {/* ── Login ──────────────────────────────────────────────────────── */}
      <ScreenTransition show={gameState === 'login'} type="fade" duration={200}>
        <LoginScreen
          onLoginSuccess={handleLoginSuccess}
          onGoToSignup={() => {
            setGameState('signup');
            gameRef.current.state = 'signup';
          }}
          onGoToAdminLogin={() => {
            setGameState('adminDashboard');
            gameRef.current.state = 'adminDashboard';
          }}
        />
      </ScreenTransition>

      {/* ── Admin Dashboard ────────────────────────────────────────────── */}
      <ScreenTransition show={gameState === 'adminDashboard'} type="slide-left" duration={250}>
        <AdminDashboard
          onBack={() => {
            setGameState('login');
            gameRef.current.state = 'login';
          }}
        />
      </ScreenTransition>

      {/* ── Name Entry ───────────────────────────────────────────────── */}
      <ScreenTransition show={gameState === 'nameEntry'} type="slide-left" duration={220}>
        <NameEntryScreen
          playerName={playerName}
          onChange={setPlayerName}
          onSubmit={continueFromName}
        />
      </ScreenTransition>

      {/* ── Photo Capture ────────────────────────────────────────────── */}
      <ScreenTransition show={gameState === 'photoCapture'} type="slide-left" duration={220}>
        <PhotoCaptureScreen
          playerName={playerName}
          profilePhoto={camera.profilePhoto}
          videoRef={camera.videoRef}
          captureCanvasRef={camera.captureCanvasRef}
          cameraReady={camera.cameraReady}
          cameraError={camera.cameraError}
          onCapture={camera.capturePhoto}
          onRetake={() => camera.setProfilePhoto(null)}
          onContinue={startGame}
        />
      </ScreenTransition>

      {/* ── Character Select ─────────────────────────────────────────── */}
      <ScreenTransition show={gameState === 'characterSelect'} type="scale" duration={250}>
        <CharacterSelectScreen
          selectedId={selectedCharacterId}
          onSelect={setSelectedCharacterId}
          onContinue={() => {
            hapticMedium();
            // First time → tutorial, returning → main menu
            if (!storeData.profile) {
              setGameState('tutorial');
              gameRef.current.state = 'tutorial';
            } else {
              goToMainMenu();
            }
          }}
        />
      </ScreenTransition>

      {/* ── Tutorial ─────────────────────────────────────────────────── */}
      <ScreenTransition show={gameState === 'tutorial'} type="slide-left" duration={250}>
        <TutorialScreen
          onContinue={() => {
            goToMainMenu();
          }}
        />
      </ScreenTransition>

      {/* ── Main Menu (Hub) ──────────────────────────────────────────── */}
      <ScreenTransition show={gameState === 'mainMenu'} type="fade" duration={200}>
        <MainMenuScreen
          storeData={storeData}
          playerName={playerName}
          profilePhoto={camera.profilePhoto}
          characterImage={selectedCharacter.image}
          onPlay={() => {
            hapticMedium();
            setGameState('levelSelect');
            gameRef.current.state = 'levelSelect';
          }}
          onLeaderboard={() => {
            setGameState('leaderboard');
            gameRef.current.state = 'leaderboard';
          }}
          onInventory={() => {
            setGameState('inventory');
            gameRef.current.state = 'inventory';
          }}
          onMysteryBox={() => {
            setGameState('mysteryBox');
            gameRef.current.state = 'mysteryBox';
          }}
          onSettings={() => {
            setGameState('settings');
            gameRef.current.state = 'settings';
          }}
          onChangeCharacter={() => {
            setGameState('characterSelect');
            gameRef.current.state = 'characterSelect';
          }}
        />
      </ScreenTransition>

      {/* ── Level Select ─────────────────────────────────────────────── */}
      <ScreenTransition show={gameState === 'levelSelect'} type="slide-left" duration={250}>
        <LevelSelectScreen
          storeData={storeData}
          onSelectLevel={(levelId) => {
            hapticMedium();
            setCurrentLevelId(levelId);
            setDialogueIndex(0);
            // Quick start: skip dialogue for replayed levels
            const hasPlayed = storeData.levels[levelId]?.completed;
            if (hasPlayed) {
              startLevel(levelId);
            } else {
              setGameState('dialogue');
              gameRef.current.state = 'dialogue';
            }
          }}
          onBack={() => {
            setGameState('mainMenu');
            gameRef.current.state = 'mainMenu';
          }}
        />
      </ScreenTransition>

      {/* ── Leaderboard ──────────────────────────────────────────────── */}
      <ScreenTransition show={gameState === 'leaderboard'} type="slide-left" duration={250}>
        <LeaderboardScreen
          storeData={storeData}
          userId={authUser?.id}
          onBack={() => {
            setGameState('mainMenu');
            gameRef.current.state = 'mainMenu';
          }}
        />
      </ScreenTransition>

      {/* ── Inventory ────────────────────────────────────────────────── */}
      <ScreenTransition show={gameState === 'inventory'} type="slide-left" duration={250}>
        <InventoryScreen
          storeData={storeData}
          userId={authUser?.id}
          onBack={() => {
            setGameState('mainMenu');
            gameRef.current.state = 'mainMenu';
          }}
          onDataChange={(updated) => setStoreData(updated)}
        />
      </ScreenTransition>

      {/* ── Mystery Box ──────────────────────────────────────────────── */}
      <ScreenTransition show={gameState === 'mysteryBox'} type="slide-up" duration={280}>
        <MysteryBoxScreen
          storeData={storeData}
          onDataChange={setStoreData}
          onBack={() => {
            setGameState('mainMenu');
            gameRef.current.state = 'mainMenu';
          }}
          onSpinWheel={() => {
            hapticSuccess();
            setGameState('spinWheel');
            gameRef.current.state = 'spinWheel';
          }}
          userId={authUser?.id}
        />
      </ScreenTransition>

      {/* ── Spin Wheel ─────────────────────────────────────────────── */}
      <ScreenTransition show={gameState === 'spinWheel'} type="scale" duration={300}>
        <SpinWheelScreen
          storeData={storeData}
          onDataChange={setStoreData}
          userId={authUser?.id}
          onBack={() => {
            setGameState('mainMenu');
            gameRef.current.state = 'mainMenu';
          }}
        />
      </ScreenTransition>

      {/* ── Settings ─────────────────────────────────────────────────── */}
      <ScreenTransition show={gameState === 'settings'} type="slide-left" duration={250}>
        <SettingsScreen
          storeData={storeData}
          onDataChange={setStoreData}
          onBack={() => {
            setGameState('mainMenu');
            gameRef.current.state = 'mainMenu';
          }}
          onResetComplete={fullRestart}
          onLogout={handleLogout}
          gameUserId={authUser?.gameUserId}
          playerName={playerName}
          profilePhoto={camera.profilePhoto}
          onEditProfile={handleEditProfile}
          onEditPhoto={handleEditPhoto}
          onReplayTutorial={handleReplayTutorial}
        />
      </ScreenTransition>

      {/* ── Opening Dialogue ─────────────────────────────────────────── */}
      <ScreenTransition show={gameState === 'dialogue'} type="fade" duration={200}>
        <DialogueScreen
          messages={dialogueMessages}
          currentIndex={dialogueIndex}
          playerName={playerName}
          profilePhoto={camera.profilePhoto}
          characterImage={selectedCharacter.image}
          characterName={selectedCharacter.name}
          onNext={nextDialogue}
          finalLabel="Start Level"
          zIndex={70}
        />
      </ScreenTransition>

      {/* ── Milestone Dialogue ───────────────────────────────────────── */}
      <ScreenTransition show={gameState === 'milestoneDialogue' && milestoneDialogues.length > 0} type="fade" duration={200}>
        <DialogueScreen
          messages={milestoneDialogues}
          currentIndex={milestoneDialogueIndex}
          playerName={playerName}
          profilePhoto={camera.profilePhoto}
          characterImage={selectedCharacter.image}
          characterName={selectedCharacter.name}
          onNext={nextMilestoneDialogue}
          finalLabel="Continue"
          zIndex={72}
        />
      </ScreenTransition>

      {/* ── Battle Loading Screen ──────────────────────────────────── */}
      <ScreenTransition show={gameState === 'battleLoading'} type="fade" duration={200}>
        <BattleLoadingScreen
          levelName={currentLevel?.name || 'Unknown'}
          levelNumber={currentLevelId}
          dimsumCount={dimsumTotal}
          characterImage={selectedCharacter.image}
          characterName={selectedCharacter.name}
          onReady={onBattleReady}
        />
      </ScreenTransition>

      {/* ── Playing HUD ──────────────────────────────────────────────── */}
      {gameState === 'playing' && (
        <GameHUD
          score={score}
          health={health}
          lives={lives}
          weapon={weapon}
          powerUps={powerUps}
          playerName={playerName}
          profilePhoto={camera.profilePhoto}
          characterImage={selectedCharacter.image}
          characterName={selectedCharacter.name}
          dimsumCollected={dimsumCollected}
          dimsumTotal={dimsumTotal}
          levelName={currentLevel?.name}
          onPause={() => {
            setGamePaused(true);
            gameRef.current.paused = true;
          }}
        />
      )}

      {/* ── Pause Menu Overlay ───────────────────────────────────────── */}
      {gamePaused && gameState === 'playing' && (
        <GamePauseMenu
          currentCharacterId={selectedCharacterId}
          soundEnabled={soundEnabled}
          musicEnabled={musicEnabled}
          onResume={() => {
            setGamePaused(false);
            gameRef.current.paused = false;
          }}
          onToggleSound={(enabled) => setSoundEnabled(enabled)}
          onToggleMusic={(enabled) => {
            setMusicEnabled(enabled);
            if (!enabled) {
              audio.stopBackgroundMusic();
            } else {
              audio.startBackgroundMusic();
            }
          }}
          onChangeCharacter={(charId) => {
            setSelectedCharacterId(charId as CharacterId);
            if (storeData.profile) {
              const updatedProfile = { ...storeData.profile, characterId: charId };
              const updatedData = saveProfile(storeData, updatedProfile);
              setStoreData(updatedData);
            }
          }}
          onExitToMenu={() => {
            setGamePaused(false);
            gameRef.current.paused = false;
            setGameState('mainMenu');
            gameRef.current.state = 'mainMenu';
            audio.stopBackgroundMusic();
          }}
        />
      )}

      {/* ── Wish ─────────────────────────────────────────────────────── */}
      <ScreenTransition show={gameState === 'wish'} type="slide-up" duration={250}>
        <WishScreen
          milestone={currentWishMilestone}
          wishInput={wishInput}
          onWishChange={setWishInput}
          onSubmit={submitWish}
        />
      </ScreenTransition>

      {/* ── Game Over ────────────────────────────────────────────────── */}
      <ScreenTransition show={gameState === 'gameover'} type="scale" duration={300}>
        <GameOverScreen
          score={score}
          dimsumCollected={dimsumCollected}
          dimsumTotal={dimsumTotal}
          onRestart={() => startLevel(currentLevelId)}
          onMenu={() => {
            setGameState('mainMenu');
            gameRef.current.state = 'mainMenu';
            audio.stopBackgroundMusic();
          }}
        />
      </ScreenTransition>

      {/* ── Level Complete ────────────────────────────────────────────── */}
      <ScreenTransition show={gameState === 'levelComplete' && !!currentLevel} type="scale" duration={300}>
        {currentLevel && (
          <LevelCompleteScreen
            levelConfig={currentLevel}
            dimsumCollected={dimsumCollected}
            timeTaken={Math.floor(levelTimeElapsed)}
            previousBest={storeData.levels[currentLevelId]?.bestTime ?? 0}
            ticketEarned={storeData.tickets > previousTickets}
            onNextLevel={handleLevelComplete_NextLevel}
            onRetry={handleLevelComplete_Retry}
            onMenu={handleLevelComplete_Menu}
            hasNextLevel={currentLevelId < LEVELS.length}
          />
        )}
      </ScreenTransition>

      {/* ── Birthday / Victory ─────────────────────────────────────────── */}
      <ScreenTransition show={gameState === 'birthday'} type="scale" duration={350}>
        <BirthdayScreen
          playerName={playerName}
          wishes={wishes}
          dimsumCollected={storeData.totalDimsum}
          onPlayAgain={restartGame}
          onViewRewards={() => {
            setGameState('inventory');
          }}
          onMenu={() => {
            setGameState('mainMenu');
            gameRef.current.state = 'mainMenu';
          }}
        />
      </ScreenTransition>
    </div>
  );
}

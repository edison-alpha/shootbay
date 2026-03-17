import { useEffect, useState } from 'react';
import { loadGameData, saveGameData, type GameStoreData } from '../store/gameStore';
import * as profileService from '../services/profileService';
import * as levelService from '../services/levelService';
import * as statsService from '../services/statsService';
import * as leaderboardService from '../services/leaderboardService';

export function useSupabaseSync() {
  const [profileId, setProfileId] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    // Load profile ID from localStorage
    const data = loadGameData();
    if (data.profile) {
      // Check if we have a Supabase profile ID stored
      const storedProfileId = localStorage.getItem('supabase_profile_id');
      setProfileId(storedProfileId);
    }
  }, []);

  const syncProfile = async (data: GameStoreData) => {
    if (!data.profile) return;

    setSyncing(true);
    try {
      if (!profileId) {
        // Create new profile
        const result = await profileService.createProfile(data.profile);
        if (result.success && result.profileId) {
          localStorage.setItem('supabase_profile_id', result.profileId);
          setProfileId(result.profileId);
        }
      } else {
        // Update existing profile
        await profileService.updateProfile(profileId, data.profile);
      }
    } finally {
      setSyncing(false);
    }
  };

  const syncLevelProgress = async (
    levelId: number,
    dimsumCollected: number,
    dimsumTotal: number,
    timeSeconds: number,
    stars: number
  ) => {
    if (!profileId) return;

    setSyncing(true);
    try {
      await levelService.saveLevelProgress(
        profileId,
        levelId,
        dimsumCollected,
        dimsumTotal,
        timeSeconds,
        stars
      );
    } finally {
      setSyncing(false);
    }
  };

  const syncLeaderboard = async (playerName: string, profilePhoto: string | null) => {
    if (!profileId) return;

    setSyncing(true);
    try {
      await leaderboardService.updateLeaderboard(profileId, playerName, profilePhoto);
    } finally {
      setSyncing(false);
    }
  };

  const syncSettings = async (settings: GameStoreData['settings']) => {
    if (!profileId) return;

    setSyncing(true);
    try {
      await statsService.updateSettings(profileId, {
        musicVolume: settings.musicVolume,
        sfxVolume: settings.sfxVolume,
        vibration: settings.vibration,
        language: settings.language,
      });
    } finally {
      setSyncing(false);
    }
  };

  return {
    profileId,
    syncing,
    syncProfile,
    syncLevelProgress,
    syncLeaderboard,
    syncSettings,
  };
}

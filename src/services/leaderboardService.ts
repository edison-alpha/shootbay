// @ts-nocheck
import { supabase } from '../lib/supabase';
import type { LeaderboardEntry } from '../store/gameStore';

export async function updateLeaderboard(profileId: string, playerName: string, profilePhoto: string | null) {
  try {
    // Get player stats
    const { data: stats } = await supabase
      .from('player_stats')
      .select('total_dimsum')
      .eq('profile_id', profileId)
      .single();

    // Get level progress
    const { data: levels } = await supabase
      .from('level_progress')
      .select('stars, completed')
      .eq('profile_id', profileId);

    const totalDimsum = stats?.total_dimsum || 0;
    const levelsCompleted = levels?.filter(l => l.completed).length || 0;
    const totalStars = levels?.reduce((sum, l) => sum + l.stars, 0) || 0;

    // Check if entry exists
    const { data: existing } = await supabase
      .from('leaderboard')
      .select('*')
      .eq('profile_id', profileId)
      .single();

    if (existing) {
      // Update
      const { error } = await supabase
        .from('leaderboard')
        .update({
          player_name: playerName,
          profile_photo: profilePhoto,
          total_dimsum: totalDimsum,
          levels_completed: levelsCompleted,
          total_stars: totalStars,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id);

      if (error) throw error;
    } else {
      // Insert
      const { error } = await supabase
        .from('leaderboard')
        .insert({
          profile_id: profileId,
          player_name: playerName,
          profile_photo: profilePhoto,
          total_dimsum: totalDimsum,
          levels_completed: levelsCompleted,
          total_stars: totalStars,
        });

      if (error) throw error;
    }

    return { success: true };
  } catch (error) {
    console.error('Error updating leaderboard:', error);
    return { success: false, error: (error as Error).message };
  }
}

export async function getLeaderboard(limit: number = 50) {
  try {
    const { data, error } = await supabase
      .from('leaderboard')
      .select('*')
      .order('total_dimsum', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return { success: true, data: data || [] };
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    return { success: false, error: (error as Error).message };
  }
}

export async function getPlayerRank(profileId: string) {
  try {
    const { data: allPlayers } = await supabase
      .from('leaderboard')
      .select('profile_id, total_dimsum')
      .order('total_dimsum', { ascending: false });

    if (!allPlayers) return { success: false, error: 'No data' };

    const rank = allPlayers.findIndex(p => p.profile_id === profileId) + 1;
    return { success: true, rank };
  } catch (error) {
    console.error('Error fetching player rank:', error);
    return { success: false, error: (error as Error).message };
  }
}

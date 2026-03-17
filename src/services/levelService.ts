// @ts-nocheck
import { supabase } from '../lib/supabase';

export async function saveLevelProgress(
  userId: string,
  levelId: number,
  dimsumCollected: number,
  dimsumTotal: number,
  timeSeconds: number,
  stars: number
) {
  try {
    // Check if level progress exists
    const { data: existing } = await supabase
      .from('level_progress')
      .select('*')
      .eq('user_id', userId)
      .eq('level_id', levelId)
      .single();

    if (existing) {
      // Update if better
      const bestDimsum = Math.max(existing.dimsum_collected, dimsumCollected);
      const bestStars = Math.max(existing.stars, stars);
      const bestTime = existing.best_time > 0 ? Math.min(existing.best_time, timeSeconds) : timeSeconds;

      const { error } = await supabase
        .from('level_progress')
        .update({
          dimsum_collected: bestDimsum,
          stars: bestStars,
          best_time: bestTime,
          completed: true,
        } as never)
        .eq('id', existing.id);

      if (error) throw error;
    } else {
      // Insert new
      const { error } = await supabase
        .from('level_progress')
        .insert({
          user_id: userId,
          level_id: levelId,
          dimsum_collected: dimsumCollected,
          dimsum_total: dimsumTotal,
          stars,
          best_time: timeSeconds,
          completed: true,
        } as never);

      if (error) throw error;
    }

    // Update profile stats
    await updatePlayerStats(userId);

    return { success: true };
  } catch (error) {
    console.error('Error saving level progress:', error);
    return { success: false, error: (error as Error).message };
  }
}

export async function getLevelProgress(userId: string, levelId: number) {
  try {
    const { data, error } = await supabase
      .from('level_progress')
      .select('*')
      .eq('user_id', userId)
      .eq('level_id', levelId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Error fetching level progress:', error);
    return { success: false, error: (error as Error).message };
  }
}

export async function getAllLevelProgress(userId: string) {
  try {
    const { data, error } = await supabase
      .from('level_progress')
      .select('*')
      .eq('user_id', userId)
      .order('level_id', { ascending: true });

    if (error) throw error;
    return { success: true, data: data || [] };
  } catch (error) {
    console.error('Error fetching all level progress:', error);
    return { success: false, error: (error as Error).message };
  }
}

async function updatePlayerStats(userId: string) {
  try {
    // Calculate total dimsum from all levels
    const { data: levels } = await supabase
      .from('level_progress')
      .select('dimsum_collected, stars, completed')
      .eq('user_id', userId);

    const totalDimsum = levels?.reduce((sum, l) => sum + l.dimsum_collected, 0) || 0;
    const totalStars = levels?.reduce((sum, l) => sum + l.stars, 0) || 0;
    const levelsCompleted = levels?.filter(l => l.completed).length || 0;

    // Update profile
    await supabase
      .from('profiles')
      .update({
        total_dimsum: totalDimsum,
        total_stars: totalStars,
        levels_completed: levelsCompleted,
      } as never)
      .eq('id', userId);

    return { success: true };
  } catch (error) {
    console.error('Error updating player stats:', error);
    return { success: false, error: (error as Error).message };
  }
}

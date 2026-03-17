// @ts-nocheck
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { LeaderboardEntry } from '../store/gameStore';

export function useRealtimeLeaderboard(limit: number = 50) {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Initial fetch
    fetchLeaderboard();

    // Subscribe to changes
    const channel = supabase
      .channel('leaderboard-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'leaderboard',
        },
        () => {
          fetchLeaderboard();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [limit]);

  const fetchLeaderboard = async () => {
    try {
      const { data, error } = await supabase
        .from('leaderboard')
        .select('*')
        .order('total_dimsum', { ascending: false })
        .limit(limit);

      if (error) throw error;

      const entries: LeaderboardEntry[] = (data || []).map((row) => ({
        playerName: row.player_name,
        profilePhoto: row.profile_photo,
        totalDimsum: row.total_dimsum,
        levelsCompleted: row.levels_completed,
        totalStars: row.total_stars,
        timestamp: new Date(row.created_at).getTime(),
      }));

      setLeaderboard(entries);
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  return { leaderboard, loading, refresh: fetchLeaderboard };
}

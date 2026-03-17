import { useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { invalidate, CK } from '../lib/queryCache';

/**
 * Hook for realtime mystery box updates
 * 
 * Subscribes to Postgres changes on mystery_boxes table for the current user.
 * Automatically invalidates cache when boxes are created, updated, or deleted.
 * 
 * Benefits:
 * - Instant updates when admin assigns new box
 * - No manual refresh needed
 * - Better UX with real-time data
 */
export function useMysteryBoxRealtime(userId: string | undefined) {
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`mystery_boxes:${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'mystery_boxes',
          filter: `assigned_to=eq.${userId}`,
        },
        (payload) => {
          console.log('Mystery box realtime update:', payload);
          
          // Invalidate cache to trigger refetch
          invalidate(CK.userMysteryBoxes(userId));
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('Mystery box realtime: subscribed');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('Mystery box realtime: channel error');
        } else if (status === 'TIMED_OUT') {
          console.error('Mystery box realtime: timed out');
        }
      });

    return () => {
      console.log('Mystery box realtime: unsubscribing');
      supabase.removeChannel(channel);
    };
  }, [userId]);
}

// @ts-nocheck
import { supabase } from '../lib/supabase';

export async function getPlayerStats(profileId: string) {
  try {
    const { data, error } = await supabase
      .from('player_stats')
      .select('*')
      .eq('profile_id', profileId)
      .single();

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Error fetching player stats:', error);
    return { success: false, error: (error as Error).message };
  }
}

export async function updateSettings(
  profileId: string,
  settings: {
    musicVolume?: number;
    sfxVolume?: number;
    vibration?: boolean;
    language?: string;
  }
) {
  try {
    const { error } = await supabase
      .from('player_stats')
      .update({
        music_volume: settings.musicVolume,
        sfx_volume: settings.sfxVolume,
        vibration: settings.vibration,
        language: settings.language,
        updated_at: new Date().toISOString(),
      })
      .eq('profile_id', profileId);

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Error updating settings:', error);
    return { success: false, error: (error as Error).message };
  }
}

export async function useTicket(profileId: string) {
  try {
    const { data: stats } = await supabase
      .from('player_stats')
      .select('tickets, tickets_used')
      .eq('profile_id', profileId)
      .single();

    if (!stats || stats.tickets <= 0) {
      return { success: false, error: 'Not enough tickets' };
    }

    const { error } = await supabase
      .from('player_stats')
      .update({
        tickets: stats.tickets - 1,
        tickets_used: stats.tickets_used + 1,
        updated_at: new Date().toISOString(),
      })
      .eq('profile_id', profileId);

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Error using ticket:', error);
    return { success: false, error: (error as Error).message };
  }
}

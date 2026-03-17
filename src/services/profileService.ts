// @ts-nocheck
import { supabase } from '../lib/supabase';
import type { PlayerProfile } from '../store/gameStore';

export async function createProfile(profile: PlayerProfile): Promise<{ success: boolean; profileId?: string; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .insert({
        name: profile.name,
        profile_photo: profile.profilePhoto,
        character_id: profile.characterId,
      })
      .select()
      .single();

    if (error) throw error;

    // Initialize player stats
    await supabase.from('player_stats').insert({
      profile_id: data.id,
      total_dimsum: 0,
      tickets: 0,
      tickets_used: 0,
    });

    return { success: true, profileId: data.id };
  } catch (error) {
    console.error('Error creating profile:', error);
    return { success: false, error: (error as Error).message };
  }
}

export async function getProfile(profileId: string) {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', profileId)
      .single();

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Error fetching profile:', error);
    return { success: false, error: (error as Error).message };
  }
}

export async function updateProfile(profileId: string, updates: Partial<PlayerProfile>) {
  try {
    const { error } = await supabase
      .from('profiles')
      .update({
        name: updates.name,
        profile_photo: updates.profilePhoto,
        character_id: updates.characterId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', profileId);

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Error updating profile:', error);
    return { success: false, error: (error as Error).message };
  }
}

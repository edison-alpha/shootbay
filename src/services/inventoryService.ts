// @ts-nocheck
import { supabase } from '../lib/supabase';
import type { InventoryItem } from '../store/gameStore';

export async function addInventoryItem(profileId: string, item: InventoryItem) {
  try {
    // Check if item exists
    const { data: existing } = await supabase
      .from('inventory')
      .select('*')
      .eq('profile_id', profileId)
      .eq('item_id', item.id)
      .single();

    if (existing) {
      // Update quantity
      const { error } = await supabase
        .from('inventory')
        .update({
          quantity: existing.quantity + item.quantity,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id);

      if (error) throw error;
    } else {
      // Insert new
      const { error } = await supabase
        .from('inventory')
        .insert({
          profile_id: profileId,
          item_id: item.id,
          name: item.name,
          description: item.description,
          icon: item.icon,
          quantity: item.quantity,
          type: item.type,
        });

      if (error) throw error;
    }

    return { success: true };
  } catch (error) {
    console.error('Error adding inventory item:', error);
    return { success: false, error: (error as Error).message };
  }
}

export async function getInventory(profileId: string) {
  try {
    const { data, error } = await supabase
      .from('inventory')
      .select('*')
      .eq('profile_id', profileId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return { success: true, data: data || [] };
  } catch (error) {
    console.error('Error fetching inventory:', error);
    return { success: false, error: (error as Error).message };
  }
}

export async function redeemItem(profileId: string, itemId: string) {
  try {
    const { error } = await supabase
      .from('inventory')
      .update({
        redeemed: true,
        redeemed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('profile_id', profileId)
      .eq('item_id', itemId);

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Error redeeming item:', error);
    return { success: false, error: (error as Error).message };
  }
}

// @ts-nocheck
import { supabase } from '../lib/supabase';
import type { MysteryBoxReward } from '../store/gameStore';

export async function redeemCode(profileId: string, code: string) {
  try {
    // Check if code already redeemed
    const { data: existing } = await supabase
      .from('redeemed_codes')
      .select('*')
      .eq('profile_id', profileId)
      .eq('code', code.toUpperCase())
      .single();

    if (existing) {
      return { success: false, error: 'Code already redeemed' };
    }

    // Check if user has tickets
    const { data: stats } = await supabase
      .from('player_stats')
      .select('tickets')
      .eq('profile_id', profileId)
      .single();

    if (!stats || stats.tickets <= 0) {
      return { success: false, error: 'Not enough tickets' };
    }

    // Generate reward
    const reward = generateMysteryReward(code);

    // Save redeemed code
    await supabase.from('redeemed_codes').insert({
      profile_id: profileId,
      code: code.toUpperCase(),
    });

    // Save reward
    await supabase.from('mystery_box_rewards').insert({
      profile_id: profileId,
      reward_id: reward.id,
      type: reward.type,
      name: reward.name,
      description: reward.description,
      icon: reward.icon,
      message: reward.message,
      value: reward.value,
      spins: reward.spins,
      claimed: true,
      claimed_at: new Date().toISOString(),
    });

    // Use ticket
    await supabase
      .from('player_stats')
      .update({
        tickets: stats.tickets - 1,
        tickets_used: (stats as any).tickets_used + 1,
        updated_at: new Date().toISOString(),
      })
      .eq('profile_id', profileId);

    // Handle reward effects
    if (reward.type === 'dimsum_bonus' && reward.value) {
      await supabase.rpc('increment_dimsum', {
        p_profile_id: profileId,
        p_amount: reward.value,
      });
    }

    return { success: true, reward };
  } catch (error) {
    console.error('Error redeeming code:', error);
    return { success: false, error: (error as Error).message };
  }
}

export async function getMysteryBoxRewards(profileId: string) {
  try {
    const { data, error } = await supabase
      .from('mystery_box_rewards')
      .select('*')
      .eq('profile_id', profileId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return { success: true, data: data || [] };
  } catch (error) {
    console.error('Error fetching mystery box rewards:', error);
    return { success: false, error: (error as Error).message };
  }
}

function generateMysteryReward(code: string): MysteryBoxReward {
  const upperCode = code.toUpperCase();
  const DEFAULT_BIRTHDAY_MESSAGE = 'Selamat Ulang Tahun! 🎉🎂\n\nSemoga di hari yang spesial ini, semua harapan dan impianmu terwujud. Kamu adalah orang yang luar biasa dan dunia beruntung memilikimu.\n\nTerus bersinar dan jangan pernah berhenti bermimpi! ✨\n\nWith love and warm wishes! 💝';

  if (upperCode === 'BAYUGANTENG') {
    return {
      id: `bayu_spin_${Date.now()}`,
      type: 'spin_ticket',
      name: '🎰 Lucky Spin x3',
      description: 'You won 3 spins on the Lucky Wheel!',
      icon: '🎰',
      spins: 3,
      claimed: true,
      claimedAt: Date.now(),
    };
  }

  if (upperCode.startsWith('BDAY') || upperCode.startsWith('HBD') || upperCode.startsWith('ULTAH')) {
    return {
      id: `bday_${Date.now()}`,
      type: 'birthday_card',
      name: '🎂 Birthday Card',
      description: 'A special birthday greeting card!',
      icon: '🎂',
      message: DEFAULT_BIRTHDAY_MESSAGE,
      claimed: true,
      claimedAt: Date.now(),
    };
  }

  const rewards: MysteryBoxReward[] = [
    {
      id: `bonus_dimsum_${Date.now()}`,
      type: 'dimsum_bonus',
      name: '🥟 Dimsum Bonus Pack',
      description: '+10 Bonus Dimsum added to your collection!',
      icon: '🥟',
      value: 10,
      claimed: true,
      claimedAt: Date.now(),
    },
    {
      id: `golden_chopstick_${Date.now()}`,
      type: 'inventory_item',
      name: '🥢 Golden Chopstick',
      description: 'A rare golden chopstick. Boosts dimsum collection!',
      icon: '🥢',
      claimed: true,
      claimedAt: Date.now(),
    },
    {
      id: `lucky_cat_${Date.now()}`,
      type: 'cosmetic',
      name: '🐱 Lucky Cat Charm',
      description: 'A maneki-neko charm that brings good fortune!',
      icon: '🐱',
      claimed: true,
      claimedAt: Date.now(),
    },
    {
      id: `dragon_hat_${Date.now()}`,
      type: 'cosmetic',
      name: '🐉 Dragon Hat',
      description: 'A legendary dragon hat for your character!',
      icon: '🐉',
      claimed: true,
      claimedAt: Date.now(),
    },
  ];

  return rewards[Math.floor(Math.random() * rewards.length)];
}

/**
 * Remote asset URLs grouped by category.
 * All CDN URLs are centralised here for easy swapping/versioning.
 */

export const IMAGE_ASSETS = {
  // trooper_character & goblin_minion removed – using local sprites instead
  // (caractertentara.png / caracterdaster.png for player, boss-caracter/* for enemies)
  arena_background:
    'https://d2oir5eh8rty2e.cloudfront.net/assets/images/arena_background_342bb5c7-d769-4454-9b3d-4e0b3d9ec32d.webp',
  wish_card_background:
    'https://d2oir5eh8rty2e.cloudfront.net/assets/images/wish_card_background_6a6cf9b3-879e-480d-8f4c-0c55c2aaa4c2.webp',
  birthday_card:
    'https://d2oir5eh8rty2e.cloudfront.net/assets/images/birthday_card_7d737669-10fc-4974-89b3-c5c30a08c368.webp',
} as const;

export const AUDIO_ASSETS = {
  shoot_sound:
    'https://d2oir5eh8rty2e.cloudfront.net/assets/sounds/effect/shoot_sound_b9c0882b-96c2-43c7-a40d-c42f8c3e009c.mp3',
  minion_hit_sound:
    'https://d2oir5eh8rty2e.cloudfront.net/assets/sounds/effect/minion_hit_sound_74c7acd4-d851-46bf-8d95-bf269c507ab9.mp3',
  milestone_sound:
    'https://d2oir5eh8rty2e.cloudfront.net/assets/sounds/effect/milestone_sound_63c259ae-a7e9-442b-9e4e-e30badccd3c8.mp3',
  background_music:
    'https://d2oir5eh8rty2e.cloudfront.net/assets/sounds/effect/background_music_27ccbdba-8d11-4bec-886e-a9c533b1f02c.mp3',
  victory_music:
    'https://d2oir5eh8rty2e.cloudfront.net/assets/sounds/effect/victory_music_499bec15-412b-4a6c-8fac-8139c9c06ca3.mp3',
} as const;

/** Flat map of all remote assets (images + audio) used by the loader. */
export const ALL_ASSETS: Record<string, string> = {
  ...IMAGE_ASSETS,
  ...AUDIO_ASSETS,
};

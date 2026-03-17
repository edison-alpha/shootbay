import React from 'react';

interface ProfileAvatarProps {
  /** Data-URL or image path for the captured photo. */
  photo: string | null;
  /** Fallback image when no photo is available. */
  fallbackSrc: string;
  fallbackAlt: string;
  /** Display name used as alt text when photo exists. */
  name: string;
  /** Tailwind size classes, defaults to h-12 w-12. */
  className?: string;
}

/**
 * Circular avatar that shows the player's selfie, or falls back
 * to the selected character image.
 */
export const ProfileAvatar: React.FC<ProfileAvatarProps> = ({
  photo,
  fallbackSrc,
  fallbackAlt,
  name,
  className = 'h-12 w-12',
}) => (
  <div className={`overflow-hidden rounded-full border-2 border-yellow-400 bg-zinc-700 shadow-lg ${className}`}>
    {photo ? (
      <img src={photo} alt={name || 'Player'} className="h-full w-full object-cover" />
    ) : (
      <img src={fallbackSrc} alt={fallbackAlt} className="h-full w-full object-cover" />
    )}
  </div>
);

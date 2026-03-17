// @ts-nocheck
import { supabase } from '../lib/supabase';

export async function uploadProfilePhoto(file: File, profileId: string) {
  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `${profileId}-${Date.now()}.${fileExt}`;
    const filePath = `${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('profile-photos')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true,
      });

    if (uploadError) throw uploadError;

    const { data } = supabase.storage
      .from('profile-photos')
      .getPublicUrl(filePath);

    return { success: true, url: data.publicUrl };
  } catch (error) {
    console.error('Error uploading photo:', error);
    return { success: false, error: (error as Error).message };
  }
}

export async function deleteProfilePhoto(url: string) {
  try {
    const path = url.split('/profile-photos/').pop();
    if (!path) throw new Error('Invalid URL');

    const { error } = await supabase.storage
      .from('profile-photos')
      .remove([path]);

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Error deleting photo:', error);
    return { success: false, error: (error as Error).message };
  }
}

export function convertBlobToFile(blob: Blob, fileName: string): File {
  return new File([blob], fileName, { type: blob.type });
}

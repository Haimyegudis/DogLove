import { supabase } from '../lib/supabase';

export interface GalleryPhoto {
  id: string;
  photo_url: string;
  created_at: string;
}

export async function listDogPhotos(dogId: string) {
  const { data, error } = await supabase.rpc('list_dog_photos', { p_dog_id: dogId });
  return { data: (data as GalleryPhoto[]) ?? [], error: error?.message ?? null };
}

export async function listOwnerPhotos(ownerId: string) {
  const { data, error } = await supabase.rpc('list_owner_photos', { p_owner: ownerId });
  return { data: (data as GalleryPhoto[]) ?? [], error: error?.message ?? null };
}

export async function addGalleryPhoto(ownerId: string, dogId: string | null, photoUrl: string) {
  const { error } = await supabase
    .from('gallery_photos')
    .insert({ owner_id: ownerId, dog_id: dogId, photo_url: photoUrl });
  return { error: error?.message ?? null };
}

export async function deleteGalleryPhoto(id: string) {
  const { error } = await supabase.from('gallery_photos').delete().eq('id', id);
  return { error: error?.message ?? null };
}

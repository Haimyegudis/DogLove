import { supabase } from '../lib/supabase';

type Bucket = 'avatars' | 'dog-photos';

// `now` is injectable so tests are deterministic; production callers omit it.
export async function uploadImage(bucket: Bucket, userId: string, uri: string, now = Date.now()) {
  const path = `${userId}/${now}.jpg`;
  const arrayBuffer = await fetch(uri).then((r) => r.arrayBuffer());
  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, arrayBuffer, { contentType: 'image/jpeg', upsert: true });
  if (error) return { url: null, error: error.message };
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return { url: data.publicUrl, error: null };
}

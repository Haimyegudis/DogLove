import { supabase } from '../lib/supabase';

type Bucket = 'avatars' | 'dog-photos';

// `now`/`rand` are injectable so tests are deterministic; production omits them.
// The random suffix makes the public storage URL effectively unguessable.
export async function uploadImage(
  bucket: Bucket, userId: string, uri: string,
  now = Date.now(), rand = Math.random().toString(36).slice(2, 10),
) {
  const path = `${userId}/${now}-${rand}.jpg`;
  const arrayBuffer = await fetch(uri).then((r) => r.arrayBuffer());
  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, arrayBuffer, { contentType: 'image/jpeg', upsert: true });
  if (error) return { url: null, error: error.message };
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return { url: data.publicUrl, error: null };
}

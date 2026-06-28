jest.mock('../src/lib/supabase', () => {
  const eq2 = jest.fn().mockResolvedValue({ error: null });
  eq2.mockReturnValue({ eq: eq2 });
  const del = jest.fn(() => ({ eq: eq2 }));
  const upsert = jest.fn().mockResolvedValue({ error: null });
  const insert = jest.fn().mockResolvedValue({ error: null });
  const rpc = jest.fn().mockResolvedValue({ data: [], error: null });
  return {
    supabase: {
      rpc,
      from: jest.fn(() => ({ insert, upsert, delete: del })),
      __m: { rpc, insert, upsert, del, eq2 },
    },
  };
});

import { listFeed, createPost, reactToPost, removeReaction } from '../src/services/feed';
import { supabase } from '../src/lib/supabase';
const m = (supabase as any).__m;

beforeEach(() => {
  jest.clearAllMocks();
  m.eq2.mockResolvedValue({ error: null });
  m.eq2.mockReturnValue({ eq: m.eq2 });
  m.del.mockReturnValue({ eq: m.eq2 });
  m.insert.mockResolvedValue({ error: null });
  m.upsert.mockResolvedValue({ error: null });
  m.rpc.mockResolvedValue({ data: [], error: null });
});

test('listFeed calls rpc list_feed with p_limit 50', async () => {
  const res = await listFeed();
  expect(m.rpc).toHaveBeenCalledWith('list_feed', { p_limit: 50 });
  expect(res.error).toBeNull();
  expect(Array.isArray(res.data)).toBe(true);
});

test('createPost calls from(dog_posts) then insert with correct fields', async () => {
  const res = await createPost('owner1', 'dog1', 'https://photo.url', 'cute dog');
  expect((supabase.from as jest.Mock).mock.calls[0][0]).toBe('dog_posts');
  expect(m.insert).toHaveBeenCalledWith({
    owner_id: 'owner1',
    dog_id: 'dog1',
    photo_url: 'https://photo.url',
    caption: 'cute dog',
  });
  expect(res.error).toBeNull();
});

test('reactToPost calls from(post_reactions) then upsert with correct fields and onConflict', async () => {
  const res = await reactToPost('post1', 'user1', '❤️');
  expect((supabase.from as jest.Mock).mock.calls[0][0]).toBe('post_reactions');
  expect(m.upsert).toHaveBeenCalledWith(
    { post_id: 'post1', user_id: 'user1', emoji: '❤️' },
    { onConflict: 'post_id,user_id' }
  );
  expect(res.error).toBeNull();
});

test('removeReaction calls from(post_reactions) then delete then eq twice', async () => {
  const res = await removeReaction('post1', 'user1');
  expect((supabase.from as jest.Mock).mock.calls[0][0]).toBe('post_reactions');
  expect(m.del).toHaveBeenCalled();
  expect(m.eq2).toHaveBeenCalledWith('post_id', 'post1');
  expect(m.eq2).toHaveBeenCalledWith('user_id', 'user1');
  expect(res.error).toBeNull();
});

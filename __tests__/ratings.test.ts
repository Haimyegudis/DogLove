jest.mock('../src/lib/supabase', () => {
  const upsert = jest.fn();
  const rpc = jest.fn();
  return {
    supabase: {
      from: jest.fn(() => ({ upsert })),
      rpc,
      __m: { upsert, rpc },
    },
  };
});
import { rateUser, getUserRating } from '../src/services/ratings';
import { supabase } from '../src/lib/supabase';
const m = (supabase as any).__m;

beforeEach(() => jest.clearAllMocks());

test('rateUser upserts correctly', async () => {
  m.upsert.mockResolvedValue({ error: null });
  await rateUser('rater1', 'rated2', 4, 'nice');
  expect(m.upsert).toHaveBeenCalledWith(
    { rater_id: 'rater1', rated_id: 'rated2', stars: 4, comment: 'nice' },
    { onConflict: 'rater_id,rated_id' }
  );
});

test('getUserRating calls rpc and returns first row', async () => {
  m.rpc.mockResolvedValue({ data: [{ avg_stars: 4.5, rating_count: 2 }], error: null });
  const result = await getUserRating('user1');
  expect(m.rpc).toHaveBeenCalledWith('user_rating', { p_user: 'user1' });
  expect(result.data).toEqual({ avg_stars: 4.5, rating_count: 2 });
});

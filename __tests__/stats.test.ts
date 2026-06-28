jest.mock('../src/lib/supabase', () => {
  const rpc = jest.fn();
  return { supabase: { rpc, __m: { rpc } } };
});
import { myWalkStats } from '../src/services/stats';
import { supabase } from '../src/lib/supabase';
const m = (supabase as any).__m;

beforeEach(() => jest.clearAllMocks());

test('myWalkStats calls rpc my_walk_stats and returns first row', async () => {
  m.rpc.mockResolvedValue({ data: [{ total_walks: 5, total_minutes: 120, week_walks: 3, total_km: 12.5, streak_days: 2 }], error: null });
  const res = await myWalkStats();
  expect(m.rpc).toHaveBeenCalledWith('my_walk_stats');
  expect(res.data?.total_walks).toBe(5);
  expect(res.data?.streak_days).toBe(2);
  expect(res.error).toBeNull();
});

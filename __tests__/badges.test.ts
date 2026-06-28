jest.mock('../src/lib/supabase', () => {
  const rpc = jest.fn();
  return { supabase: { rpc, __m: { rpc } } };
});
import { myBadges } from '../src/services/badges';
import { supabase } from '../src/lib/supabase';
const m = (supabase as any).__m;

beforeEach(() => jest.clearAllMocks());

const MOCK_BADGES = [
  { code: 'first_walk', label: 'טיול ראשון', emoji: '🐾', earned: true,  progress: 3,  target: 1  },
  { code: 'walks_10',   label: '10 טיולים',  emoji: '🥉', earned: false, progress: 3,  target: 10 },
  { code: 'km_10',      label: '10 ק"מ',     emoji: '🏃', earned: false, progress: 4.2, target: 10 },
];

test('myBadges calls rpc my_badges and returns rows', async () => {
  m.rpc.mockResolvedValue({ data: MOCK_BADGES, error: null });
  const res = await myBadges();
  expect(m.rpc).toHaveBeenCalledWith('my_badges');
  expect(res.data).toHaveLength(3);
  expect(res.error).toBeNull();
});

test('myBadges maps earned flag correctly', async () => {
  m.rpc.mockResolvedValue({ data: MOCK_BADGES, error: null });
  const res = await myBadges();
  expect(res.data![0].earned).toBe(true);
  expect(res.data![1].earned).toBe(false);
});

test('myBadges returns null data and error message on failure', async () => {
  m.rpc.mockResolvedValue({ data: null, error: { message: 'not authenticated' } });
  const res = await myBadges();
  expect(res.data).toBeNull();
  expect(res.error).toBe('not authenticated');
});

jest.mock('../src/lib/supabase', () => {
  const eq2 = jest.fn().mockResolvedValue({ error: null });
  const eq1 = jest.fn(() => ({ eq: eq2 }));
  const del = jest.fn(() => ({ eq: eq1 }));
  const insert = jest.fn().mockResolvedValue({ error: null });
  return {
    supabase: {
      from: jest.fn(() => ({ insert, delete: del })),
      __m: { insert, delete: del, eq1, eq2 },
    },
  };
});
import { blockUser, unblockUser, reportUser } from '../src/services/safety';
import { supabase } from '../src/lib/supabase';
const m = (supabase as any).__m;

beforeEach(() => jest.clearAllMocks());

test('blockUser inserts blocker_id and blocked_id', async () => {
  m.insert.mockResolvedValue({ error: null });
  const res = await blockUser('u1', 'u2');
  expect(supabase.from).toHaveBeenCalledWith('blocks');
  expect(m.insert).toHaveBeenCalledWith({ blocker_id: 'u1', blocked_id: 'u2' });
  expect(res.error).toBeNull();
});

test('unblockUser calls delete then eq blocker_id then eq blocked_id', async () => {
  m.eq2.mockResolvedValue({ error: null });
  const res = await unblockUser('u1', 'u2');
  expect(supabase.from).toHaveBeenCalledWith('blocks');
  expect(m.delete).toHaveBeenCalled();
  expect(m.eq1).toHaveBeenCalledWith('blocker_id', 'u1');
  expect(m.eq2).toHaveBeenCalledWith('blocked_id', 'u2');
  expect(res.error).toBeNull();
});

test('reportUser inserts reporter_id, reported_id, reason', async () => {
  m.insert.mockResolvedValue({ error: null });
  const res = await reportUser('u1', 'u2', 'spam');
  expect(supabase.from).toHaveBeenCalledWith('reports');
  expect(m.insert).toHaveBeenCalledWith({ reporter_id: 'u1', reported_id: 'u2', reason: 'spam' });
  expect(res.error).toBeNull();
});

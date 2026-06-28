jest.mock('../src/lib/supabase', () => {
  const rpc = jest.fn();
  const single = jest.fn();
  const select = jest.fn(() => ({ single }));
  const insert = jest.fn(() => ({ select }));
  const from = jest.fn(() => ({ insert }));
  return { supabase: { rpc, from, __m: { rpc, from, insert, select, single } } };
});

import { listChallenges, joinChallenge, leaveChallenge, createChallenge } from '../src/services/challenges';
import { supabase } from '../src/lib/supabase';
const m = (supabase as any).__m;

beforeEach(() => jest.clearAllMocks());

test('listChallenges calls rpc list_challenges and returns data array', async () => {
  const mockData = [
    {
      id: 'abc-123',
      title: '5 טיולים השבוע',
      description: 'צאו לטייל!',
      goal_kind: 'walks',
      goal_target: 5,
      ends_at: '2026-07-05T00:00:00Z',
      participant_count: 12,
      i_joined: false,
      my_progress: 2,
    },
  ];
  m.rpc.mockResolvedValue({ data: mockData, error: null });
  const res = await listChallenges();
  expect(m.rpc).toHaveBeenCalledWith('list_challenges');
  expect(res.data).toHaveLength(1);
  expect(res.data![0].title).toBe('5 טיולים השבוע');
  expect(res.error).toBeNull();
});

test('joinChallenge calls rpc join_challenge with correct args', async () => {
  m.rpc.mockResolvedValue({ data: null, error: null });
  const res = await joinChallenge('abc-123');
  expect(m.rpc).toHaveBeenCalledWith('join_challenge', { p_challenge: 'abc-123' });
  expect(res.error).toBeNull();
});

test('leaveChallenge calls rpc leave_challenge with correct args', async () => {
  m.rpc.mockResolvedValue({ data: null, error: null });
  const res = await leaveChallenge('abc-123');
  expect(m.rpc).toHaveBeenCalledWith('leave_challenge', { p_challenge: 'abc-123' });
  expect(res.error).toBeNull();
});

test('createChallenge inserts into challenges table and returns data', async () => {
  const mockRow = {
    id: 'new-uuid',
    title: 'אתגר חדש',
    description: 'תיאור',
    goal_kind: 'distance_km',
    goal_target: 10,
    ends_at: '2026-07-31T00:00:00Z',
    created_at: '2026-06-28T00:00:00Z',
  };
  m.single.mockResolvedValue({ data: mockRow, error: null });
  const res = await createChallenge({
    title: 'אתגר חדש',
    description: 'תיאור',
    goalKind: 'distance_km',
    goalTarget: 10,
    endsAt: '2026-07-31T00:00:00Z',
  });
  expect(m.from).toHaveBeenCalledWith('challenges');
  expect(m.insert).toHaveBeenCalledWith({
    title: 'אתגר חדש',
    description: 'תיאור',
    goal_kind: 'distance_km',
    goal_target: 10,
    ends_at: '2026-07-31T00:00:00Z',
  });
  expect(res.data?.id).toBe('new-uuid');
  expect(res.error).toBeNull();
});

test('listChallenges returns error message on rpc failure', async () => {
  m.rpc.mockResolvedValue({ data: null, error: { message: 'DB error' } });
  const res = await listChallenges();
  expect(res.data).toBeNull();
  expect(res.error).toBe('DB error');
});

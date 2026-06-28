jest.mock('../src/lib/supabase', () => {
  const insert = jest.fn();
  const eq2 = jest.fn();
  const eq1 = jest.fn(() => ({ eq: eq2 }));
  const del = jest.fn(() => ({ eq: eq1 }));
  const rpc = jest.fn();
  return {
    supabase: {
      from: jest.fn(() => ({ insert, delete: del })),
      rpc,
      __m: { insert, del, eq1, eq2, rpc },
    },
  };
});
import { listSocialWalks, createSocialWalk, joinWalk, leaveWalk } from '../src/services/events';
import { supabase } from '../src/lib/supabase';
const m = (supabase as any).__m;

beforeEach(() => jest.clearAllMocks());

test('listSocialWalks calls rpc list_events', async () => {
  m.rpc.mockResolvedValue({ data: [{ id: 'e1', title: 'Walk in the park' }], error: null });
  const res = await listSocialWalks();
  expect(m.rpc).toHaveBeenCalledWith('list_events');
  expect(res.data).toHaveLength(1);
});

test('createSocialWalk inserts the payload', async () => {
  m.insert.mockResolvedValue({ error: null });
  const res = await createSocialWalk('user-1', 'Morning Walk', 'Park', null, '2026-07-01T08:00:00Z');
  expect(m.insert).toHaveBeenCalledWith({
    organizer_id: 'user-1',
    title: 'Morning Walk',
    location_name: 'Park',
    location: null,
    starts_at: '2026-07-01T08:00:00Z',
  });
  expect(res.error).toBeNull();
});

test('joinWalk inserts event_id and user_id', async () => {
  m.insert.mockResolvedValue({ error: null });
  const res = await joinWalk('event-1', 'user-2');
  expect(m.insert).toHaveBeenCalledWith({ event_id: 'event-1', user_id: 'user-2' });
  expect(res.error).toBeNull();
});

test('leaveWalk deletes eq event_id then eq user_id', async () => {
  m.eq2.mockResolvedValue({ error: null });
  const res = await leaveWalk('event-1', 'user-2');
  expect(m.del).toHaveBeenCalled();
  expect(m.eq1).toHaveBeenCalledWith('event_id', 'event-1');
  expect(m.eq2).toHaveBeenCalledWith('user_id', 'user-2');
  expect(res.error).toBeNull();
});

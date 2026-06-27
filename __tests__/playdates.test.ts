jest.mock('../src/lib/supabase', () => {
  const insert = jest.fn();
  const eqUpd = jest.fn();
  const update = jest.fn(() => ({ eq: eqUpd }));
  const from = jest.fn(() => ({ insert, update }));
  const rpc = jest.fn();
  return { supabase: { from, rpc, __m: { insert, update, eqUpd, from, rpc } } };
});
import { schedulePlaydate, listMyPlaydates, cancelPlaydate, otherInConversation } from '../src/services/playdates';
import { supabase } from '../src/lib/supabase';
const m = (supabase as any).__m;

beforeEach(() => jest.clearAllMocks());

test('schedulePlaydate inserts organizer/guest/time/place', async () => {
  m.insert.mockResolvedValue({ error: null });
  await schedulePlaydate('o1', 'g1', '2026-07-01T17:00:00Z', 'פארק');
  expect(m.from).toHaveBeenCalledWith('scheduled_playdates');
  expect(m.insert).toHaveBeenCalledWith({ organizer_id: 'o1', guest_id: 'g1', starts_at: '2026-07-01T17:00:00Z', location_name: 'פארק' });
});

test('listMyPlaydates calls the rpc', async () => {
  m.rpc.mockResolvedValue({ data: [{ id: 'p1' }], error: null });
  const res = await listMyPlaydates();
  expect(m.rpc).toHaveBeenCalledWith('list_my_playdates');
  expect(res.data).toHaveLength(1);
});

test('cancelPlaydate updates status to cancelled', async () => {
  m.eqUpd.mockResolvedValue({ error: null });
  await cancelPlaydate('p1');
  expect(m.update).toHaveBeenCalledWith({ status: 'cancelled' });
  expect(m.eqUpd).toHaveBeenCalledWith('id', 'p1');
});

test('otherInConversation calls conversation_other rpc', async () => {
  m.rpc.mockResolvedValue({ data: 'u2', error: null });
  const res = await otherInConversation('c1');
  expect(m.rpc).toHaveBeenCalledWith('conversation_other', { p_conv: 'c1' });
  expect(res.data).toBe('u2');
});

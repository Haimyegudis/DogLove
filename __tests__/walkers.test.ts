jest.mock('../src/lib/supabase', () => {
  const single = jest.fn();
  const eq = jest.fn();
  const select = jest.fn();
  const update = jest.fn();
  const rpc = jest.fn();
  eq.mockReturnValue({ single });
  select.mockReturnValue({ eq });
  update.mockReturnValue({ eq });
  return {
    supabase: {
      from: jest.fn(() => ({ select, update })),
      rpc,
      __m: { single, eq, select, update, rpc },
    },
  };
});
import { availableWalkers, setWalker, startConversation, getWalkerStatus } from '../src/services/walkers';
import { supabase } from '../src/lib/supabase';
const m = (supabase as any).__m;

beforeEach(() => {
  jest.clearAllMocks();
  m.eq.mockReturnValue({ single: m.single });
  m.select.mockReturnValue({ eq: m.eq });
  m.update.mockReturnValue({ eq: m.eq });
});

test('availableWalkers calls rpc with available_walkers and p_city', async () => {
  m.rpc.mockResolvedValue({ data: [], error: null });
  await availableWalkers('');
  expect(m.rpc).toHaveBeenCalledWith('available_walkers', { p_city: '' });
});

test('setWalker calls profiles.update({ is_walker: true }).eq(id)', async () => {
  m.eq.mockResolvedValue({ error: null });
  await setWalker('user-1', true);
  expect(m.update).toHaveBeenCalledWith({ is_walker: true });
  expect(m.eq).toHaveBeenCalledWith('id', 'user-1');
});

test('startConversation calls rpc with get_or_create_conversation and p_other', async () => {
  m.rpc.mockResolvedValue({ data: 'conv-123', error: null });
  const res = await startConversation('other-user');
  expect(m.rpc).toHaveBeenCalledWith('get_or_create_conversation', { p_other: 'other-user' });
  expect(res.data).toBe('conv-123');
});

test('getWalkerStatus calls profiles.select(is_walker).eq(id)', async () => {
  m.single.mockResolvedValue({ data: { is_walker: true }, error: null });
  const res = await getWalkerStatus('user-1');
  expect(m.select).toHaveBeenCalledWith('is_walker');
  expect(m.eq).toHaveBeenCalledWith('id', 'user-1');
  expect(res.data).toBe(true);
});

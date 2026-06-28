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
import { availableWalkers, nearbyWalkers, setWalker, startConversation, getWalkerStatus } from '../src/services/walkers';
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

test('setWalker calls rpc set_walker with flag and coords', async () => {
  m.rpc.mockResolvedValue({ error: null });
  await setWalker('user-1', true, { lat: 32.1, lng: 34.8 });
  expect(m.rpc).toHaveBeenCalledWith('set_walker', { p_on: true, p_lat: 32.1, p_lng: 34.8 });
});

test('setWalker without coords passes null lat/lng', async () => {
  m.rpc.mockResolvedValue({ error: null });
  await setWalker('user-1', false);
  expect(m.rpc).toHaveBeenCalledWith('set_walker', { p_on: false, p_lat: null, p_lng: null });
});

test('nearbyWalkers calls rpc nearby_walkers with coords and radius', async () => {
  m.rpc.mockResolvedValue({ data: [], error: null });
  await nearbyWalkers({ lat: 32.1, lng: 34.8 }, 5000);
  expect(m.rpc).toHaveBeenCalledWith('nearby_walkers', { p_lat: 32.1, p_lng: 34.8, p_radius_m: 5000 });
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

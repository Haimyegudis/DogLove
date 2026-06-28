jest.mock('../src/lib/supabase', () => {
  const eq = jest.fn();
  const update = jest.fn(() => ({ eq }));
  const rpc = jest.fn();
  return { supabase: { from: jest.fn(() => ({ update })), rpc,
    __m: { eq, update, rpc } } };
});
import { reportLostDog, nearbyLostDogs, markFound } from '../src/services/lost';
import { supabase } from '../src/lib/supabase';
const m = (supabase as any).__m;

beforeEach(() => jest.clearAllMocks());

test('reportLostDog calls rpc report_lost_dog with 6 params', async () => {
  m.rpc.mockResolvedValue({ error: null });
  await reportLostDog('dog-1', 'Buddy', null, 'שחום', { lat: 32.1, lng: 34.9 });
  expect(m.rpc).toHaveBeenCalledWith('report_lost_dog', {
    p_dog_id: 'dog-1', p_dog_name: 'Buddy', p_photo_url: null,
    p_note: 'שחום', p_lat: 32.1, p_lng: 34.9,
  });
});

test('nearbyLostDogs calls rpc nearby_lost_dogs', async () => {
  m.rpc.mockResolvedValue({ data: [{ id: 'l1', dog_name: 'Rex' }], error: null });
  const res = await nearbyLostDogs({ lat: 32.1, lng: 34.9 });
  expect(m.rpc).toHaveBeenCalledWith('nearby_lost_dogs', { p_lat: 32.1, p_lng: 34.9, p_radius_m: 50000 });
  expect(res.data).toHaveLength(1);
});

test('markFound updates is_found true', async () => {
  m.eq.mockResolvedValue({ error: null });
  await markFound('lost-99');
  expect(m.update).toHaveBeenCalledWith({ is_found: true });
  expect(m.eq).toHaveBeenCalledWith('id', 'lost-99');
});

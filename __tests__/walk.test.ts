jest.mock('../src/lib/supabase');

import { supabase } from '../src/lib/supabase';
import { startWalk, updateWalkLocation, endWalk, nearbyDogs } from '../src/services/walk';

const mockRpc = supabase.rpc as jest.Mock;

beforeEach(() => jest.clearAllMocks());

test('startWalk calls start_walk rpc with dog id + lat/lng', async () => {
  mockRpc.mockResolvedValue({ error: null });
  const res = await startWalk('d1', { lat: 32.1, lng: 34.8 });
  expect(mockRpc).toHaveBeenCalledWith('start_walk', { p_dog_id: 'd1', p_lat: 32.1, p_lng: 34.8 });
  expect(res.error).toBeNull();
});

test('updateWalkLocation calls update_walk_location rpc', async () => {
  mockRpc.mockResolvedValue({ error: null });
  await updateWalkLocation('d1', { lat: 1, lng: 2 });
  expect(mockRpc).toHaveBeenCalledWith('update_walk_location', { p_dog_id: 'd1', p_lat: 1, p_lng: 2 });
});

test('endWalk calls end_walk rpc', async () => {
  mockRpc.mockResolvedValue({ error: null });
  await endWalk('d1');
  expect(mockRpc).toHaveBeenCalledWith('end_walk', { p_dog_id: 'd1' });
});

test('nearbyDogs calls nearby_active_dogs and returns rows', async () => {
  mockRpc.mockResolvedValue({ data: [{ dog_id: 'd2', name: 'Bella' }], error: null });
  const res = await nearbyDogs({ lat: 1, lng: 2 }, 3000);
  expect(mockRpc).toHaveBeenCalledWith('nearby_active_dogs', { p_lat: 1, p_lng: 2, p_radius_m: 3000 });
  expect(res.data).toHaveLength(1);
  expect(res.error).toBeNull();
});

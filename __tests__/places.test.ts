jest.mock('../src/lib/supabase', () => {
  const rpc = jest.fn();
  return { supabase: { rpc }, __rpc: rpc };
});
import { nearbyPlaces } from '../src/services/places';
import { supabase } from '../src/lib/supabase';
const rpc = (supabase as any).rpc;

beforeEach(() => jest.clearAllMocks());

test('nearbyPlaces calls nearby_places RPC with coords, kind and radius', async () => {
  rpc.mockResolvedValue({ data: [], error: null });
  await nearbyPlaces(32.0, 35.0, 'vet', 3000);
  expect(rpc).toHaveBeenCalledWith('nearby_places', {
    p_lat: 32.0, p_lng: 35.0, p_kind: 'vet', p_radius_m: 3000,
  });
});

test('nearbyPlaces uses default radius 5000 when not supplied', async () => {
  rpc.mockResolvedValue({ data: [], error: null });
  await nearbyPlaces(32.0, 35.0, 'petshop');
  expect(rpc).toHaveBeenCalledWith('nearby_places', {
    p_lat: 32.0, p_lng: 35.0, p_kind: 'petshop', p_radius_m: 5000,
  });
});

test('nearbyPlaces maps RPC rows to Place objects', async () => {
  rpc.mockResolvedValue({
    data: [{ id: 1, name: 'וטרינר רון', lat: 32.1, lng: 34.8, kind: 'vet' }],
    error: null,
  });
  const { data, error } = await nearbyPlaces(32.1, 34.8, 'vet');
  expect(error).toBeNull();
  expect(data).toHaveLength(1);
  expect(data[0]).toMatchObject({ id: 1, name: 'וטרינר רון', lat: 32.1, lng: 34.8, kind: 'vet' });
});

test('nearbyPlaces applies a kind-based Hebrew name when name is null', async () => {
  rpc.mockResolvedValue({
    data: [
      { id: 2, name: null, lat: 32.2, lng: 34.9, kind: 'vet' },
      { id: 3, name: null, lat: 32.3, lng: 34.7, kind: 'petshop' },
    ],
    error: null,
  });
  const vet = await nearbyPlaces(32.2, 34.9, 'vet');
  expect(vet.data[0].name).toBe('מרפאה וטרינרית');
  const shop = await nearbyPlaces(32.3, 34.7, 'petshop');
  expect(shop.data[0].name).toBe('חנות לחיות מחמד');
});

test('nearbyPlaces filters out rows without coordinates', async () => {
  rpc.mockResolvedValue({
    data: [
      { id: 9, name: 'x', lat: null, lng: null, kind: 'vet' },
      { id: 10, name: 'y', lat: 32.5, lng: 34.7, kind: 'vet' },
    ],
    error: null,
  });
  const { data } = await nearbyPlaces(32.5, 34.7, 'vet');
  expect(data).toHaveLength(1);
  expect(data[0].id).toBe(10);
});

test('nearbyPlaces returns the error message when the RPC errors', async () => {
  rpc.mockResolvedValue({ data: null, error: { message: 'rpc failed' } });
  const { data, error } = await nearbyPlaces(32.0, 35.0, 'vet');
  expect(data).toHaveLength(0);
  expect(error).toBe('rpc failed');
});

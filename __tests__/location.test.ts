jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
  watchPositionAsync: jest.fn(),
  Accuracy: { Balanced: 3 },
}));
import { requestLocationPermission, getCurrentCoords, watchCoords } from '../src/services/location';
import * as Location from 'expo-location';

const mockRequestForegroundPermissionsAsync = Location.requestForegroundPermissionsAsync as jest.Mock;
const mockGetCurrentPositionAsync = Location.getCurrentPositionAsync as jest.Mock;
const mockWatchPositionAsync = Location.watchPositionAsync as jest.Mock;

beforeEach(() => jest.clearAllMocks());

test('requestLocationPermission returns true when granted', async () => {
  mockRequestForegroundPermissionsAsync.mockResolvedValue({ granted: true });
  expect(await requestLocationPermission()).toBe(true);
});

test('getCurrentCoords maps the expo position to Coords', async () => {
  mockGetCurrentPositionAsync.mockResolvedValue({ coords: { latitude: 32.1, longitude: 34.8 } });
  const c = await getCurrentCoords();
  expect(c).toEqual({ lat: 32.1, lng: 34.8 });
});

test('watchCoords forwards mapped coords to the callback', async () => {
  let captured: any;
  mockWatchPositionAsync.mockImplementation((_opts: any, cb: any) => {
    captured = cb;
    return Promise.resolve({ remove: jest.fn() });
  });
  const onCoords = jest.fn();
  await watchCoords(onCoords);
  captured({ coords: { latitude: 1, longitude: 2 } });
  expect(onCoords).toHaveBeenCalledWith({ lat: 1, lng: 2 });
});

const store: Record<string, string> = {};
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn((k: string) => Promise.resolve(store[k] ?? null)),
  setItem: jest.fn((k: string, v: string) => { store[k] = v; return Promise.resolve(); }),
}));
import { hasSeenDataNotice, setDataNoticeSeen } from '../src/state/consent';

test('notice is unseen by default, seen after set', async () => {
  expect(await hasSeenDataNotice()).toBe(false);
  await setDataNoticeSeen();
  expect(await hasSeenDataNotice()).toBe(true);
});

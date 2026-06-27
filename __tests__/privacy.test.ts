jest.mock('../src/lib/supabase', () => {
  const eqUpd = jest.fn();
  const update = jest.fn(() => ({ eq: eqUpd }));
  const from = jest.fn(() => ({ update }));
  const rpc = jest.fn();
  const supabaseMock = { from, rpc } as any;
  supabaseMock.__m = { eqUpd, update, from, rpc };
  return { supabase: supabaseMock };
});
import { getDiscoverable, setDiscoverable, deleteAccount } from '../src/services/privacy';
import { supabase } from '../src/lib/supabase';
const m = (supabase as any).__m;

beforeEach(() => jest.clearAllMocks());

test('getDiscoverable reads is_discoverable from get_my_settings', async () => {
  m.rpc.mockResolvedValue({ data: [{ is_discoverable: false }], error: null });
  const res = await getDiscoverable();
  expect(m.rpc).toHaveBeenCalledWith('get_my_settings');
  expect(res.data).toBe(false);
});

test('setDiscoverable updates the profile', async () => {
  m.eqUpd.mockResolvedValue({ error: null });
  await setDiscoverable('u1', true);
  expect(m.from).toHaveBeenCalledWith('profiles');
  expect(m.update).toHaveBeenCalledWith({ is_discoverable: true });
  expect(m.eqUpd).toHaveBeenCalledWith('id', 'u1');
});

test('deleteAccount calls delete_my_account rpc', async () => {
  m.rpc.mockResolvedValue({ error: null });
  const res = await deleteAccount();
  expect(m.rpc).toHaveBeenCalledWith('delete_my_account');
  expect(res.error).toBeNull();
});

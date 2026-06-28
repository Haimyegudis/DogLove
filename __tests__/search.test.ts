jest.mock('../src/lib/supabase', () => {
  const rpc = jest.fn();
  return { supabase: { rpc }, __rpc: rpc };
});
import { searchDogs, searchUsers } from '../src/services/search';
import { supabase } from '../src/lib/supabase';
const rpc = (supabase as any).rpc;

beforeEach(() => jest.clearAllMocks());

test('searchDogs calls search_dogs with query', async () => {
  rpc.mockResolvedValue({ data: [{ dog_id: 'd1' }], error: null });
  const res = await searchDogs('lab');
  expect(rpc).toHaveBeenCalledWith('search_dogs', { p_q: 'lab', p_city: '' });
  expect(res.data).toHaveLength(1);
});

test('searchUsers calls search_users with name query and filters', async () => {
  rpc.mockResolvedValue({ data: [], error: null });
  await searchUsers('דנה', 'female', 18, 40);
  expect(rpc).toHaveBeenCalledWith('search_users', { p_q: 'דנה', p_gender: 'female', p_min_age: 18, p_max_age: 40, p_city: '' });
});

jest.mock('../src/lib/supabase', () => ({
  supabase: {
    from: jest.fn(),
  },
}));

import { getMyProfile, saveMyProfile } from '../src/services/profile';
import { supabase } from '../src/lib/supabase';

const mockSingle = jest.fn();
const mockEq = jest.fn(() => ({ single: mockSingle }));
const mockSelect = jest.fn(() => ({ eq: mockEq }));
const mockUpsert = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  (supabase.from as jest.Mock).mockReturnValue({
    select: mockSelect,
    upsert: mockUpsert,
  });
});

test('getMyProfile returns the row', async () => {
  mockSingle.mockResolvedValue({ data: { id: 'u1', display_name: 'Maya' }, error: null });
  const res = await getMyProfile('u1');
  expect(mockSelect).toHaveBeenCalledWith('id, display_name, photo_url, date_of_birth, gender, bio');
  expect(mockEq).toHaveBeenCalledWith('id', 'u1');
  expect(res.data?.display_name).toBe('Maya');
  expect(res.error).toBeNull();
});

test('saveMyProfile upserts the patch with the id', async () => {
  mockUpsert.mockResolvedValue({ error: null });
  const res = await saveMyProfile('u1', { display_name: 'Maya', gender: 'female' });
  expect(mockUpsert).toHaveBeenCalledWith(
    { id: 'u1', display_name: 'Maya', gender: 'female' },
    { onConflict: 'id' },
  );
  expect(res.error).toBeNull();
});

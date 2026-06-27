const mockUpsert = jest.fn();
jest.mock('../src/lib/supabase', () => ({
  supabase: { from: jest.fn(() => ({ upsert: mockUpsert })) },
}));
import { ensureProfile } from '../src/services/profile';

beforeEach(() => jest.clearAllMocks());

test('ensureProfile upserts the profile row by id', async () => {
  mockUpsert.mockResolvedValue({ error: null });
  const res = await ensureProfile('user-1', 'google');
  expect(mockUpsert).toHaveBeenCalledWith(
    { id: 'user-1', auth_provider: 'google' },
    { onConflict: 'id', ignoreDuplicates: true },
  );
  expect(res.error).toBeNull();
});

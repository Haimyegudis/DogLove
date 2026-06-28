// Mock must come before imports (jest hoisting).
jest.mock('../src/lib/supabase', () => ({
  supabase: {
    rpc: jest.fn(),
  },
}));

import { isVerified, myVerificationStatus } from '../src/services/verification';
import { supabase } from '../src/lib/supabase';

const mockRpc = supabase.rpc as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
});

// ─── isVerified ──────────────────────────────────────────────────────────────

test('isVerified calls is_verified_owner with the given userId', async () => {
  mockRpc.mockResolvedValue({ data: true, error: null });

  const res = await isVerified('user-abc');

  expect(mockRpc).toHaveBeenCalledWith('is_verified_owner', { p_user: 'user-abc' });
  expect(res.data).toBe(true);
  expect(res.error).toBeNull();
});

test('isVerified returns false when the RPC returns false', async () => {
  mockRpc.mockResolvedValue({ data: false, error: null });

  const res = await isVerified('user-xyz');

  expect(res.data).toBe(false);
  expect(res.error).toBeNull();
});

test('isVerified surfaces an error message and null data on failure', async () => {
  mockRpc.mockResolvedValue({ data: null, error: { message: 'permission denied' } });

  const res = await isVerified('user-xyz');

  expect(res.data).toBeNull();
  expect(res.error).toBe('permission denied');
});

// ─── myVerificationStatus ────────────────────────────────────────────────────

test('myVerificationStatus calls verification_status with no arguments', async () => {
  const fakeRow = {
    verified: true,
    has_photo: true,
    has_dog: true,
    walk_count: 5,
    walks_needed: 0,
  };
  mockRpc.mockResolvedValue({ data: [fakeRow], error: null });

  const res = await myVerificationStatus();

  expect(mockRpc).toHaveBeenCalledWith('verification_status');
  expect(res.error).toBeNull();
  expect(res.data).not.toBeNull();
});

test('myVerificationStatus returns correct shape with walks_needed > 0', async () => {
  const fakeRow = {
    verified: false,
    has_photo: true,
    has_dog: false,
    walk_count: 1,
    walks_needed: 2,
  };
  mockRpc.mockResolvedValue({ data: [fakeRow], error: null });

  const res = await myVerificationStatus();

  expect(res.data?.verified).toBe(false);
  expect(res.data?.walks_needed).toBe(2);
  expect(res.data?.walk_count).toBe(1);
  expect(res.data?.has_dog).toBe(false);
});

test('myVerificationStatus surfaces error and null data on failure', async () => {
  mockRpc.mockResolvedValue({ data: null, error: { message: 'rpc error' } });

  const res = await myVerificationStatus();

  expect(res.data).toBeNull();
  expect(res.error).toBe('rpc error');
});

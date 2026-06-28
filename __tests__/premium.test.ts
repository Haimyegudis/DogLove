jest.mock('../src/lib/supabase', () => ({
  supabase: {
    rpc: jest.fn(),
  },
}));

import { amIPremium, setPremium } from '../src/services/premium';
import { supabase } from '../src/lib/supabase';

const mockRpc = supabase.rpc as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
});

test('amIPremium calls rpc("am_i_premium") and returns boolean data', async () => {
  mockRpc.mockResolvedValue({ data: true, error: null });
  const res = await amIPremium();
  expect(mockRpc).toHaveBeenCalledWith('am_i_premium');
  expect(res.data).toBe(true);
  expect(res.error).toBeNull();
});

test('amIPremium returns false when rpc returns false', async () => {
  mockRpc.mockResolvedValue({ data: false, error: null });
  const res = await amIPremium();
  expect(res.data).toBe(false);
  expect(res.error).toBeNull();
});

test('setPremium(true) calls rpc("set_premium", { p_on: true })', async () => {
  mockRpc.mockResolvedValue({ data: true, error: null });
  const res = await setPremium(true);
  expect(mockRpc).toHaveBeenCalledWith('set_premium', { p_on: true });
  expect(res.data).toBe(true);
  expect(res.error).toBeNull();
});

test('setPremium(false) calls rpc("set_premium", { p_on: false })', async () => {
  mockRpc.mockResolvedValue({ data: false, error: null });
  const res = await setPremium(false);
  expect(mockRpc).toHaveBeenCalledWith('set_premium', { p_on: false });
  expect(res.data).toBe(false);
  expect(res.error).toBeNull();
});

test('amIPremium surfaces rpc error string', async () => {
  mockRpc.mockResolvedValue({ data: null, error: { message: 'not authenticated' } });
  const res = await amIPremium();
  expect(res.error).toBe('not authenticated');
  expect(res.data).toBe(false);
});

test('setPremium surfaces rpc error string', async () => {
  mockRpc.mockResolvedValue({ data: null, error: { message: 'rpc failed' } });
  const res = await setPremium(true);
  expect(res.error).toBe('rpc failed');
});

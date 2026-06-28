let mockRpc: jest.Mock;

jest.mock('../src/lib/supabase', () => {
  const rpc = jest.fn();
  mockRpc = rpc;
  return { supabase: { rpc } };
});

import { compatibility } from '../src/services/compatibility';

beforeEach(() => jest.clearAllMocks());

test('compatibility calls dog_compatibility rpc with both dog ids', async () => {
  mockRpc.mockResolvedValue({
    data: [{ score: 75, reasons: ['גודל דומה', 'גזע זהה'] }],
    error: null,
  });

  const res = await compatibility('dog-a-uuid', 'dog-b-uuid');

  expect(mockRpc).toHaveBeenCalledWith('dog_compatibility', {
    p_dog_a: 'dog-a-uuid',
    p_dog_b: 'dog-b-uuid',
  });
  expect(res.error).toBeNull();
  expect(res.data).not.toBeNull();
  expect(res.data!.score).toBe(75);
  expect(res.data!.reasons).toEqual(['גודל דומה', 'גזע זהה']);
});

test('compatibility returns score and reasons from the first row', async () => {
  mockRpc.mockResolvedValue({
    data: [{ score: 40, reasons: ['גיל קרוב'] }],
    error: null,
  });

  const res = await compatibility('dog-c-uuid', 'dog-d-uuid');

  expect(res.data?.score).toBe(40);
  expect(res.data?.reasons).toContain('גיל קרוב');
});

test('compatibility propagates rpc error', async () => {
  mockRpc.mockResolvedValue({ data: null, error: { message: 'dog_a not found' } });

  const res = await compatibility('bad-uuid', 'dog-b-uuid');

  expect(res.data).toBeNull();
  expect(res.error).toBe('dog_a not found');
});

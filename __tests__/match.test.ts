let mockRpc: jest.Mock;
let mockInsert: jest.Mock;
let mockFrom: jest.Mock;

jest.mock('../src/lib/supabase', () => {
  const rpc = jest.fn();
  const insert = jest.fn();
  const from = jest.fn(() => ({ insert }));
  mockRpc = rpc;
  mockInsert = insert;
  mockFrom = from;
  return { supabase: { rpc, from } };
});

import { browseDogs, sendPlaydateRequest, listIncoming, listOutgoing, respondToRequest } from '../src/services/match';

beforeEach(() => jest.clearAllMocks());

test('browseDogs calls browse_dogs rpc and returns rows', async () => {
  mockRpc.mockResolvedValue({ data: [{ dog_id: 'd2', name: 'Bella' }], error: null });
  const res = await browseDogs(20);
  expect(mockRpc).toHaveBeenCalledWith('browse_dogs', { p_limit: 20 });
  expect(res.data).toHaveLength(1);
  expect(res.error).toBeNull();
});

test('sendPlaydateRequest inserts from/to dog ids', async () => {
  mockInsert.mockResolvedValue({ error: null });
  const res = await sendPlaydateRequest('d1', 'd2');
  expect(mockFrom).toHaveBeenCalledWith('playdate_requests');
  expect(mockInsert).toHaveBeenCalledWith({ from_dog_id: 'd1', to_dog_id: 'd2' });
  expect(res.error).toBeNull();
});

test('listIncoming calls incoming_requests rpc', async () => {
  mockRpc.mockResolvedValue({ data: [], error: null });
  await listIncoming();
  expect(mockRpc).toHaveBeenCalledWith('incoming_requests');
});

test('listOutgoing calls outgoing_requests rpc', async () => {
  mockRpc.mockResolvedValue({ data: [], error: null });
  await listOutgoing();
  expect(mockRpc).toHaveBeenCalledWith('outgoing_requests');
});

test('respondToRequest calls respond_to_request rpc with accept flag', async () => {
  mockRpc.mockResolvedValue({ error: null });
  const res = await respondToRequest('r1', true);
  expect(mockRpc).toHaveBeenCalledWith('respond_to_request', { p_request_id: 'r1', p_accept: true });
  expect(res.error).toBeNull();
});

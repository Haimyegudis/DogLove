jest.mock('../src/lib/supabase', () => {
  const order = jest.fn();
  const eq = jest.fn(() => ({ order }));
  const select = jest.fn(() => ({ eq }));
  const insert = jest.fn();
  const rpc = jest.fn();
  const subscribe = jest.fn();
  const on = jest.fn(() => ({ subscribe }));
  const channel = jest.fn(() => ({ on }));
  const removeChannel = jest.fn();
  return { supabase: { from: jest.fn(() => ({ select, insert })), rpc, channel, removeChannel,
    __m: { order, eq, select, insert, rpc, on, subscribe, channel, removeChannel } } };
});
import { listConversations, listMessages, sendMessage, subscribeMessages } from '../src/services/chat';
import { supabase } from '../src/lib/supabase';
const m = (supabase as any).__m;

beforeEach(() => jest.clearAllMocks());

test('listConversations calls list_conversations rpc', async () => {
  m.rpc.mockResolvedValue({ data: [{ conversation_id: 'c1' }], error: null });
  const res = await listConversations();
  expect(m.rpc).toHaveBeenCalledWith('list_conversations');
  expect(res.data).toHaveLength(1);
});

test('listMessages selects by conversation ordered by time', async () => {
  m.order.mockResolvedValue({ data: [{ id: 'm1' }], error: null });
  const res = await listMessages('c1');
  expect(m.eq).toHaveBeenCalledWith('conversation_id', 'c1');
  expect(res.data).toHaveLength(1);
});

test('sendMessage inserts body + sender + conversation', async () => {
  m.insert.mockResolvedValue({ error: null });
  const res = await sendMessage('c1', 'u1', 'hi');
  expect(m.insert).toHaveBeenCalledWith({ conversation_id: 'c1', sender_id: 'u1', body: 'hi' });
  expect(res.error).toBeNull();
});

test('subscribeMessages subscribes to inserts and unsubscribes', () => {
  m.subscribe.mockReturnValue('chan');
  const cb = jest.fn();
  const sub = subscribeMessages('c1', cb);
  expect(m.channel).toHaveBeenCalled();
  expect(m.on).toHaveBeenCalledWith('postgres_changes',
    expect.objectContaining({ event: 'INSERT', table: 'messages', filter: 'conversation_id=eq.c1' }),
    expect.any(Function));
  const handler = m.on.mock.calls[0][2];
  handler({ new: { id: 'm9' } });
  expect(cb).toHaveBeenCalledWith({ id: 'm9' });
  sub.unsubscribe();
  expect(m.removeChannel).toHaveBeenCalled();
});

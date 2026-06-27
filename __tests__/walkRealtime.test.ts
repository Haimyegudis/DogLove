jest.mock('../src/lib/supabase');

import { subscribeActiveWalks } from '../src/services/walkRealtime';
import { supabase } from '../src/lib/supabase';

const mockSubscribe = jest.fn(() => mockChannelObj);
const mockOn = jest.fn<any, any>(() => mockChannelObj);
const mockChannelObj: any = { on: mockOn, subscribe: mockSubscribe };
const mockChannel = jest.fn<any, any>(() => mockChannelObj);
const mockRemoveChannel = jest.fn<any, any>();

(supabase as any).channel = mockChannel;
(supabase as any).removeChannel = mockRemoveChannel;

beforeEach(() => jest.clearAllMocks());

test('subscribes to walk_sessions changes and unsubscribes', () => {
  const onChange = jest.fn();
  const sub = subscribeActiveWalks(onChange);
  expect(mockChannel).toHaveBeenCalled();
  expect(mockOn).toHaveBeenCalledWith(
    'postgres_changes',
    expect.objectContaining({ event: '*', schema: 'public', table: 'walk_sessions' }),
    expect.any(Function),
  );
  // simulate an event → onChange fires
  const handler = mockOn.mock.calls[0]?.[2] as Function | undefined;
  handler?.({});
  expect(onChange).toHaveBeenCalled();
  sub.unsubscribe();
  expect(mockRemoveChannel).toHaveBeenCalledWith(mockChannelObj);
});

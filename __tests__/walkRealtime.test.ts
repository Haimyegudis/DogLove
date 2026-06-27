const mockChannelObj: any = { on: jest.fn(), subscribe: jest.fn() };
mockChannelObj.on.mockReturnValue(mockChannelObj);
mockChannelObj.subscribe.mockReturnValue(mockChannelObj);
jest.mock('../src/lib/supabase', () => ({
  supabase: {
    channel: jest.fn(() => mockChannelObj),
    removeChannel: jest.fn(),
  },
}));
import { subscribeActiveWalks } from '../src/services/walkRealtime';
import { supabase } from '../src/lib/supabase';

const mockChannel = supabase.channel as jest.Mock;
const mockRemoveChannel = supabase.removeChannel as jest.Mock;

beforeEach(() => jest.clearAllMocks());

test('subscribes to walk_sessions changes and unsubscribes', () => {
  mockChannelObj.on.mockReturnValue(mockChannelObj);
  mockChannelObj.subscribe.mockReturnValue(mockChannelObj);
  mockChannel.mockReturnValue(mockChannelObj);
  const onChange = jest.fn();
  const sub = subscribeActiveWalks(onChange);
  expect(mockChannel).toHaveBeenCalled();
  expect(mockChannelObj.on).toHaveBeenCalledWith(
    'postgres_changes',
    expect.objectContaining({ event: '*', schema: 'public', table: 'walk_sessions' }),
    expect.any(Function),
  );
  // simulate an event → onChange fires
  const handler = (mockChannelObj.on as jest.Mock).mock.calls[0][2];
  handler({});
  expect(onChange).toHaveBeenCalled();
  sub.unsubscribe();
  expect(mockRemoveChannel).toHaveBeenCalledWith(mockChannelObj);
});

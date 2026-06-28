const mockUpload = jest.fn();
const mockGetPublicUrl = jest.fn();
jest.mock('../src/lib/supabase', () => ({
  supabase: { storage: { from: jest.fn(() => ({ upload: mockUpload, getPublicUrl: mockGetPublicUrl })) } },
}));
import { uploadImage } from '../src/services/storage';

beforeEach(() => {
  jest.clearAllMocks();
  // @ts-ignore
  global.fetch = jest.fn().mockResolvedValue({ arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)) });
});

test('uploads to <userId>/<now>.jpg and returns public url', async () => {
  mockUpload.mockResolvedValue({ error: null });
  mockGetPublicUrl.mockReturnValue({ data: { publicUrl: 'https://cdn/avatars/u1/123.jpg' } });
  const res = await uploadImage('avatars', 'u1', 'file:///tmp/pic.jpg', 123, 'r4nd');
  expect(global.fetch).toHaveBeenCalledWith('file:///tmp/pic.jpg');
  expect(mockUpload).toHaveBeenCalledWith('u1/123-r4nd.jpg', expect.any(ArrayBuffer), {
    contentType: 'image/jpeg', upsert: true,
  });
  expect(res.url).toBe('https://cdn/avatars/u1/123.jpg');
  expect(res.error).toBeNull();
});

test('returns the error when upload fails', async () => {
  mockUpload.mockResolvedValue({ error: { message: 'denied' } });
  const res = await uploadImage('avatars', 'u1', 'file:///tmp/pic.jpg', 123);
  expect(res.url).toBeNull();
  expect(res.error).toBe('denied');
});

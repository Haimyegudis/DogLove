const mockOrder = jest.fn();
const mockEqSel = jest.fn(() => ({ order: mockOrder }));
const mockSelect = jest.fn(() => ({ eq: mockEqSel }));
const mockInsert = jest.fn();
const mockEqUpd = jest.fn();
const mockUpdate = jest.fn(() => ({ eq: mockEqUpd }));
const mockEqDel = jest.fn();
const mockDel = jest.fn(() => ({ eq: mockEqDel }));
jest.mock('../src/lib/supabase', () => ({
  supabase: { from: jest.fn(() => ({ select: mockSelect, insert: mockInsert, update: mockUpdate, delete: mockDel })) },
}));
import { listMyDogs, createDog, updateDog, deleteDog } from '../src/services/dogs';

beforeEach(() => jest.clearAllMocks());

test('listMyDogs filters by owner and returns rows', async () => {
  mockOrder.mockResolvedValue({ data: [{ id: 'd1', name: 'Rocky' }], error: null });
  const res = await listMyDogs('u1');
  expect(mockSelect).toHaveBeenCalledWith('id, owner_id, name, breed, age, size, gender, photo_url, bio');
  expect(mockEqSel).toHaveBeenCalledWith('owner_id', 'u1');
  expect(res.data).toHaveLength(1);
  expect(res.error).toBeNull();
});

test('createDog inserts with the owner id', async () => {
  mockInsert.mockResolvedValue({ error: null });
  const res = await createDog('u1', { name: 'Rocky', breed: 'Lab', age: 3, size: 'L', gender: null, photo_url: 'u', bio: null });
  expect(mockInsert).toHaveBeenCalledWith({
    owner_id: 'u1', name: 'Rocky', breed: 'Lab', age: 3, size: 'L', gender: null, photo_url: 'u', bio: null,
  });
  expect(res.error).toBeNull();
});

test('updateDog updates by id', async () => {
  mockEqUpd.mockResolvedValue({ error: null });
  const res = await updateDog('d1', { name: 'Rex' });
  expect(mockUpdate).toHaveBeenCalledWith({ name: 'Rex' });
  expect(mockEqUpd).toHaveBeenCalledWith('id', 'd1');
  expect(res.error).toBeNull();
});

test('deleteDog deletes by id', async () => {
  mockEqDel.mockResolvedValue({ error: null });
  const res = await deleteDog('d1');
  expect(mockDel).toHaveBeenCalled();
  expect(mockEqDel).toHaveBeenCalledWith('id', 'd1');
  expect(res.error).toBeNull();
});

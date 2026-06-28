jest.mock('../src/lib/supabase', () => {
  const order = jest.fn();
  const eq = jest.fn(() => ({ order }));
  const select = jest.fn(() => ({ eq }));
  const insert = jest.fn();
  const deleteEq = jest.fn();
  const del = jest.fn(() => ({ eq: deleteEq }));
  return {
    supabase: {
      from: jest.fn(() => ({ select, insert, delete: del })),
      __m: { order, eq, select, insert, del, deleteEq },
    },
  };
});
import { listHealth, addHealth, deleteHealth } from '../src/services/health';
import { supabase } from '../src/lib/supabase';
const m = (supabase as any).__m;

beforeEach(() => jest.clearAllMocks());

test('listHealth selects and filters by dogId', async () => {
  m.order.mockResolvedValue({
    data: [{ id: 'rec-1', dog_id: 'dog-1', kind: 'vaccine', label: 'Rabies', event_date: '15-01-2024', notes: null, created_at: '2024-01-15T00:00:00Z' }],
    error: null,
  });
  const res = await listHealth('dog-1');
  expect(m.eq).toHaveBeenCalledWith('dog_id', 'dog-1');
  expect(res.data).toHaveLength(1);
  expect(res.error).toBeNull();
});

test('addHealth inserts the correct payload', async () => {
  m.insert.mockResolvedValue({ error: null });
  const res = await addHealth('owner-1', 'dog-1', 'vaccine', 'Rabies', '2024-01-15', 'note');
  expect(m.insert).toHaveBeenCalledWith({
    owner_id: 'owner-1',
    dog_id: 'dog-1',
    kind: 'vaccine',
    label: 'Rabies',
    event_date: '2024-01-15',
    notes: 'note',
  });
  expect(res.error).toBeNull();
});

test('deleteHealth deletes by id', async () => {
  m.deleteEq.mockResolvedValue({ error: null });
  const res = await deleteHealth('rec-1');
  expect(m.del).toHaveBeenCalled();
  expect(m.deleteEq).toHaveBeenCalledWith('id', 'rec-1');
  expect(res.error).toBeNull();
});

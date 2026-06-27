import { ageFromISO } from '../src/lib/age';

const now = new Date('2026-06-27T00:00:00Z');

test('computes whole years, true on the birthday', () => {
  expect(ageFromISO('2008-06-27', now)).toBe(18);
  expect(ageFromISO('2008-06-28', now)).toBe(17);
  expect(ageFromISO('2000-01-01', now)).toBe(26);
});

test('returns 0 for empty or invalid input', () => {
  expect(ageFromISO('', now)).toBe(0);
  expect(ageFromISO('not-a-date', now)).toBe(0);
});

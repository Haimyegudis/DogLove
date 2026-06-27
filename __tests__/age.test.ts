import { isAdult } from '../src/lib/age';

const now = new Date('2026-06-27T00:00:00Z');

describe('isAdult', () => {
  it('born 2008-06-27 → exactly 18 today → true', () => {
    expect(isAdult('2008-06-27', now)).toBe(true);
  });

  it('born 2008-06-28 → turns 18 tomorrow, still 17 → false', () => {
    expect(isAdult('2008-06-28', now)).toBe(false);
  });

  it('born 2000-01-01 → true', () => {
    expect(isAdult('2000-01-01', now)).toBe(true);
  });

  it('born 2010-01-01 → false', () => {
    expect(isAdult('2010-01-01', now)).toBe(false);
  });

  it('empty string → false', () => {
    expect(isAdult('', now)).toBe(false);
  });

  it('not-a-date → false', () => {
    expect(isAdult('not-a-date', now)).toBe(false);
  });
});

/**
 * Returns true iff a person born on `birthISO` (YYYY-MM-DD) is at least 18
 * years old as of `now`. Empty or unparseable strings return false.
 */
export function isAdult(birthISO: string, now: Date): boolean {
  if (!birthISO) return false;

  const birth = new Date(birthISO);
  // new Date on an invalid string gives NaN
  if (isNaN(birth.getTime())) return false;

  // Use UTC year/month/day so time-zone offsets don't shift the birthday
  const birthYear = birth.getUTCFullYear();
  const birthMonth = birth.getUTCMonth(); // 0-indexed
  const birthDay = birth.getUTCDate();

  const nowYear = now.getUTCFullYear();
  const nowMonth = now.getUTCMonth();
  const nowDay = now.getUTCDate();

  let age = nowYear - birthYear;

  // If this year's birthday hasn't arrived yet, subtract one
  if (
    nowMonth < birthMonth ||
    (nowMonth === birthMonth && nowDay < birthDay)
  ) {
    age -= 1;
  }

  return age >= 18;
}

import { strings, Lang } from '../src/i18n/strings';

// Pure t() helper — same logic as LanguageContext but without React.
// Guards against an undefined lang bucket (e.g. during initial load).
function t(lang: Lang, key: string): string {
  return (strings[lang]?.[key]) ?? strings.he[key] ?? key;
}

const heKeys = Object.keys(strings.he);
const enKeys = Object.keys(strings.en);

// 1. Every English key must also exist in Hebrew (parity: en ⊆ he)
test('every key in en also exists in he', () => {
  const missing = enKeys.filter((k) => !(k in strings.he));
  expect(missing).toEqual([]);
});

// 2. Every Hebrew key must also exist in English (parity: he ⊆ en)
test('every key in he also exists in en', () => {
  const missing = heKeys.filter((k) => !(k in strings.en));
  expect(missing).toEqual([]);
});

// 3. t() returns the correct value for a known key in each language
test('t() returns correct value for known keys', () => {
  expect(t('he', 'tabs.home')).toBe('בית');
  expect(t('en', 'tabs.home')).toBe('Home');
  expect(t('he', 'home.heroTitle')).toBe('היי, חבר הכלבים! 🐾');
  expect(t('en', 'home.heroTitle')).toBe('Hey, Dog Friend! 🐾');
});

// 4. t() falls back to Hebrew value when a key is missing from English
test('t() falls back to he when key missing from lang', () => {
  // Temporarily verify fallback logic with a key we know exists in he but
  // simulate "missing" by querying a non-existent lang cast as Lang
  const fakeLang = 'xx' as Lang;
  const result = t(fakeLang, 'tabs.home');
  // strings['xx'] is undefined → strings.he['tabs.home'] is returned
  expect(result).toBe('בית');
});

// 5. t() returns the key itself when it doesn't exist in either language
test('t() returns the key for a completely unknown key', () => {
  expect(t('he', 'nonexistent.key')).toBe('nonexistent.key');
  expect(t('en', 'nonexistent.key')).toBe('nonexistent.key');
});

// 6. Tab key spot-checks
test('tab keys are present and non-empty in both languages', () => {
  const tabKeys = ['tabs.home', 'tabs.map', 'tabs.playdates', 'tabs.messages', 'tabs.profile'];
  for (const key of tabKeys) {
    expect(strings.he[key]).toBeTruthy();
    expect(strings.en[key]).toBeTruthy();
  }
});

// 7. All 13 feature card title keys exist in both languages
test('all 13 feature card title keys present in both languages', () => {
  const cardTitleKeys = [
    'card.map.title', 'card.findFriend.title', 'card.search.title',
    'card.calendar.title', 'card.gallery.title', 'card.lostDog.title',
    'card.socialWalks.title', 'card.walkers.title', 'card.walkStats.title',
    'card.challenges.title', 'card.badges.title', 'card.places.title',
    'card.premium.title',
  ];
  for (const key of cardTitleKeys) {
    expect(strings.he[key]).toBeTruthy();
    expect(strings.en[key]).toBeTruthy();
  }
});

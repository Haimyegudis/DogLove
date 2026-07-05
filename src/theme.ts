// כלב LOVE — "Golden-Hour Dog Park" design system.
// Warm bone paper, sunset coral + raspberry love + leaf-green community, honey
// highlights, deep espresso ink. Tactile sticker-cards with a warm offset shadow.
// A characterful Hebrew display serif (Suez One) over a clean body (Heebo).
//
// Token NAMES are kept stable (legacy warm + cool sets both map here) so the
// whole app re-skins from this one file. New: `font.display`, `colors.gold`.

export const colors = {
  // --- Warm paper surfaces ---
  cream: '#FBF5EA',        // app background (warm bone)
  creamDeep: '#F3E7D2',
  peach: '#FCE8D6',

  // Primary energy — sunset coral (CTAs, walk/adventure)
  coral: '#FF6A3D',
  coralDeep: '#E8502A',
  coralSoft: '#FFE3D6',

  // Grounding text (warm espresso)
  caramel: '#7A6A5E',
  bark: '#2E211A',

  // Love accent in the wordmark
  heart: '#FF5D73',

  // Link / small pop — warm teal
  sky: '#2B8C8C',

  // Neutrals (warm)
  ink: '#3A2E27',
  // Secondary text — darkened from #9A8B80 (~3.0:1, failed WCAG AA) to #6B5D52,
  // which is 5.84:1 on cream and 6.34:1 on white → passes AA for 13px body text.
  inkSoft: '#6B5D52',
  white: '#FFFFFF',
  line: '#ECE0CF',
  danger: '#D7443E',

  // Honey highlight
  gold: '#E8992B',
  goldSoft: '#FBE9CC',

  // --- Dashboard / "cool" token set, remapped onto the warm palette ---
  bgApp: '#FBF5EA',
  brandDark: '#2E211A',    // wordmark + headings
  rose: '#FF5D73',         // the "love" accent / dating
  roseSoft: '#FFE0E3',
  purple: '#E8992B',       // honey (info/search cards)
  purpleSoft: '#FBE9CC',
  green: '#2F7A52',        // leaf (community/walks)
  greenSoft: '#DCEFE1',
  lineCool: '#ECE0CF',     // warm hairline
  inkCool: '#3A2E27',      // body text
  inkCoolSoft: '#6B5D52',  // secondary text — AA on cream (5.84:1) & white (6.34:1); was #9A8B80 (~3.0:1, failed AA)
};
// NOTE (contrast): `gold`/`purple` (#E8992B ≈ 2.1:1 on cream) and `rose`/`heart`
// (#FF5D73 ≈ 2.7:1 on cream) still FAIL WCAG AA as small text colors. They are
// kept for brand identity (badges, accents, large display) — avoid using them
// for 13px body copy; use `inkSoft`/`ink` for readable secondary/body text.

// Gradients (consumed by expo-linear-gradient `colors` prop).
export const gradients = {
  hero: ['#FFB23E', '#FF6A3D', '#FF5D73'] as const,    // golden hour: gold → coral → raspberry
  rose: ['#FF6A3D', '#FF5D73'] as const,
  green: ['#3E9B6A', '#2F7A52'] as const,
};

export const font = {
  // Body — Heebo (clean, Hebrew + Latin)
  regular: 'Heebo_400Regular',
  medium: 'Heebo_500Medium',
  bold: 'Heebo_700Bold',
  black: 'Heebo_800ExtraBold',
  // Display — Suez One (characterful Hebrew serif, for brand/hero/section)
  display: 'SuezOne_400Regular',
};

export const radius = {
  sm: 12,
  md: 16,
  lg: 22,
  pill: 999,
};

export const shadow = {
  // Tactile, warm offset lift (sticker-card feel)
  soft: {
    shadowColor: '#6B4A2E',
    shadowOpacity: 0.20,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 6,
  },
  card: {
    shadowColor: '#6B4A2E',
    shadowOpacity: 0.14,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 9 },
    elevation: 4,
  },
};

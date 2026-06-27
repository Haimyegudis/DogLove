// כלב LOVE — "Golden-Hour Dog Park" design system.
// Warm, friendly, dog-park-at-sunset palette with soft pillowy surfaces.

export const colors = {
  // Backgrounds — warm cream / sunset wash
  cream: '#FFF6EC',
  creamDeep: '#FBE7CE',
  peach: '#FFD9B7',

  // Primary — sunset coral (friendly, energetic)
  coral: '#FF7A4D',
  coralDeep: '#F2613B',
  coralSoft: '#FFE3D5',

  // Caramel / leash brown — grounding text + accents
  caramel: '#6B4A33',
  bark: '#3F2A1D',

  // Heart accent in the wordmark
  heart: '#E8455F',

  // Sky pop (links, small accents)
  sky: '#2BA7B0',

  // Neutrals on cream
  ink: '#3F2A1D',
  inkSoft: '#9A8472',
  white: '#FFFFFF',
  line: '#EAD7C2',
  danger: '#D7443E',

  // --- "Pastel Pup Dashboard" tokens (aligned to the reference mockup) ---
  bgApp: '#F4F5FB',        // cool light app background
  brandDark: '#2D2A4A',    // "כלב" wordmark + headings on light bg
  rose: '#FF5E8A',         // the "love" accent / primary pink
  roseSoft: '#FFE1EC',
  purple: '#7C5CE6',
  purpleSoft: '#EAE4FF',
  green: '#22C28B',
  greenSoft: '#D6F7EC',
  lineCool: '#E9E9F3',     // hairline on the cool background
  inkCool: '#3A3950',      // body text on light bg
  inkCoolSoft: '#8E8DA8',  // secondary text on light bg
};

// Gradients (consumed by expo-linear-gradient `colors` prop).
export const gradients = {
  hero: ['#7C5CE6', '#FF6FA5', '#FFB06B'] as const,    // purple → pink → peach
  rose: ['#FF6FA5', '#FF5E8A'] as const,
};

export const font = {
  // Rubik — rounded, friendly, supports Hebrew + Latin
  regular: 'Rubik_400Regular',
  medium: 'Rubik_500Medium',
  bold: 'Rubik_700Bold',
  black: 'Rubik_800ExtraBold',
};

export const radius = {
  sm: 12,
  md: 18,
  lg: 26,
  pill: 999,
};

export const shadow = {
  // Soft, warm-tinted lift for the pillowy button/card feel
  soft: {
    shadowColor: '#C2632F',
    shadowOpacity: 0.22,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  card: {
    shadowColor: '#B9743A',
    shadowOpacity: 0.14,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 12 },
    elevation: 4,
  },
};

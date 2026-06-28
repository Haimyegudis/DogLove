import { useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useOnboarding } from '../../src/hooks/useOnboarding';
import { colors, font, radius, shadow, gradients } from '../../src/theme';

// ---------------------------------------------------------------------------
// Slide data — Hebrew, RTL
// ---------------------------------------------------------------------------
interface Slide {
  emoji: string;
  title: string;
  subtitle: string;
}

const SLIDES: Slide[] = [
  {
    emoji: '🐕',
    title: 'מצא חברים לכלב',
    subtitle:
      'צור פגישות משחק (פלייד\'טים) וראה על המפה אילו כלבים פעילים עכשיו בקרבתך.',
  },
  {
    emoji: '🐾',
    title: 'הכר אנשים דרך הכלב',
    subtitle:
      'גלה בעלי כלבים שמתאימים לך — אישיות, גזע, ואזור — ויצור קשר בדרך הכי טבעית שיש.',
  },
  {
    emoji: '🌳',
    title: 'קהילה',
    subtitle:
      'הצטרף לטיולי קבוצה בפארקים, תאם עם מטיילי כלבים ומצא אירועים קהילתיים ליד הבית.',
  },
  {
    emoji: '🔒',
    title: 'פרטיות ובטיחות',
    subtitle:
      'מיקומך משותף רק בזמן הטיול. אפשרות חסימה ודיווח בכל עת. האפליקציה מיועדת לגילאי 18 ומעלה בלבד.',
  },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function OnboardingScreen() {
  const router = useRouter();
  const { markSeen } = useOnboarding();
  const { width } = useWindowDimensions();
  const scrollRef = useRef<ScrollView>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const isLast = activeIndex === SLIDES.length - 1;

  function handleScroll(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const idx = Math.round(e.nativeEvent.contentOffset.x / width);
    setActiveIndex(idx);
  }

  async function finish() {
    await markSeen();
    router.replace('/(app)/(tabs)');
  }

  function scrollToNext() {
    const next = Math.min(activeIndex + 1, SLIDES.length - 1);
    scrollRef.current?.scrollTo({ x: next * width, animated: true });
    setActiveIndex(next);
  }

  return (
    <SafeAreaView style={styles.safe}>
      {/* ── gradient header accent ── */}
      <LinearGradient colors={gradients.hero} style={styles.headerAccent} />

      {/* ── skip link ── */}
      <View style={styles.skipRow}>
        <Pressable onPress={finish} hitSlop={12}>
          <Text style={styles.skipText}>דלג</Text>
        </Pressable>
      </View>

      {/* ── horizontal pager ── */}
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        style={styles.pager}
        contentContainerStyle={{ width: width * SLIDES.length }}
        // LTR scroll direction so swipe-left advances; content is RTL inside each slide
      >
        {SLIDES.map((slide, i) => (
          <SlideCard key={i} slide={slide} width={width} />
        ))}
      </ScrollView>

      {/* ── dots indicator ── */}
      <View style={styles.dotsRow}>
        {SLIDES.map((_, i) => (
          <View
            key={i}
            style={[styles.dot, i === activeIndex && styles.dotActive]}
          />
        ))}
      </View>

      {/* ── CTA / next button ── */}
      <View style={styles.ctaWrap}>
        {isLast ? (
          <Pressable
            style={({ pressed }) => [styles.cta, shadow.soft, pressed && styles.pressed]}
            onPress={finish}
          >
            <LinearGradient colors={gradients.rose} style={styles.ctaGradient}>
              <Text style={styles.ctaText}>התחל 🐾</Text>
            </LinearGradient>
          </Pressable>
        ) : (
          <Pressable
            style={({ pressed }) => [styles.cta, shadow.soft, pressed && styles.pressed]}
            onPress={scrollToNext}
          >
            <LinearGradient colors={gradients.rose} style={styles.ctaGradient}>
              <Text style={styles.ctaText}>הבא ›</Text>
            </LinearGradient>
          </Pressable>
        )}
      </View>
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// SlideCard — individual slide
// ---------------------------------------------------------------------------
function SlideCard({ slide, width }: { slide: Slide; width: number }) {
  return (
    <View style={[styles.slide, { width }]}>
      <View style={[styles.emojiCircle, shadow.card]}>
        <Text style={styles.emoji}>{slide.emoji}</Text>
      </View>
      <Text style={styles.slideTitle}>{slide.title}</Text>
      <Text style={styles.slideSub}>{slide.subtitle}</Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles — theme tokens only, RTL text
// ---------------------------------------------------------------------------
const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.bgApp,
  },

  // gradient bar across the top
  headerAccent: {
    height: 6,
    borderRadius: radius.pill,
    marginHorizontal: 24,
    marginTop: 8,
  },

  skipRow: {
    alignItems: 'flex-end', // right side in LTR layout = visually left in RTL reading order
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 4,
  },
  skipText: {
    fontFamily: font.medium,
    fontSize: 15,
    color: colors.inkCoolSoft,
  },

  pager: {
    flex: 1,
  },

  slide: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 36,
    gap: 20,
  },

  emojiCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  emoji: {
    fontSize: 58,
  },

  slideTitle: {
    fontFamily: font.black,
    fontSize: 28,
    color: colors.brandDark,
    textAlign: 'right',
    writingDirection: 'rtl',
    alignSelf: 'stretch',
  },
  slideSub: {
    fontFamily: font.regular,
    fontSize: 16,
    color: colors.inkCool,
    textAlign: 'right',
    writingDirection: 'rtl',
    lineHeight: 26,
    alignSelf: 'stretch',
  },

  // dots
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.lineCool,
  },
  dotActive: {
    width: 24,
    backgroundColor: colors.rose,
  },

  // CTA
  ctaWrap: {
    paddingHorizontal: 28,
    paddingBottom: 24,
  },
  cta: {
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
  ctaGradient: {
    paddingVertical: 17,
    alignItems: 'center',
    borderRadius: radius.pill,
  },
  ctaText: {
    fontFamily: font.black,
    fontSize: 18,
    color: colors.white,
  },
  pressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.92,
  },
});

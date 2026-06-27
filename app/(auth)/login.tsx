import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import BrandLockup from '../../src/components/BrandLockup';
import DogParkBackground from '../../src/components/DogParkBackground';
import { signInWithEmail, signInWithGoogle } from '../../src/services/auth';
import { colors, font, radius, shadow } from '../../src/theme';

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  // Staggered entrance: the whole card floats up and fades in on mount.
  const rise = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(rise, {
      toValue: 1,
      duration: 650,
      useNativeDriver: true,
    }).start();
  }, [rise]);
  const cardStyle = {
    opacity: rise,
    transform: [
      { translateY: rise.interpolate({ inputRange: [0, 1], outputRange: [28, 0] }) },
    ],
  };

  async function onEmailLogin() {
    setBusy(true);
    const { error } = await signInWithEmail(email.trim(), password);
    setBusy(false);
    if (error) Alert.alert('שגיאת התחברות', error);
  }
  async function onGoogle() {
    const { error } = await signInWithGoogle();
    if (error) Alert.alert('שגיאת התחברות', error);
  }

  return (
    <DogParkBackground>
      <SafeAreaView style={styles.safe}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Hero */}
            <View style={styles.hero}>
              <View style={styles.badge}>
                <Text style={styles.badgeDog}>🐶</Text>
              </View>
              <BrandLockup size={44} />
              <Text style={styles.tagline}>חברים חדשים לכלב שלך — כאן ועכשיו</Text>
            </View>

            {/* Card */}
            <Animated.View style={[styles.card, shadow.card, cardStyle]}>
              <Pressable
                testID="google-btn"
                disabled={busy}
                style={({ pressed }) => [styles.google, pressed && styles.pressed]}
                onPress={onGoogle}
              >
                <View style={styles.googleG}>
                  <Text style={styles.googleGText}>G</Text>
                </View>
                <Text style={styles.googleText}>המשך עם Google</Text>
              </Pressable>

              <View style={styles.divider}>
                <View style={styles.line} />
                <Text style={styles.or}>או 🐾</Text>
                <View style={styles.line} />
              </View>

              <Text style={styles.label}>אימייל</Text>
              <TextInput
                style={styles.input}
                placeholder="you@example.com"
                placeholderTextColor={colors.inkSoft}
                autoCapitalize="none"
                keyboardType="email-address"
                value={email}
                onChangeText={setEmail}
              />

              <Text style={styles.label}>סיסמה</Text>
              <TextInput
                style={styles.input}
                placeholder="••••••••"
                placeholderTextColor={colors.inkSoft}
                secureTextEntry
                value={password}
                onChangeText={setPassword}
              />

              <Pressable
                testID="login-btn"
                disabled={busy}
                style={({ pressed }) => [styles.cta, shadow.soft, pressed && styles.pressed, busy && styles.ctaBusy]}
                onPress={onEmailLogin}
              >
                <Text style={styles.ctaText}>{busy ? 'רגע…' : 'בוא נצא לטיול 🦮'}</Text>
              </Pressable>
            </Animated.View>

            <Pressable onPress={() => router.push('/(auth)/signup')} style={styles.linkWrap}>
              <Text style={styles.link}>
                אין לך חשבון? <Text style={styles.linkStrong}>הרשמה</Text>
              </Text>
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </DogParkBackground>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safe: { flex: 1 },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 24, gap: 22 },

  hero: { alignItems: 'center', gap: 12 },
  badge: {
    width: 96,
    height: 96,
    borderRadius: 999,
    backgroundColor: colors.coralSoft,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: colors.white,
    ...shadow.soft,
  },
  badgeDog: { fontSize: 52 },
  tagline: {
    fontFamily: font.medium,
    fontSize: 15,
    color: colors.caramel,
    textAlign: 'center',
    writingDirection: 'rtl',
  },

  card: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: 22,
    gap: 12,
    borderWidth: 1,
    borderColor: colors.line,
  },

  google: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.line,
    borderRadius: radius.pill,
    paddingVertical: 14,
  },
  googleG: {
    width: 26,
    height: 26,
    borderRadius: 999,
    backgroundColor: colors.cream,
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleGText: { fontFamily: font.black, color: colors.coralDeep, fontSize: 16 },
  googleText: { fontFamily: font.bold, color: colors.ink, fontSize: 16 },

  divider: { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 2 },
  line: { flex: 1, height: 1, backgroundColor: colors.line },
  or: { fontFamily: font.medium, color: colors.inkSoft, fontSize: 13 },

  label: {
    fontFamily: font.medium,
    fontSize: 13,
    color: colors.caramel,
    textAlign: 'right',
    marginTop: 2,
  },
  input: {
    backgroundColor: colors.cream,
    borderWidth: 1.5,
    borderColor: colors.line,
    borderRadius: radius.md,
    paddingHorizontal: 16,
    paddingVertical: 13,
    fontSize: 16,
    fontFamily: font.regular,
    color: colors.ink,
    textAlign: 'right',
    writingDirection: 'rtl',
  },

  cta: {
    backgroundColor: colors.coral,
    borderRadius: radius.pill,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  ctaBusy: { backgroundColor: colors.coralDeep },
  ctaText: { fontFamily: font.black, color: colors.white, fontSize: 18 },

  pressed: { transform: [{ scale: 0.98 }], opacity: 0.92 },

  linkWrap: { alignItems: 'center' },
  link: { fontFamily: font.medium, color: colors.caramel, fontSize: 15 },
  linkStrong: { fontFamily: font.bold, color: colors.coralDeep },
});

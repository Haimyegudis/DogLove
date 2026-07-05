import { useState } from 'react';
import {
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Alert,
  View,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Link } from 'expo-router';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import DogParkBackground from '../../src/components/DogParkBackground';
import { signUpWithEmail } from '../../src/services/auth';
import { isAdult } from '../../src/lib/age';
import { useI18n } from '../../src/i18n/LanguageContext';
import { colors, font, radius, shadow } from '../../src/theme';

const pad = (n: number) => String(n).padStart(2, '0');
const toDisplay = (d: Date) => `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()}`;
const toISO = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

// Default the wheel to ~25 years ago so adults land near their year quickly.
function defaultDob(): Date {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 25);
  return d;
}

export default function Signup() {
  const router = useRouter();
  const { t } = useI18n();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [dob, setDob] = useState<Date | null>(null);
  const [showPicker, setShowPicker] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);

  function onPickerChange(event: DateTimePickerEvent, selected?: Date) {
    if (Platform.OS === 'android') {
      setShowPicker(false);
      if (event.type === 'set' && selected) setDob(selected);
    } else if (selected) {
      setDob(selected); // iOS spinner updates live
    }
  }

  async function onSignup() {
    if (!email.trim()) { Alert.alert(t('auth.missingFieldTitle'), t('auth.emailRequired')); return; }
    if (password.length < 6) { Alert.alert(t('auth.passwordShortTitle'), t('auth.passwordShortBody')); return; }
    if (!dob) { Alert.alert(t('auth.missingFieldTitle'), t('auth.dobRequired')); return; }

    const now = new Date();
    const utcToday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    if (!isAdult(toISO(dob), utcToday)) {
      Alert.alert(t('auth.signupFailedTitle'), t('auth.mustBeAdult'));
      return;
    }
    if (!agreed) {
      Alert.alert(t('auth.consentNeededTitle'), t('auth.consentNeededBody'));
      return;
    }

    setBusy(true);
    const { error } = await signUpWithEmail(email.trim(), password);
    setBusy(false);
    if (error) { Alert.alert(t('auth.signupFailedTitle'), error); return; }
    Alert.alert(
      t('auth.almostThereTitle'),
      t('auth.verifyEmailBody'),
    );
    router.replace('/(auth)/login');
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
            <View style={styles.hero}>
              <Text style={styles.heroDog} accessibilityLabel={t('auth.title')}>🐕</Text>
              <Text style={styles.title}>{t('auth.title')}</Text>
              <Text style={styles.sub}>{t('auth.subtitle')}</Text>
            </View>

            <View style={[styles.card, shadow.card]}>
              <Text style={styles.label}>{t('auth.email')}</Text>
              <TextInput
                style={styles.input}
                placeholder="you@example.com"
                placeholderTextColor={colors.inkSoft}
                autoCapitalize="none"
                keyboardType="email-address"
                accessibilityLabel={t('auth.email')}
                value={email}
                onChangeText={setEmail}
              />

              <Text style={styles.label}>{t('auth.password')}</Text>
              <TextInput
                style={styles.input}
                placeholder={t('auth.passwordPlaceholder')}
                placeholderTextColor={colors.inkSoft}
                secureTextEntry
                accessibilityLabel={t('auth.password')}
                value={password}
                onChangeText={setPassword}
              />

              <Text style={styles.label}>{t('auth.dob')}</Text>
              <Pressable
                testID="dob-field"
                style={styles.input}
                accessibilityRole="button"
                accessibilityLabel={t('auth.dob')}
                onPress={() => setShowPicker(true)}
              >
                <Text style={[styles.dobText, !dob && styles.dobPlaceholder]}>
                  {dob ? toDisplay(dob) : t('auth.dobPlaceholder')}
                </Text>
                <Text style={styles.dobIcon}>🎂</Text>
              </Pressable>
              <Text style={styles.hint}>{t('auth.ageHint')}</Text>

              {showPicker && (
                <View>
                  <DateTimePicker
                    value={dob ?? defaultDob()}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'spinner' : 'calendar'}
                    maximumDate={new Date()}
                    minimumDate={new Date(1900, 0, 1)}
                    onChange={onPickerChange}
                  />
                  {Platform.OS === 'ios' && (
                    <Pressable
                      style={styles.doneBtn}
                      accessibilityRole="button"
                      accessibilityLabel={t('auth.pickerDone')}
                      onPress={() => setShowPicker(false)}
                    >
                      <Text style={styles.doneText}>{t('auth.pickerDone')}</Text>
                    </Pressable>
                  )}
                </View>
              )}

              <Pressable
                style={styles.consentRow}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: agreed }}
                accessibilityLabel={t('auth.consentText')}
                onPress={() => setAgreed((v) => !v)}
              >
                <View style={[styles.checkbox, agreed && styles.checkboxOn]}>
                  {agreed ? <Text style={styles.checkmark}>✓</Text> : null}
                </View>
                <Text style={styles.consentText}>
                  {t('auth.consentText')}
                </Text>
              </Pressable>

              <View style={styles.legalRow}>
                <Link href="/privacy-policy" asChild>
                  <Pressable
                    accessibilityRole="link"
                    accessibilityLabel={t('auth.privacyLink')}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Text style={styles.legalLink}>{t('auth.privacyLink')}</Text>
                  </Pressable>
                </Link>
                <Text style={styles.legalSep}>·</Text>
                <Link href="/terms" asChild>
                  <Pressable
                    accessibilityRole="link"
                    accessibilityLabel={t('auth.termsLink')}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Text style={styles.legalLink}>{t('auth.termsLink')}</Text>
                  </Pressable>
                </Link>
              </View>

              <Pressable
                testID="signup-btn"
                disabled={busy}
                accessibilityRole="button"
                accessibilityLabel={t('auth.signupCta')}
                style={({ pressed }) => [styles.cta, shadow.soft, pressed && styles.pressed, (busy || !agreed) && styles.ctaBusy]}
                onPress={onSignup}
              >
                <Text style={styles.ctaText}>{busy ? t('auth.wait') : t('auth.signupCta')}</Text>
              </Pressable>
            </View>

            <Pressable
              onPress={() => router.replace('/(auth)/login')}
              accessibilityRole="button"
              accessibilityLabel={t('auth.loginLink')}
              style={styles.linkWrap}
            >
              <Text style={styles.link}>
                {t('auth.haveAccount')} <Text style={styles.linkStrong}>{t('auth.loginLink')}</Text>
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
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 24, gap: 20 },

  hero: { alignItems: 'center', gap: 6 },
  heroDog: { fontSize: 46 },
  title: { fontFamily: font.black, fontSize: 26, color: colors.bark, textAlign: 'center' },
  sub: { fontFamily: font.medium, fontSize: 14, color: colors.caramel, textAlign: 'center' },

  card: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: 22,
    gap: 8,
    borderWidth: 1,
    borderColor: colors.line,
  },

  label: { fontFamily: font.medium, fontSize: 13, color: colors.caramel, textAlign: 'right', marginTop: 6 },
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
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dobText: { fontFamily: font.regular, fontSize: 16, color: colors.ink },
  dobPlaceholder: { color: colors.inkSoft },
  dobIcon: { fontSize: 18 },
  hint: { fontFamily: font.regular, fontSize: 12, color: colors.inkSoft, textAlign: 'right' },

  doneBtn: { alignSelf: 'center', paddingVertical: 8, paddingHorizontal: 28, marginTop: 4 },
  doneText: { fontFamily: font.bold, color: colors.coralDeep, fontSize: 16 },

  consentRow: { flexDirection: 'row-reverse', alignItems: 'flex-start', gap: 10, marginTop: 12 },
  checkbox: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: colors.coral, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  checkboxOn: { backgroundColor: colors.coral },
  checkmark: { color: colors.white, fontSize: 15, fontFamily: font.bold },
  consentText: { flex: 1, fontFamily: font.regular, fontSize: 12, color: colors.caramel, textAlign: 'right', lineHeight: 17 },

  legalRow: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 6 },
  legalLink: { fontFamily: font.bold, fontSize: 13, color: colors.coralDeep, textDecorationLine: 'underline' },
  legalSep: { fontFamily: font.regular, fontSize: 13, color: colors.inkSoft },

  cta: {
    backgroundColor: colors.coral,
    borderRadius: radius.pill,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 14,
  },
  ctaBusy: { backgroundColor: colors.coralDeep },
  ctaText: { fontFamily: font.black, color: colors.white, fontSize: 18 },
  pressed: { transform: [{ scale: 0.98 }], opacity: 0.92 },

  linkWrap: { alignItems: 'center' },
  link: { fontFamily: font.medium, color: colors.caramel, fontSize: 15 },
  linkStrong: { fontFamily: font.bold, color: colors.coralDeep },
});

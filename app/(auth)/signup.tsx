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
import { useRouter } from 'expo-router';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import DogParkBackground from '../../src/components/DogParkBackground';
import { signUpWithEmail } from '../../src/services/auth';
import { isAdult } from '../../src/lib/age';
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
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [dob, setDob] = useState<Date | null>(null);
  const [showPicker, setShowPicker] = useState(false);
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
    if (!email.trim()) { Alert.alert('שדה חסר', 'יש להזין אימייל'); return; }
    if (password.length < 6) { Alert.alert('סיסמה קצרה מדי', 'לפחות 6 תווים'); return; }
    if (!dob) { Alert.alert('שדה חסר', 'יש לבחור תאריך לידה'); return; }

    const now = new Date();
    const utcToday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    if (!isAdult(toISO(dob), utcToday)) {
      Alert.alert('הרשמה נכשלה', 'עליך להיות בן 18 ומעלה כדי להירשם');
      return;
    }

    setBusy(true);
    const { error } = await signUpWithEmail(email.trim(), password);
    setBusy(false);
    if (error) { Alert.alert('הרשמה נכשלה', error); return; }
    Alert.alert('ברוך הבא לעדר! 🐾', 'החשבון נוצר. עכשיו אפשר להתחבר.');
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
              <Text style={styles.heroDog}>🐕</Text>
              <Text style={styles.title}>יצירת חשבון</Text>
              <Text style={styles.sub}>כמה פרטים קטנים ויוצאים לדרך</Text>
            </View>

            <View style={[styles.card, shadow.card]}>
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
                placeholder="לפחות 6 תווים"
                placeholderTextColor={colors.inkSoft}
                secureTextEntry
                value={password}
                onChangeText={setPassword}
              />

              <Text style={styles.label}>תאריך לידה</Text>
              <Pressable
                testID="dob-field"
                style={styles.input}
                onPress={() => setShowPicker(true)}
              >
                <Text style={[styles.dobText, !dob && styles.dobPlaceholder]}>
                  {dob ? toDisplay(dob) : 'בחר תאריך (יום-חודש-שנה)'}
                </Text>
                <Text style={styles.dobIcon}>🎂</Text>
              </Pressable>
              <Text style={styles.hint}>צריך להיות בן 18 ומעלה 🐾</Text>

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
                    <Pressable style={styles.doneBtn} onPress={() => setShowPicker(false)}>
                      <Text style={styles.doneText}>אישור</Text>
                    </Pressable>
                  )}
                </View>
              )}

              <Pressable
                testID="signup-btn"
                disabled={busy}
                style={({ pressed }) => [styles.cta, shadow.soft, pressed && styles.pressed, busy && styles.ctaBusy]}
                onPress={onSignup}
              >
                <Text style={styles.ctaText}>{busy ? 'רגע…' : 'הצטרפות 🐾'}</Text>
              </Pressable>
            </View>

            <Pressable onPress={() => router.replace('/(auth)/login')} style={styles.linkWrap}>
              <Text style={styles.link}>
                כבר יש לך חשבון? <Text style={styles.linkStrong}>התחברות</Text>
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

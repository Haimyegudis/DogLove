import { useEffect, useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, Alert, ScrollView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import DogParkBackground from '../../src/components/DogParkBackground';
import Avatar from '../../src/components/Avatar';
import FormField from '../../src/components/FormField';
import { useAuth } from '../../src/state/AuthContext';
import { getMyProfile, saveMyProfile } from '../../src/services/profile';
import { uploadImage } from '../../src/services/storage';
import { pickSquareImage } from '../../src/lib/pickImage';
import { isAdult } from '../../src/lib/age';
import { GENDER_OPTIONS, Gender } from '../../src/types/profile';
import { colors, font, radius, shadow } from '../../src/theme';

const pad = (n: number) => String(n).padStart(2, '0');
const toDisplay = (iso: string) => {
  const [y, m, d] = iso.split('-');
  return `${d}-${m}-${y}`;
};
const toISO = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export default function EditProfile() {
  const router = useRouter();
  const { session } = useAuth();
  const userId = session!.user.id;

  const [name, setName] = useState('');
  const [photo, setPhoto] = useState<string | null>(null);
  const [dob, setDob] = useState<string | null>(null);
  const [gender, setGender] = useState<Gender | null>(null);
  const [city, setCity] = useState('');
  const [bio, setBio] = useState('');
  const [showPicker, setShowPicker] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getMyProfile(userId).then(({ data }) => {
      if (!data) return;
      setName(data.display_name ?? '');
      setPhoto(data.photo_url);
      setDob(data.date_of_birth);
      setGender(data.gender);
      setCity(data.city ?? '');
      setBio(data.bio ?? '');
    });
  }, [userId]);

  async function onPickPhoto() {
    const uri = await pickSquareImage();
    if (uri) setPhoto(uri);
  }

  function onDateChange(event: DateTimePickerEvent, selected?: Date) {
    if (Platform.OS === 'android') setShowPicker(false);
    if (selected) setDob(toISO(selected));
  }

  async function onSave() {
    if (!name.trim()) { Alert.alert('שדה חסר', 'יש להזין שם'); return; }
    if (!dob) { Alert.alert('שדה חסר', 'יש לבחור תאריך לידה'); return; }
    const now = new Date();
    const utcToday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    if (!isAdult(dob, utcToday)) { Alert.alert('הרשמה נכשלה', 'עליך להיות בן 18 ומעלה'); return; }
    if (!gender) { Alert.alert('שדה חסר', 'יש לבחור מגדר'); return; }
    if (!photo) { Alert.alert('שדה חסר', 'יש להוסיף תמונת פרופיל'); return; }

    setBusy(true);
    let photoUrl = photo;
    if (photo.startsWith('file:')) {
      const up = await uploadImage('avatars', userId, photo);
      if (up.error) { setBusy(false); Alert.alert('שגיאת העלאה', up.error); return; }
      photoUrl = up.url!;
    }
    const { error } = await saveMyProfile(userId, {
      display_name: name.trim(), photo_url: photoUrl, date_of_birth: dob, gender, bio: bio.trim() || null, city: city.trim() || null,
    });
    setBusy(false);
    if (error) { Alert.alert('שמירה נכשלה', error); return; }
    router.replace('/(app)/(tabs)');
  }

  return (
    <DogParkBackground>
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>הפרופיל שלי</Text>

          <Pressable onPress={onPickPhoto} style={styles.avatarWrap}>
            <Avatar uri={photo} fallback="🧑" size={110} />
            <Text style={styles.changePhoto}>החלף תמונה 📷</Text>
          </Pressable>

          <View style={[styles.card, shadow.card]}>
            <FormField label="שם">
              <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="השם שלך" placeholderTextColor={colors.inkSoft} />
            </FormField>

            <FormField label="תאריך לידה">
              <Pressable style={styles.input} onPress={() => setShowPicker(true)}>
                <Text style={[styles.inputText, !dob && { color: colors.inkSoft }]}>
                  {dob ? toDisplay(dob) : 'בחר תאריך'}
                </Text>
              </Pressable>
            </FormField>
            {showPicker && (
              <DateTimePicker
                value={dob ? new Date(dob) : new Date(1995, 0, 1)}
                mode="date" display={Platform.OS === 'ios' ? 'spinner' : 'calendar'}
                maximumDate={new Date()} onChange={onDateChange}
              />
            )}

            <FormField label="מגדר">
              <View style={styles.chips}>
                {GENDER_OPTIONS.map((g) => (
                  <Pressable key={g.value} onPress={() => setGender(g.value)}
                    style={[styles.chip, gender === g.value && styles.chipOn]}>
                    <Text style={[styles.chipText, gender === g.value && styles.chipTextOn]}>{g.label}</Text>
                  </Pressable>
                ))}
              </View>
            </FormField>

            <FormField label="עיר">
              <TextInput style={styles.input} value={city} onChangeText={setCity} placeholder="עיר מגורים" placeholderTextColor={colors.inkSoft} />
            </FormField>

            <FormField label="קצת עליי (אופציונלי)">
              <TextInput style={[styles.input, styles.multiline]} value={bio} onChangeText={setBio}
                placeholder="ספר/י קצת..." placeholderTextColor={colors.inkSoft} multiline />
            </FormField>
          </View>

          <Pressable testID="save-profile" disabled={busy} onPress={onSave}
            style={({ pressed }) => [styles.cta, shadow.soft, pressed && styles.pressed]}>
            <Text style={styles.ctaText}>{busy ? 'שומר…' : 'שמירה 🐾'}</Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </DogParkBackground>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: 24, gap: 16 },
  title: { fontFamily: font.black, fontSize: 24, color: colors.bark, textAlign: 'center' },
  avatarWrap: { alignItems: 'center', gap: 8 },
  changePhoto: { fontFamily: font.medium, color: colors.coralDeep, fontSize: 14 },
  card: { backgroundColor: colors.white, borderRadius: radius.lg, padding: 20, borderWidth: 1, borderColor: colors.line },
  input: {
    backgroundColor: colors.cream, borderWidth: 1.5, borderColor: colors.line, borderRadius: radius.md,
    paddingHorizontal: 16, paddingVertical: 12, fontSize: 16, fontFamily: font.regular, color: colors.ink,
    textAlign: 'right', writingDirection: 'rtl',
  },
  inputText: { fontFamily: font.regular, fontSize: 16, color: colors.ink, textAlign: 'right' },
  multiline: { minHeight: 80, textAlignVertical: 'top' },
  chips: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8 },
  chip: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: radius.pill, borderWidth: 1.5, borderColor: colors.line, backgroundColor: colors.cream },
  chipOn: { backgroundColor: colors.coralSoft, borderColor: colors.coral },
  chipText: { fontFamily: font.medium, color: colors.caramel, fontSize: 14 },
  chipTextOn: { color: colors.coralDeep, fontFamily: font.bold },
  cta: { backgroundColor: colors.coral, borderRadius: radius.pill, paddingVertical: 16, alignItems: 'center' },
  ctaText: { fontFamily: font.black, color: colors.white, fontSize: 18 },
  pressed: { transform: [{ scale: 0.98 }], opacity: 0.92 },
});

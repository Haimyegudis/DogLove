import { useEffect, useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import DogParkBackground from '../../../src/components/DogParkBackground';
import Avatar from '../../../src/components/Avatar';
import FormField from '../../../src/components/FormField';
import { useAuth } from '../../../src/state/AuthContext';
import { listMyDogs, createDog, updateDog, deleteDog } from '../../../src/services/dogs';
import { uploadImage } from '../../../src/services/storage';
import { pickSquareImage } from '../../../src/lib/pickImage';
import { SIZE_OPTIONS, DogSize } from '../../../src/types/profile';
import { colors, font, radius, shadow } from '../../../src/theme';

export default function DogForm() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useAuth();
  const userId = session!.user.id;
  const isNew = id === 'new';

  const [name, setName] = useState('');
  const [breed, setBreed] = useState('');
  const [age, setAge] = useState('');
  const [size, setSize] = useState<DogSize | null>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [bio, setBio] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (isNew) return;
    listMyDogs(userId).then(({ data }) => {
      const dog = data.find((d) => d.id === id);
      if (!dog) return;
      setName(dog.name); setBreed(dog.breed); setAge(String(dog.age));
      setSize(dog.size); setPhoto(dog.photo_url); setBio(dog.bio ?? '');
    });
  }, [id, isNew, userId]);

  async function onPickPhoto() {
    const uri = await pickSquareImage();
    if (uri) setPhoto(uri);
  }

  async function onSave() {
    if (!name.trim()) { Alert.alert('שדה חסר', 'יש להזין שם'); return; }
    if (!breed.trim()) { Alert.alert('שדה חסר', 'יש להזין סוג/גזע'); return; }
    const ageNum = parseInt(age, 10);
    if (!age.trim() || isNaN(ageNum) || ageNum < 0) { Alert.alert('גיל לא תקין', 'הזן גיל במספרים'); return; }
    if (!photo) { Alert.alert('שדה חסר', 'יש להוסיף תמונה של הכלב'); return; }

    setBusy(true);
    let photoUrl = photo;
    if (photo.startsWith('file:')) {
      const up = await uploadImage('dog-photos', userId, photo);
      if (up.error) { setBusy(false); Alert.alert('שגיאת העלאה', up.error); return; }
      photoUrl = up.url!;
    }
    const payload = { name: name.trim(), breed: breed.trim(), age: ageNum, size, photo_url: photoUrl, bio: bio.trim() || null };
    const { error } = isNew ? await createDog(userId, payload) : await updateDog(id, payload);
    setBusy(false);
    if (error) { Alert.alert('שמירה נכשלה', error); return; }
    router.replace('/(app)/(tabs)');
  }

  function onDelete() {
    Alert.alert('למחוק את הכלב?', 'הפעולה אינה הפיכה', [
      { text: 'ביטול', style: 'cancel' },
      { text: 'מחק', style: 'destructive', onPress: async () => {
        const { error } = await deleteDog(id);
        if (error) { Alert.alert('מחיקה נכשלה', error); return; }
        router.replace('/(app)/(tabs)');
      } },
    ]);
  }

  return (
    <DogParkBackground>
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>{isNew ? 'כלב חדש 🐕' : 'עריכת כלב 🐕'}</Text>

          <Pressable onPress={onPickPhoto} style={styles.avatarWrap}>
            <Avatar uri={photo} fallback="🐶" size={110} />
            <Text style={styles.changePhoto}>תמונת הכלב 📷</Text>
          </Pressable>

          <View style={[styles.card, shadow.card]}>
            <FormField label="שם">
              <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="שם הכלב" placeholderTextColor={colors.inkSoft} />
            </FormField>
            <FormField label="סוג / גזע">
              <TextInput style={styles.input} value={breed} onChangeText={setBreed} placeholder="לדוגמה: לברדור" placeholderTextColor={colors.inkSoft} />
            </FormField>
            <FormField label="גיל (שנים)">
              <TextInput style={styles.input} value={age} onChangeText={setAge} keyboardType="number-pad" placeholder="3" placeholderTextColor={colors.inkSoft} />
            </FormField>
            <FormField label="גודל (אופציונלי)">
              <View style={styles.chips}>
                {SIZE_OPTIONS.map((s) => (
                  <Pressable key={s.value} onPress={() => setSize(size === s.value ? null : s.value)}
                    style={[styles.chip, size === s.value && styles.chipOn]}>
                    <Text style={[styles.chipText, size === s.value && styles.chipTextOn]}>{s.label}</Text>
                  </Pressable>
                ))}
              </View>
            </FormField>
            <FormField label="תיאור (אופציונלי)">
              <TextInput style={[styles.input, styles.multiline]} value={bio} onChangeText={setBio} placeholder="האופי, הרגלים..." placeholderTextColor={colors.inkSoft} multiline />
            </FormField>
          </View>

          <Pressable testID="save-dog" disabled={busy} onPress={onSave}
            style={({ pressed }) => [styles.cta, shadow.soft, pressed && styles.pressed]}>
            <Text style={styles.ctaText}>{busy ? 'שומר…' : 'שמירה 🐾'}</Text>
          </Pressable>

          {!isNew && (
            <Pressable onPress={onDelete} style={styles.deleteBtn}>
              <Text style={styles.deleteText}>מחיקת הכלב</Text>
            </Pressable>
          )}
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
  multiline: { minHeight: 80, textAlignVertical: 'top' },
  chips: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8 },
  chip: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: radius.pill, borderWidth: 1.5, borderColor: colors.line, backgroundColor: colors.cream },
  chipOn: { backgroundColor: colors.coralSoft, borderColor: colors.coral },
  chipText: { fontFamily: font.medium, color: colors.caramel, fontSize: 14 },
  chipTextOn: { color: colors.coralDeep, fontFamily: font.bold },
  cta: { backgroundColor: colors.coral, borderRadius: radius.pill, paddingVertical: 16, alignItems: 'center' },
  ctaText: { fontFamily: font.black, color: colors.white, fontSize: 18 },
  pressed: { transform: [{ scale: 0.98 }], opacity: 0.92 },
  deleteBtn: { alignItems: 'center', paddingVertical: 10 },
  deleteText: { fontFamily: font.medium, color: colors.danger, fontSize: 15 },
});

import { useState, useEffect } from 'react';
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import Avatar from '../../src/components/Avatar';
import { useAuth } from '../../src/state/AuthContext';
import { colors, font, radius, shadow } from '../../src/theme';
import { listMyDogs } from '../../src/services/dogs';
import { uploadImage } from '../../src/services/storage';
import { pickSquareImage } from '../../src/lib/pickImage';
import { getCurrentCoords } from '../../src/services/location';
import { reportLostDog } from '../../src/services/lost';
import MapPicker from '../../src/components/MapPicker';
import type { Dog } from '../../src/types/profile';
import type { Coords } from '../../src/types/walk';

export default function ReportLost() {
  const router = useRouter();
  const { session } = useAuth();
  const userId = session!.user.id;

  const [dogs, setDogs] = useState<Dog[]>([]);
  const [selectedDogId, setSelectedDogId] = useState<string | null>(null);
  const [dogName, setDogName] = useState('');
  const [photo, setPhoto] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [pin, setPin] = useState<Coords | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    listMyDogs(userId).then(({ data }) => setDogs(data));
    // Seed the map with the current location; the user can drag the pin.
    getCurrentCoords().then((c) => { if (c) setPin(c); });
  }, [userId]);

  function handleSelectDog(dog: Dog) {
    if (selectedDogId === dog.id) {
      setSelectedDogId(null);
      setDogName('');
      setPhoto(null);
    } else {
      setSelectedDogId(dog.id);
      setDogName(dog.name);
      setPhoto(dog.photo_url ?? null);
    }
  }

  async function handlePickPhoto() {
    const uri = await pickSquareImage();
    if (uri) {
      setPhoto(uri);
      setSelectedDogId(null);
    }
  }

  async function handleSubmit() {
    const name = dogName.trim();
    if (!name) {
      Alert.alert('שגיאה', 'הכנס שם כלב');
      return;
    }
    if (!note.trim()) {
      Alert.alert('שגיאה', 'הכנס הערה');
      return;
    }

    setSubmitting(true);
    try {
      // Prefer the pin the user dropped; fall back to current GPS.
      const coords = pin ?? (await getCurrentCoords());

      let photoUrl: string | null = photo;
      if (photo && photo.startsWith('file:')) {
        const { url: uploaded, error: uploadError } = await uploadImage('dog-photos', userId, photo);
        if (uploadError || !uploaded) {
          Alert.alert('שגיאה', uploadError ?? 'שגיאה בהעלאת התמונה');
          return;
        }
        photoUrl = uploaded;
      }

      const { error } = await reportLostDog(selectedDogId, name, photoUrl, note.trim(), coords);
      if (error) {
        Alert.alert('שגיאה', error);
        return;
      }

      Alert.alert('הצלחה', 'ההתראה נשלחה לקהילה');
      router.back();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      <Stack.Screen options={{ title: 'דווח על כלב נעדר 🚨' }} />

      {/* בחר כלב שלי */}
      {dogs.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>הכלבים שלי</Text>
          <View style={styles.chipsRow}>
            {dogs.map((dog) => {
              const selected = selectedDogId === dog.id;
              return (
                <Pressable
                  key={dog.id}
                  style={[styles.chip, selected && styles.chipSelected]}
                  onPress={() => handleSelectDog(dog)}
                >
                  <Avatar uri={dog.photo_url ?? null} size={28} fallback="🐶" />
                  <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                    {dog.name}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      ) : null}

      {/* שם כלב */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>שם הכלב</Text>
        <TextInput
          style={styles.input}
          placeholder="שם הכלב..."
          placeholderTextColor={colors.inkCoolSoft}
          value={dogName}
          onChangeText={(t) => { setDogName(t); setSelectedDogId(null); }}
          textAlign="right"
        />
      </View>

      {/* תמונה */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>תמונה (אופציונלי)</Text>
        <Pressable style={styles.pickButton} onPress={handlePickPhoto}>
          <Text style={styles.pickButtonText}>
            {photo ? 'החלף תמונה 📷' : 'בחר תמונה 📷'}
          </Text>
        </Pressable>
        {photo ? (
          <Image source={{ uri: photo }} style={styles.preview} resizeMode="cover" />
        ) : null}
      </View>

      {/* מיקום על המפה */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>סמן מיקום אחרון על המפה 📍</Text>
        <Text style={styles.locHint}>גע במפה כדי לסמן את המקום שבו נראה הכלב לאחרונה</Text>
        <View style={styles.mapBox}>
          <MapPicker initial={pin} onPick={setPin} />
        </View>
        <Pressable style={styles.locBtn} onPress={async () => { const c = await getCurrentCoords(); if (c) setPin(c); }}>
          <Text style={styles.locBtnText}>📍 השתמש במיקום הנוכחי</Text>
        </Pressable>
      </View>

      {/* הערה */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>הערה</Text>
        <TextInput
          style={styles.noteInput}
          placeholder="תאר את הכלב, מיקום אחרון, פרטי קשר..."
          placeholderTextColor={colors.inkCoolSoft}
          value={note}
          onChangeText={setNote}
          multiline
          textAlign="right"
          textAlignVertical="top"
        />
      </View>

      {/* כפתור שליחה */}
      <Pressable
        testID="report-lost"
        style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
        onPress={handleSubmit}
        disabled={submitting}
      >
        <Text style={styles.submitButtonText}>
          {submitting ? 'שולח...' : 'שלח התראה 🚨'}
        </Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.bgApp },
  container: { padding: 16, gap: 20, paddingBottom: 40 },
  section: { gap: 10 },
  sectionTitle: {
    fontFamily: font.bold,
    fontSize: 16,
    color: colors.brandDark,
    textAlign: 'right',
  },
  chipsRow: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: 8,
  },
  locHint: { fontFamily: font.regular, fontSize: 12, color: colors.inkCoolSoft, textAlign: 'right' },
  mapBox: { height: 220, borderRadius: radius.md, overflow: 'hidden', borderWidth: 1, borderColor: colors.lineCool },
  locBtn: { alignSelf: 'flex-end', backgroundColor: colors.greenSoft, borderRadius: radius.pill, paddingVertical: 7, paddingHorizontal: 14, borderWidth: 1, borderColor: colors.green },
  locBtnText: { fontFamily: font.bold, fontSize: 13, color: colors.green },
  chip: {
    backgroundColor: colors.roseSoft,
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 6,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
  },
  chipSelected: {
    backgroundColor: colors.rose,
  },
  chipText: {
    fontFamily: font.medium,
    fontSize: 14,
    color: colors.brandDark,
  },
  chipTextSelected: {
    color: colors.white,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.lineCool,
    borderRadius: radius.sm,
    padding: 12,
    fontFamily: font.regular,
    fontSize: 14,
    color: colors.brandDark,
    backgroundColor: colors.white,
  },
  pickButton: {
    backgroundColor: colors.roseSoft,
    borderRadius: radius.sm,
    padding: 14,
    alignItems: 'center',
  },
  pickButtonText: {
    fontFamily: font.bold,
    fontSize: 15,
    color: colors.rose,
  },
  preview: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: radius.sm,
  },
  noteInput: {
    borderWidth: 1,
    borderColor: colors.lineCool,
    borderRadius: radius.sm,
    padding: 12,
    minHeight: 100,
    fontFamily: font.regular,
    fontSize: 14,
    color: colors.brandDark,
    backgroundColor: colors.white,
  },
  submitButton: {
    backgroundColor: colors.rose,
    borderRadius: radius.sm,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
    ...shadow.soft,
  },
  submitButtonDisabled: { opacity: 0.6 },
  submitButtonText: {
    fontFamily: font.bold,
    fontSize: 16,
    color: colors.white,
  },
});

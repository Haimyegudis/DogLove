import { useState } from 'react';
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/state/AuthContext';
import { colors, font, radius } from '../../src/theme';
import { createSocialWalk } from '../../src/services/events';

function defaultDate() {
  const d = new Date();
  d.setHours(d.getHours() + 1, 0, 0, 0);
  return d;
}

export default function NewSocialWalk() {
  const router = useRouter();
  const { session } = useAuth();
  const userId = session!.user.id;

  const [title, setTitle] = useState('');
  const [locationName, setLocationName] = useState('');
  const [date, setDate] = useState<Date>(defaultDate);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pad = (n: number) => String(n).padStart(2, '0');
  const displayDate = `${pad(date.getDate())}-${pad(date.getMonth() + 1)}-${date.getFullYear()}`;
  const displayTime = `${pad(date.getHours())}:${pad(date.getMinutes())}`;

  async function handlePublish() {
    setError(null);
    if (!title.trim()) {
      setError('יש להזין כותרת לטיול');
      return;
    }
    setSubmitting(true);
    try {
      const { error: svcErr } = await createSocialWalk(
        userId,
        title.trim(),
        locationName.trim(),
        null,
        date.toISOString(),
      );
      if (svcErr) {
        setError(svcErr);
        return;
      }
      Alert.alert('הטיול פורסם! 🐾', 'כלבלבים ובעליהם יכולים עכשיו להצטרף', [
        { text: 'אוקי', onPress: () => router.back() },
      ]);
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
      {/* Title */}
      <View style={styles.field}>
        <Text style={styles.label}>שם הטיול</Text>
        <TextInput
          style={styles.input}
          placeholder="לדוגמה: טיול בוקר בפארק הירקון"
          placeholderTextColor={colors.inkCoolSoft}
          value={title}
          onChangeText={setTitle}
          textAlign="right"
        />
      </View>

      {/* Location */}
      <View style={styles.field}>
        <Text style={styles.label}>איפה נפגשים?</Text>
        <TextInput
          style={styles.input}
          placeholder="שם המקום או כתובת"
          placeholderTextColor={colors.inkCoolSoft}
          value={locationName}
          onChangeText={setLocationName}
          textAlign="right"
        />
      </View>

      {/* Date + Time */}
      <View style={styles.field}>
        <Text style={styles.label}>תאריך ושעה</Text>
        <View style={styles.dateRow}>
          {Platform.OS === 'ios' ? (
            <DateTimePicker
              value={date}
              mode="datetime"
              display="compact"
              onChange={(_e, d) => { if (d) setDate(d); }}
              style={styles.iosPicker}
            />
          ) : (
            <>
              <Pressable
                style={styles.dateBtn}
                onPress={() => setShowDatePicker(true)}
              >
                <Text style={styles.dateBtnText}>{displayDate}</Text>
              </Pressable>
              <Pressable
                style={styles.dateBtn}
                onPress={() => setShowTimePicker(true)}
              >
                <Text style={styles.dateBtnText}>{displayTime}</Text>
              </Pressable>
            </>
          )}
        </View>
        {showDatePicker && Platform.OS === 'android' ? (
          <DateTimePicker
            value={date}
            mode="date"
            display="default"
            onChange={(_e, d) => {
              setShowDatePicker(false);
              if (d) {
                const next = new Date(d);
                next.setHours(date.getHours(), date.getMinutes(), 0, 0);
                setDate(next);
              }
            }}
          />
        ) : null}
        {showTimePicker && Platform.OS === 'android' ? (
          <DateTimePicker
            value={date}
            mode="time"
            display="default"
            onChange={(_e, d) => {
              setShowTimePicker(false);
              if (d) {
                const next = new Date(date);
                next.setHours(d.getHours(), d.getMinutes(), 0, 0);
                setDate(next);
              }
            }}
          />
        ) : null}
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {/* Publish */}
      <Pressable
        testID="create-walk"
        style={[styles.publishBtn, submitting && styles.publishBtnDisabled]}
        onPress={handlePublish}
        disabled={submitting}
      >
        <Text style={styles.publishBtnText}>
          {submitting ? 'מפרסם...' : 'פרסם טיול 🐾'}
        </Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.bgApp },
  container: { padding: 20, gap: 20 },
  field: { gap: 8 },
  label: {
    fontFamily: font.bold,
    fontSize: 15,
    color: colors.brandDark,
    textAlign: 'right',
  },
  input: {
    borderWidth: 1,
    borderColor: colors.lineCool,
    borderRadius: radius.sm,
    padding: 12,
    fontFamily: font.regular,
    fontSize: 15,
    color: colors.inkCool,
    backgroundColor: colors.white,
  },
  dateRow: {
    flexDirection: 'row-reverse',
    gap: 10,
    alignItems: 'center',
  },
  dateBtn: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.lineCool,
    borderRadius: radius.sm,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  dateBtnText: {
    fontFamily: font.medium,
    fontSize: 15,
    color: colors.brandDark,
  },
  iosPicker: {
    flex: 1,
  },
  error: {
    fontFamily: font.regular,
    fontSize: 14,
    color: colors.danger,
    textAlign: 'right',
  },
  publishBtn: {
    backgroundColor: colors.rose,
    borderRadius: radius.sm,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  publishBtnDisabled: {
    opacity: 0.6,
  },
  publishBtnText: {
    fontFamily: font.bold,
    fontSize: 16,
    color: colors.white,
  },
});

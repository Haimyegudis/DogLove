import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Alert,
  ScrollView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, Stack } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useAuth } from '../../../src/state/AuthContext';
import { listHealth, addHealth, deleteHealth } from '../../../src/services/health';
import { HealthRecord, HEALTH_KINDS, HealthKind } from '../../../src/types/health';
import { colors, font, radius, shadow } from '../../../src/theme';

function formatDate(d: Date): string {
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

function kindColors(kind: HealthKind): { bg: string; border: string; text: string } {
  switch (kind) {
    case 'vaccine': return { bg: colors.greenSoft, border: colors.green, text: colors.green };
    case 'vet':     return { bg: colors.purpleSoft, border: colors.purple, text: colors.purple };
    case 'weight':  return { bg: colors.coralSoft, border: colors.coral, text: colors.coral };
    case 'med':     return { bg: colors.roseSoft, border: colors.rose, text: colors.rose };
    case 'note':    return { bg: colors.cream, border: colors.caramel, text: colors.caramel };
  }
}

export default function DogHealthScreen() {
  const { dogId } = useLocalSearchParams<{ dogId: string }>();
  const { session } = useAuth();
  const ownerId = session!.user.id;

  const [records, setRecords] = useState<HealthRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [kind, setKind] = useState<HealthKind>('vaccine');
  const [label, setLabel] = useState('');
  const [dateObj, setDateObj] = useState<Date | null>(null);
  const [showPicker, setShowPicker] = useState(false);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const loadRecords = useCallback(async () => {
    setLoading(true);
    const { data } = await listHealth(dogId);
    setRecords(data);
    setLoading(false);
  }, [dogId]);

  useEffect(() => {
    loadRecords();
  }, [loadRecords]);

  const onDateChange = (_: any, selected?: Date) => {
    setShowPicker(false);
    if (selected) setDateObj(selected);
  };

  async function onSave() {
    if (!label.trim()) {
      Alert.alert('שדה חסר', 'יש להזין תיאור/שם הרשומה');
      return;
    }
    setSaving(true);
    const { error } = await addHealth(
      ownerId,
      dogId,
      kind,
      label.trim(),
      dateObj ? formatDate(dateObj) : null,
      notes,
    );
    setSaving(false);
    if (error) {
      Alert.alert('שגיאה', error);
      return;
    }
    await loadRecords();
    // Reset form
    setLabel('');
    setDateObj(null);
    setNotes('');
    setKind('vaccine');
    setShowForm(false);
  }

  function onDelete(id: string) {
    Alert.alert('מחיקת רשומה', 'האם למחוק את הרשומה?', [
      { text: 'ביטול', style: 'cancel' },
      {
        text: 'מחק',
        style: 'destructive',
        onPress: async () => {
          const { error } = await deleteHealth(id);
          if (error) { Alert.alert('שגיאה', error); return; }
          await loadRecords();
        },
      },
    ]);
  }

  return (
    <>
      <Stack.Screen options={{ title: 'בריאות וחיסונים', headerBackTitle: 'חזור' }} />
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

          {/* Add record toggle button */}
          <Pressable
            onPress={() => setShowForm((v) => !v)}
            style={({ pressed }) => [styles.addBtn, pressed && styles.pressed]}
          >
            <Text style={styles.addBtnText}>{showForm ? '✕ ביטול' : '+ הוסף רשומה'}</Text>
          </Pressable>

          {/* Form */}
          {showForm && (
            <View style={[styles.formCard, shadow.card]}>
              {/* Kind chips */}
              <Text style={styles.fieldLabel}>סוג רשומה</Text>
              <View style={styles.kindRow}>
                {HEALTH_KINDS.map((k) => {
                  const kc = kindColors(k.value);
                  const selected = kind === k.value;
                  return (
                    <Pressable
                      key={k.value}
                      onPress={() => setKind(k.value)}
                      style={[
                        styles.kindChip,
                        { borderColor: kc.border, backgroundColor: selected ? kc.bg : colors.cream },
                      ]}
                    >
                      <Text style={[styles.kindChipText, { color: selected ? kc.text : colors.caramel }]}>
                        {k.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {/* Label input */}
              <Text style={styles.fieldLabel}>תיאור / שם *</Text>
              <TextInput
                style={styles.input}
                value={label}
                onChangeText={setLabel}
                placeholder="לדוגמה: חיסון כלבת"
                placeholderTextColor={colors.inkSoft}
                textAlign="right"
              />

              {/* Date picker */}
              <Text style={styles.fieldLabel}>תאריך (אופציונלי)</Text>
              <Pressable
                onPress={() => setShowPicker(true)}
                style={styles.dateBtn}
              >
                <Text style={styles.dateBtnText}>
                  {dateObj ? formatDate(dateObj) : 'בחר תאריך'}
                </Text>
              </Pressable>
              {showPicker && (
                <DateTimePicker
                  value={dateObj ?? new Date()}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'inline' : 'default'}
                  onChange={onDateChange}
                />
              )}

              {/* Notes input */}
              <Text style={styles.fieldLabel}>הערות (אופציונלי)</Text>
              <TextInput
                style={[styles.input, styles.multiline]}
                value={notes}
                onChangeText={setNotes}
                placeholder="הערות נוספות..."
                placeholderTextColor={colors.inkSoft}
                textAlign="right"
                multiline
              />

              {/* Save button */}
              <Pressable
                onPress={onSave}
                disabled={saving}
                style={({ pressed }) => [styles.saveBtn, pressed && styles.pressed]}
              >
                <Text style={styles.saveBtnText}>{saving ? 'שומר…' : 'שמירה'}</Text>
              </Pressable>
            </View>
          )}

          {/* Records list */}
          {loading ? (
            <Text style={styles.emptyText}>טוען…</Text>
          ) : records.length === 0 ? (
            <Text style={styles.emptyText}>אין רשומות בריאות עדיין</Text>
          ) : (
            records.map((rec) => {
              const kc = kindColors(rec.kind);
              const kindMeta = HEALTH_KINDS.find((k) => k.value === rec.kind);
              return (
                <View key={rec.id} style={[styles.recordCard, shadow.card]}>
                  <View style={styles.recordHeader}>
                    <View style={[styles.kindBadge, { backgroundColor: kc.bg, borderColor: kc.border }]}>
                      <Text style={[styles.kindBadgeText, { color: kc.text }]}>{kindMeta?.label}</Text>
                    </View>
                    <Pressable onPress={() => onDelete(rec.id)} style={styles.deleteBtn}>
                      <Text style={styles.deleteText}>מחק</Text>
                    </Pressable>
                  </View>
                  <Text style={styles.recordLabel}>{rec.label}</Text>
                  {rec.event_date ? (
                    <Text style={styles.recordDate}>{rec.event_date}</Text>
                  ) : null}
                  {rec.notes ? (
                    <Text style={styles.recordNotes}>{rec.notes}</Text>
                  ) : null}
                </View>
              );
            })
          )}
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.cream },
  scroll: { padding: 20, gap: 16 },

  // Add button
  addBtn: {
    backgroundColor: colors.purpleSoft,
    borderWidth: 1.5,
    borderColor: colors.purple,
    borderRadius: radius.pill,
    paddingVertical: 12,
    alignItems: 'center',
  },
  addBtnText: { fontFamily: font.bold, color: colors.purple, fontSize: 16 },

  // Form card
  formCard: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.line,
    gap: 10,
  },
  fieldLabel: { fontFamily: font.medium, color: colors.bark, fontSize: 14, textAlign: 'right' },

  // Kind chips
  kindRow: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8 },
  kindChip: {
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    borderWidth: 1.5,
  },
  kindChipText: { fontFamily: font.medium, fontSize: 14 },

  // Inputs
  input: {
    backgroundColor: colors.cream,
    borderWidth: 1.5,
    borderColor: colors.line,
    borderRadius: radius.md,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    fontFamily: font.regular,
    color: colors.ink,
    writingDirection: 'rtl',
  },
  multiline: { minHeight: 72, textAlignVertical: 'top' },

  // Date button
  dateBtn: {
    backgroundColor: colors.cream,
    borderWidth: 1.5,
    borderColor: colors.purple,
    borderRadius: radius.md,
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
  },
  dateBtnText: { fontFamily: font.medium, color: colors.purple, fontSize: 15 },

  // Save button
  saveBtn: {
    backgroundColor: colors.purple,
    borderRadius: radius.pill,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  saveBtnText: { fontFamily: font.black, color: colors.white, fontSize: 16 },

  // Record cards
  recordCard: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.line,
    gap: 6,
  },
  recordHeader: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' },
  kindBadge: {
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  kindBadgeText: { fontFamily: font.bold, fontSize: 12 },
  recordLabel: { fontFamily: font.medium, color: colors.bark, fontSize: 16, textAlign: 'right' },
  recordDate: { fontFamily: font.regular, color: colors.caramel, fontSize: 13, textAlign: 'right' },
  recordNotes: { fontFamily: font.regular, color: colors.inkSoft, fontSize: 13, textAlign: 'right' },

  // Delete
  deleteBtn: { paddingVertical: 4, paddingHorizontal: 10 },
  deleteText: { fontFamily: font.medium, color: colors.danger, fontSize: 14 },

  // Empty / loading
  emptyText: { fontFamily: font.regular, color: colors.inkSoft, fontSize: 15, textAlign: 'center', marginTop: 32 },

  pressed: { opacity: 0.8, transform: [{ scale: 0.98 }] },
});

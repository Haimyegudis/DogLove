import { useMemo, useState } from 'react';
import { View, Text, TextInput, Pressable, Modal, FlatList, StyleSheet } from 'react-native';
import { ISRAELI_CITIES } from '../data/cities';
import { colors, font, radius } from '../theme';

type Props = {
  value: string;
  onChange: (city: string) => void;
  placeholder?: string;
  onSubmit?: () => void;
};

// Free-text city field with a dropdown of common Israeli cities. The user can
// type anything OR tap ▾ to pick from the (live-filtered) list.
export default function CityPicker({ value, onChange, placeholder = 'עיר', onSubmit }: Props) {
  const [open, setOpen] = useState(false);

  const list = useMemo(() => {
    const q = value.trim();
    if (!q) return ISRAELI_CITIES;
    return ISRAELI_CITIES.filter((c) => c.includes(q));
  }, [value]);

  return (
    <View>
      <View style={styles.row}>
        <TextInput
          style={styles.input}
          placeholder={placeholder}
          placeholderTextColor={colors.inkCoolSoft}
          accessibilityLabel={placeholder}
          value={value}
          onChangeText={onChange}
          onSubmitEditing={onSubmit}
          returnKeyType="search"
          textAlign="right"
        />
        <Pressable
          style={styles.caret}
          onPress={() => setOpen(true)}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="בחירת יישוב מהרשימה"
        >
          <Text style={styles.caretText} importantForAccessibility="no">▾</Text>
        </Pressable>
      </View>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)} accessibilityRole="button" accessibilityLabel="סגירת רשימת היישובים">
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.sheetTitle}>בחר יישוב</Text>
            <FlatList
              data={list}
              keyExtractor={(c) => c}
              keyboardShouldPersistTaps="handled"
              style={styles.flatList}
              ListEmptyComponent={<Text style={styles.empty}>אין התאמה — אפשר להקליד ידנית</Text>}
              renderItem={({ item }) => (
                <Pressable
                  style={styles.cityRow}
                  onPress={() => { onChange(item); setOpen(false); }}
                  accessibilityRole="button"
                  accessibilityLabel={item}
                >
                  <Text style={styles.cityText}>{item}</Text>
                </Pressable>
              )}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row-reverse', alignItems: 'center', backgroundColor: colors.white, borderWidth: 1, borderColor: colors.lineCool, borderRadius: radius.md },
  input: { flex: 1, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, fontFamily: font.regular, color: colors.inkCool, textAlign: 'right', writingDirection: 'rtl' },
  caret: { paddingHorizontal: 14, paddingVertical: 10 },
  caretText: { fontSize: 16, color: colors.inkCoolSoft },
  backdrop: { flex: 1, backgroundColor: 'rgba(20,18,40,0.45)', justifyContent: 'center', padding: 28 },
  sheet: { backgroundColor: colors.white, borderRadius: radius.lg, padding: 16, maxHeight: '70%' },
  sheetTitle: { fontFamily: font.black, fontSize: 18, color: colors.brandDark, textAlign: 'center', marginBottom: 10 },
  flatList: { flexGrow: 0 },
  cityRow: { paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: colors.lineCool },
  cityText: { fontFamily: font.medium, fontSize: 16, color: colors.inkCool, textAlign: 'right' },
  empty: { fontFamily: font.regular, fontSize: 14, color: colors.inkCoolSoft, textAlign: 'center', paddingVertical: 16 },
});

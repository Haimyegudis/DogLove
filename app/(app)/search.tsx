import { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import DogCard from '../../src/components/DogCard';
import Avatar from '../../src/components/Avatar';
import CityPicker from '../../src/components/CityPicker';
import { searchDogs, searchUsers } from '../../src/services/search';
import type { BrowseDog } from '../../src/types/match';
import type { UserResult } from '../../src/types/search';
import { colors, font, radius } from '../../src/theme';

const GENDERS = [
  { v: null as string | null, label: 'הכל' },
  { v: 'female', label: 'נקבה' },
  { v: 'male', label: 'זכר' },
];

const INTENTS = [
  { v: 'friends', label: 'חברים 🐾' },
  { v: 'dates',   label: 'דייטים ❤️' },
  { v: 'walks',   label: 'טיולים 🦮' },
];

export default function Search() {
  const router = useRouter();
  const [mode, setMode] = useState<'dogs' | 'users'>('dogs');
  const [q, setQ] = useState('');
  const [gender, setGender] = useState<string | null>(null);
  const [city, setCity] = useState('');
  const [minAge, setMinAge] = useState(18);
  const [maxAge, setMaxAge] = useState(99);
  const [intent, setIntent] = useState<string[]>([]);
  const [dogs, setDogs] = useState<BrowseDog[]>([]);
  const [users, setUsers] = useState<UserResult[]>([]);

  function toggleIntent(v: string) {
    setIntent((prev) =>
      prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]
    );
  }

  async function run() {
    if (mode === 'dogs') {
      const { data, error } = await searchDogs(q, city);
      if (error) { Alert.alert('שגיאה', error); return; }
      setDogs(data);
    } else {
      const { data, error } = await searchUsers(q, gender, minAge, maxAge, city, intent);
      if (error) { Alert.alert('שגיאה', error); return; }
      setUsers(data);
    }
  }

  return (
    <View style={styles.screen}>
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>חיפוש 🔎</Text>

          <View style={styles.toggle}>
            <Pressable onPress={() => setMode('dogs')} style={[styles.tab, mode === 'dogs' && styles.tabOn]}>
              <Text style={[styles.tabText, mode === 'dogs' && styles.tabTextOn]}>כלבים</Text>
            </Pressable>
            <Pressable onPress={() => setMode('users')} style={[styles.tab, mode === 'users' && styles.tabOn]}>
              <Text style={[styles.tabText, mode === 'users' && styles.tabTextOn]}>בעלים</Text>
            </Pressable>
          </View>

          <TextInput style={styles.input}
            placeholder={mode === 'dogs' ? 'סוג/גזע, שם כלב או שם בעלים' : 'שם בעל/ת הכלב'}
            placeholderTextColor={colors.inkCoolSoft}
            value={q} onChangeText={setQ} onSubmitEditing={run} returnKeyType="search" />

          {mode === 'users' && (
            <>
              {/* Gender chips */}
              <View style={styles.chips}>
                {GENDERS.map((g) => (
                  <Pressable key={g.label} onPress={() => setGender(g.v)} style={[styles.chip, gender === g.v && styles.chipOn]}>
                    <Text style={[styles.chipText, gender === g.v && styles.chipTextOn]}>{g.label}</Text>
                  </Pressable>
                ))}
              </View>

              {/* Age range */}
              <View style={styles.ageRow}>
                <Text style={styles.ageLabel}>טווח גיל</Text>
                <View style={styles.ageInputs}>
                  <View style={styles.ageField}>
                    <Text style={styles.ageHint}>עד</Text>
                    <TextInput
                      style={styles.ageInput}
                      keyboardType="number-pad"
                      value={String(maxAge)}
                      onChangeText={(t) => {
                        const n = parseInt(t, 10);
                        if (!isNaN(n)) setMaxAge(Math.min(120, Math.max(minAge, n)));
                      }}
                      maxLength={3}
                    />
                  </View>
                  <Text style={styles.ageDash}>—</Text>
                  <View style={styles.ageField}>
                    <Text style={styles.ageHint}>מ</Text>
                    <TextInput
                      style={styles.ageInput}
                      keyboardType="number-pad"
                      value={String(minAge)}
                      onChangeText={(t) => {
                        const n = parseInt(t, 10);
                        if (!isNaN(n)) setMinAge(Math.max(0, Math.min(maxAge, n)));
                      }}
                      maxLength={3}
                    />
                  </View>
                </View>
              </View>

              {/* Intent chips */}
              <View style={styles.chips}>
                {INTENTS.map((i) => {
                  const on = intent.includes(i.v);
                  return (
                    <Pressable key={i.v} onPress={() => toggleIntent(i.v)} style={[styles.chip, on && styles.chipOn]}>
                      <Text style={[styles.chipText, on && styles.chipTextOn]}>{i.label}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </>
          )}

          <CityPicker value={city} onChange={setCity} placeholder="עיר (אופציונלי)" onSubmit={run} />

          <Pressable onPress={run} style={styles.searchBtn}><Text style={styles.searchText}>חפש</Text></Pressable>

          {mode === 'dogs'
            ? dogs.map((d) => (
                <DogCard key={d.dog_id} photo={d.photo_url} name={d.name} breed={d.breed}
                  subtitle={d.owner_name ?? undefined} onPress={() => router.push(`/(app)/request/${d.dog_id}`)} />
              ))
            : users.map((u) => (
                <Pressable key={u.user_id} style={styles.userRow} onPress={() => router.push('/(app)/owner-view/' + u.user_id)}>
                  <Avatar uri={u.photo_url} fallback="🧑" size={48} />
                  <View style={styles.userInfo}>
                    <Text style={styles.userName}>{u.display_name ?? 'בעל כלב'}</Text>
                    <Text style={styles.userMeta}>{u.age} · {u.gender === 'female' ? 'נקבה' : u.gender === 'male' ? 'זכר' : '—'} · {u.city ?? ''}</Text>
                  </View>
                  <Text style={styles.chevron}>‹</Text>
                </Pressable>
              ))}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bgApp },
  safe: { flex: 1 },
  scroll: { padding: 18, gap: 12 },
  title: { fontFamily: font.black, fontSize: 24, color: colors.brandDark, textAlign: 'center' },
  toggle: { flexDirection: 'row-reverse', gap: 8 },
  tab: { flex: 1, paddingVertical: 10, borderRadius: radius.pill, alignItems: 'center', backgroundColor: colors.white, borderWidth: 1, borderColor: colors.lineCool },
  tabOn: { backgroundColor: colors.roseSoft, borderColor: colors.rose },
  tabText: { fontFamily: font.medium, color: colors.inkCoolSoft },
  tabTextOn: { color: colors.rose, fontFamily: font.bold },
  input: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.lineCool, borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, fontFamily: font.regular, color: colors.inkCool, textAlign: 'right', writingDirection: 'rtl' },
  chips: { flexDirection: 'row-reverse', gap: 8 },
  chip: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.lineCool, backgroundColor: colors.white },
  chipOn: { backgroundColor: colors.roseSoft, borderColor: colors.rose },
  chipText: { fontFamily: font.medium, color: colors.inkCoolSoft, fontSize: 14 },
  chipTextOn: { color: colors.rose, fontFamily: font.bold },
  // Age range row
  ageRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10 },
  ageLabel: { fontFamily: font.medium, fontSize: 14, color: colors.inkCoolSoft },
  ageInputs: { flex: 1, flexDirection: 'row-reverse', alignItems: 'center', gap: 6 },
  ageField: { flexDirection: 'row-reverse', alignItems: 'center', gap: 4 },
  ageHint: { fontFamily: font.regular, fontSize: 13, color: colors.inkCoolSoft },
  ageInput: { width: 52, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.lineCool, borderRadius: radius.sm, paddingHorizontal: 8, paddingVertical: 6, fontSize: 15, fontFamily: font.bold, color: colors.inkCool, textAlign: 'center' },
  ageDash: { fontFamily: font.regular, fontSize: 16, color: colors.inkCoolSoft },
  // Search button
  searchBtn: { backgroundColor: colors.rose, borderRadius: radius.pill, paddingVertical: 13, alignItems: 'center' },
  searchText: { fontFamily: font.black, color: colors.white, fontSize: 16 },
  // User results
  userRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12, backgroundColor: colors.white, borderRadius: radius.lg, padding: 12, borderWidth: 1, borderColor: colors.lineCool },
  userInfo: { flex: 1 },
  userName: { fontFamily: font.bold, fontSize: 16, color: colors.brandDark, textAlign: 'right' },
  userMeta: { fontFamily: font.regular, fontSize: 13, color: colors.inkCoolSoft, textAlign: 'right' },
  chevron: { fontFamily: font.bold, fontSize: 22, color: colors.inkCoolSoft },
});

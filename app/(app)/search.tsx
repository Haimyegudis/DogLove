import { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import DogCard from '../../src/components/DogCard';
import Avatar from '../../src/components/Avatar';
import { searchDogs, searchUsers } from '../../src/services/search';
import type { BrowseDog } from '../../src/types/match';
import type { UserResult } from '../../src/types/search';
import { colors, font, radius } from '../../src/theme';

const GENDERS = [
  { v: null as string | null, label: 'הכל' },
  { v: 'female', label: 'נקבה' },
  { v: 'male', label: 'זכר' },
];

export default function Search() {
  const router = useRouter();
  const [mode, setMode] = useState<'dogs' | 'users'>('dogs');
  const [q, setQ] = useState('');
  const [gender, setGender] = useState<string | null>(null);
  const [dogs, setDogs] = useState<BrowseDog[]>([]);
  const [users, setUsers] = useState<UserResult[]>([]);

  async function run() {
    if (mode === 'dogs') setDogs((await searchDogs(q)).data);
    else setUsers((await searchUsers(gender, 18, 120)).data);
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

          {mode === 'dogs' ? (
            <TextInput style={styles.input} placeholder="סוג/גזע או שם" placeholderTextColor={colors.inkCoolSoft}
              value={q} onChangeText={setQ} onSubmitEditing={run} returnKeyType="search" />
          ) : (
            <View style={styles.chips}>
              {GENDERS.map((g) => (
                <Pressable key={g.label} onPress={() => setGender(g.v)} style={[styles.chip, gender === g.v && styles.chipOn]}>
                  <Text style={[styles.chipText, gender === g.v && styles.chipTextOn]}>{g.label}</Text>
                </Pressable>
              ))}
            </View>
          )}

          <Pressable onPress={run} style={styles.searchBtn}><Text style={styles.searchText}>חפש</Text></Pressable>

          {mode === 'dogs'
            ? dogs.map((d) => (
                <DogCard key={d.dog_id} photo={d.photo_url} name={d.name} breed={d.breed}
                  subtitle={d.owner_name ?? undefined} onPress={() => router.push(`/(app)/request/${d.dog_id}`)} />
              ))
            : users.map((u) => (
                <View key={u.user_id} style={styles.userRow}>
                  <Avatar uri={u.photo_url} fallback="🧑" size={48} />
                  <View style={styles.userInfo}>
                    <Text style={styles.userName}>{u.display_name ?? 'בעל כלב'}</Text>
                    <Text style={styles.userMeta}>{u.age} · {u.gender === 'female' ? 'נקבה' : u.gender === 'male' ? 'זכר' : '—'}</Text>
                  </View>
                </View>
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
  searchBtn: { backgroundColor: colors.rose, borderRadius: radius.pill, paddingVertical: 13, alignItems: 'center' },
  searchText: { fontFamily: font.black, color: colors.white, fontSize: 16 },
  userRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12, backgroundColor: colors.white, borderRadius: radius.lg, padding: 12, borderWidth: 1, borderColor: colors.lineCool },
  userInfo: { flex: 1 },
  userName: { fontFamily: font.bold, fontSize: 16, color: colors.brandDark, textAlign: 'right' },
  userMeta: { fontFamily: font.regular, fontSize: 13, color: colors.inkCoolSoft, textAlign: 'right' },
});

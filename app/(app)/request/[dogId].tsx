import { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import DogParkBackground from '../../../src/components/DogParkBackground';
import Avatar from '../../../src/components/Avatar';
import { useAuth } from '../../../src/state/AuthContext';
import { browseDogs, sendPlaydateRequest } from '../../../src/services/match';
import { listMyDogs } from '../../../src/services/dogs';
import type { BrowseDog } from '../../../src/types/match';
import type { Dog } from '../../../src/types/profile';
import { colors, font, radius, shadow } from '../../../src/theme';

export default function RequestPlaydate() {
  const router = useRouter();
  const { dogId } = useLocalSearchParams<{ dogId: string }>();
  const { session } = useAuth();
  const userId = session!.user.id;

  const [target, setTarget] = useState<BrowseDog | null>(null);
  const [myDogs, setMyDogs] = useState<Dog[]>([]);
  const [fromDog, setFromDog] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    browseDogs(100).then(({ data }) => setTarget(data.find((d) => d.dog_id === dogId) ?? null));
    listMyDogs(userId).then(({ data }) => { setMyDogs(data); if (data[0]) setFromDog(data[0].id); });
  }, [dogId, userId]);

  async function onSend() {
    if (!fromDog) { Alert.alert('אין כלב', 'הוסף קודם פרופיל כלב.'); return; }
    setBusy(true);
    const { error } = await sendPlaydateRequest(fromDog, dogId);
    setBusy(false);
    if (error) { Alert.alert('שליחה נכשלה', error); return; }
    Alert.alert('נשלח! 🐾', 'הבקשה נשלחה. תקבל עדכון כשיענו.');
    router.back();
  }

  return (
    <DogParkBackground>
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.scroll}>
          {target && (
            <View style={styles.targetCard}>
              <Avatar uri={target.photo_url} fallback="🐶" size={110} />
              <Text style={styles.name}>{target.name}</Text>
              <Text style={styles.meta}>{target.breed} · {target.age} שנים</Text>
              {target.owner_name ? <Text style={styles.owner}>הבעלים: {target.owner_name}</Text> : null}
            </View>
          )}

          <Text style={styles.section}>מי מבקש/ת לשחק?</Text>
          <View style={styles.chips}>
            {myDogs.map((d) => (
              <Pressable key={d.id} onPress={() => setFromDog(d.id)} style={[styles.chip, fromDog === d.id && styles.chipOn]}>
                <Text style={[styles.chipText, fromDog === d.id && styles.chipTextOn]}>{d.name}</Text>
              </Pressable>
            ))}
          </View>

          <Pressable testID="send-request" disabled={busy} onPress={onSend}
            style={({ pressed }) => [styles.cta, shadow.soft, pressed && styles.pressed]}>
            <Text style={styles.ctaText}>{busy ? 'שולח…' : 'בקשת משחק 🐾'}</Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </DogParkBackground>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: 24, gap: 16 },
  targetCard: { alignItems: 'center', gap: 6, backgroundColor: colors.white, borderRadius: radius.lg, padding: 22, borderWidth: 1, borderColor: colors.line },
  name: { fontFamily: font.black, fontSize: 24, color: colors.bark },
  meta: { fontFamily: font.medium, fontSize: 15, color: colors.caramel },
  owner: { fontFamily: font.regular, fontSize: 14, color: colors.inkSoft },
  section: { fontFamily: font.bold, fontSize: 16, color: colors.bark, textAlign: 'right', marginTop: 6 },
  chips: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8 },
  chip: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: radius.pill, borderWidth: 1.5, borderColor: colors.line, backgroundColor: colors.cream },
  chipOn: { backgroundColor: colors.coralSoft, borderColor: colors.coral },
  chipText: { fontFamily: font.medium, color: colors.caramel, fontSize: 14 },
  chipTextOn: { color: colors.coralDeep, fontFamily: font.bold },
  cta: { backgroundColor: colors.coral, borderRadius: radius.pill, paddingVertical: 16, alignItems: 'center', marginTop: 10 },
  ctaText: { fontFamily: font.black, color: colors.white, fontSize: 18 },
  pressed: { transform: [{ scale: 0.98 }], opacity: 0.92 },
});

import { useCallback, useState } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import DogParkBackground from '../../../src/components/DogParkBackground';
import DogCard from '../../../src/components/DogCard';
import { listIncoming, listOutgoing, respondToRequest } from '../../../src/services/match';
import type { PlaydateRequestRow } from '../../../src/types/match';
import { colors, font, radius, shadow } from '../../../src/theme';

const statusLabel: Record<string, string> = { pending: 'ממתין', accepted: 'אושר ✓', declined: 'נדחה' };

export default function Playdates() {
  const router = useRouter();
  const [incoming, setIncoming] = useState<PlaydateRequestRow[]>([]);
  const [outgoing, setOutgoing] = useState<PlaydateRequestRow[]>([]);

  const load = useCallback(() => {
    listIncoming().then(({ data, error }) => { if (error) { Alert.alert('שגיאה', error); return; } setIncoming(data); });
    listOutgoing().then(({ data, error }) => { if (error) { Alert.alert('שגיאה', error); return; } setOutgoing(data); });
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function respond(requestId: string, accept: boolean) {
    const { error } = await respondToRequest(requestId, accept);
    if (error) { Alert.alert('שגיאה', error); return; }
    load();
  }

  return (
    <DogParkBackground>
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <Pressable onPress={() => router.push('/(app)/browse')} style={[styles.browseBtn, shadow.soft]}>
            <Text style={styles.browseText}>+ חפש כלבים להכרות 🐾</Text>
          </Pressable>

          <Text style={styles.section}>בקשות שהתקבלו</Text>
          {incoming.length === 0 ? <Text style={styles.empty}>אין בקשות חדשות</Text> : incoming.map((r) => (
            <View key={r.request_id} style={styles.reqWrap}>
              <DogCard photo={r.dog_photo} name={r.dog_name} breed={r.dog_breed} subtitle={r.owner_name ?? undefined} right={statusLabel[r.status]} />
              {r.status === 'pending' && (
                <View style={styles.actions}>
                  <Pressable onPress={() => respond(r.request_id, true)} style={[styles.act, styles.accept]}><Text style={styles.actText}>אישור</Text></Pressable>
                  <Pressable onPress={() => respond(r.request_id, false)} style={[styles.act, styles.decline]}><Text style={styles.actTextDark}>דחייה</Text></Pressable>
                </View>
              )}
            </View>
          ))}

          <Text style={styles.section}>בקשות שנשלחו</Text>
          {outgoing.length === 0 ? <Text style={styles.empty}>עוד לא שלחת בקשות</Text> : outgoing.map((r) => (
            <DogCard key={r.request_id} photo={r.dog_photo} name={r.dog_name} breed={r.dog_breed} subtitle={r.owner_name ?? undefined} right={statusLabel[r.status]} />
          ))}
        </ScrollView>
      </SafeAreaView>
    </DogParkBackground>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: 20, gap: 12 },
  browseBtn: { backgroundColor: colors.coral, borderRadius: radius.pill, paddingVertical: 14, alignItems: 'center' },
  browseText: { fontFamily: font.black, color: colors.white, fontSize: 16 },
  section: { fontFamily: font.black, fontSize: 18, color: colors.bark, textAlign: 'right', marginTop: 10 },
  empty: { fontFamily: font.regular, color: colors.inkSoft, textAlign: 'center', paddingVertical: 8 },
  reqWrap: { gap: 8 },
  actions: { flexDirection: 'row-reverse', gap: 8 },
  act: { flex: 1, borderRadius: radius.pill, paddingVertical: 12, alignItems: 'center' },
  accept: { backgroundColor: colors.coral },
  decline: { backgroundColor: colors.cream, borderWidth: 1.5, borderColor: colors.line },
  actText: { fontFamily: font.bold, color: colors.white, fontSize: 15 },
  actTextDark: { fontFamily: font.bold, color: colors.caramel, fontSize: 15 },
});

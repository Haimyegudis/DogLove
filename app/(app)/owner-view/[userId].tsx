import { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView, Alert } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import Avatar from '../../../src/components/Avatar';
import DogCard from '../../../src/components/DogCard';
import PhotoGallery from '../../../src/components/PhotoGallery';
import VerifiedBadge from '../../../src/components/VerifiedBadge';
import { getOwnerCard, listOwnerDogs, type OwnerCard, type OwnerDog } from '../../../src/services/owners';
import { listOwnerPhotos, type GalleryPhoto } from '../../../src/services/gallery';
import { startConversation } from '../../../src/services/walkers';
import { blockUser, reportUser } from '../../../src/services/safety';
import { useAuth } from '../../../src/state/AuthContext';
import { GENDER_OPTIONS } from '../../../src/types/profile';
import { colors, font, radius, shadow } from '../../../src/theme';

const INTENT_LABEL: Record<string, string> = { friends: 'חברים 🐾', dates: 'דייטים ❤️', walks: 'טיולים 🦮' };
const genderLabel = (g: string | null) => GENDER_OPTIONS.find((o) => o.value === g)?.label ?? '';

export default function OwnerView() {
  const router = useRouter();
  const { session } = useAuth();
  const meId = session!.user.id;
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const [owner, setOwner] = useState<OwnerCard | null>(null);
  const [dogs, setDogs] = useState<OwnerDog[]>([]);
  const [photos, setPhotos] = useState<GalleryPhoto[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [{ data: o }, { data: d }, { data: ph }] = await Promise.all([
        getOwnerCard(userId), listOwnerDogs(userId), listOwnerPhotos(userId),
      ]);
      setOwner(o); setDogs(d); setPhotos(ph); setLoading(false);
    })();
  }, [userId]);

  async function onMessage() {
    const { data, error } = await startConversation(userId);
    if (error || !data) { Alert.alert('שגיאה', error ?? 'שגיאה'); return; }
    router.push(`/(app)/chat/${data}?name=${encodeURIComponent(owner?.display_name ?? 'בעלים')}`);
  }

  if (loading) return <View style={styles.screen}><Stack.Screen options={{ title: 'פרופיל' }} /></View>;
  if (!owner) return (
    <View style={styles.screen}>
      <Stack.Screen options={{ title: 'פרופיל' }} />
      <Text style={styles.empty}>הפרופיל לא זמין (ייתכן שהוא פרטי).</Text>
    </View>
  );

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ title: owner.display_name ?? 'פרופיל' }} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={[styles.card, shadow.card]}>
          <Avatar uri={owner.photo_url} fallback="🧑" size={110} />
          <Text style={styles.name}>{owner.display_name}</Text>
          <Text style={styles.meta}>
            {owner.age ? `${owner.age}` : ''}{owner.gender ? ` · ${genderLabel(owner.gender)}` : ''}{owner.city ? ` · ${owner.city}` : ''}
          </Text>
          <VerifiedBadge userId={owner.user_id} />
          {owner.intent && owner.intent.length > 0 ? (
            <View style={styles.intentRow}>
              {owner.intent.map((i) => <Text key={i} style={styles.intentTag}>{INTENT_LABEL[i] ?? i}</Text>)}
            </View>
          ) : null}
        </View>

        <View style={[styles.card2, shadow.card]}>
          <Text style={styles.sectionTitle}>התמונות שלי 📸</Text>
          <PhotoGallery photos={photos} emptyText="אין תמונות" />
        </View>

        <Text style={styles.sectionTitle}>הכלבים</Text>
        {dogs.length === 0 ? <Text style={styles.empty}>אין כלבים</Text> : dogs.map((d) => (
          <DogCard key={d.dog_id} photo={d.photo_url} name={d.name} breed={d.breed}
            onPress={() => router.push('/(app)/dog-view/' + d.dog_id)} />
        ))}

        <Pressable style={styles.msgBtn} onPress={onMessage}>
          <Text style={styles.msgBtnText}>שלח הודעה 💬</Text>
        </Pressable>

        <Pressable style={styles.safetyBtn} onPress={() => {
          Alert.alert('דיווח וחסימה', owner.display_name ?? '', [
            { text: 'ביטול', style: 'cancel' },
            { text: 'דווח', onPress: async () => { const { error } = await reportUser(meId, userId, 'דווח מפרופיל'); Alert.alert(error ? 'שגיאה' : 'תודה', error ?? 'הדיווח התקבל.'); } },
            { text: 'חסום', style: 'destructive', onPress: async () => { const { error } = await blockUser(meId, userId); if (error) { Alert.alert('שגיאה', error); return; } Alert.alert('נחסם', 'לא תראו עוד אחד את השני.'); router.back(); } },
          ]);
        }}>
          <Text style={styles.safetyText}>דיווח / חסימה 🚫</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bgApp },
  scroll: { padding: 18, gap: 12 },
  card: { backgroundColor: colors.white, borderRadius: radius.lg, padding: 18, gap: 6, alignItems: 'center', borderWidth: 1, borderColor: colors.lineCool },
  card2: { backgroundColor: colors.white, borderRadius: radius.lg, padding: 16, borderWidth: 1, borderColor: colors.lineCool },
  name: { fontFamily: font.black, fontSize: 22, color: colors.brandDark },
  meta: { fontFamily: font.medium, fontSize: 14, color: colors.inkCoolSoft },
  intentRow: { flexDirection: 'row-reverse', gap: 6, flexWrap: 'wrap', marginTop: 4 },
  intentTag: { fontFamily: font.bold, fontSize: 12, color: colors.purple, backgroundColor: colors.purpleSoft, borderRadius: radius.pill, paddingVertical: 4, paddingHorizontal: 10 },
  sectionTitle: { fontFamily: font.black, fontSize: 16, color: colors.brandDark, textAlign: 'right', marginTop: 4 },
  msgBtn: { backgroundColor: colors.rose, borderRadius: radius.pill, paddingVertical: 14, alignItems: 'center', marginTop: 6 },
  msgBtnText: { fontFamily: font.black, fontSize: 16, color: colors.white },
  safetyBtn: { alignSelf: 'center', paddingVertical: 8 },
  safetyText: { fontFamily: font.medium, color: colors.inkCoolSoft, fontSize: 13 },
  empty: { fontFamily: font.regular, color: colors.inkCoolSoft, textAlign: 'center', marginTop: 12 },
});


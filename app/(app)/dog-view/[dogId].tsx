import { useCallback, useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import Avatar from '../../../src/components/Avatar';
import PhotoGallery from '../../../src/components/PhotoGallery';
import VerifiedBadge from '../../../src/components/VerifiedBadge';
import CompatibilityBadge from '../../../src/components/CompatibilityBadge';
import { getDogCard, listMyDogs, type DogCard } from '../../../src/services/dogs';
import { listDogPhotos, type GalleryPhoto } from '../../../src/services/gallery';
import { startConversation } from '../../../src/services/walkers';
import { blockUser, reportUser } from '../../../src/services/safety';
import { useAuth } from '../../../src/state/AuthContext';
import { SIZE_OPTIONS, DOG_GENDER_OPTIONS } from '../../../src/types/profile';
import { colors, font, radius, shadow } from '../../../src/theme';

const sizeLabel = (s: string | null) => SIZE_OPTIONS.find((o) => o.value === s)?.label ?? '';
const genderLabel = (g: string | null) => DOG_GENDER_OPTIONS.find((o) => o.value === g)?.label ?? '';

export default function DogView() {
  const router = useRouter();
  const { dogId } = useLocalSearchParams<{ dogId: string }>();
  const { session } = useAuth();
  const userId = session!.user.id;

  const [card, setCard] = useState<DogCard | null>(null);
  const [photos, setPhotos] = useState<GalleryPhoto[]>([]);
  const [myDogId, setMyDogId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [{ data: c }, { data: ph }, { data: mine }] = await Promise.all([
        getDogCard(dogId),
        listDogPhotos(dogId),
        listMyDogs(userId),
      ]);
      setCard(c); setPhotos(ph); setMyDogId(mine[0]?.id ?? null);
      setLoading(false);
    })();
  }, [dogId, userId]);

  const onMessage = useCallback(async () => {
    if (!card) return;
    const { data, error } = await startConversation(card.owner_id);
    if (error || !data) { Alert.alert('שגיאה', error ?? 'שגיאה'); return; }
    router.push(`/(app)/chat/${data}?name=${encodeURIComponent(card.owner_name ?? 'בעלים')}`);
  }, [card, router]);

  function onBlockReport() {
    if (!card) return;
    const ownerId = card.owner_id;
    Alert.alert('דיווח / חסימה', undefined, [
      {
        text: 'דווח 🚩',
        onPress: async () => {
          const { error } = await reportUser(userId, ownerId, 'דווח מדף כלב');
          Alert.alert(error ? 'שגיאה' : 'תודה', error || 'הדיווח התקבל');
        },
      },
      {
        text: 'חסום 🚫',
        style: 'destructive',
        onPress: async () => {
          const { error } = await blockUser(userId, ownerId);
          if (error) { Alert.alert('שגיאה', error); return; }
          router.back();
        },
      },
      { text: 'ביטול', style: 'cancel' },
    ]);
  }

  if (loading) return <View style={styles.screen}><Stack.Screen options={{ title: 'כלב' }} /></View>;
  if (!card) return (
    <View style={styles.screen}>
      <Stack.Screen options={{ title: 'כלב' }} />
      <Text style={styles.empty}>הכרטיס לא זמין (ייתכן שהפרופיל פרטי).</Text>
    </View>
  );

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ title: card.name }} />
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={[styles.card, shadow.card]}>
            <Avatar uri={card.photo_url} fallback="🐶" size={120} />
            <Text style={styles.name}>{card.name}</Text>
            <Text style={styles.meta}>{card.breed} · {card.age} שנים{card.size ? ` · ${sizeLabel(card.size)}` : ''}{card.gender ? ` · ${genderLabel(card.gender)}` : ''}</Text>
            {card.bio ? <Text style={styles.bio}>{card.bio}</Text> : null}
            <View style={styles.ownerRow}>
              <Text style={styles.owner}>הבעלים: {card.owner_name ?? ''}</Text>
              <VerifiedBadge userId={card.owner_id} />
            </View>
          </View>

          {myDogId ? <CompatibilityBadge dogA={myDogId} dogB={dogId} /> : null}

          <View style={[styles.card, shadow.card]}>
            <Text style={styles.galleryTitle}>גלריה 📸</Text>
            <PhotoGallery photos={photos} emptyText="עדיין אין תמונות נוספות" />
          </View>

          <Pressable style={styles.msgBtn} onPress={onMessage}>
            <Text style={styles.msgBtnText}>שלח הודעה 💬</Text>
          </Pressable>

          <Pressable style={styles.reportBtn} onPress={onBlockReport}>
            <Text style={styles.reportBtnText}>דיווח / חסימה 🚫</Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bgApp },
  safe: { flex: 1 },
  scroll: { padding: 18, gap: 14 },
  card: { backgroundColor: colors.white, borderRadius: radius.lg, padding: 18, gap: 8, alignItems: 'center', borderWidth: 1, borderColor: colors.lineCool },
  name: { fontFamily: font.black, fontSize: 24, color: colors.brandDark },
  meta: { fontFamily: font.medium, fontSize: 14, color: colors.inkCoolSoft, textAlign: 'center' },
  bio: { fontFamily: font.regular, fontSize: 14, color: colors.inkCool, textAlign: 'center', lineHeight: 20 },
  ownerRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8, marginTop: 4 },
  owner: { fontFamily: font.regular, fontSize: 14, color: colors.inkCoolSoft },
  galleryTitle: { fontFamily: font.bold, fontSize: 15, color: colors.bark, textAlign: 'right', alignSelf: 'stretch' },
  msgBtn: { backgroundColor: colors.rose, borderRadius: radius.pill, paddingVertical: 14, alignItems: 'center' },
  msgBtnText: { fontFamily: font.black, fontSize: 16, color: colors.white },
  empty: { fontFamily: font.regular, color: colors.inkCoolSoft, textAlign: 'center', marginTop: 40 },
  reportBtn: { alignItems: 'center', paddingVertical: 10 },
  reportBtnText: { fontFamily: font.regular, fontSize: 14, color: colors.inkCoolSoft },
});

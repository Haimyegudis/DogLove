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
import { useI18n } from '../../../src/i18n/LanguageContext';
import { GENDER_OPTIONS } from '../../../src/types/profile';
import { colors, font, radius, shadow } from '../../../src/theme';

const genderLabel = (g: string | null) => GENDER_OPTIONS.find((o) => o.value === g)?.label ?? '';

export default function OwnerView() {
  const router = useRouter();
  const { t } = useI18n();
  const { session } = useAuth();
  const meId = session!.user.id;
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const INTENT_LABEL: Record<string, string> = { friends: t('ownerView.intentFriends'), dates: t('ownerView.intentDates'), walks: t('ownerView.intentWalks') };
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
    if (error || !data) { Alert.alert(t('ownerView.error'), error ?? t('ownerView.error')); return; }
    router.push(`/(app)/chat/${data}?name=${encodeURIComponent(owner?.display_name ?? t('ownerView.ownerFallback'))}`);
  }

  if (loading) return <View style={styles.screen}><Stack.Screen options={{ title: t('ownerView.title') }} /></View>;
  if (!owner) return (
    <View style={styles.screen}>
      <Stack.Screen options={{ title: t('ownerView.title') }} />
      <Text style={styles.empty}>{t('ownerView.unavailable')}</Text>
    </View>
  );

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ title: owner.display_name ?? t('ownerView.title') }} />
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
          <Text style={styles.sectionTitle}>{t('ownerView.myPhotos')}</Text>
          <PhotoGallery photos={photos} emptyText={t('ownerView.noPhotos')} />
        </View>

        <Text style={styles.sectionTitle}>{t('ownerView.dogs')}</Text>
        {dogs.length === 0 ? <Text style={styles.empty}>{t('ownerView.noDogs')}</Text> : dogs.map((d) => (
          <DogCard key={d.dog_id} photo={d.photo_url} name={d.name} breed={d.breed}
            onPress={() => router.push('/(app)/dog-view/' + d.dog_id)} />
        ))}

        <Pressable style={styles.msgBtn} onPress={onMessage} accessibilityRole="button" accessibilityLabel={t('ownerView.sendMessage')}>
          <Text style={styles.msgBtnText}>{t('ownerView.sendMessage')}</Text>
        </Pressable>

        <Pressable style={styles.safetyBtn} accessibilityRole="button" accessibilityLabel={t('ownerView.reportBlock')} onPress={() => {
          Alert.alert(t('ownerView.reportBlockTitle'), owner.display_name ?? '', [
            { text: t('common.cancel'), style: 'cancel' },
            { text: t('ownerView.report'), onPress: async () => { const { error } = await reportUser(meId, userId, 'דווח מפרופיל'); Alert.alert(error ? t('ownerView.error') : t('ownerView.thanks'), error ?? t('ownerView.reportReceived')); } },
            { text: t('ownerView.block'), style: 'destructive', onPress: async () => { const { error } = await blockUser(meId, userId); if (error) { Alert.alert(t('ownerView.error'), error); return; } Alert.alert(t('ownerView.blocked'), t('ownerView.blockedMsg')); router.back(); } },
          ]);
        }}>
          <Text style={styles.safetyText}>{t('ownerView.reportBlock')}</Text>
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


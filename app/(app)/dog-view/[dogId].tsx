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
import { useI18n } from '../../../src/i18n/LanguageContext';
import { SIZE_OPTIONS, DOG_GENDER_OPTIONS } from '../../../src/types/profile';
import { colors, font, radius, shadow } from '../../../src/theme';

const sizeLabel = (s: string | null) => SIZE_OPTIONS.find((o) => o.value === s)?.label ?? '';
const genderLabel = (g: string | null) => DOG_GENDER_OPTIONS.find((o) => o.value === g)?.label ?? '';

export default function DogView() {
  const router = useRouter();
  const { t } = useI18n();
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
    if (error || !data) { Alert.alert(t('dogView.error'), error ?? t('dogView.error')); return; }
    router.push(`/(app)/chat/${data}?name=${encodeURIComponent(card.owner_name ?? t('dogView.ownerFallback'))}`);
  }, [card, router]);

  function onBlockReport() {
    if (!card) return;
    const ownerId = card.owner_id;
    Alert.alert(t('dogView.reportBlockTitle'), undefined, [
      {
        text: t('dogView.report'),
        onPress: async () => {
          const { error } = await reportUser(userId, ownerId, 'דווח מדף כלב');
          Alert.alert(error ? t('dogView.error') : t('dogView.thanks'), error || t('dogView.reportReceived'));
        },
      },
      {
        text: t('dogView.block'),
        style: 'destructive',
        onPress: async () => {
          const { error } = await blockUser(userId, ownerId);
          if (error) { Alert.alert(t('dogView.error'), error); return; }
          router.back();
        },
      },
      { text: t('common.cancel'), style: 'cancel' },
    ]);
  }

  if (loading) return <View style={styles.screen}><Stack.Screen options={{ title: t('dogView.title') }} /></View>;
  if (!card) return (
    <View style={styles.screen}>
      <Stack.Screen options={{ title: t('dogView.title') }} />
      <Text style={styles.empty}>{t('dogView.unavailable')}</Text>
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
            <Text style={styles.meta}>{card.breed} · {card.age} {t('dogView.years')}{card.size ? ` · ${sizeLabel(card.size)}` : ''}{card.gender ? ` · ${genderLabel(card.gender)}` : ''}</Text>
            {card.bio ? <Text style={styles.bio}>{card.bio}</Text> : null}
            <View style={styles.ownerRow}>
              <Text style={styles.owner}>{t('dogView.owner')} {card.owner_name ?? ''}</Text>
              <VerifiedBadge userId={card.owner_id} />
            </View>
          </View>

          {myDogId ? <CompatibilityBadge dogA={myDogId} dogB={dogId} /> : null}

          <View style={[styles.card, shadow.card]}>
            <Text style={styles.galleryTitle}>{t('dogView.gallery')}</Text>
            <PhotoGallery photos={photos} emptyText={t('dogView.noPhotos')} />
          </View>

          <Pressable style={styles.msgBtn} onPress={onMessage} accessibilityRole="button" accessibilityLabel={t('dogView.sendMessage')}>
            <Text style={styles.msgBtnText}>{t('dogView.sendMessage')}</Text>
          </Pressable>

          <Pressable style={styles.reportBtn} onPress={onBlockReport} accessibilityRole="button" accessibilityLabel={t('dogView.reportBlock')}>
            <Text style={styles.reportBtnText}>{t('dogView.reportBlock')}</Text>
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

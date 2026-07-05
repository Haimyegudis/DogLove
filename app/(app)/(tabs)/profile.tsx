import { useCallback, useState } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView, Switch, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import DogParkBackground from '../../../src/components/DogParkBackground';
import BrandLockup from '../../../src/components/BrandLockup';
import Avatar from '../../../src/components/Avatar';
import VerifiedBadge from '../../../src/components/VerifiedBadge';
import { PremiumBadge } from '../../../src/components/PremiumBadge';
import PhotoGallery from '../../../src/components/PhotoGallery';
import { listOwnerPhotos, addGalleryPhoto, deleteGalleryPhoto, type GalleryPhoto } from '../../../src/services/gallery';
import { uploadImage } from '../../../src/services/storage';
import { pickMultipleImages } from '../../../src/lib/pickImage';
import { useAuth } from '../../../src/state/AuthContext';
import { useI18n } from '../../../src/i18n/LanguageContext';
import { getMyProfile } from '../../../src/services/profile';
import { amIPremium } from '../../../src/services/premium';
import { getWalkerStatus, setWalker } from '../../../src/services/walkers';
import { requestLocationPermission, getCurrentCoords } from '../../../src/services/location';
import { listMyDogs } from '../../../src/services/dogs';
import { ageFromISO } from '../../../src/lib/age';
import { OwnerProfile, Dog, GENDER_OPTIONS } from '../../../src/types/profile';
import { colors, font, radius, shadow } from '../../../src/theme';

const genderLabel = (g: OwnerProfile['gender']) => GENDER_OPTIONS.find((o) => o.value === g)?.label ?? '';

export default function Home() {
  const router = useRouter();
  const { session, signOut } = useAuth();
  const { t } = useI18n();
  const userId = session!.user.id;
  const [profile, setProfile] = useState<OwnerProfile | null>(null);
  const [dogs, setDogs] = useState<Dog[]>([]);
  const [premium, setPremium] = useState(false);
  const [isWalker, setIsWalker] = useState(false);
  const [walkerBusy, setWalkerBusy] = useState(false);
  const [photos, setPhotos] = useState<GalleryPhoto[]>([]);
  const [photosBusy, setPhotosBusy] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      getMyProfile(userId).then(({ data }) => active && setProfile(data));
      listMyDogs(userId).then(({ data }) => active && setDogs(data));
      amIPremium().then(({ data }) => active && setPremium(!!data));
      getWalkerStatus(userId).then(({ data }) => active && setIsWalker(data));
      listOwnerPhotos(userId).then(({ data }) => active && setPhotos(data));
      return () => { active = false; };
    }, [userId]),
  );

  async function onAddPhotos() {
    const uris = await pickMultipleImages();
    if (uris.length === 0) return;
    setPhotosBusy(true);
    for (const uri of uris) {
      const up = await uploadImage('dog-photos', userId, uri);
      if (up.url) await addGalleryPhoto(userId, null, up.url);
    }
    const { data, error } = await listOwnerPhotos(userId);
    if (error) Alert.alert(t('profile.error'), error);
    else setPhotos(data);
    setPhotosBusy(false);
  }

  async function onDeletePhoto(photoId: string) {
    await deleteGalleryPhoto(photoId);
    setPhotos((prev) => prev.filter((p) => p.id !== photoId));
  }

  async function onToggleWalker(value: boolean) {
    setWalkerBusy(true);
    try {
      let coords = null;
      if (value) {
        // Capture location so the user shows up in radius-based walker search.
        const ok = await requestLocationPermission();
        if (ok) coords = await getCurrentCoords();
      }
      const { error } = await setWalker(userId, value, coords);
      if (error) { Alert.alert(t('profile.error'), error); return; }
      setIsWalker(value);
      if (value && !coords) {
        Alert.alert(t('profile.walkerOnTitle'), t('profile.walkerOnMsg'));
      }
    } finally {
      setWalkerBusy(false);
    }
  }

  const incomplete = !profile?.display_name || !profile?.photo_url || !profile?.date_of_birth;
  const now = new Date();
  const utcToday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

  return (
    <DogParkBackground>
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={styles.topbar}>
            <BrandLockup size={28} />
            <View style={styles.topbarActions}>
              <Pressable onPress={() => router.push('/(app)/privacy')} accessibilityRole="button" accessibilityLabel={t('profile.privacy')} style={styles.privacyBtn}>
                <Text style={styles.privacyText}>{t('profile.privacy')}</Text>
              </Pressable>
              <Pressable testID="signout-btn" onPress={signOut} accessibilityRole="button" accessibilityLabel={t('profile.signOut')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}><Text style={styles.signout}>{t('profile.signOut')}</Text></Pressable>
            </View>
          </View>

          {incomplete ? (
            <Pressable onPress={() => router.push('/(app)/edit-profile')} accessibilityRole="button" accessibilityLabel={t('profile.completeTitle')} style={[styles.completeCard, shadow.card]}>
              <Text style={styles.completeEmoji}>👋</Text>
              <Text style={styles.completeTitle}>{t('profile.completeTitle')}</Text>
              <Text style={styles.completeSub}>{t('profile.completeSub')}</Text>
            </Pressable>
          ) : (
            <Pressable onPress={() => router.push('/(app)/edit-profile')} accessibilityRole="button" accessibilityLabel={t('profile.edit')} style={[styles.ownerCard, shadow.card]}>
              <Avatar uri={profile!.photo_url} fallback="🧑" size={72} />
              <View style={styles.ownerInfo}>
                <Text style={styles.ownerName}>{profile!.display_name}</Text>
                <Text style={styles.ownerMeta}>
                  {ageFromISO(profile!.date_of_birth!, utcToday)} · {genderLabel(profile!.gender)}
                </Text>
              </View>
              <Text style={styles.edit}>{t('profile.edit')}</Text>
            </Pressable>
          )}

          {!incomplete && (
            <Pressable onPress={() => router.push('/(app)/premium')} accessibilityRole="button" accessibilityLabel={t('profile.upgradeHint')} style={styles.badgeRow}>
              <VerifiedBadge userId={userId} />
              <PremiumBadge premium={premium} />
              {!premium ? <Text style={styles.upgradeHint}>{t('profile.upgradeHint')}</Text> : null}
            </Pressable>
          )}

          <View style={[styles.walkerCard, shadow.card]}>
            <View style={styles.walkerText}>
              <Text style={styles.walkerTitle}>{t('profile.walkerTitle')}</Text>
              <Text style={styles.walkerSub}>{t('profile.walkerSub')}</Text>
            </View>
            <Switch
              value={isWalker}
              disabled={walkerBusy}
              onValueChange={onToggleWalker}
              trackColor={{ true: colors.green, false: colors.lineCool }}
              thumbColor={colors.white}
            />
          </View>

          {!incomplete && (
            <View style={[styles.photosCard, shadow.card]}>
              <Text style={styles.photosTitle}>{t('profile.photosTitle')}</Text>
              <PhotoGallery photos={photos} editable busy={photosBusy} onAdd={onAddPhotos} onDelete={onDeletePhoto} />
            </View>
          )}

          <View style={styles.dogsHeader}>
            <Text style={styles.dogsTitle}>{t('profile.myDogs')}</Text>
            <Pressable testID="add-dog" onPress={() => router.push('/(app)/dog/new')} accessibilityRole="button" accessibilityLabel={t('profile.add')} style={styles.addBtn}>
              <Text style={styles.addText}>{t('profile.add')}</Text>
            </Pressable>
          </View>

          {dogs.length === 0 ? (
            <Text style={styles.empty}>{t('profile.noDogs')}</Text>
          ) : (
            dogs.map((d) => (
              <Pressable key={d.id} onPress={() => router.push(`/(app)/dog/${d.id}`)} accessibilityRole="button" accessibilityLabel={d.name} style={[styles.dogCard, shadow.card]}>
                <Avatar uri={d.photo_url} fallback="🐶" size={56} />
                <View style={styles.dogInfo}>
                  <Text style={styles.dogName}>{d.name}</Text>
                  <Text style={styles.dogMeta}>{d.breed} · {d.age} {t('profile.years')}</Text>
                </View>
                <Text style={styles.chevron}>‹</Text>
              </Pressable>
            ))
          )}
        </ScrollView>
      </SafeAreaView>
    </DogParkBackground>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: 20, gap: 16 },
  topbar: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between' },
  topbarActions: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10 },
  privacyBtn: { backgroundColor: colors.purpleSoft, borderRadius: radius.pill, paddingVertical: 6, paddingHorizontal: 12, borderWidth: 1, borderColor: colors.lineCool },
  privacyText: { fontFamily: font.medium, color: colors.purple, fontSize: 13 },
  signout: { fontFamily: font.medium, color: colors.caramel, fontSize: 14 },

  completeCard: { backgroundColor: colors.white, borderRadius: radius.lg, padding: 24, alignItems: 'center', gap: 6, borderWidth: 1, borderColor: colors.line },
  completeEmoji: { fontSize: 40 },
  completeTitle: { fontFamily: font.black, fontSize: 20, color: colors.bark },
  completeSub: { fontFamily: font.regular, fontSize: 14, color: colors.caramel, textAlign: 'center' },

  ownerCard: { flexDirection: 'row-reverse', alignItems: 'center', gap: 14, backgroundColor: colors.white, borderRadius: radius.lg, padding: 16, borderWidth: 1, borderColor: colors.line },
  ownerInfo: { flex: 1 },
  ownerName: { fontFamily: font.bold, fontSize: 18, color: colors.bark, textAlign: 'right' },
  ownerMeta: { fontFamily: font.regular, fontSize: 14, color: colors.caramel, textAlign: 'right' },
  edit: { fontFamily: font.medium, color: colors.coralDeep, fontSize: 13 },
  badgeRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  upgradeHint: { fontFamily: font.medium, color: colors.purple, fontSize: 13 },
  walkerCard: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12, backgroundColor: colors.white, borderRadius: radius.lg, padding: 16, borderWidth: 1, borderColor: colors.line },
  walkerText: { flex: 1 },
  walkerTitle: { fontFamily: font.bold, fontSize: 15, color: colors.bark, textAlign: 'right' },
  walkerSub: { fontFamily: font.regular, fontSize: 12, color: colors.caramel, textAlign: 'right', marginTop: 2 },
  photosCard: { backgroundColor: colors.white, borderRadius: radius.lg, padding: 16, borderWidth: 1, borderColor: colors.line },
  photosTitle: { fontFamily: font.bold, fontSize: 15, color: colors.bark, textAlign: 'right', marginBottom: 8 },

  dogsHeader: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 },
  dogsTitle: { fontFamily: font.black, fontSize: 18, color: colors.bark },
  addBtn: { backgroundColor: colors.coralSoft, borderRadius: radius.pill, paddingVertical: 8, paddingHorizontal: 16 },
  addText: { fontFamily: font.bold, color: colors.coralDeep, fontSize: 14 },
  empty: { fontFamily: font.regular, color: colors.inkSoft, textAlign: 'center', marginTop: 12 },

  dogCard: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12, backgroundColor: colors.white, borderRadius: radius.lg, padding: 12, borderWidth: 1, borderColor: colors.line },
  dogInfo: { flex: 1 },
  dogName: { fontFamily: font.bold, fontSize: 16, color: colors.bark, textAlign: 'right' },
  dogMeta: { fontFamily: font.regular, fontSize: 13, color: colors.caramel, textAlign: 'right' },
  chevron: { fontFamily: font.bold, fontSize: 22, color: colors.inkSoft },
});

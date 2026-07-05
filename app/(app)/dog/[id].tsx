import { useEffect, useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import DogParkBackground from '../../../src/components/DogParkBackground';
import Avatar from '../../../src/components/Avatar';
import FormField from '../../../src/components/FormField';
import PhotoGallery from '../../../src/components/PhotoGallery';
import { useAuth } from '../../../src/state/AuthContext';
import { useI18n } from '../../../src/i18n/LanguageContext';
import { listMyDogs, createDog, updateDog, deleteDog } from '../../../src/services/dogs';
import { listDogPhotos, addGalleryPhoto, deleteGalleryPhoto, type GalleryPhoto } from '../../../src/services/gallery';
import { uploadImage } from '../../../src/services/storage';
import { pickSquareImage, pickMultipleImages } from '../../../src/lib/pickImage';
import { SIZE_OPTIONS, DogSize, DOG_GENDER_OPTIONS, DogGender } from '../../../src/types/profile';
import { colors, font, radius, shadow } from '../../../src/theme';

export default function DogForm() {
  const router = useRouter();
  const { t } = useI18n();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useAuth();
  const userId = session!.user.id;
  const isNew = id === 'new';

  const [name, setName] = useState('');
  const [breed, setBreed] = useState('');
  const [age, setAge] = useState('');
  const [size, setSize] = useState<DogSize | null>(null);
  const [gender, setGender] = useState<DogGender | null>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [bio, setBio] = useState('');
  const [busy, setBusy] = useState(false);
  const [photos, setPhotos] = useState<GalleryPhoto[]>([]);
  const [galleryBusy, setGalleryBusy] = useState(false);

  useEffect(() => {
    if (isNew) return;
    listMyDogs(userId).then(({ data }) => {
      const dog = data.find((d) => d.id === id);
      if (!dog) return;
      setName(dog.name); setBreed(dog.breed); setAge(String(dog.age));
      setSize(dog.size); setGender((dog as any).gender ?? null); setPhoto(dog.photo_url); setBio(dog.bio ?? '');
    });
    listDogPhotos(id).then(({ data }) => setPhotos(data));
  }, [id, isNew, userId]);

  async function onAddPhotos() {
    const uris = await pickMultipleImages();
    if (uris.length === 0) return;
    setGalleryBusy(true);
    for (const uri of uris) {
      const up = await uploadImage('dog-photos', userId, uri);
      if (up.url) await addGalleryPhoto(userId, id, up.url);
    }
    const { data, error } = await listDogPhotos(id);
    if (error) Alert.alert(t('dogDetail.error'), error);
    else setPhotos(data);
    setGalleryBusy(false);
  }

  async function onDeletePhoto(photoId: string) {
    await deleteGalleryPhoto(photoId);
    setPhotos((prev) => prev.filter((p) => p.id !== photoId));
  }

  async function onPickPhoto() {
    const uri = await pickSquareImage();
    if (uri) setPhoto(uri);
  }

  async function onSave() {
    if (!name.trim()) { Alert.alert(t('dogDetail.missingField'), t('dogDetail.enterName')); return; }
    if (!breed.trim()) { Alert.alert(t('dogDetail.missingField'), t('dogDetail.enterBreed')); return; }
    const ageNum = parseInt(age, 10);
    if (!age.trim() || isNaN(ageNum) || ageNum < 0) { Alert.alert(t('dogDetail.invalidAge'), t('dogDetail.enterAge')); return; }
    if (!photo) { Alert.alert(t('dogDetail.missingField'), t('dogDetail.addPhoto')); return; }
    if (!gender) { Alert.alert(t('dogDetail.missingField'), t('dogDetail.selectGender')); return; }

    setBusy(true);
    let photoUrl = photo;
    if (photo.startsWith('file:')) {
      const up = await uploadImage('dog-photos', userId, photo);
      if (up.error) { setBusy(false); Alert.alert(t('dogDetail.uploadError'), up.error); return; }
      photoUrl = up.url!;
    }
    const payload = { name: name.trim(), breed: breed.trim(), age: ageNum, size, gender, photo_url: photoUrl, bio: bio.trim() || null };
    const { error } = isNew ? await createDog(userId, payload) : await updateDog(id, payload);
    setBusy(false);
    if (error) { Alert.alert(t('dogDetail.saveFailed'), error); return; }
    router.replace('/(app)/(tabs)');
  }

  function onDelete() {
    Alert.alert(t('dogDetail.deleteTitle'), t('dogDetail.deleteIrreversible'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('dogDetail.delete'), style: 'destructive', onPress: async () => {
        const { error } = await deleteDog(id);
        if (error) { Alert.alert(t('dogDetail.deleteFailed'), error); return; }
        router.replace('/(app)/(tabs)');
      } },
    ]);
  }

  return (
    <DogParkBackground>
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>{isNew ? t('dogDetail.newDog') : t('dogDetail.editDog')}</Text>

          <Pressable onPress={onPickPhoto} style={styles.avatarWrap} accessibilityRole="button" accessibilityLabel={t('dogDetail.photoLabel')}>
            <Avatar uri={photo} fallback="🐶" size={110} />
            <Text style={styles.changePhoto}>{t('dogDetail.photoLabel')}</Text>
          </Pressable>

          <View style={[styles.card, shadow.card]}>
            <FormField label={t('dogDetail.name')}>
              <TextInput style={styles.input} value={name} onChangeText={setName} placeholder={t('dogDetail.namePlaceholder')} placeholderTextColor={colors.inkSoft} />
            </FormField>
            <FormField label={t('dogDetail.breed')}>
              <TextInput style={styles.input} value={breed} onChangeText={setBreed} placeholder={t('dogDetail.breedPlaceholder')} placeholderTextColor={colors.inkSoft} />
            </FormField>
            <FormField label={t('dogDetail.age')}>
              <TextInput style={styles.input} value={age} onChangeText={setAge} keyboardType="number-pad" placeholder="3" placeholderTextColor={colors.inkSoft} />
            </FormField>
            <FormField label={t('dogDetail.sizeOptional')}>
              <View style={styles.chips}>
                {SIZE_OPTIONS.map((s) => (
                  <Pressable key={s.value} onPress={() => setSize(size === s.value ? null : s.value)}
                    accessibilityRole="button" accessibilityLabel={s.label}
                    style={[styles.chip, size === s.value && styles.chipOn]}>
                    <Text style={[styles.chipText, size === s.value && styles.chipTextOn]}>{s.label}</Text>
                  </Pressable>
                ))}
              </View>
            </FormField>
            <FormField label={t('dogDetail.gender')}>
              <View style={styles.chips}>
                {DOG_GENDER_OPTIONS.map((g) => (
                  <Pressable key={g.value} onPress={() => setGender(gender === g.value ? null : g.value)}
                    accessibilityRole="button" accessibilityLabel={g.label}
                    style={[styles.chip, gender === g.value && styles.chipOn]}>
                    <Text style={[styles.chipText, gender === g.value && styles.chipTextOn]}>{g.label}</Text>
                  </Pressable>
                ))}
              </View>
            </FormField>
            <FormField label={t('dogDetail.bioOptional')}>
              <TextInput style={[styles.input, styles.multiline]} value={bio} onChangeText={setBio} placeholder={t('dogDetail.bioPlaceholder')} placeholderTextColor={colors.inkSoft} multiline />
            </FormField>
          </View>

          <Pressable testID="save-dog" disabled={busy} onPress={onSave}
            accessibilityRole="button" accessibilityLabel={t('dogDetail.save')}
            style={({ pressed }) => [styles.cta, shadow.soft, pressed && styles.pressed]}>
            <Text style={styles.ctaText}>{busy ? t('dogDetail.saving') : t('dogDetail.save')}</Text>
          </Pressable>

          {!isNew && (
            <>
              <View style={[styles.card, shadow.card]}>
                <Text style={styles.galleryTitle}>{t('dogDetail.galleryOf')} {name || t('dogDetail.theDog')} 📸</Text>
                <PhotoGallery photos={photos} editable busy={galleryBusy} onAdd={onAddPhotos} onDelete={onDeletePhoto} />
              </View>

              <Pressable onPress={() => router.push('/(app)/dog-health/' + id)} style={styles.healthBtn} accessibilityRole="button" accessibilityLabel={t('dogDetail.health')}>
                <Text style={styles.healthBtnText}>{t('dogDetail.health')}</Text>
              </Pressable>
              <Pressable onPress={onDelete} style={styles.deleteBtn} accessibilityRole="button" accessibilityLabel={t('dogDetail.deleteDog')}>
                <Text style={styles.deleteText}>{t('dogDetail.deleteDog')}</Text>
              </Pressable>
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </DogParkBackground>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: 24, gap: 16 },
  title: { fontFamily: font.black, fontSize: 24, color: colors.bark, textAlign: 'center' },
  avatarWrap: { alignItems: 'center', gap: 8 },
  changePhoto: { fontFamily: font.medium, color: colors.coralDeep, fontSize: 14 },
  card: { backgroundColor: colors.white, borderRadius: radius.lg, padding: 20, borderWidth: 1, borderColor: colors.line },
  input: {
    backgroundColor: colors.cream, borderWidth: 1.5, borderColor: colors.line, borderRadius: radius.md,
    paddingHorizontal: 16, paddingVertical: 12, fontSize: 16, fontFamily: font.regular, color: colors.ink,
    textAlign: 'right', writingDirection: 'rtl',
  },
  multiline: { minHeight: 80, textAlignVertical: 'top' },
  chips: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8 },
  chip: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: radius.pill, borderWidth: 1.5, borderColor: colors.line, backgroundColor: colors.cream },
  chipOn: { backgroundColor: colors.coralSoft, borderColor: colors.coral },
  chipText: { fontFamily: font.medium, color: colors.caramel, fontSize: 14 },
  chipTextOn: { color: colors.coralDeep, fontFamily: font.bold },
  cta: { backgroundColor: colors.coral, borderRadius: radius.pill, paddingVertical: 16, alignItems: 'center' },
  ctaText: { fontFamily: font.black, color: colors.white, fontSize: 18 },
  pressed: { transform: [{ scale: 0.98 }], opacity: 0.92 },
  deleteBtn: { alignItems: 'center', paddingVertical: 10 },
  deleteText: { fontFamily: font.medium, color: colors.danger, fontSize: 15 },
  galleryTitle: { fontFamily: font.bold, fontSize: 15, color: colors.bark, textAlign: 'right', marginBottom: 8 },
  healthBtn: { alignItems: 'center', paddingVertical: 12, backgroundColor: colors.purpleSoft, borderWidth: 1.5, borderColor: colors.purple, borderRadius: radius.pill },
  healthBtnText: { fontFamily: font.bold, color: colors.purple, fontSize: 15 },
});

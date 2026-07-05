import { useState, useEffect } from 'react';
import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { pickSquareImage } from '../../src/lib/pickImage';
import { listMyDogs } from '../../src/services/dogs';
import { uploadImage } from '../../src/services/storage';
import { createPost } from '../../src/services/feed';
import { useAuth } from '../../src/state/AuthContext';
import { colors, font, radius } from '../../src/theme';
import { useI18n } from '../../src/i18n/LanguageContext';
import type { Dog } from '../../src/types/profile';

export default function NewPost() {
  const router = useRouter();
  const { t } = useI18n();
  const { session } = useAuth();
  const userId = session!.user.id;

  const [photo, setPhoto] = useState<string | null>(null);
  const [dogs, setDogs] = useState<Dog[]>([]);
  const [dogId, setDogId] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    listMyDogs(userId).then(({ data }) => setDogs(data));
  }, [userId]);

  async function handlePickPhoto() {
    const uri = await pickSquareImage();
    if (uri) setPhoto(uri);
  }

  function handleSelectDog(id: string) {
    setDogId((prev) => (prev === id ? null : id));
  }

  async function handleShare() {
    if (!photo) {
      Alert.alert(t('newPost.error'), t('newPost.pickPhotoFirst'));
      return;
    }

    setSubmitting(true);
    try {
      let url = photo;

      if (photo.startsWith('file:')) {
        const { url: uploaded, error: uploadError } = await uploadImage('dog-photos', userId, photo);
        if (uploadError || !uploaded) {
          Alert.alert(t('newPost.error'), uploadError ?? t('newPost.uploadError'));
          return;
        }
        url = uploaded;
      }

      const { error: postError } = await createPost(userId, dogId, url, caption.trim());
      if (postError) {
        Alert.alert(t('newPost.error'), postError);
        return;
      }

      router.back();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      {/* בחר תמונה */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('newPost.pickPhotoTitle')}</Text>
        <Pressable style={styles.pickButton} onPress={handlePickPhoto} accessibilityRole="button" accessibilityLabel={photo ? t('newPost.replacePhoto') : t('newPost.pickPhoto')}>
          <Text style={styles.pickButtonText}>
            {photo ? t('newPost.replacePhoto') : t('newPost.pickPhoto')}
          </Text>
        </Pressable>
        {photo ? (
          <Image
            source={{ uri: photo }}
            style={styles.preview}
            resizeMode="cover"
            accessibilityLabel={t('newPost.previewLabel')}
          />
        ) : null}
      </View>

      {/* בחר כלב */}
      {dogs.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('newPost.pickDogTitle')}</Text>
          <View style={styles.chipsRow}>
            {dogs.map((dog) => {
              const selected = dogId === dog.id;
              return (
                <Pressable
                  key={dog.id}
                  style={[styles.chip, selected && styles.chipSelected]}
                  onPress={() => handleSelectDog(dog.id)}
                  accessibilityRole="button"
                  accessibilityLabel={dog.name}
                >
                  <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                    {dog.name}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      ) : null}

      {/* כיתוב */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('newPost.captionTitle')}</Text>
        <TextInput
          style={styles.captionInput}
          placeholder={t('newPost.captionPlaceholder')}
          placeholderTextColor={colors.inkCoolSoft}
          value={caption}
          onChangeText={setCaption}
          multiline
          textAlign="right"
        />
      </View>

      {/* כפתור שיתוף */}
      <Pressable
        testID="share-post"
        style={[styles.shareButton, submitting && styles.shareButtonDisabled]}
        onPress={handleShare}
        disabled={submitting}
        accessibilityRole="button"
        accessibilityLabel={t('newPost.shareBtn')}
      >
        {submitting ? (
          <Text style={styles.shareButtonText}>{t('newPost.sending')}</Text>
        ) : (
          <Text style={styles.shareButtonText}>{t('newPost.shareBtn')}</Text>
        )}
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: colors.bgApp,
  },
  container: {
    padding: 16,
    gap: 20,
  },
  section: {
    gap: 10,
  },
  sectionTitle: {
    fontFamily: font.bold,
    fontSize: 16,
    color: colors.brandDark,
    textAlign: 'right',
  },
  pickButton: {
    backgroundColor: colors.roseSoft,
    borderRadius: radius.sm,
    padding: 14,
    alignItems: 'center',
  },
  pickButtonText: {
    fontFamily: font.bold,
    fontSize: 15,
    color: colors.rose,
  },
  preview: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: radius.sm,
  },
  chipsRow: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    backgroundColor: colors.roseSoft,
    borderRadius: radius.pill,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  chipSelected: {
    backgroundColor: colors.rose,
  },
  chipText: {
    fontFamily: font.medium,
    fontSize: 14,
    color: colors.brandDark,
  },
  chipTextSelected: {
    color: colors.white,
  },
  captionInput: {
    borderWidth: 1,
    borderColor: colors.lineCool,
    borderRadius: radius.sm,
    padding: 12,
    minHeight: 80,
    fontFamily: font.regular,
    fontSize: 14,
    color: colors.brandDark,
    textAlignVertical: 'top',
  },
  shareButton: {
    backgroundColor: colors.rose,
    borderRadius: radius.sm,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  shareButtonDisabled: {
    opacity: 0.6,
  },
  shareButtonText: {
    fontFamily: font.bold,
    fontSize: 16,
    color: colors.white,
  },
});

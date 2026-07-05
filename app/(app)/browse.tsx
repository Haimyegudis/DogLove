import { useEffect, useState } from 'react';
import { Text, StyleSheet, FlatList, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import DogParkBackground from '../../src/components/DogParkBackground';
import DogCard from '../../src/components/DogCard';
import { browseDogs } from '../../src/services/match';
import type { BrowseDog } from '../../src/types/match';
import { colors, font } from '../../src/theme';
import { useI18n } from '../../src/i18n/LanguageContext';

export default function Browse() {
  const router = useRouter();
  const { t } = useI18n();
  const [dogs, setDogs] = useState<BrowseDog[]>([]);

  useEffect(() => {
    browseDogs(50).then(({ data, error }) => {
      if (error) { Alert.alert(t('browse.error'), error); return; }
      setDogs(data);
    });
  }, []);

  return (
    <DogParkBackground>
      <SafeAreaView style={styles.safe}>
        <FlatList
          data={dogs}
          keyExtractor={(d) => d.dog_id}
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={<Text style={styles.title}>{t('browse.title')}</Text>}
          ListEmptyComponent={<Text style={styles.empty}>{t('browse.empty')}</Text>}
          renderItem={({ item: d }) => (
            <DogCard
              photo={d.photo_url}
              name={d.name}
              breed={d.breed}
              subtitle={d.owner_name ?? undefined}
              onPress={() => router.push(`/(app)/request/${d.dog_id}`)}
            />
          )}
        />
      </SafeAreaView>
    </DogParkBackground>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: 20, gap: 12 },
  title: { fontFamily: font.black, fontSize: 24, color: colors.bark, textAlign: 'center', marginBottom: 4 },
  empty: { fontFamily: font.regular, color: colors.inkSoft, textAlign: 'center', marginTop: 20 },
});

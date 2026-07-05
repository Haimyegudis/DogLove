import { useEffect, useState } from 'react';
import { Text, StyleSheet, FlatList, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import DogParkBackground from '../../src/components/DogParkBackground';
import DogCard from '../../src/components/DogCard';
import { listActiveWalkers, type ActiveWalker } from '../../src/services/walk';
import { useI18n } from '../../src/i18n/LanguageContext';
import { colors, font } from '../../src/theme';

type TFn = (key: string) => string;

function sinceLabel(startedAt: string | null, t: TFn): string {
  if (!startedAt) return `${t('activeWalkers.onWalkNow')} 🟢`;
  const mins = Math.max(0, Math.round((Date.now() - new Date(startedAt).getTime()) / 60000));
  if (mins < 1) return `${t('activeWalkers.justLeft')} 🟢`;
  if (mins < 60) return `${t('activeWalkers.onWalkFor')} ${mins} ${t('activeWalkers.minutes')} 🟢`;
  return `${t('activeWalkers.onWalkFor')} ${Math.floor(mins / 60)} ${t('activeWalkers.hours')} 🟢`;
}

export default function ActiveWalkers() {
  const router = useRouter();
  const { t } = useI18n();
  const [walkers, setWalkers] = useState<ActiveWalker[]>([]);

  useEffect(() => {
    listActiveWalkers().then(({ data, error }) => {
      if (error) { Alert.alert(t('activeWalkers.error'), error); return; }
      setWalkers(data);
    });
  }, []);

  return (
    <DogParkBackground>
      <SafeAreaView style={styles.safe}>
        <FlatList
          data={walkers}
          keyExtractor={(item) => item.dog_id}
          renderItem={({ item: w }) => (
            <DogCard
              photo={w.photo_url}
              name={w.name}
              breed={w.breed}
              subtitle={`${w.owner_name ?? ''} · ${sinceLabel(w.started_at, t)}`}
              onPress={() => router.push(`/(app)/request/${w.dog_id}`)}
            />
          )}
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          initialNumToRender={8}
          windowSize={7}
          removeClippedSubviews
          ListHeaderComponent={<Text style={styles.title}>{t('activeWalkers.title')} 🐾</Text>}
          ListEmptyComponent={<Text style={styles.empty}>{t('activeWalkers.empty')} 🦮</Text>}
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

import { useEffect, useState } from 'react';
import { Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import DogParkBackground from '../../src/components/DogParkBackground';
import DogCard from '../../src/components/DogCard';
import { browseDogs } from '../../src/services/match';
import type { BrowseDog } from '../../src/types/match';
import { colors, font } from '../../src/theme';

export default function Browse() {
  const router = useRouter();
  const [dogs, setDogs] = useState<BrowseDog[]>([]);

  useEffect(() => { browseDogs(50).then(({ data }) => setDogs(data)); }, []);

  return (
    <DogParkBackground>
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <Text style={styles.title}>כלבים להכרות 🐾</Text>
          {dogs.length === 0 ? (
            <Text style={styles.empty}>עדיין אין כלבים אחרים. חזור מאוחר יותר!</Text>
          ) : (
            dogs.map((d) => (
              <DogCard
                key={d.dog_id}
                photo={d.photo_url}
                name={d.name}
                breed={d.breed}
                subtitle={d.owner_name ?? undefined}
                onPress={() => router.push(`/(app)/request/${d.dog_id}`)}
              />
            ))
          )}
        </ScrollView>
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

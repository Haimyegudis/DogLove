import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Stack, useRouter, useFocusEffect } from 'expo-router';
import Avatar from '../../src/components/Avatar';
import { colors, font, radius, shadow } from '../../src/theme';
import { useI18n } from '../../src/i18n/LanguageContext';
import { getCurrentCoords } from '../../src/services/location';
import { nearbyLostDogs } from '../../src/services/lost';
import type { LostDog } from '../../src/types/lost';

function relativeTime(isoString: string, t: (k: string) => string): string {
  const diffMs = Date.now() - new Date(isoString).getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return t('lostDogs.now');
  if (diffMin < 60) return t('lostDogs.agoPrefix') + diffMin + t('lostDogs.minutes');
  const diffHrs = Math.floor(diffMin / 60);
  if (diffHrs < 24) return t('lostDogs.agoPrefix') + diffHrs + t('lostDogs.hours');
  const diffDays = Math.floor(diffHrs / 24);
  return t('lostDogs.agoPrefix') + diffDays + t('lostDogs.days');
}

function LostDogCard({ item }: { item: LostDog }) {
  const { t } = useI18n();
  return (
    <View style={styles.card}>
      <View style={styles.cardRow}>
        <Avatar uri={item.photo_url} size={64} fallback="🐶" />
        <View style={styles.cardInfo}>
          <Text style={styles.dogName}>{item.dog_name ?? t('lostDogs.unknownDog')} 🐾</Text>
          {item.owner_name ? (
            <Text style={styles.ownerName}>{t('lostDogs.ownerPrefix')}{item.owner_name}</Text>
          ) : null}
          {item.note ? (
            <Text style={styles.note} numberOfLines={2}>{item.note}</Text>
          ) : null}
          <Text style={styles.time}>{relativeTime(item.created_at, t)}</Text>
        </View>
      </View>
    </View>
  );
}

export default function LostDogs() {
  const router = useRouter();
  const { t } = useI18n();
  const [dogs, setDogs] = useState<LostDog[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const coords = await getCurrentCoords();
      if (!coords) return;
      const { data, error } = await nearbyLostDogs(coords);
      if (error) Alert.alert(t('lostDogs.error'), error);
      else setDogs(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  return (
    <View style={styles.screen}>
      <Stack.Screen
        options={{
          title: t('lostDogs.title'),
        }}
      />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.rose} />
          <Text style={styles.loadingText}>{t('lostDogs.loading')}</Text>
        </View>
      ) : (
        <FlatList
          data={dogs}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <LostDogCard item={item} />}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <Text style={styles.empty}>{t('lostDogs.empty')}</Text>
          }
        />
      )}

      <View style={styles.bottomBar}>
        <Pressable
          style={styles.alertButton}
          onPress={() => router.push('/(app)/report-lost')}
          accessibilityRole="button"
          accessibilityLabel={t('lostDogs.reportButton')}
        >
          <Text style={styles.alertButtonText}>{t('lostDogs.reportButton')}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bgApp },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  loadingText: { fontFamily: font.regular, color: colors.inkCoolSoft, fontSize: 15 },
  list: { paddingVertical: 8, paddingBottom: 100 },
  empty: {
    fontFamily: font.regular,
    color: colors.inkCoolSoft,
    textAlign: 'center',
    marginTop: 40,
    fontSize: 15,
    paddingHorizontal: 24,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.lineCool,
    marginHorizontal: 12,
    marginVertical: 8,
    padding: 12,
    ...shadow.card,
  },
  cardRow: {
    flexDirection: 'row-reverse',
    alignItems: 'flex-start',
    gap: 12,
  },
  cardInfo: { flex: 1 },
  dogName: {
    fontFamily: font.bold,
    fontSize: 16,
    color: colors.brandDark,
    textAlign: 'right',
    marginBottom: 2,
  },
  ownerName: {
    fontFamily: font.medium,
    fontSize: 13,
    color: colors.inkCool,
    textAlign: 'right',
    marginBottom: 2,
  },
  note: {
    fontFamily: font.regular,
    fontSize: 13,
    color: colors.inkCoolSoft,
    textAlign: 'right',
    marginBottom: 4,
  },
  time: {
    fontFamily: font.regular,
    fontSize: 12,
    color: colors.rose,
    textAlign: 'right',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.lineCool,
  },
  alertButton: {
    backgroundColor: colors.rose,
    borderRadius: radius.sm,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.soft,
  },
  alertButtonText: {
    fontFamily: font.bold,
    fontSize: 16,
    color: colors.white,
  },
});

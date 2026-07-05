import { useCallback, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { colors, font, radius, shadow } from '../../src/theme';
import { useI18n } from '../../src/i18n/LanguageContext';
import { myBadges, type Badge } from '../../src/services/badges';

export default function BadgesScreen() {
  const { t } = useI18n();
  const [badges, setBadges] = useState<Badge[] | null>(null);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      setLoading(true);
      myBadges().then(({ data }: { data: Badge[] | null; error: string | null }) => {
        if (active) {
          setBadges(data);
          setLoading(false);
        }
      });
      return () => { active = false; };
    }, [])
  );

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>{t('badges.title')}</Text>
        {loading ? (
          <ActivityIndicator size="large" color={colors.rose} style={styles.loader} />
        ) : badges === null || badges.length === 0 ? (
          <Text style={styles.empty}>{t('badges.empty')}</Text>
        ) : (
          <View style={styles.grid}>
            {badges.map((badge) => (
              <BadgeCard key={badge.code} badge={badge} />
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function BadgeCard({ badge }: { badge: Badge }) {
  const { t } = useI18n();
  const earned = badge.earned;
  return (
    <View style={[styles.card, earned ? styles.cardEarned : styles.cardLocked]}>
      <Text style={[styles.emoji, earned ? null : styles.emojiLocked]}>
        {badge.emoji}
      </Text>
      <Text style={[styles.label, earned ? styles.labelEarned : styles.labelLocked]}>
        {badge.label}
      </Text>
      {earned ? (
        <View style={styles.earnedPill}>
          <Text style={styles.earnedText}>{t('badges.earned')}</Text>
        </View>
      ) : (
        <Text style={styles.progress}>
          {badge.progress} / {badge.target}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.cream },
  content: { padding: 20, gap: 16 },
  title: {
    fontSize: 24,
    fontFamily: font.bold,
    color: colors.brandDark,
    textAlign: 'right',
    writingDirection: 'rtl',
    marginBottom: 8,
  },
  loader: { marginTop: 48 },
  empty: {
    textAlign: 'center',
    fontFamily: font.regular,
    color: colors.inkCoolSoft,
    fontSize: 16,
    marginTop: 48,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'flex-end',
  },
  card: {
    width: '47%',
    borderRadius: radius.md,
    padding: 18,
    alignItems: 'center',
    ...shadow.card,
  },
  cardEarned: {
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: colors.rose,
  },
  cardLocked: {
    backgroundColor: colors.creamDeep,
    borderWidth: 2,
    borderColor: colors.lineCool,
  },
  emoji: {
    fontSize: 36,
    marginBottom: 8,
  },
  emojiLocked: {
    opacity: 0.35,
  },
  label: {
    fontFamily: font.bold,
    fontSize: 14,
    textAlign: 'center',
    writingDirection: 'rtl',
    marginBottom: 8,
  },
  labelEarned: {
    color: colors.brandDark,
  },
  labelLocked: {
    color: colors.inkCoolSoft,
  },
  earnedPill: {
    backgroundColor: colors.roseSoft,
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  earnedText: {
    fontFamily: font.medium,
    fontSize: 12,
    color: colors.rose,
  },
  progress: {
    fontFamily: font.regular,
    fontSize: 13,
    color: colors.inkCoolSoft,
  },
});

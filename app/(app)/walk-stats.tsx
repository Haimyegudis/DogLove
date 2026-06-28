import { useCallback, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { colors, font } from '../../src/theme';
import { myWalkStats } from '../../src/services/stats';
import type { WalkStats } from '../../src/types/stats';

export default function WalkStatsScreen() {
  const [stats, setStats] = useState<WalkStats | null>(null);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      setLoading(true);
      myWalkStats().then(({ data }: { data: WalkStats | null; error: string | null }) => {
        if (active) {
          setStats(data);
          setLoading(false);
        }
      });
      return () => { active = false; };
    }, [])
  );

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>הסטטיסטיקות שלי</Text>
        {loading ? (
          <ActivityIndicator size="large" color={colors.rose} style={styles.loader} />
        ) : stats === null ? (
          <Text style={styles.empty}>אין נתונים עדיין</Text>
        ) : (
          <View style={styles.grid}>
            <StatCard emoji="🐾" label="סה״כ טיולים" value={String(stats.total_walks)} accent={colors.rose} />
            <StatCard emoji="🛣️" label="ק״מ כולל" value={stats.total_km.toFixed(1)} accent={colors.purple} />
            <StatCard emoji="📅" label="השבוע" value={String(stats.week_walks)} accent={colors.green} />
            <StatCard emoji="⏱️" label="דקות סה״כ" value={String(stats.total_minutes)} accent={colors.sky} />
            <StatCard emoji="🔥" label="ימי רצף" value={String(stats.streak_days)} accent={colors.coralDeep} />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function StatCard({ emoji, label, value, accent }: { emoji: string; label: string; value: string; accent: string }) {
  return (
    <View style={[styles.card, { borderTopColor: accent }]}>
      <Text style={styles.cardEmoji}>{emoji}</Text>
      <Text style={[styles.cardValue, { color: accent }]}>{value}</Text>
      <Text style={styles.cardLabel}>{label}</Text>
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
  grid: { gap: 16 },
  card: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderTopWidth: 4,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardEmoji: { fontSize: 32, marginBottom: 8 },
  cardValue: { fontSize: 36, fontFamily: font.bold, marginBottom: 4 },
  cardLabel: {
    fontSize: 14,
    fontFamily: font.regular,
    color: colors.inkCoolSoft,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
});

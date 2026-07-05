import { useCallback, useState } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import Avatar from '../../../src/components/Avatar';
import { listConversations } from '../../../src/services/chat';
import type { ConversationRow } from '../../../src/types/chat';
import { useI18n } from '../../../src/i18n/LanguageContext';
import { colors, font, radius } from '../../../src/theme';

export default function Messages() {
  const router = useRouter();
  const { t } = useI18n();
  const [rows, setRows] = useState<ConversationRow[]>([]);

  useFocusEffect(useCallback(() => {
    let active = true;
    listConversations().then(({ data, error }) => { if (!active) return; if (error) { Alert.alert(t('messages.error'), error); return; } setRows(data); });
    return () => { active = false; };
  }, []));

  return (
    <View style={styles.screen}>
      <SafeAreaView style={styles.safe}>
        <Text style={styles.title}>{t('messages.title')}</Text>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {rows.length === 0 ? (
            <Text style={styles.empty}>{t('messages.empty')}</Text>
          ) : rows.map((c) => (
            <Pressable key={c.conversation_id} onPress={() => router.push(`/(app)/chat/${c.conversation_id}?name=${encodeURIComponent(c.other_name ?? t('messages.ownerFallback'))}`)} accessibilityRole="button" accessibilityLabel={c.other_name ?? t('messages.ownerFallback')} style={styles.row}>
              <Avatar uri={c.other_photo} fallback="🧑" size={52} />
              <View style={styles.info}>
                <Text style={styles.name}>{c.other_name ?? t('messages.ownerFallback')}</Text>
                <Text style={styles.preview} numberOfLines={1}>{c.last_body ?? t('messages.startChat')}</Text>
              </View>
            </Pressable>
          ))}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bgApp },
  safe: { flex: 1 },
  title: { fontFamily: font.black, fontSize: 24, color: colors.brandDark, textAlign: 'center', marginTop: 12 },
  scroll: { padding: 16, gap: 10 },
  empty: { fontFamily: font.regular, color: colors.inkCoolSoft, textAlign: 'center', marginTop: 24 },
  row: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12, backgroundColor: colors.white, borderRadius: radius.lg, padding: 12, borderWidth: 1, borderColor: colors.lineCool },
  info: { flex: 1 },
  name: { fontFamily: font.bold, fontSize: 16, color: colors.brandDark, textAlign: 'right' },
  preview: { fontFamily: font.regular, fontSize: 13, color: colors.inkCoolSoft, textAlign: 'right' },
});

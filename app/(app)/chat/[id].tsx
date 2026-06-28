import { useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, FlatList, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '../../../src/state/AuthContext';
import { listMessages, sendMessage, subscribeMessages } from '../../../src/services/chat';
import type { Message } from '../../../src/types/chat';
import { blockUser, reportUser } from '../../../src/services/safety';
import { colors, font, radius } from '../../../src/theme';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { otherInConversation, schedulePlaydate } from '../../../src/services/playdates';

export default function Chat() {
  const { id, name } = useLocalSearchParams<{ id: string; name?: string }>();
  const router = useRouter();
  const { session } = useAuth();
  const userId = session!.user.id;
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [showDate, setShowDate] = useState(false);
  const [pickedDate, setPickedDate] = useState<Date | null>(null);

  async function finishSchedule(d: Date, place: string) {
    const { data: otherId, error: e1 } = await otherInConversation(id);
    if (e1) { Alert.alert('שגיאה', e1); return; }
    if (!otherId) { Alert.alert('שגיאה', 'לא נמצא משתתף'); return; }
    const { error } = await schedulePlaydate(userId, otherId, d.toISOString(), place);
    if (error) { Alert.alert('שגיאה', error); return; }
    Alert.alert('נקבע! 📅', 'המפגש נוסף ליומן.');
  }

  function confirmSchedule(d: Date) {
    setShowDate(false);
    if (Platform.OS === 'ios') {
      (Alert as any).prompt('מקום המפגש', 'איפה נפגשים?', (place?: string) => finishSchedule(d, place || ''));
    } else {
      finishSchedule(d, '');
    }
  }
  const listRef = useRef<FlatList<Message>>(null);
  const headerTitle = name ?? 'שיחה';

  useEffect(() => {
    listMessages(id).then(({ data }) => setMessages(data));
    const sub = subscribeMessages(id, (m) => setMessages((prev) => prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
    return () => { sub.unsubscribe(); };
  }, [id]);

  async function openMenu() {
    Alert.alert('אפשרויות', undefined, [
      {
        text: 'חסום משתמש',
        style: 'destructive',
        onPress: () => {
          Alert.alert('חסום משתמש', 'האם לחסום משתמש זה?', [
            { text: 'ביטול', style: 'cancel' },
            {
              text: 'חסום',
              style: 'destructive',
              onPress: async () => {
                const { data: otherId, error: e1 } = await otherInConversation(id);
                if (e1) { Alert.alert('שגיאה', e1); return; }
                if (!otherId) { Alert.alert('שגיאה', 'לא נמצא משתתף'); return; }
                const { error } = await blockUser(userId, otherId);
                if (error) { Alert.alert('שגיאה', error); return; }
                router.back();
              },
            },
          ]);
        },
      },
      {
        text: 'דווח',
        onPress: async () => {
          const { data: otherId, error: e1 } = await otherInConversation(id);
          if (e1) { Alert.alert('שגיאה', e1); return; }
          if (!otherId) { Alert.alert('שגיאה', 'לא נמצא משתתף'); return; }
          if ((Alert as any).prompt) {
            (Alert as any).prompt('דווח על משתמש', 'סיבה (אופציונלי):', async (reason: string) => {
              const { error } = await reportUser(userId, otherId, reason ?? '');
              if (error) { Alert.alert('שגיאה', error); return; }
              Alert.alert('תודה, הדיווח התקבל');
            });
          } else {
            const { error } = await reportUser(userId, otherId, '');
            if (error) { Alert.alert('שגיאה', error); return; }
            Alert.alert('תודה, הדיווח התקבל');
          }
        },
      },
      { text: 'ביטול', style: 'cancel' },
    ]);
  }

  async function onSend() {
    const body = text.trim();
    if (!body) return;
    setText('');
    const { error } = await sendMessage(id, userId, body);
    if (error) {
      setText(body);
      Alert.alert('שליחה נכשלה', error);
    }
  }

  return (
    <View style={styles.screen}>
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{headerTitle}</Text>
          <Pressable onPress={() => { setPickedDate(new Date(Date.now() + 3600_000)); setShowDate(true); }} style={styles.scheduleButton}>
            <Text style={styles.scheduleText}>קבע מפגש 📅</Text>
          </Pressable>
          <Pressable onPress={openMenu} style={styles.menuButton}>
            <Text style={styles.menuText}>⋯</Text>
          </Pressable>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backText}>‹</Text>
          </Pressable>
        </View>
        {showDate && (
          <View style={styles.pickerPanel}>
            <DateTimePicker
              value={pickedDate ?? new Date(Date.now() + 3600_000)}
              mode="datetime"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={(_e: DateTimePickerEvent, d?: Date) => {
                if (Platform.OS === 'android') {
                  setShowDate(false);
                  if (_e.type === 'set' && d) confirmSchedule(d);
                } else if (d) {
                  setPickedDate(d);
                }
              }}
            />
            {Platform.OS === 'ios' && (
              <View style={styles.pickerActions}>
                <Pressable onPress={() => setShowDate(false)} style={styles.cancelPickerBtn}>
                  <Text style={styles.cancelPickerText}>ביטול</Text>
                </Pressable>
                <Pressable onPress={() => confirmSchedule(pickedDate ?? new Date(Date.now() + 3600_000))} style={styles.confirmPickerBtn}>
                  <Text style={styles.confirmPickerText}>קבע</Text>
                </Pressable>
              </View>
            )}
          </View>
        )}
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(m) => m.id}
            contentContainerStyle={styles.list}
            onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
            renderItem={({ item }) => {
              const mine = item.sender_id === userId;
              return (
                <View style={[styles.bubbleWrap, mine ? styles.mineWrap : styles.theirsWrap]}>
                  <View style={[styles.bubble, mine ? styles.mine : styles.theirs]}>
                    <Text style={[styles.bubbleText, mine && styles.mineText]}>{item.body}</Text>
                  </View>
                </View>
              );
            }}
          />
          <View style={styles.composer}>
            <TextInput
              style={styles.input}
              placeholder="הודעה…"
              placeholderTextColor={colors.inkCoolSoft}
              value={text}
              onChangeText={setText}
              multiline
            />
            <Pressable testID="send-message" onPress={onSend} style={styles.send}>
              <Text style={styles.sendText}>שלח</Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bgApp },
  safe: { flex: 1 },
  header: { flexDirection: 'row-reverse', alignItems: 'center', height: 50, backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.lineCool, paddingHorizontal: 12 },
  headerTitle: { flex: 1, fontFamily: font.bold, fontSize: 17, color: colors.brandDark, textAlign: 'center' },
  backButton: { padding: 8 },
  backText: { fontSize: 28, color: colors.brandDark, lineHeight: 32 },
  scheduleButton: { paddingHorizontal: 10, paddingVertical: 6 },
  scheduleText: { fontFamily: font.regular, fontSize: 13, color: colors.brandDark },
  menuButton: { paddingHorizontal: 10, paddingVertical: 6 },
  menuText: { fontFamily: font.regular, fontSize: 18, color: colors.rose },
  flex: { flex: 1 },
  list: { padding: 14, gap: 8 },
  bubbleWrap: { flexDirection: 'row' },
  mineWrap: { justifyContent: 'flex-start' },
  theirsWrap: { justifyContent: 'flex-end' },
  bubble: { maxWidth: '80%', borderRadius: 18, paddingVertical: 9, paddingHorizontal: 13 },
  mine: { backgroundColor: colors.rose },
  theirs: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.lineCool },
  bubbleText: { fontFamily: font.regular, fontSize: 15, color: colors.inkCool, textAlign: 'right', writingDirection: 'rtl' },
  mineText: { color: colors.white },
  composer: { flexDirection: 'row-reverse', alignItems: 'flex-end', gap: 8, padding: 12, borderTopWidth: 1, borderTopColor: colors.lineCool, backgroundColor: colors.white },
  input: { flex: 1, maxHeight: 110, backgroundColor: colors.bgApp, borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15, fontFamily: font.regular, color: colors.inkCool, textAlign: 'right', writingDirection: 'rtl' },
  send: { backgroundColor: colors.rose, borderRadius: radius.pill, paddingVertical: 11, paddingHorizontal: 18 },
  sendText: { fontFamily: font.bold, color: colors.white, fontSize: 15 },
  pickerPanel: { backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.lineCool, paddingBottom: 8 },
  pickerActions: { flexDirection: 'row-reverse', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 4 },
  confirmPickerBtn: { backgroundColor: colors.rose, borderRadius: radius.pill, paddingVertical: 8, paddingHorizontal: 20 },
  confirmPickerText: { fontFamily: font.bold, color: colors.white, fontSize: 15 },
  cancelPickerBtn: { paddingVertical: 8, paddingHorizontal: 12 },
  cancelPickerText: { fontFamily: font.regular, color: colors.inkCool, fontSize: 15 },
});

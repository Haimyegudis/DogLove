import { useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, FlatList, KeyboardAvoidingView, Platform, Alert, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '../../../src/state/AuthContext';
import { listMessages, sendMessage, subscribeMessages } from '../../../src/services/chat';
import type { Message } from '../../../src/types/chat';
import { blockUser, reportUser } from '../../../src/services/safety';
import { rateUser } from '../../../src/services/ratings';
import { colors, font, radius } from '../../../src/theme';
import { useI18n } from '../../../src/i18n/LanguageContext';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { otherInConversation, schedulePlaydate } from '../../../src/services/playdates';
import MapPicker from '../../../src/components/MapPicker';
import { getCurrentCoords } from '../../../src/services/location';
import type { Coords } from '../../../src/types/walk';

export default function Chat() {
  const { id, name } = useLocalSearchParams<{ id: string; name?: string }>();
  const router = useRouter();
  const { t } = useI18n();
  const { session } = useAuth();
  const userId = session!.user.id;
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [showDate, setShowDate] = useState(false);
  const [pickedDate, setPickedDate] = useState<Date | null>(null);
  const [showMeetup, setShowMeetup] = useState(false);
  const [meetupCoords, setMeetupCoords] = useState<Coords | null>(null);
  const [currentCoords, setCurrentCoords] = useState<Coords | null>(null);

  async function finishSchedule(d: Date, place: string) {
    const { data: otherId, error: e1 } = await otherInConversation(id);
    if (e1) { Alert.alert(t('chat.error'), e1); return; }
    if (!otherId) { Alert.alert(t('chat.error'), t('chat.noParticipant')); return; }
    const { error } = await schedulePlaydate(userId, otherId, d.toISOString(), place);
    if (error) { Alert.alert(t('chat.error'), error); return; }
    Alert.alert(t('chat.scheduledTitle'), t('chat.scheduledBody'));
  }

  function confirmSchedule(d: Date) {
    setShowDate(false);
    if (Platform.OS === 'ios') {
      (Alert as any).prompt(t('chat.meetupPlaceTitle'), t('chat.meetupPlacePrompt'), (place?: string) => finishSchedule(d, place || ''));
    } else {
      finishSchedule(d, '');
    }
  }
  const listRef = useRef<FlatList<Message>>(null);
  const headerTitle = name ?? t('chat.headerDefault');

  useEffect(() => {
    listMessages(id).then(({ data, error }) => {
      if (error) { Alert.alert(t('chat.error'), error); return; }
      setMessages(data);
    });
    const sub = subscribeMessages(id, (m) => setMessages((prev) => prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
    return () => { sub.unsubscribe(); };
  }, [id]);

  async function openRating() {
    const { data: otherId } = await otherInConversation(id);
    if (!otherId) return;
    async function submit(oId: string, stars: number) {
      const { error } = await rateUser(userId, oId, stars);
      Alert.alert(error ? t('chat.error') : t('chat.rateThanksTitle'), error || t('chat.rateSaved'));
    }
    Alert.alert(t('chat.rateTitle'), t('chat.ratePrompt'), [
      { text: '⭐', onPress: () => submit(otherId, 1) },
      { text: '⭐⭐', onPress: () => submit(otherId, 2) },
      { text: '⭐⭐⭐', onPress: () => submit(otherId, 3) },
      { text: '⭐⭐⭐⭐', onPress: () => submit(otherId, 4) },
      { text: '⭐⭐⭐⭐⭐', onPress: () => submit(otherId, 5) },
    ]);
  }

  async function openMenu() {
    Alert.alert(t('chat.menuTitle'), undefined, [
      {
        text: t('chat.blockUser'),
        style: 'destructive',
        onPress: () => {
          Alert.alert(t('chat.blockUser'), t('chat.blockConfirm'), [
            { text: t('common.cancel'), style: 'cancel' },
            {
              text: t('chat.blockAction'),
              style: 'destructive',
              onPress: async () => {
                const { data: otherId, error: e1 } = await otherInConversation(id);
                if (e1) { Alert.alert(t('chat.error'), e1); return; }
                if (!otherId) { Alert.alert(t('chat.error'), t('chat.noParticipant')); return; }
                const { error } = await blockUser(userId, otherId);
                if (error) { Alert.alert(t('chat.error'), error); return; }
                router.back();
              },
            },
          ]);
        },
      },
      {
        text: t('chat.report'),
        onPress: async () => {
          const { data: otherId, error: e1 } = await otherInConversation(id);
          if (e1) { Alert.alert(t('chat.error'), e1); return; }
          if (!otherId) { Alert.alert(t('chat.error'), t('chat.noParticipant')); return; }
          if ((Alert as any).prompt) {
            (Alert as any).prompt(t('chat.reportTitle'), t('chat.reportPrompt'), async (reason: string) => {
              const { error } = await reportUser(userId, otherId, reason ?? '');
              if (error) { Alert.alert(t('chat.error'), error); return; }
              Alert.alert(t('chat.reportThanks'));
            });
          } else {
            const { error } = await reportUser(userId, otherId, '');
            if (error) { Alert.alert(t('chat.error'), error); return; }
            Alert.alert(t('chat.reportThanks'));
          }
        },
      },
      { text: t('common.cancel'), style: 'cancel' },
    ]);
  }

  async function onSend() {
    const body = text.trim();
    if (!body) return;
    setText('');
    const { error } = await sendMessage(id, userId, body);
    if (error) {
      setText(body);
      Alert.alert(t('chat.sendFailed'), error);
    }
  }

  async function openMeetup() {
    const coords = await getCurrentCoords();
    setCurrentCoords(coords);
    setMeetupCoords(coords);
    setShowMeetup(true);
  }

  async function sendMeetupLocation() {
    if (!meetupCoords) { Alert.alert(t('chat.pickLocationTitle'), t('chat.pickLocationBody')); return; }
    const { lat, lng } = meetupCoords;
    const body = `${t('chat.meetupPrefix')}https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=17/${lat}/${lng}`;
    const { error } = await sendMessage(id, userId, body);
    if (error) { Alert.alert(t('chat.sendFailed'), error); return; }
    setShowMeetup(false);
  }

  return (
    <View style={styles.screen}>
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{headerTitle}</Text>
          <Pressable onPress={() => { setPickedDate(new Date(Date.now() + 3600_000)); setShowDate(true); }} style={styles.scheduleButton} accessibilityRole="button" accessibilityLabel={t('chat.schedule')}>
            <Text style={styles.scheduleText}>{t('chat.schedule')}</Text>
          </Pressable>
          <Pressable onPress={openRating} style={styles.rateButton} accessibilityRole="button" accessibilityLabel={t('chat.rate')}>
            <Text style={styles.rateText}>{t('chat.rate')}</Text>
          </Pressable>
          <Pressable onPress={openMenu} style={styles.menuButton} accessibilityRole="button" accessibilityLabel={t('chat.menuTitle')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={styles.menuText}>⋯</Text>
          </Pressable>
          <Pressable onPress={() => router.back()} style={styles.backButton} accessibilityRole="button" accessibilityLabel={t('common.back')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
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
                <Pressable onPress={() => setShowDate(false)} style={styles.cancelPickerBtn} accessibilityRole="button" accessibilityLabel={t('common.cancel')}>
                  <Text style={styles.cancelPickerText}>{t('common.cancel')}</Text>
                </Pressable>
                <Pressable onPress={() => confirmSchedule(pickedDate ?? new Date(Date.now() + 3600_000))} style={styles.confirmPickerBtn} accessibilityRole="button" accessibilityLabel={t('chat.confirm')}>
                  <Text style={styles.confirmPickerText}>{t('chat.confirm')}</Text>
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
            <Pressable onPress={openMeetup} style={styles.meetupBtn} accessibilityRole="button" accessibilityLabel={t('chat.suggestMeetup')}>
              <Text style={styles.meetupBtnText}>{t('chat.suggestMeetup')}</Text>
            </Pressable>
            <TextInput
              style={styles.input}
              placeholder={t('chat.messagePlaceholder')}
              placeholderTextColor={colors.inkCoolSoft}
              value={text}
              onChangeText={setText}
              multiline
            />
            <Pressable testID="send-message" onPress={onSend} style={styles.send} accessibilityRole="button" accessibilityLabel={t('chat.send')}>
              <Text style={styles.sendText}>{t('chat.send')}</Text>
            </Pressable>
          </View>

          <Modal visible={showMeetup} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowMeetup(false)}>
            <SafeAreaView style={styles.modalSafe}>
              <View style={styles.modalHeader}>
                <Pressable onPress={() => setShowMeetup(false)} style={styles.modalCancelBtn} accessibilityRole="button" accessibilityLabel={t('common.cancel')}>
                  <Text style={styles.modalCancelText}>{t('common.cancel')}</Text>
                </Pressable>
                <Text style={styles.modalTitle}>{t('chat.pickMeetupTitle')}</Text>
                <View style={styles.modalCancelBtn} />
              </View>
              <MapPicker initial={currentCoords} onPick={(c) => setMeetupCoords(c)} />
              <View style={styles.modalFooter}>
                <Pressable onPress={sendMeetupLocation} style={[styles.send, styles.sendFullWidth]} accessibilityRole="button" accessibilityLabel={t('chat.sendLocation')}>
                  <Text style={styles.sendText}>{t('chat.sendLocation')}</Text>
                </Pressable>
              </View>
            </SafeAreaView>
          </Modal>
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
  rateButton: { paddingHorizontal: 10, paddingVertical: 6 },
  rateText: { fontFamily: font.regular, fontSize: 13, color: colors.rose },
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
  meetupBtn: { paddingHorizontal: 10, paddingVertical: 8, justifyContent: 'center' },
  meetupBtnText: { fontFamily: font.regular, fontSize: 13, color: colors.brandDark, textAlign: 'right' },
  modalSafe: { flex: 1, backgroundColor: colors.bgApp },
  modalHeader: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', height: 50, paddingHorizontal: 12, backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.lineCool },
  modalTitle: { fontFamily: font.bold, fontSize: 16, color: colors.brandDark, textAlign: 'center', flex: 1 },
  modalCancelBtn: { width: 60, paddingVertical: 8 },
  modalCancelText: { fontFamily: font.regular, fontSize: 15, color: colors.rose, textAlign: 'left' },
  modalFooter: { padding: 16, backgroundColor: colors.white, borderTopWidth: 1, borderTopColor: colors.lineCool },
  sendFullWidth: { alignItems: 'center', paddingVertical: 14 },
});

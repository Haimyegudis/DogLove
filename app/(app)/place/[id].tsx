import { useCallback, useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, ScrollView, Linking, Alert, ActivityIndicator } from 'react-native';
import { Stack, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { colors, font, radius, shadow } from '../../../src/theme';
import { listPlaceReviews, myPlaceReview, ratePlace, type PlaceReview, type PlaceKind } from '../../../src/services/places';

const TAGS: Record<PlaceKind, string[]> = {
  park: ['גדול', 'קטן', 'נקי', 'מטופח', 'מגודר', 'צל', 'ברז מים', 'מוצל'],
  vet: ['מקצועי', 'שירות טוב', 'יקר', 'מחירים הוגנים', 'זמינות גבוהה', 'יחס חם'],
  petshop: ['יקר', 'מחירים טובים', 'מבחר גדול', 'שירות טוב', 'חניה נוחה'],
};

const KIND_TITLE: Record<PlaceKind, string> = { park: 'גינת כלבים', vet: 'וטרינר', petshop: 'חנות' };

export default function PlaceDetail() {
  const params = useLocalSearchParams<{ id: string; kind: PlaceKind; name: string; lat: string; lng: string }>();
  const placeId = Number(params.id);
  const kind = (params.kind as PlaceKind) ?? 'park';
  const name = params.name ?? KIND_TITLE[kind];
  const lat = Number(params.lat);
  const lng = Number(params.lng);

  const [reviews, setReviews] = useState<PlaceReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [stars, setStars] = useState(0);
  const [comment, setComment] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: list }, { data: mine }] = await Promise.all([
      listPlaceReviews(placeId, kind),
      myPlaceReview(placeId, kind),
    ]);
    setReviews(list);
    if (mine) { setStars(mine.stars); setComment(mine.comment ?? ''); setTags(mine.tags ?? []); }
    setLoading(false);
  }, [placeId, kind]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  function toggleTag(t: string) {
    setTags((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));
  }

  async function onSave() {
    if (stars < 1) { Alert.alert('דירוג חסר', 'בחר/י דירוג בכוכבים'); return; }
    setSaving(true);
    const { error } = await ratePlace({ placeId, kind, stars, comment, tags, name, lat, lng });
    setSaving(false);
    if (error) { Alert.alert('שמירה נכשלה', error); return; }
    Alert.alert('תודה! ⭐', 'הדירוג נשמר.');
    load();
  }

  const avg = reviews.length ? (reviews.reduce((s, r) => s + r.stars, 0) / reviews.length).toFixed(1) : null;

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ title: name }} />
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={[styles.head, shadow.card]}>
          <Text style={styles.name}>{name}</Text>
          <Text style={styles.sub}>
            {KIND_TITLE[kind]} · {avg ? `⭐ ${avg} (${reviews.length})` : 'אין דירוגים עדיין'}
          </Text>
          <Pressable style={styles.mapBtn} onPress={() => Linking.openURL(`https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=18/${lat}/${lng}`)}>
            <Text style={styles.mapBtnText}>📍 פתח במפה</Text>
          </Pressable>
        </View>

        <View style={[styles.formCard, shadow.card]}>
          <Text style={styles.formTitle}>הדירוג שלי</Text>
          <View style={styles.starsRow}>
            {[1, 2, 3, 4, 5].map((n) => (
              <Pressable key={n} onPress={() => setStars(n)} hitSlop={6}>
                <Text style={[styles.star, n <= stars && styles.starOn]}>{n <= stars ? '★' : '☆'}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.label}>מה אפיין את המקום?</Text>
          <View style={styles.tagWrap}>
            {TAGS[kind].map((t) => (
              <Pressable key={t} onPress={() => toggleTag(t)} style={[styles.tag, tags.includes(t) && styles.tagOn]}>
                <Text style={[styles.tagText, tags.includes(t) && styles.tagTextOn]}>{t}</Text>
              </Pressable>
            ))}
          </View>

          <TextInput
            style={styles.input}
            placeholder="ביקורת חופשית (אופציונלי)"
            placeholderTextColor={colors.inkCoolSoft}
            value={comment}
            onChangeText={setComment}
            multiline
            textAlign="right"
          />

          <Pressable style={styles.saveBtn} disabled={saving} onPress={onSave}>
            <Text style={styles.saveBtnText}>{saving ? 'שומר…' : 'שמור דירוג ⭐'}</Text>
          </Pressable>
        </View>

        <Text style={styles.reviewsTitle}>ביקורות ({reviews.length})</Text>
        {loading ? (
          <ActivityIndicator color={colors.rose} style={{ marginTop: 20 }} />
        ) : reviews.length === 0 ? (
          <Text style={styles.empty}>אין עדיין ביקורות. היה/י הראשון/ה!</Text>
        ) : (
          reviews.map((r, i) => (
            <View key={i} style={[styles.reviewCard, shadow.soft]}>
              <View style={styles.reviewHead}>
                <Text style={styles.reviewer}>{r.reviewer_name ?? 'משתמש'}</Text>
                <Text style={styles.reviewStars}>{'★'.repeat(r.stars)}{'☆'.repeat(5 - r.stars)}</Text>
              </View>
              {r.tags && r.tags.length > 0 ? (
                <View style={styles.reviewTags}>
                  {r.tags.map((t) => <Text key={t} style={styles.reviewTag}>{t}</Text>)}
                </View>
              ) : null}
              {r.comment ? <Text style={styles.reviewComment}>{r.comment}</Text> : null}
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bgApp },
  scroll: { padding: 16, gap: 14, paddingBottom: 40 },
  head: { backgroundColor: colors.white, borderRadius: radius.lg, padding: 18, gap: 6, borderWidth: 1, borderColor: colors.lineCool },
  name: { fontFamily: font.black, fontSize: 20, color: colors.brandDark, textAlign: 'right' },
  sub: { fontFamily: font.medium, fontSize: 14, color: colors.inkCoolSoft, textAlign: 'right' },
  mapBtn: { alignSelf: 'flex-end', marginTop: 6, backgroundColor: colors.purpleSoft, borderRadius: radius.pill, paddingVertical: 7, paddingHorizontal: 14 },
  mapBtnText: { fontFamily: font.bold, fontSize: 13, color: colors.purple },

  formCard: { backgroundColor: colors.white, borderRadius: radius.lg, padding: 18, gap: 10, borderWidth: 1, borderColor: colors.lineCool },
  formTitle: { fontFamily: font.black, fontSize: 16, color: colors.brandDark, textAlign: 'right' },
  starsRow: { flexDirection: 'row-reverse', gap: 6, alignSelf: 'flex-end' },
  star: { fontSize: 34, color: colors.lineCool },
  starOn: { color: '#FFB400' },
  label: { fontFamily: font.medium, fontSize: 13, color: colors.inkCoolSoft, textAlign: 'right', marginTop: 4 },
  tagWrap: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8 },
  tag: { paddingVertical: 7, paddingHorizontal: 13, borderRadius: radius.pill, borderWidth: 1.5, borderColor: colors.lineCool, backgroundColor: colors.white },
  tagOn: { backgroundColor: colors.roseSoft, borderColor: colors.rose },
  tagText: { fontFamily: font.medium, fontSize: 13, color: colors.inkCoolSoft },
  tagTextOn: { color: colors.rose, fontFamily: font.bold },
  input: { backgroundColor: colors.bgApp, borderWidth: 1, borderColor: colors.lineCool, borderRadius: radius.md, padding: 12, minHeight: 64, fontFamily: font.regular, fontSize: 14, color: colors.inkCool, textAlignVertical: 'top', writingDirection: 'rtl' },
  saveBtn: { backgroundColor: colors.rose, borderRadius: radius.pill, paddingVertical: 13, alignItems: 'center', marginTop: 4 },
  saveBtnText: { fontFamily: font.black, fontSize: 15, color: colors.white },

  reviewsTitle: { fontFamily: font.black, fontSize: 16, color: colors.brandDark, textAlign: 'right', marginTop: 4 },
  empty: { fontFamily: font.regular, fontSize: 14, color: colors.inkCoolSoft, textAlign: 'center', marginTop: 16 },
  reviewCard: { backgroundColor: colors.white, borderRadius: radius.md, padding: 14, gap: 6, borderWidth: 1, borderColor: colors.lineCool },
  reviewHead: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' },
  reviewer: { fontFamily: font.bold, fontSize: 14, color: colors.brandDark },
  reviewStars: { fontSize: 14, color: '#FFB400' },
  reviewTags: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 6 },
  reviewTag: { fontFamily: font.medium, fontSize: 12, color: colors.purple, backgroundColor: colors.purpleSoft, borderRadius: radius.pill, paddingVertical: 3, paddingHorizontal: 9 },
  reviewComment: { fontFamily: font.regular, fontSize: 14, color: colors.inkCool, textAlign: 'right', lineHeight: 19 },
});

import { View, Text, Image, Pressable, ScrollView, StyleSheet, Alert } from 'react-native';
import type { GalleryPhoto } from '../services/gallery';
import { colors, font, radius } from '../theme';

type Props = {
  photos: GalleryPhoto[];
  editable?: boolean;
  busy?: boolean;
  onAdd?: () => void;
  onDelete?: (id: string) => void;
  emptyText?: string;
};

export default function PhotoGallery({ photos, editable = false, busy = false, onAdd, onDelete, emptyText }: Props) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {editable && (
        <Pressable
          style={styles.addTile}
          onPress={onAdd}
          disabled={busy}
          accessibilityRole="button"
          accessibilityLabel="הוספת תמונה"
          accessibilityState={{ disabled: busy, busy }}
        >
          <Text style={styles.addPlus} importantForAccessibility="no">{busy ? '…' : '+'}</Text>
          <Text style={styles.addText} importantForAccessibility="no">הוסף</Text>
        </Pressable>
      )}
      {photos.length === 0 && !editable ? (
        <Text style={styles.empty}>{emptyText ?? 'אין עדיין תמונות'}</Text>
      ) : (
        photos.map((p) => (
          <Pressable
            key={p.id}
            accessibilityRole="image"
            accessibilityLabel="תמונת כלב"
            accessibilityHint={editable && onDelete ? 'לחיצה ארוכה למחיקת התמונה' : undefined}
            onLongPress={editable && onDelete ? () => {
              Alert.alert('למחוק תמונה?', '', [
                { text: 'ביטול', style: 'cancel' },
                { text: 'מחק', style: 'destructive', onPress: () => onDelete(p.id) },
              ]);
            } : undefined}
          >
            <Image source={{ uri: p.photo_url }} style={styles.thumb} />
            {editable ? <Text style={styles.hint}>לחיצה ארוכה למחיקה</Text> : null}
          </Pressable>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row-reverse', gap: 10, paddingVertical: 4 },
  thumb: { width: 96, height: 96, borderRadius: radius.md, backgroundColor: colors.lineCool },
  hint: { fontFamily: font.regular, fontSize: 9, color: colors.inkCoolSoft, textAlign: 'center', marginTop: 2 },
  addTile: { width: 96, height: 96, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.rose, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.roseSoft },
  addPlus: { fontSize: 28, color: colors.rose, fontFamily: font.bold },
  addText: { fontSize: 12, color: colors.rose, fontFamily: font.medium },
  empty: { fontFamily: font.regular, fontSize: 13, color: colors.inkCoolSoft, paddingVertical: 30, paddingHorizontal: 10 },
});

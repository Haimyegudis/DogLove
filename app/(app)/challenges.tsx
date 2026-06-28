import { useCallback, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { colors, font, radius, shadow } from '../../src/theme';
import {
  listChallenges,
  joinChallenge,
  leaveChallenge,
  createChallenge,
  type Challenge,
} from '../../src/services/challenges';

type GoalKind = 'walks' | 'distance_km' | 'streak_days';

const GOAL_LABELS: Record<GoalKind, string> = {
  walks: 'טיולים',
  distance_km: 'ק״מ',
  streak_days: 'ימי רצף',
};

export default function ChallengesScreen() {
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  // Create-form state
  const [showForm, setShowForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newKind, setNewKind] = useState<GoalKind>('walks');
  const [newTarget, setNewTarget] = useState('');
  const [newDays, setNewDays] = useState('7');
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await listChallenges();
    setChallenges(data ?? []);
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      setLoading(true);
      listChallenges().then(({ data }) => {
        if (active) {
          setChallenges(data ?? []);
          setLoading(false);
        }
      });
      return () => { active = false; };
    }, [])
  );

  const handleJoin = async (id: string) => {
    setBusyId(id);
    const { error } = await joinChallenge(id);
    if (error) Alert.alert('שגיאה', error);
    else await load();
    setBusyId(null);
  };

  const handleLeave = async (id: string) => {
    setBusyId(id);
    const { error } = await leaveChallenge(id);
    if (error) Alert.alert('שגיאה', error);
    else await load();
    setBusyId(null);
  };

  const handleCreate = async () => {
    if (!newTitle.trim()) { Alert.alert('שגיאה', 'יש להזין כותרת לאתגר'); return; }
    const target = parseFloat(newTarget);
    if (!target || target <= 0) { Alert.alert('שגיאה', 'יש להזין יעד חיובי'); return; }
    const days = parseInt(newDays, 10);
    if (!days || days <= 0) { Alert.alert('שגיאה', 'יש להזין מספר ימים חיובי'); return; }

    const endsAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
    setCreating(true);
    const { error } = await createChallenge({
      title: newTitle.trim(),
      description: newDescription.trim() || undefined,
      goalKind: newKind,
      goalTarget: target,
      endsAt,
    });
    setCreating(false);
    if (error) { Alert.alert('שגיאה', error); return; }
    setNewTitle('');
    setNewDescription('');
    setNewKind('walks');
    setNewTarget('');
    setNewDays('7');
    setShowForm(false);
    await load();
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View style={styles.headerRow}>
          <Text style={styles.title}>אתגרי כושר</Text>
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => setShowForm(v => !v)}
            accessibilityLabel="אתגר חדש"
          >
            <Text style={styles.addBtnText}>{showForm ? '✕' : '+ אתגר חדש'}</Text>
          </TouchableOpacity>
        </View>

        {/* Create form */}
        {showForm && (
          <View style={styles.form}>
            <Text style={styles.formTitle}>אתגר חדש</Text>

            <TextInput
              style={styles.input}
              placeholder="כותרת האתגר"
              placeholderTextColor={colors.inkCoolSoft}
              value={newTitle}
              onChangeText={setNewTitle}
              textAlign="right"
            />

            <TextInput
              style={[styles.input, styles.inputMulti]}
              placeholder="תיאור (אופציונלי)"
              placeholderTextColor={colors.inkCoolSoft}
              value={newDescription}
              onChangeText={setNewDescription}
              textAlign="right"
              multiline
              numberOfLines={2}
            />

            {/* Goal kind chips */}
            <Text style={styles.formLabel}>סוג יעד</Text>
            <View style={styles.chips}>
              {(['walks', 'distance_km', 'streak_days'] as GoalKind[]).map(k => (
                <TouchableOpacity
                  key={k}
                  style={[styles.chip, newKind === k && styles.chipActive]}
                  onPress={() => setNewKind(k)}
                >
                  <Text style={[styles.chipText, newKind === k && styles.chipTextActive]}>
                    {GOAL_LABELS[k]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.row2}>
              <View style={styles.halfInput}>
                <Text style={styles.formLabel}>יעד ({GOAL_LABELS[newKind]})</Text>
                <TextInput
                  style={styles.input}
                  placeholder="למשל 10"
                  placeholderTextColor={colors.inkCoolSoft}
                  value={newTarget}
                  onChangeText={setNewTarget}
                  keyboardType="numeric"
                  textAlign="right"
                />
              </View>
              <View style={styles.halfInput}>
                <Text style={styles.formLabel}>מספר ימים</Text>
                <TextInput
                  style={styles.input}
                  placeholder="7"
                  placeholderTextColor={colors.inkCoolSoft}
                  value={newDays}
                  onChangeText={setNewDays}
                  keyboardType="numeric"
                  textAlign="right"
                />
              </View>
            </View>

            <TouchableOpacity
              style={[styles.createBtn, creating && styles.createBtnDisabled]}
              onPress={handleCreate}
              disabled={creating}
            >
              {creating
                ? <ActivityIndicator size="small" color={colors.white} />
                : <Text style={styles.createBtnText}>צור אתגר</Text>
              }
            </TouchableOpacity>
          </View>
        )}

        {/* List */}
        {loading ? (
          <ActivityIndicator size="large" color={colors.rose} style={styles.loader} />
        ) : challenges.length === 0 ? (
          <Text style={styles.empty}>אין אתגרים פעילים כרגע</Text>
        ) : (
          <View style={styles.list}>
            {challenges.map(c => (
              <ChallengeCard
                key={c.id}
                challenge={c}
                busy={busyId === c.id}
                onJoin={() => handleJoin(c.id)}
                onLeave={() => handleLeave(c.id)}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function ChallengeCard({
  challenge,
  busy,
  onJoin,
  onLeave,
}: {
  challenge: Challenge;
  busy: boolean;
  onJoin: () => void;
  onLeave: () => void;
}) {
  const { title, description, goal_kind, goal_target, participant_count, i_joined, my_progress } = challenge;
  const progress = Math.min(my_progress / goal_target, 1);
  const progressPct = Math.round(progress * 100);
  const progressColor = progress >= 1 ? colors.green : colors.rose;
  const kindLabel = GOAL_LABELS[goal_kind as GoalKind] ?? goal_kind;

  return (
    <View style={[styles.card, shadow.card]}>
      {/* Title row */}
      <Text style={styles.cardTitle}>{title}</Text>
      {description ? <Text style={styles.cardDesc}>{description}</Text> : null}

      {/* Progress */}
      <View style={styles.progressSection}>
        <View style={styles.progressLabelRow}>
          <Text style={styles.progressLabel}>התקדמות</Text>
          <Text style={[styles.progressValue, { color: progressColor }]}>
            {my_progress} / {goal_target} {kindLabel}
          </Text>
        </View>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progressPct}%` as any, backgroundColor: progressColor }]} />
        </View>
      </View>

      {/* Footer */}
      <View style={styles.cardFooter}>
        <Text style={styles.participantsText}>👥 {participant_count} משתתפים</Text>
        <TouchableOpacity
          style={[styles.actionBtn, i_joined ? styles.actionBtnLeave : styles.actionBtnJoin]}
          onPress={i_joined ? onLeave : onJoin}
          disabled={busy}
        >
          {busy
            ? <ActivityIndicator size="small" color={colors.white} />
            : <Text style={i_joined ? styles.actionBtnTextLeave : styles.actionBtnTextJoin}>{i_joined ? 'עזוב' : 'הצטרף'}</Text>
          }
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bgApp },
  content: { padding: 20, gap: 16, paddingBottom: 40 },

  headerRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  title: {
    fontSize: 24,
    fontFamily: font.bold,
    color: colors.brandDark,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  addBtn: {
    backgroundColor: colors.purpleSoft,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: radius.pill,
  },
  addBtnText: {
    fontFamily: font.medium,
    color: colors.purple,
    fontSize: 14,
  },

  // Form
  form: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: 16,
    gap: 10,
    ...shadow.soft,
  },
  formTitle: {
    fontFamily: font.bold,
    color: colors.brandDark,
    fontSize: 16,
    textAlign: 'right',
    writingDirection: 'rtl',
    marginBottom: 2,
  },
  formLabel: {
    fontFamily: font.medium,
    color: colors.inkCool,
    fontSize: 13,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  input: {
    borderWidth: 1,
    borderColor: colors.lineCool,
    borderRadius: radius.sm,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontFamily: font.regular,
    fontSize: 15,
    color: colors.inkCool,
    backgroundColor: colors.bgApp,
  },
  inputMulti: {
    minHeight: 60,
    textAlignVertical: 'top',
  },
  chips: {
    flexDirection: 'row-reverse',
    gap: 8,
    flexWrap: 'wrap',
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.lineCool,
    backgroundColor: colors.bgApp,
  },
  chipActive: {
    backgroundColor: colors.purpleSoft,
    borderColor: colors.purple,
  },
  chipText: {
    fontFamily: font.regular,
    fontSize: 13,
    color: colors.inkCoolSoft,
  },
  chipTextActive: {
    fontFamily: font.medium,
    color: colors.purple,
  },
  row2: {
    flexDirection: 'row-reverse',
    gap: 10,
  },
  halfInput: { flex: 1, gap: 4 },
  createBtn: {
    backgroundColor: colors.rose,
    borderRadius: radius.sm,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  createBtnDisabled: { opacity: 0.6 },
  createBtnText: {
    fontFamily: font.bold,
    color: colors.white,
    fontSize: 16,
  },

  loader: { marginTop: 48 },
  empty: {
    textAlign: 'center',
    fontFamily: font.regular,
    color: colors.inkCoolSoft,
    fontSize: 16,
    marginTop: 48,
  },
  list: { gap: 14 },

  // Challenge card
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: 16,
    gap: 10,
  },
  cardTitle: {
    fontFamily: font.bold,
    fontSize: 17,
    color: colors.brandDark,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  cardDesc: {
    fontFamily: font.regular,
    fontSize: 13,
    color: colors.inkCoolSoft,
    textAlign: 'right',
    writingDirection: 'rtl',
  },

  // Progress
  progressSection: { gap: 6 },
  progressLabelRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressLabel: {
    fontFamily: font.medium,
    fontSize: 13,
    color: colors.inkCoolSoft,
    writingDirection: 'rtl',
  },
  progressValue: {
    fontFamily: font.bold,
    fontSize: 13,
  },
  progressTrack: {
    height: 8,
    backgroundColor: colors.lineCool,
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: radius.pill,
    minWidth: 4,
  },

  // Footer
  cardFooter: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 2,
  },
  participantsText: {
    fontFamily: font.regular,
    fontSize: 13,
    color: colors.inkCoolSoft,
  },
  actionBtn: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: radius.pill,
    minWidth: 80,
    alignItems: 'center',
  },
  actionBtnJoin: { backgroundColor: colors.green },
  actionBtnLeave: { backgroundColor: colors.roseSoft },
  actionBtnTextJoin: {
    fontFamily: font.bold,
    fontSize: 14,
    color: colors.white,
  },
  actionBtnTextLeave: {
    fontFamily: font.bold,
    fontSize: 14,
    color: colors.coralDeep,
  },
});

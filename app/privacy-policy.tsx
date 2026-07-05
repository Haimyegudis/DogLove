import { Text, StyleSheet, View, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { colors, font, radius } from '../src/theme';

type Section = { heading: string; body?: string; bullets?: string[] };

const UPDATED = 'עודכן לאחרונה: ינואר 2026';

const SECTIONS: Section[] = [
  {
    heading: 'מבוא',
    body:
      'כלב LOVE ("האפליקציה", "אנחנו") היא רשת חברתית לבעלי כלבים, הכוללת פרופילי כלבים, ' +
      'הליכות משותפות, צ׳אט, שיתוף תמונות, דיווח על כלבים אבודים, וכן פיצ׳רים היכרויות המיועדים ' +
      'לבגירים בלבד (18+). מדיניות זו מסבירה אילו נתונים אנו אוספים, כיצד אנו משתמשים בהם, עם מי הם ' +
      'משותפים, וכיצד תוכל לממש את זכויותיך. אנו מאמינים בשקיפות ובאיסוף מינימלי של מידע.',
  },
  {
    heading: 'איזה מידע אנחנו אוספים',
    bullets: [
      'כתובת אימייל — לצורך יצירת החשבון והתחברות.',
      'שם תצוגה — השם שאיתו אחרים רואים אותך.',
      'תאריך לידה — משמש אך ורק לאימות גיל (18+); איננו מציגים אותו לאחרים.',
      'מגדר ועיר — אם בחרת למלא אותם, לצורך התאמה וסינון בהיכרויות.',
      'פרופילי כלבים — שם, גזע, גיל, גודל, תיאור ותמונה של הכלבים שלך.',
      'תמונות — תמונות פרופיל, תמונות כלבים ותמונות שאתה מעלה לפיד.',
      'אזור מגורים מקורב — נשמר רק אם בחרת להפעיל זאת (opt-in), לצורך מיון תוכן קרוב אליך; ' +
        'כיבוי ההגדרה מוחק את המיקום השמור בשרת.',
      'מיקום מדויק — משותף אך ורק בזמן הליכה פעילה, ומטושטש לאחרים לרזולוציה של כ-110 מטר.',
      'הודעות צ׳אט — תוכן ההתכתבויות שלך עם משתמשים אחרים.',
      'צ׳ק-אין בפארק — כשאתה מסמן נוכחות בפארק כלבים.',
      'דיווחי כלב אבוד — פרטי הכלב, הערה ומיקום מקורב אם בחרת לצרף.',
      'יומן הליכות — נתוני הליכות שהשלמת (מרחק וזמן).',
    ],
  },
  {
    heading: 'כיצד אנחנו משתמשים במידע',
    bullets: [
      'להפעלת החשבון והצגת הפרופיל שלך למשתמשים רלוונטיים.',
      'לחיבור בינך לבין בעלי כלבים אחרים בקרבתך ולתיאום מפגשים והליכות.',
      'להצגת הליכות פעילות של משתמשים אחרים בזמן אמת (במיקום מטושטש).',
      'להצגת שירותים ומקומות קרובים (פארקים, וטרינרים וכד׳).',
      'לשליחת התראות רלוונטיות (הודעות חדשות, בקשות, תזכורות).',
      'לאבטחת השירות, מניעת שימוש לרעה ואכיפת תנאי השימוש.',
    ],
  },
  {
    heading: 'הגנות פרטיות על מיקום',
    body:
      'מיקומך המדויק לעולם אינו נאסף ברקע. הוא משותף אך ורק בזמן שאתה בהליכה פעילה שיזמת, ' +
      'ומופסק ברגע שסיימת. גם אז, המיקום המוצג למשתמשים אחרים מטושטש בכוונה לרזולוציה של כ-110 מטר, ' +
      'כדי שלא ניתן יהיה לאתר אותך במדויק. אזור המגורים המקורב נשמר רק אם הפעלת זאת ידנית, ואפשר לכבותו ' +
      'בכל רגע — פעולה שגם מוחקת את המיקום השמור.',
  },
  {
    heading: 'צדדים שלישיים',
    body:
      'אנו משתמשים במספר מצומצם של ספקי תשתית, ואיננו מוכרים את המידע שלך לאף גורם.',
    bullets: [
      'Supabase / PostgreSQL — אחסון מסד הנתונים, אימות משתמשים ואחסון הקבצים והתמונות.',
      'OpenStreetMap (Overpass API) — שליפת מקומות ושירותים ציבוריים בקרבתך; שאילתות אלו מבוססות ' +
        'על אזור כללי ואינן חושפות את זהותך.',
      'Expo Push Notifications — משמש למשלוח התראות למכשירך.',
    ],
  },
  {
    heading: 'שיתוף עם משתמשים אחרים',
    body:
      'שם התצוגה, תמונות הפרופיל, פרופילי הכלבים והתוכן שאתה מפרסם (תמונות בפיד, צ׳ק-אין, דיווחי אבדה) ' +
      'גלויים למשתמשים אחרים באפליקציה. הודעות צ׳אט גלויות רק לך ולנמען. תוכל להסתיר את עצמך מגילוי ' +
      'דרך הגדרות הפרטיות.',
  },
  {
    heading: 'שמירת מידע ומחיקה',
    body:
      'אנו שומרים את המידע כל עוד החשבון שלך פעיל. חלק מהנתונים הם זמניים מעצם טבעם — למשל צ׳ק-אין ' +
      'בפארק פג לאחר זמן קצר, ושיתוף המיקום נמחק בסיום ההליכה. כאשר אתה מוחק את חשבונך, אנו מוחקים את ' +
      'הפרופיל והנתונים המשויכים אליו.',
  },
  {
    heading: 'הזכויות שלך',
    body: 'דרך "מרכז הפרטיות" באפליקציה תוכל:',
    bullets: [
      'לגשת לנתונים שלך ולצפות בהם.',
      'לייצא עותק של הנתונים שלך (קובץ JSON הכולל את הפרופיל, הכלבים, ההודעות שלך ועוד).',
      'למחוק את חשבונך ואת הנתונים המשויכים אליו.',
      'לשלוט בגילוי, בשיתוף אזור המגורים ובהגדרות פרטיות נוספות.',
    ],
  },
  {
    heading: 'קטינים',
    body:
      'השירות מיועד לבגירים מגיל 18 ומעלה בלבד, בין היתר בשל פיצ׳רי ההיכרויות. איננו אוספים ביודעין ' +
      'מידע מקטינים. אם נודע לנו שנוצר חשבון על ידי קטין, נמחק אותו.',
  },
  {
    heading: 'אבטחה',
    body:
      'אנו נוקטים אמצעים סבירים להגנה על המידע, כולל הרשאות גישה ברמת השורה (RLS) המבטיחות שמשתמש ' +
      'יכול לגשת רק לנתונים שלו. עם זאת, אף שירות מקוון אינו מאובטח לחלוטין, ואיננו יכולים להבטיח ' +
      'אבטחה מוחלטת.',
  },
  {
    heading: 'שינויים במדיניות',
    body:
      'אנו עשויים לעדכן מדיניות זו מעת לעת. במקרה של שינוי מהותי נודיע על כך בתוך האפליקציה. המשך ' +
      'השימוש לאחר עדכון מהווה הסכמה למדיניות המעודכנת.',
  },
  {
    heading: 'יצירת קשר',
    body:
      'לכל שאלה, בקשה או פנייה בנושא פרטיות ניתן לפנות אלינו דרך ערוצי התמיכה באפליקציה.',
  },
];

export default function PrivacyPolicy() {
  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <Stack.Screen
        options={{
          title: 'מדיניות פרטיות',
          headerShown: true,
          headerStyle: { backgroundColor: colors.cream },
          headerTintColor: colors.bark,
          headerTitleStyle: { fontFamily: font.bold },
        }}
      />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.docTitle}>מדיניות פרטיות</Text>
        <Text style={styles.updated}>{UPDATED}</Text>

        {SECTIONS.map((s, i) => (
          <View key={i} style={styles.section}>
            <Text style={styles.heading}>{s.heading}</Text>
            {s.body ? <Text style={styles.body}>{s.body}</Text> : null}
            {s.bullets?.map((b, j) => (
              <View key={j} style={styles.bulletRow}>
                <Text style={styles.bulletDot}>•</Text>
                <Text style={styles.bulletText}>{b}</Text>
              </View>
            ))}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.cream },
  scroll: { padding: 20, paddingBottom: 40, gap: 18 },

  docTitle: {
    fontFamily: font.display,
    fontSize: 26,
    color: colors.bark,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  updated: {
    fontFamily: font.regular,
    fontSize: 13,
    color: colors.inkSoft,
    textAlign: 'right',
    writingDirection: 'rtl',
    marginTop: -8,
  },

  section: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 16,
    gap: 8,
  },
  heading: {
    fontFamily: font.bold,
    fontSize: 17,
    color: colors.coralDeep,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  body: {
    fontFamily: font.regular,
    fontSize: 15,
    lineHeight: 24,
    color: colors.ink,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  bulletRow: {
    flexDirection: 'row-reverse',
    alignItems: 'flex-start',
    gap: 8,
  },
  bulletDot: {
    fontFamily: font.bold,
    fontSize: 15,
    lineHeight: 24,
    color: colors.coral,
  },
  bulletText: {
    flex: 1,
    fontFamily: font.regular,
    fontSize: 15,
    lineHeight: 24,
    color: colors.ink,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
});

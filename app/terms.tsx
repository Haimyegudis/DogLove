import { Text, StyleSheet, View, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { colors, font, radius } from '../src/theme';

type Section = { heading: string; body?: string; bullets?: string[] };

const UPDATED = 'עודכן לאחרונה: ינואר 2026';

const SECTIONS: Section[] = [
  {
    heading: 'קבלת התנאים',
    body:
      'ברוכים הבאים לכלב LOVE ("האפליקציה", "השירות"). השימוש באפליקציה כפוף לתנאי שימוש אלה. ' +
      'עצם ההרשמה והשימוש בשירות מהווים הסכמה מלאה לתנאים אלה ולמדיניות הפרטיות. אם אינך מסכים לתנאים, ' +
      'אין לך רשות להשתמש בשירות.',
  },
  {
    heading: 'כשירות וגיל',
    body:
      'השירות מיועד לבגירים מגיל 18 ומעלה בלבד, בין היתר בשל פיצ׳רי ההיכרויות. בעצם השימוש אתה מצהיר ' +
      'שאתה בן 18 לפחות ובעל כשירות משפטית להתקשר בהסכם זה. אנו רשאים לאמת את גילך ולסגור חשבונות של ' +
      'משתמשים שאינם עומדים בדרישה זו.',
  },
  {
    heading: 'שימוש מקובל',
    body: 'בעת השימוש בשירות אתה מתחייב:',
    bullets: [
      'לספק מידע נכון ומדויק, ולא להתחזות לאדם אחר.',
      'לא להטריד, לאיים, לפגוע או להציק למשתמשים אחרים.',
      'לא לפרסם תוכן פוגעני, מיני, אלים, גזעני, בלתי חוקי או המפר זכויות של אחרים.',
      'לא להשתמש בשירות למטרות מסחריות, ספאם או הונאה.',
      'לא לנסות לפרוץ, לשבש או לעקוף את מנגנוני האבטחה של השירות.',
      'לכבד את שלומם ובטיחותם של בעלי חיים בכל אינטראקציה.',
    ],
  },
  {
    heading: 'תוכן ותמונות של המשתמש',
    body:
      'אתה נותר הבעלים של התוכן שאתה מעלה (תמונות, פרופילי כלבים, טקסטים). בהעלאת תוכן אתה מעניק לנו ' +
      'רישיון מוגבל להציגו ולהפיצו בתוך השירות לצורך הפעלתו. אתה מצהיר שיש לך את הזכויות בתוכן שאתה ' +
      'מעלה. אנו רשאים להסיר תוכן המפר תנאים אלה, לפי שיקול דעתנו.',
  },
  {
    heading: 'בטיחות, חסימה ודיווח',
    body:
      'באפשרותך לחסום ולדווח על משתמשים. אנו מספקים כלים אלה כדי לשמור על קהילה בטוחה, אך איננו ' +
      'מבטיחים את התנהגותם של משתמשים אחרים ואיננו ערבים לקיומם או להצלחתם של מפגשים כלשהם. מפגשים עם ' +
      'אנשים שהכרת באפליקציה נעשים באחריותך בלבד — נקוט משנה זהירות, היפגש במקומות ציבוריים ואל תמסור ' +
      'מידע אישי רגיש.',
  },
  {
    heading: 'פיצ׳רים מבוססי מיקום',
    body:
      'השירות כולל פיצ׳רים מבוססי מיקום, כגון שיתוף מיקום בהליכה פעילה, צ׳ק-אין בפארק ואיתור מקומות ' +
      'קרובים. שיתוף המיקום המדויק מתרחש רק בזמן הליכה יזומה והוא מטושטש לאחרים. נתוני מיקום ומפות ' +
      'עשויים להיות משוערים ואינם מדויקים תמיד — אין להסתמך עליהם למצבי חירום.',
  },
  {
    heading: 'שירות פרימיום',
    body:
      'פיצ׳רי הפרימיום בשירות מוצעים כעת כהדגמה (demo) ללא כל תשלום. אין כרגע חיוב כספי, מנוי או רכישה ' +
      'בתוך האפליקציה. אם נשיק בעתיד תכונות בתשלום, נעדכן על כך מראש ותנאי החיוב יובאו לאישורך.',
  },
  {
    heading: 'הגבלת אחריות',
    body:
      'השירות ניתן כמות שהוא ("AS IS") וללא כל אחריות מכל סוג. איננו אחראים לנזק ישיר או עקיף הנובע ' +
      'מהשימוש בשירות, מהתנהגות משתמשים אחרים, ממפגשים, מדיוקן נתוני מיקום או מאובדן נתונים, במידה ' +
      'המרבית המותרת על פי דין.',
  },
  {
    heading: 'סיום והשעיה',
    body:
      'באפשרותך למחוק את חשבונך בכל עת דרך מרכז הפרטיות. אנו רשאים להשעות או לסגור חשבון המפר תנאים ' +
      'אלה, פוגע במשתמשים אחרים או מסכן את תקינות השירות, ללא הודעה מוקדמת במקרים חמורים.',
  },
  {
    heading: 'הדין החל',
    body:
      'על תנאים אלה יחול הדין החל במקום מושבנו [יש להשלים תחום שיפוט], וסמכות השיפוט הבלעדית תהיה של ' +
      'בתי המשפט המוסמכים באותו מקום.',
  },
  {
    heading: 'שינויים בתנאים',
    body:
      'אנו עשויים לעדכן תנאים אלה מעת לעת. במקרה של שינוי מהותי נודיע בתוך האפליקציה. המשך השימוש לאחר ' +
      'העדכון מהווה הסכמה לתנאים המעודכנים.',
  },
  {
    heading: 'יצירת קשר',
    body: 'לשאלות בנוגע לתנאי השימוש ניתן לפנות אלינו דרך ערוצי התמיכה באפליקציה.',
  },
];

export default function Terms() {
  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <Stack.Screen
        options={{
          title: 'תנאי שימוש',
          headerShown: true,
          headerStyle: { backgroundColor: colors.cream },
          headerTintColor: colors.bark,
          headerTitleStyle: { fontFamily: font.bold },
        }}
      />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.docTitle}>תנאי שימוש</Text>
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

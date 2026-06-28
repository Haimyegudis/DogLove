export type Lang = 'he' | 'en';

export const strings: Record<Lang, Record<string, string>> = {
  he: {
    // Tab labels
    'tabs.home': 'בית',
    'tabs.map': 'מפה',
    'tabs.playdates': 'משחקים',
    'tabs.messages': 'הודעות',
    'tabs.profile': 'פרופיל',

    // Dashboard hero
    'home.heroTitle': 'היי, חבר הכלבים! 🐾',
    'home.heroSub': 'בוא נמצא חברים חדשים ועוד הרפתקאות בשכונה',
    'home.heroBtn': 'גלה הרפתקאות חדשות! 🦮',

    // Dashboard section
    'home.section': 'קיצורי דרך ✨',

    // Feature cards — titles
    'card.map.title': 'צא לטיול',
    'card.findFriend.title': 'מצא חבר',
    'card.search.title': 'חיפוש',
    'card.calendar.title': 'יומן',
    'card.gallery.title': 'גלריה',
    'card.lostDog.title': 'כלב נעדר',
    'card.socialWalks.title': 'טיולים קבוצתיים',
    'card.walkers.title': 'מטיילי כלבים',
    'card.walkStats.title': 'הסטטיסטיקה שלי',
    'card.challenges.title': 'אתגרי כושר',
    'card.badges.title': 'ההישגים שלי',
    'card.places.title': 'שירותים קרובים',
    'card.premium.title': 'Premium',

    // Feature cards — subtitles
    'card.map.sub': 'כלבים פעילים על המפה',
    'card.findFriend.sub': 'בקשות משחק לכלב שלך',
    'card.search.sub': 'כלבים לפי סוג, בעלים',
    'card.calendar.sub': 'מפגשים מתוכננים',
    'card.gallery.sub': 'תמונות של כלבים',
    'card.lostDog.sub': 'התראות בקהילה',
    'card.socialWalks.sub': 'להיפגש בפארק',
    'card.walkers.sub': 'מי יוציא את הכלב',
    'card.walkStats.sub': 'טיולים ורצף',
    'card.challenges.sub': 'התחרו בקהילה',
    'card.badges.sub': 'תגים ומדליות',
    'card.places.sub': 'וטרינר, גינות',
    'card.premium.sub': 'שדרג את החוויה',

    // Profile screen
    'profile.myDogs': 'הכלבים שלי 🐾',
    'profile.add': '+ הוסף',
    'profile.edit': 'עריכה ✏️',
    'profile.signOut': 'התנתק',
    'profile.privacy': 'פרטיות והגדרות 🔒',
    'profile.completeTitle': 'בוא נשלים את הפרופיל',
    'profile.completeSub': 'שם, תמונה ותאריך לידה — ויוצאים לדרך',
    'profile.upgradeHint': 'שדרג ל-Premium ⭐',
    'profile.noDogs': 'עדיין אין כלבים. הוסף את החבר הראשון! 🐶',

    // Settings / privacy screen
    'settings.language': 'שפה',
    'settings.langHe': 'עברית',
    'settings.langEn': 'English',

    // Common
    'common.save': 'שמור',
    'common.cancel': 'ביטול',
    'common.back': 'חזרה',
  },

  en: {
    // Tab labels
    'tabs.home': 'Home',
    'tabs.map': 'Map',
    'tabs.playdates': 'Playdates',
    'tabs.messages': 'Messages',
    'tabs.profile': 'Profile',

    // Dashboard hero
    'home.heroTitle': 'Hey, Dog Friend! 🐾',
    'home.heroSub': 'Find new friends and adventures in the neighborhood',
    'home.heroBtn': 'Discover new adventures! 🦮',

    // Dashboard section
    'home.section': 'Shortcuts ✨',

    // Feature cards — titles
    'card.map.title': 'Go for a Walk',
    'card.findFriend.title': 'Find a Friend',
    'card.search.title': 'Search',
    'card.calendar.title': 'Calendar',
    'card.gallery.title': 'Gallery',
    'card.lostDog.title': 'Lost Dog',
    'card.socialWalks.title': 'Group Walks',
    'card.walkers.title': 'Dog Walkers',
    'card.walkStats.title': 'My Stats',
    'card.challenges.title': 'Fitness Challenges',
    'card.badges.title': 'My Achievements',
    'card.places.title': 'Nearby Services',
    'card.premium.title': 'Premium',

    // Feature cards — subtitles
    'card.map.sub': 'Active dogs on the map',
    'card.findFriend.sub': 'Playdate requests for your dog',
    'card.search.sub': 'Dogs by breed, owner',
    'card.calendar.sub': 'Scheduled meetups',
    'card.gallery.sub': 'Dog photos',
    'card.lostDog.sub': 'Community alerts',
    'card.socialWalks.sub': 'Meet up at the park',
    'card.walkers.sub': 'Who will walk the dog',
    'card.walkStats.sub': 'Walks and streaks',
    'card.challenges.sub': 'Compete with the community',
    'card.badges.sub': 'Tags and medals',
    'card.places.sub': 'Vet, parks',
    'card.premium.sub': 'Upgrade your experience',

    // Profile screen
    'profile.myDogs': 'My Dogs 🐾',
    'profile.add': '+ Add',
    'profile.edit': 'Edit ✏️',
    'profile.signOut': 'Sign Out',
    'profile.privacy': 'Privacy & Settings 🔒',
    'profile.completeTitle': "Let's complete your profile",
    'profile.completeSub': 'Name, photo, and date of birth — and we\'re off',
    'profile.upgradeHint': 'Upgrade to Premium ⭐',
    'profile.noDogs': "No dogs yet. Add your first friend! 🐶",

    // Settings / privacy screen
    'settings.language': 'Language',
    'settings.langHe': 'עברית',
    'settings.langEn': 'English',

    // Common
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.back': 'Back',
  },
};

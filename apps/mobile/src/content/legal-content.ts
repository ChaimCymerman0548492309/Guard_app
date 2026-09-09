export type LegalDocumentType = 'privacy' | 'terms';

type LocalizedContent = Record<'en' | 'he', string>;

export const LEGAL_CONTENT: Record<LegalDocumentType, LocalizedContent> = {
  privacy: {
    en: `Privacy Policy

Guardian is local-first. Your data stays on your device by default.

What we collect
• Network metadata only: domain names, connection sizes, timestamps, and app attribution (best-effort).
• Installed apps visible on your launcher (no full device scan).
• Risk assessments and alerts generated on-device.

What we never collect
• Message contents, photos, files, or HTTPS payloads.
• Passwords or credentials.
• Location data.

Optional cloud sync
If you enable Cloud sync in Settings, aggregated metadata is uploaded to your configured API endpoint. You can disable sync at any time.

Data retention
You control how long activity history is kept (7–90 days) in Settings. Export your data as JSON anytime. Delete all data by clearing app storage.

Your rights
You can stop monitoring, export data, or uninstall Guardian at any time. No account is required.

Contact
Privacy questions: privacy@guardian.app`,
    he: `מדיניות פרטיות

Guardian פועל מקומית. הנתונים שלך נשארים במכשיר כברירת מחדל.

מה אנחנו אוספים
• מטא-נתוני רשת בלבד: שמות דומיין, גדלי חיבור, חותמות זמן ושיוך אפליקציות (במידה האפשרית).
• אפליקציות מותקנות שמופיעות במסך הבית (ללא סריקה מלאה של המכשיר).
• הערכות סיכון והתראות שנוצרות במכשיר.

מה אנחנו לא אוספים
• תוכן הודעות, תמונות, קבצים או תעבורת HTTPS.
• סיסמאות או פרטי התחברות.
• נתוני מיקום.

סנכרון ענן (אופציונלי)
אם תפעיל סנכרון ענן בהגדרות, מטא-נתונים מצטברים יועלו לשרת שתגדיר. אפשר לכבות בכל עת.

שמירת נתונים
אתה שולט כמה זמן נשמרת היסטוריית הפעילות (7–90 יום) בהגדרות. ייצוא JSON בכל עת. מחיקה מלאה דרך ניקוי אחסון האפליקציה.

זכויותיך
אפשר לעצור ניטור, לייצא נתונים או להסיר את Guardian בכל עת. לא נדרש חשבון.

יצירת קשר
שאלות פרטיות: privacy@guardian.app`,
  },
  terms: {
    en: `Terms of Use

Guardian helps you understand app network behavior on your Android device.

Acceptance
By using Guardian you agree to these terms. If you do not agree, do not use the app.

Service description
Guardian provides local network monitoring and risk alerts. It is not antivirus software and does not guarantee detection of all threats.

Your responsibilities
• Use Guardian lawfully and only on devices you own or are authorized to monitor.
• Review alerts and make your own decisions about app trust.
• Keep your device and Guardian updated.

Limitations
• VPN-based monitoring has known Android limitations (DNS over HTTPS, app attribution).
• Guardian is provided "as is" without warranties.
• We are not liable for damages arising from use of the app.

Changes
We may update these terms. Continued use after changes constitutes acceptance.

Contact
support@guardian.app`,
    he: `תנאי שימוש

Guardian עוזר לך להבין התנהגות רשת של אפליקציות במכשיר Android שלך.

קבלה
שימוש ב-Guardian מהווה הסכמה לתנאים אלה. אם לא מסכים — אל תשתמש באפליקציה.

תיאור השירות
Guardian מספק ניטור רשת מקומי והתראות סיכון. זו לא תוכנת אנטי-וירוס ולא מבטיחה זיהוי של כל איום.

אחריותך
• השתמש ב-Guardian כחוק ורק במכשירים שבבעלותך או שיש לך הרשאה לנטר.
• בדוק התראות והחלט בעצמך על אמון באפליקציות.
• עדכן המכשיר ו-Guardian.

מגבלות
• ניטור מבוסס VPN כפוף למגבלות Android (DNS over HTTPS, שיוך אפליקציות).
• Guardian מסופק "כמות שהוא" ללא אחריות.
• לא נהיה אחראים לנזקים משימוש באפליקציה.

שינויים
אנו עשויים לעדכן תנאים אלה. המשך שימוש מהווה קבלה.

יצירת קשר
support@guardian.app`,
  },
};

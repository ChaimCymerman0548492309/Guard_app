# Install Guardian on Your Phone

**The Guardian UI runs entirely on your Android phone** — not on your computer. After install, you use the app like any other app.

---

## English

### What you need

- Android phone (Android 8+ recommended)
- USB cable (Option A only)
- A computer with Android tools (Option A only), **or** a downloaded APK/AAB file (Option B)

### Option A — Install from computer via USB

Best for developers or when building locally.

1. **Enable USB debugging** on your phone  
   Settings → About phone → tap Build number 7 times → Developer options → USB debugging ON

2. **Connect phone** to computer with USB cable. Approve the debugging prompt on the phone.

3. **On the computer**, from the project folder:

   ```bash
   ./scripts/android-build.sh
   ```

   For a release APK (no dev tools attached):

   ```bash
   ./scripts/build-release-apk.sh
   adb install -r apps/mobile/android/app/build/outputs/apk/release/app-release.apk
   ```

4. **On the phone**, open **Guardian** from the app drawer.

### Option B — Install from EAS build (no local Android Studio)

Best when someone else built the app for you.

1. **Build in the cloud** (one-time, on a computer with Expo account):

   ```bash
   cd apps/mobile
   npx eas-cli build --platform android --profile preview
   ```

   `preview` produces an **APK** you can install directly.  
   `production` produces an **AAB** for Play Store upload.

2. **Download the APK** from the link EAS prints when the build finishes (or from [expo.dev](https://expo.dev) → your project → Builds).

3. **Transfer to phone** (email, Google Drive, or USB).

4. **Install**: open the APK file on the phone. If prompted, allow **Install from unknown sources** for your file manager or browser.

5. Open **Guardian** from the app drawer.

### First launch — what you'll see

1. **Onboarding** (4 steps): welcome → privacy → VPN permission → done  
   You can skip setup, but VPN monitoring needs the permission step.

2. **VPN permission dialog** — Android asks to approve a VPN connection. Tap **OK**. A VPN key icon appears in the status bar while monitoring is active.

3. **Home screen** — risk counts, monitored apps, and activity. Everything is on the phone.

4. **Settings** — language (English / עברית), notifications, privacy policy, about.

### Troubleshooting

| Problem               | Fix                                                     |
| --------------------- | ------------------------------------------------------- |
| VPN permission denied | Settings → Monitoring setup → Start monitoring → tap OK |
| App won't install     | Enable "Install unknown apps" for your file source      |
| No apps listed        | Grant VPN first; apps appear from your launcher         |
| Hebrew layout wrong   | Change language in Settings, then restart the app       |

---

## עברית

### מה צריך

- טלפון Android (מומלץ Android 8 ומעלה)
- כבל USB (אפשרות א' בלבד)
- מחשב עם כלי Android (אפשרות א' בלבד), **או** קובץ APK/AAB מוכן (אפשרות ב')

### אפשרות א' — התקנה מהמחשב ב-USB

מתאים למפתחים או בנייה מקומית.

1. **הפעל USB debugging** בטלפון  
   הגדרות → אודות הטלפון → הקש 7 פעמים על מספר גרסה → אפשרויות מפתח → USB debugging

2. **חבר הטלפון** למחשב. אשר בקשת debugging על המסך.

3. **במחשב**, מתיקיית הפרויקט:

   ```bash
   ./scripts/android-build.sh
   ```

   ל-APK release:

   ```bash
   ./scripts/build-release-apk.sh
   adb install -r apps/mobile/android/app/build/outputs/apk/release/app-release.apk
   ```

4. **בטלפון**, פתח **Guardian** מהמגירה.

### אפשרות ב' — התקנה מ-EAS (בלי Android Studio)

מתאים כשמישהו אחר בנה האפליקציה.

1. **בנייה בענן** (פעם אחת, ממחשב עם חשבון Expo):

   ```bash
   cd apps/mobile
   npx eas-cli build --platform android --profile preview
   ```

2. **הורד את ה-APK** מהקישור ש-EAS מציג (או מ-[expo.dev](https://expo.dev) → הפרויקט → Builds).

3. **העבר לטלפון** (מייל, Drive, USB).

4. **התקן**: פתח קובץ APK. אם נדרש — אפשר "התקנה ממקורות לא ידועים".

5. פתח **Guardian**.

### הפעלה ראשונה

1. **הדרכה** (4 שלבים): ברוכים הבאים → פרטיות → הרשאת VPN → סיום

2. **דיאלוג VPN** — אשר ב-OK. סמל מפתח VPN יופיע בשורת המצב.

3. **מסך הבית** — סיכום סיכונים, אפליקציות, פעילות. הכל על הטלפון.

4. **הגדרות** — שפה, התראות, מדיניות פרטיות.

### פתרון בעיות

| בעיה            | פתרון                          |
| --------------- | ------------------------------ |
| VPN נדחה        | הגדרות ניטור → התחל ניטור → OK |
| לא מתקין        | אפשר התקנה ממקורות לא ידועים   |
| אין אפליקציות   | הפעל VPN קודם                  |
| עברית לא מיושרת | שנה שפה בהגדרות והפעל מחדש     |

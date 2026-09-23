# פריסה על Render

מדריך לפריסת **PostgreSQL + API + דשבורד Web** על [Render](https://render.com) — טלפון ודשבורד עובדים **בלי אותה Wi‑Fi** (HTTPS מובנה).

## מה נוצר

| שירות        | שם ב-Render    | תפקיד                                             |
| ------------ | -------------- | ------------------------------------------------- |
| PostgreSQL   | `guardian-db`  | משתמשים, מכשירים, events                          |
| Web (Docker) | `guardian-api` | `https://guardian-api-xxxx.onrender.com`          |
| Static Site  | `guardian-web` | דשבורד — `https://guardian-web-xxxx.onrender.com` |

---

## שלב 1 — Blueprint (מומלץ)

1. דחוף את הקוד ל-GitHub (branch עם `render.yaml`, למשל `cursor/multi-tenant-auth-b85a` / `main` אחרי merge).
2. [Render Dashboard](https://dashboard.render.com) → **New** → **Blueprint**.
3. חבר את repo `Guard_app` → Render יקרא את `render.yaml`.
4. לפני **Apply** — בשדה **Environment** של `guardian-api` הגדר:
   - **`ADMIN_PASSWORD`** — סיסמה חזקה למנהל (חובה; לא נשמר ב-git).
5. **Apply** — המתן ל-build (API Docker + Static web, כמה דקות).

---

## שלב 2 — בדיקה

1. **API:** פתח `https://<guardian-api>.onrender.com/health` → `{"success":true,...}`
2. **דשבורד:** `https://<guardian-web>.onrender.com/login`
3. התחבר: **`ADMIN_EMAIL`** (ברירת מחדל `admin@guardian.local`) + **`ADMIN_PASSWORD`** שהגדרת
4. **ניהול לקוחות** → צור לקוח חדש

> **Free tier:** השירות “נרדם” אחרי חוסר פעילות — הבקשה הראשונה אחרי שינה יכולה לקחת ~30–60 שניות (cold start).

---

## שלב 3 — APK לטלפון

כתובת ה-API לטלפון = **URL של `guardian-api`** (לא הדשבורד):

```bash
EXPO_PUBLIC_DEV_SIMULATOR=false \
EXPO_PUBLIC_API_URL=https://guardian-api-xxxx.onrender.com \
./scripts/build-release-apk.sh
```

או EAS:

```bash
cd apps/mobile
eas build --platform android --profile preview \
  --env EXPO_PUBLIC_API_URL=https://guardian-api-xxxx.onrender.com
```

### בטלפון

1. התקן APK
2. VPN / ניטור (onboarding)
3. **Settings → Cloud sync** ON
4. התחבר עם **חשבון לקוח**
5. בדשבורד (מכל רשת): login → רואים את המכשיר אחרי sync

---

## משתני סביבה (API)

| משתנה            | הערה                                     |
| ---------------- | ---------------------------------------- |
| `DATABASE_URL`   | מ-Render Postgres (אוטומטי)              |
| `JWT_SECRET`     | נוצר אוטומטית ב-Blueprint                |
| `ADMIN_PASSWORD` | **אתה מגדיר** לפני deploy                |
| `ADMIN_EMAIL`    | ברירת מחדל `admin@guardian.local`        |
| `DEV_SIMULATOR`  | `false` — רק מכשירים אמיתיים             |
| `RUN_DB_SEED`    | `true` — יוצר מנהל + trackers            |
| `CORS_ORIGIN`    | `*` (אפשר לצמצם ל-URL של `guardian-web`) |

אחרי שינוי env ב-API → **Manual Deploy** / Redeploy.

---

## פריסה ידנית (בלי Blueprint)

### Database

New → **PostgreSQL** → שם `guardian-db` → העתק **Internal Database URL** (ל-API באותו Render account).

### API

New → **Web Service** → Docker →

- Dockerfile: `apps/api/Dockerfile`
- Root directory: `.` (repo root)
- Health check: `/health`
- Env: כמו בטבלה למעלה, `DATABASE_URL` מה-DB

### Web

New → **Static Site** →

- Build:  
  `corepack enable && pnpm install && pnpm --filter @guardian/shared build && pnpm --filter @guardian/ui build && pnpm --filter @guardian/web build`
- Publish: `apps/web/dist`
- **Rewrite:** `/*` → `/index.html`
- Env: `VITE_API_URL` = `https://<guardian-api>.onrender.com`

---

## בעיות נפוצות

| בעיה                   | פתרון                                                                    |
| ---------------------- | ------------------------------------------------------------------------ |
| Login נכשל             | וודא `ADMIN_PASSWORD` הוגדר ו-seed רץ (`RUN_DB_SEED=true`, redeploy API) |
| דשבורד ריק / שגיאת רשת | `VITE_API_URL` חייב URL מלא של API; rebuild static site                  |
| טלפון לא מסנכרן        | `EXPO_PUBLIC_API_URL` = URL של **API**; Cloud sync + login; HTTPS בלבד   |
| 502 אחרי שינה          | Free tier cold start — המתן ונסה שוב                                     |
| CORS                   | השאר `CORS_ORIGIN=*` או הגדר URL מדויק של `guardian-web`                 |

---

## עלויות

- **Free:** DB + API + Static — מתאים לבדיקות; sleep + מגבלות Postgres.
- **Production:** שדרג API ו-Postgres ל-paid plans ליציבות ונפח.

פרטי הרשאות לקוחות: [CUSTOMERS-AUTH.md](./CUSTOMERS-AUTH.md)  
גישה מרחוק כללית: [REMOTE-ACCESS.md](./REMOTE-ACCESS.md)

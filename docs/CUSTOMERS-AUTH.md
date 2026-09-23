# Guardian — לקוחות והרשאות

## תפקידים

| תפקיד               | מה רואים                               |
| ------------------- | -------------------------------------- |
| **ADMIN** (מנהל)    | כל המכשירים, כל הלקוחות, יצירת משתמשים |
| **CUSTOMER** (לקוח) | **רק** מכשירים ששייכים לחשבון שלו      |

## התחברות — Web Dashboard

1. `./scripts/dev-lab.sh`
2. פתח http://localhost:5173 → `/login`

**Dev (simulator):**

| משתמש     | אימייל                 | סיסמה         |
| --------- | ---------------------- | ------------- |
| מנהל      | `admin@guardian.local` | `admin123`    |
| לקוח דemo | `customer@example.com` | `customer123` |

## יצירת לקוח חדש (מנהל בלבד)

1. התחבר כמנהל
2. **ניהול לקוחות** → מלא אימייל + סיסמה (מינימום 8 תווים)
3. שלח ללקוח את פרטי ההתחברות

## טלפון → ענן (לקוח)

1. ב-build של האפליקציה: `EXPO_PUBLIC_API_URL=https://your-api.com`
2. בטלפון: **Settings → Cloud sync** ON
3. התחבר עם **אימייל + סיסמה** של הלקוח (מסך הגדרות)
4. המכשיר נרשם אוטומטית; כל sync שולח **אפליקציות, הערכות סיכון, התראות ואירועי רשת** ל-API
5. בדשבורד (אותו משתמש): רשימת מכשירים → דוח מכשיר (דורש PostgreSQL + `DEV_SIMULATOR=false` על ה-API)

הטלפון יכול להישאר בבית — צפייה מהדשבורד אחרי sync.

## Production

```bash
pnpm db:migrate
pnpm db:seed   # יוצר admin מ-ADMIN_EMAIL / ADMIN_PASSWORD
```

שנה `JWT_SECRET` וסיסמת מנהל לפני פריסה ציבורית.

**טלפון ודשבורד לא על אותה Wi‑Fi:** פרוס API + דשבורד לענן עם HTTPS — מדריך מלא: [REMOTE-ACCESS.md](./REMOTE-ACCESS.md).

```bash
# דוגמה VPS
docker compose -f docker-compose.cloud.yml up -d --build
# דשבורד: http://SERVER:8080  →  הוסף HTTPS לפני APK ללקוחות
```

APK:

```bash
EXPO_PUBLIC_API_URL=https://your-domain.com ./scripts/build-release-apk.sh
```

## API

- `POST /api/v1/auth/login` — ציבורי
- `GET /api/v1/auth/me` — JWT
- `GET/POST /api/v1/auth/users` — ADMIN בלבד
- שאר `/api/v1/*` — JWT חובה

Header: `Authorization: Bearer <token>`

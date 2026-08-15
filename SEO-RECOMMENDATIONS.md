# SEO & Deployment — Studio Cover Design

מסמך עבודה: מה כבר מוטמע באתר, איך להעלות ל‑Vercel נכון, ואיך להמשיך לחזק SEO.
עודכן: 2026‑07‑06

---

## 1. מה כבר מוטמע (Done)

**תגיות ומטא־דאטה**
- `title` + `meta description` ייחודיים בכל עמוד, עשירים במילות מפתח.
- `canonical` + `hreflang` (he / en / x‑default) בעמודים הראשיים.
- Open Graph + Twitter Card (תצוגה יפה בשיתוף בוואטסאפ/פייסבוק/טוויטר).
- `theme-color` (#FF5500) ו‑`robots` (index, follow, max-image-preview:large) בעמודים הראשיים.

**Structured Data (Schema.org)**
- דף הבית: גרף מלא — `Organization` + `WebSite` + `ProfessionalService` עם שירותים, פרטי קשר, `sameAs` (אינסטגרם/יוטיוב/פייסבוק/טיקטוק).
- עמודי שירות: schema מסוג `Service`.

**קבצי מנוע חיפוש**
- `sitemap.xml` — כל העמודים (he+en), עם `lastmod` ואשכולות `hreflang`.
- `robots.txt` — פתוח לאינדוקס, חוסם עמודי שגיאה ואת עמוד ההדגמה הכפול, מפנה ל‑sitemap.

**אבטחה (headers)**
- `.htaccess` (Apache) **וגם** `vercel.json` (Vercel) עם: CSP, HSTS, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`, `Cross-Origin-Opener-Policy`, redirect ‑www→apex, caching חכם.

---

## 2. העלאה ל‑Vercel — צעדים

> חשוב: `.htaccess` לא עובד ב‑Vercel. כל ההגדרות (אבטחה/קאשינג/הפניות) נמצאות עכשיו ב‑`vercel.json` בשורש — אל תמחק אותו.

1. **חברו את הריפו** (GitHub) ל‑Vercel → *New Project* → בחרו את הריפו.
2. **Framework Preset:** `Other`. **Build Command:** ריק. **Output Directory:** `.` (השורש). זה אתר סטטי — אין build.
3. **Domain:** ב‑*Settings → Domains* הוסיפו `studiocoverdesign.com` וגם `www.studiocoverdesign.com`.
   - עדכנו ב‑DNS של רשם הדומיין: רשומת `A` ל‑apex ו‑`CNAME` ל‑www לפי ההוראות ש‑Vercel נותן.
   - הגדירו את `www` שיבצע redirect ל‑apex (ה‑`vercel.json` כבר מכסה זאת, וגם אפשר לסמן ב‑UI).
4. **HTTPS** אוטומטי (Let's Encrypt) — אין צורך בכלום.
5. אחרי דיפלוי — בדקו כותרות אבטחה ב‑https://securityheaders.com ואת ה‑CSP ב‑Console (שאין חסימות).

---

## 3. הצעדים הבאים לחיזוק SEO (לפי עדיפות)

### עדיפות גבוהה
1. **Google Search Console + Bing Webmaster** — אמתו בעלות, שלחו את `sitemap.xml`. זה ה‑#1 לקבל אינדוקס ודוחות.
2. **Google Business Profile** — עסק מקומי (ישראל) מרוויח המון מ‑"עיצוב עטיפות" בחיפוש מקומי + מפות.
3. **תוכן ממוקד מילות מפתח** — צרו עמוד/סקשן לכל שירות עם מילות מפתח אמיתיות שאנשים מחפשים:
   `עיצוב עטיפה לשיר`, `עיצוב עטיפה לאלבום`, `קליפ מילים`, `קליפ מונפש`, `הפצה דיגיטלית לספוטיפיי`, `עיצוב גרפי לזמרים`.
4. **תמונות** — הוסיפו `alt` תיאורי לכל תמונה (יש חלקית), והמירו ל‑WebP/AVIF כדי להאיץ טעינה (משפיע על דירוג).

### עדיפות בינונית
5. **בלוג / מדריכים** — "איך בוחרים עטיפה לסינגל", "כמה עולה קליפ מילים" — עמודים כאלה מביאים תנועה אורגנית ומחזקים סמכות.
6. **Reviews / המלצות** — אספו ביקורות לקוחות; אפשר להוסיף schema מסוג `Review`/`AggregateRating`.
7. **Backlinks** — קישורים מאתרי מוזיקה, אמנים שעבדתם איתם, בלוגים — הגורם החזק ביותר לדירוג.
8. **Video SEO** — אם תשלח לי תאריכי העלאה אמיתיים לקליפים, אוסיף schema מסוג `VideoObject` (thumbnail עשיר בגוגל).

### עדיפות טכנית (שיפור מהירות = דירוג)
9. **Core Web Vitals** — הריצו PageSpeed Insights. המלצות צפויות: `preload` לסרטון ה‑hero, `defer` לסקריפטים כבדים, טעינת GSAP רק בדף הבית (כבר ככה), אולי self‑host לפונטים.
10. **Analytics** — הוסיפו Vercel Analytics או GA4 (אני יכול להטמיע — צריך רק מזהה מדידה).
11. **SRI** על סקריפטי ה‑CDN, או self‑host ל‑GSAP (מבטל תלות בצד שלישי). אני יכול לעשות self‑host.

---

## 4. מילות מפתח מומלצות (לשילוב בכותרות/טקסטים)

עברית: עיצוב עטיפות, עיצוב עטיפה לשיר, עיצוב עטיפה לאלבום, עיצוב סינגל, עיצוב גרפי למוזיקאים, מיתוג אמנים, קליפ מילים, קליפ מונפש, הפקת קליפים, הפצה דיגיטלית, העלאה לספוטיפיי, עטיפה לאפל מיוזיק.

English: album cover design, single cover art, music cover design, lyric video, animated music video, digital distribution Spotify, artist branding.

---

*רוצה שאטפל בפריט מסוים מהרשימה (Analytics / WebP / self‑host / VideoObject / עמודי תוכן) — תגיד לי ואני מבצע.*

// Generates index-v2.html from the studio's real feed, so every cover, title
// and artist on the page is actual work rather than placeholder content.
import { readFileSync, writeFileSync } from 'node:fs';

const feed = JSON.parse(readFileSync('assets/data/instagram.json', 'utf8'));
const items = (feed.items || feed).filter((m) => m.image || m.img);

const esc = (s) => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;')
  .replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// Captions read "עיצוב עטיפה לסינגל “X” של Y". The quoted part is the track and
// what follows של is the artist — split them so the page can set the two in
// different faces instead of dumping a sentence under every cover.
function parse(caption) {
  const c = String(caption || '').replace(/\s+/g, ' ').trim();
  const q = c.match(/[“"״”]([^“”"״]+)[”"״"]/);
  const a = c.match(/\bשל\s+(.+?)\s*$/);
  return {
    title: q ? q[1].trim() : c.slice(0, 40),
    artist: a ? a[1].trim() : '',
    full: c,
  };
}

const covers = items.map((m) => ({ ...parse(m.caption), src: m.image || m.img, link: m.permalink || m.link || '' }));

const picker = covers.map((c, i) => `        <button type="button" data-src="${esc(c.src)}" data-title="${esc(c.title)}" data-artist="${esc(c.artist)}" aria-pressed="${i === 0}" aria-label="${esc(c.title)}${c.artist ? ' — ' + esc(c.artist) : ''}"><img src="${esc(c.src)}" alt="" width="40" height="40" loading="lazy" decoding="async"></button>`).join('\n');

const wall = covers.slice(0, 24).map((c) => `      <a class="tile" href="${esc(c.link)}" target="_blank" rel="noopener">
        <img src="${esc(c.src)}" alt="${esc(c.full)}" width="800" height="800" loading="lazy" decoding="async">
        <span class="tile-cap" aria-hidden="true"><b>${esc(c.title)}</b><span>${esc(c.artist)}</span></span>
      </a>`).join('\n');

const first = covers[0];

const html = `<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>עיצוב עטיפה סטודיו | עטיפות שעובדות ב־64 פיקסל וב־3000</title>
<meta name="description" content="סטודיו לעיצוב עטיפות אלבומים וסינגלים למוזיקאים, הפקת קליפים והפצה דיגיטלית. עטיפה נבחנת בשורת פלייליסט לפני שהיא נבחנת במסך מלא — אנחנו מעצבים לשני הגדלים.">
<meta name="robots" content="noindex">
<link rel="icon" href="assets/img/favicon.png?v=13">
<link rel="preload" href="assets/fonts/GoogleSans_17pt-Regular.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="assets/fonts/GoogleSans-Bold.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="assets/fonts/Karantina-Bold.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="assets/css/fonts.min.css?v=13">
<link rel="stylesheet" href="assets/css/studio-v2.min.css?v=13">
</head>
<body>

<a class="skip" href="#wall">דלגו לעבודות</a>

<header class="bar">
  <div class="bar-in">
    <a class="wordmark" href="index-v2.html">עיצוב עטיפה סטודיו</a>
    <nav class="bar-nav micro" aria-label="ראשי">
      <a href="#wall">העבודות</a>
      <a href="#release">היציאה</a>
      <a href="#brief">צרו קשר</a>
    </nav>
    <span class="live micro">מקבלים פרויקטים</span>
  </div>
</header>

<main class="shell">

  <section class="hero">
    <div class="hero-claim">
      <h1>העטיפה שלך תיבחן ב־<span class="px">64</span> פיקסל</h1>
      <p class="hero-lead">ואחר כך ב־3000. אנחנו מעצבים עטיפות שעומדות בשני המבחנים, ומלווים את השיר מהעיצוב הראשון ועד היום שהוא עולה לסטרימינג.</p>
      <div class="hero-actions">
        <a class="btn" href="#brief">ספרו לנו על השיר</a>
        <a class="btn btn-quiet" href="#wall">שלושים עטיפות אחרונות</a>
      </div>
    </div>

    <div class="ladder">
      <div class="rung rung-master">
        <div class="master">
          <img data-cover src="${esc(first.src)}" alt="${esc(first.full)}" width="800" height="800" fetchpriority="high" decoding="async">
        </div>
        <span class="rung-label">
          <b class="spec spec-lg" dir="ltr"><span data-counter>3000</span> px</b>
          <span>הקובץ שאתם מקבלים</span>
        </span>
      </div>

      <div class="rungs">
        <div class="rung rung-300">
          <img data-cover src="${esc(first.src)}" alt="" width="300" height="300" decoding="async">
          <span class="rung-label"><b dir="ltr">300 px</b><span>כרטיס אלבום</span></span>
        </div>
        <div class="rung rung-64">
          <img data-cover src="${esc(first.src)}" alt="" width="64" height="64" decoding="async">
          <span class="rung-label"><b dir="ltr">64 px</b><span>שורה בפלייליסט</span></span>
        </div>
        <div class="rung rung-24">
          <img data-cover src="${esc(first.src)}" alt="" width="24" height="24" decoding="async">
          <span class="rung-label"><b dir="ltr">24 px</b><span>נגן קטן</span></span>
        </div>
      </div>

      <p class="now-showing"><b>${esc(first.title)}</b> <span>${esc(first.artist)}</span></p>

      <div class="picker" role="group" aria-label="בחרו עטיפה">
${picker}
      </div>
    </div>
  </section>

  <section class="band" id="wall">
    <div class="band-head">
      <div>
        <h2>שלושים עטיפות אחרונות</h2>
        <p>כולן יצאו לאוויר. לחיצה פותחת את הפוסט באינסטגרם.</p>
      </div>
      <span class="spec" dir="ltr">3000 × 3000 · RGB · PNG</span>
    </div>
    <div class="wall">
${wall}
    </div>
  </section>

  <section class="band" id="release">
    <div class="band-head">
      <div>
        <h2>איך נראית יציאה של שיר</h2>
        <p>ספירה לאחור ליום השחרור. המספרים הם ימים לפני שהשיר עולה.</p>
      </div>
    </div>

    <a class="stage" href="graphics.html">
      <span class="stage-day" dir="ltr">−21</span>
      <div>
        <h3>העטיפה</h3>
        <p>שני כיווני עיצוב, סבב תיקונים, וקובץ מוכן להעלאה בכל הפלטפורמות. כאן נקבעת השפה הוויזואלית שכל השאר יישען עליה.</p>
      </div>
      <span class="stage-go micro">מחלקת גרפיקה</span>
    </a>

    <a class="stage" href="video.html">
      <span class="stage-day" dir="ltr">−14</span>
      <div>
        <h3>הקליפ</h3>
        <p>קליפ מילים, אנימציה או הפקה מלאה — באותה שפה שנקבעה בעטיפה, כדי שהשיר ייראה כמו דבר אחד ולא כמו שלושה ספקים.</p>
      </div>
      <span class="stage-go micro">מחלקת וידאו</span>
    </a>

    <a class="stage" href="distribution.html">
      <span class="stage-day" dir="ltr">−7</span>
      <div>
        <h3>ההפצה</h3>
        <p>העלאה לספוטיפיי, אפל מיוזיק ולשאר הפלטפורמות, אימות פרופיל האמן, ותאריך שחרור שנקבע מראש.</p>
      </div>
      <span class="stage-go micro">הפצה דיגיטלית</span>
    </a>

    <div class="stage stage-drop">
      <span class="stage-day" dir="ltr">0</span>
      <div>
        <h3>השיר באוויר</h3>
        <p>העטיפה במקומה, הקליפ עולה, והפרופיל נראה כמו של אמן שיצא לו אלבום.</p>
      </div>
    </div>
  </section>

  <section class="band" id="brief">
    <div class="brief">
      <div>
        <h2>ספרו לנו על השיר</h2>
        <p class="brief-lead">שם, טלפון, וכמה מילים על מה שאתם עובדים עליו. הפרטים עוברים לוואטסאפ ואנחנו חוזרים אליכם משם.</p>
        <div class="brief-direct">
          <a href="tel:0559383582" dir="ltr">055-938-3582</a>
          <a href="mailto:office@studiocoverdesign.com" dir="ltr">office@studiocoverdesign.com</a>
          <a href="https://www.instagram.com/cover_design.studio/" target="_blank" rel="noopener" dir="ltr">@cover_design.studio</a>
        </div>
      </div>

      <form class="form" novalidate>
        <input type="text" name="website" class="hp" tabindex="-1" autocomplete="off" aria-hidden="true">
        <div class="field">
          <label class="micro" for="f-name">שם</label>
          <input id="f-name" name="name" type="text" autocomplete="name" maxlength="60" required>
        </div>
        <div class="field">
          <label class="micro" for="f-phone">טלפון</label>
          <input id="f-phone" name="phone" type="tel" inputmode="tel" autocomplete="tel" maxlength="20" required>
        </div>
        <div class="field">
          <label class="micro" for="f-about">על מה אתם עובדים</label>
          <textarea id="f-about" name="about" maxlength="300" rows="4"></textarea>
        </div>
        <p class="form-msg micro" aria-live="polite"></p>
        <button class="btn" type="submit">פתחו וואטסאפ עם הפרטים</button>
      </form>
    </div>
  </section>

</main>

<footer class="shell">
  <div class="foot micro">
    <span>עיצוב עטיפה סטודיו · 2026</span>
    <nav class="foot-links" aria-label="תחתון">
      <a href="index.html">הגרסה הנוכחית של האתר</a>
      <a href="privacy.html">פרטיות</a>
      <a href="terms-of-use.html">תנאי שימוש</a>
      <a href="accessibility-statement.html">נגישות</a>
    </nav>
  </div>
</footer>

<script src="assets/js/studio-v2.min.js?v=13" defer></script>
</body>
</html>
`;

writeFileSync('index-v2.html', html);
console.log(`index-v2.html written — ${covers.length} covers in the picker, ${Math.min(24, covers.length)} on the wall`);

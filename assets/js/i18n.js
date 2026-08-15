/* Lightweight in-place HE/EN switch, no dependency, no page duplication.
   Dictionary is keyed by the element's trimmed Hebrew textContent; only strings
   present here are ever touched, so untranslated content is left untouched
   (never broken). English values may contain HTML (e.g. <strong>). */
(function () {
  "use strict";

  // he-text -> en-html
  var DICT = {
    // ---- brand wordmark ----
    "עיצוב עטיפה סטודיו": "Studio Cover Design",
    "גללו למטה": "SCROLL DOWN",
    "הבית לעיצוב עטיפות בתעשיית המוזיקה. סטודיו לעיצוב עטיפות שמעניק לזמרים מיתוג ויזואלי מקצועי ומדויק, מעיצוב עטיפות ועד אנימציות וקליפים למילים. יצירתיות, איכות והתאמה אישית, במחירים נגישים. כי המוזיקה שלך ראויה לעטיפה שמספרת את הסיפור שלה.":
      "The home for cover art in the music industry. A design studio giving " +
      "artists precise, professional visual branding — from cover design to " +
      "animation and lyric videos. Creative, crafted and made to fit, at prices " +
      "that work. Because your music deserves a cover that tells its story.",
    // ---- nav ----
    "ראשי": "Main",
    "מחלקת גרפיקה": "Graphics",
    "מחלקת וידאו": "Video",
    "הפצה דיגיטלית": "Distribution",
    // ---- hero (visually-hidden h1) ----
    "עיצוב עטיפה סטודיו, עיצוב עטיפות אלבומים וסינגלים למוזיקאים":
      "Studio Cover Design, album &amp; single cover art for musicians",
    // ---- hero ----
    // Curated on purpose: the machine service rendered the headline as
    // "Your song Worthy of wrapping that stops scrolling" and produced
    // "Since2005" / "andpost-production" without spaces.
    "סטודיו קריאייטיב למוזיקה · מ־2005": "Creative studio for music · since 2005",
    "השיר שלכם": "Your song",
    "ראוי לעטיפה": "deserves a cover",
    "שעוצרת גלילה": "that stops the scroll",
    "עיצוב עטיפות לאלבומים וסינגלים, קליפים והפצה דיגיטלית, הכול תחת קורת גג אחת, מהרעיון ועד השחרור בספוטיפיי.":
      "Cover art for albums and singles, music videos and digital distribution, all under one roof, from the first idea to release day on Spotify.",
    "בואו נתחיל פרויקט": "Start a project",
    "לתיק העבודות": "See the work",
    "שנות ניסיון": "years of experience",
    "עטיפות שיצאו לאוויר": "covers released",
    "מחלקות תחת קורת גג אחת": "departments under one roof",
    // ---- services ----
    "עטיפה, קליפ ופרומו, חבילה אחת שמדברת באותה שפה":
      "Cover, clip and promo, one package that speaks one language",
    "20 שנה שאנחנו דואגים שהשיר שלכם ייראה בדיוק כמו שהוא נשמע. שלוש מחלקות תחת קורת גג אחת, בלי לרדוף אחרי ספקים, בלי שהעטיפה, הקליפ והפרומו יספרו שלושה סיפורים שונים.":
      "20 years making sure your song looks exactly the way it sounds. Three departments under one roof, no chasing suppliers, and never a cover, clip and promo telling three different stories.",
    "עיצוב, מיתוג וקריאייטיב": "Design, branding &amp; creative",
    "עטיפות אלבום וסינגל, מיתוג אישי לאמן, גרפיקה למופעים ותוכן לרשתות, שפה עיצובית אחת שנשארת בזיכרון.":
      "Album and single covers, personal artist branding, show graphics and social content, one visual language that sticks.",
    "וידאו, אנימציה ופוסט־פרודקשן": "Video, animation &amp; post-production",
    "קליפים, קליפי מילים בכל סגנון, אנימציה, VFX, סרטוני תדמית ו־VJ להופעות חיות.":
      "Music videos, lyric videos in every style, animation, VFX, brand films and VJ visuals for live shows.",
    "הפצה דיגיטלית וליווי": "Digital distribution &amp; guidance",
    "העלאה לספוטיפיי, אפל מיוזיק וכל הפלטפורמות, אימות פרופיל אמן וליווי אסטרטגי עד השחרור.":
      "Release to Spotify, Apple Music and every other platform, artist profile verification and strategic guidance all the way to launch.",
    // ---- galleries / section heads ----
    "חדש באוויר": "New on air",
    "עטיפות שיצאו לאוויר לאחרונה, ישירות מהאינסטגרם של הסטודיו.":
      "Fresh releases, straight from the studio's Instagram.",
    "עבודות אחרונות": "Recent work",
    "עוד עבודות": "More work",
    "עבודות נוספות": "More work",
    // ---- about #1 ----
    "למה אמנים בוחרים בנו": "Why artists choose us",
    "20 שנה שאנחנו דואגים שהשיר שלכם ייראה בדיוק כמו שהוא נשמע":
      "20 years making sure your song looks exactly the way it sounds",
    "עיצוב, מיתוג וקריאייטיב, עטיפות אלבום וסינגל, מיתוג אישי לאמן ושפה עיצובית שנשארת בזיכרון.":
      "<strong>Design, branding &amp; creative</strong>, album and single covers, personal artist branding and a visual language that stays with people.",
    "מוזיקה מהרעיון ועד המדף, עיצוב לכל סינגל ואלבום, גרפיקה למופעים, קומוניקטים ותוכן למדיה החברתית שמדבר בשפת הקהל שלכם.":
      "<strong>Music, from idea to shelf</strong>, artwork for every single and album, show graphics, press materials and social content that speaks your audience's language.",
    "וידאו, אנימציה ופוסט־פרודקשן, קליפים, קליפי מילים בכל סגנון, אנימציה, VFX, סרטוני תדמית ו־VJ להופעות חיות.":
      "<strong>Video, animation &amp; post-production</strong>, music videos, lyric videos in every style, animation, VFX, brand films and VJ visuals for live shows.",
    "One Stop Shop אמיתי לאמן.": "A true <strong>one-stop shop</strong> for the artist.",
    // ---- video section ----
    "קליפים והפקות אחרונות": "Recent clips &amp; productions",
    "ריל תדמית": "Brand reel",
    'ריל "התקווה"': '"Hatikva" reel',
    // ---- strategy ----
    "מחלקת אסטרטגיה שיווקית ופיננסית": "Marketing &amp; financial strategy",
    "לא רק עיצוב, ליווי אמיתי להצלחה של השיר":
      "More than design, real guidance for your song's success",
    "חשיפה נכונה לעולם המוזיקה": "The right exposure in the music world",
    "ניהול אומנותי צמוד": "Hands-on artistic management",
    "אסטרטגיה שמביאה תוצאות": "Strategy that delivers results",
    "תקציב שעובד בשבילכם": "A budget that works for you",
    // ---- the "one package" section ----
    "עטיפה, קליפ ופרומו, כחבילה אחת שמדברת באותה שפה":
      "Cover, clip and promo, one package that speaks the same language",
    "זו הנישה החזקה ביותר שלנו: פתרון משלים אחד לשיר שלכם, עיצוב עטיפה, קליפ וידאו, קליפ מילים ופרומו לסינגל, כך שכל הרכיבים מספרים את אותו סיפור.":
      "This is our strongest niche: one complete solution for your song, cover design, music video, lyric video and single promo, so every piece tells the same story.",
    'עם ניסיון של שנים רבות בשוק המוזיקה בארץ ובחו"ל, בעיצוב ובווידאו על כל הגוונים שלו.':
      "With many years of experience in the Israeli and international music market, across design and video in all its shades.",
    // ---- scroll story ----
    "איך נולדת עטיפה": "How a cover is born",
    "כל עטיפה מתחילה בתמונה אחת": "Every cover starts with a single photo",
    "מנקים, מחדדים, מעלים רמה": "Cleaned, sharpened, leveled up",
    "גוזרים את הדמות בדיוק מלא": "A pixel-perfect cutout",
    "בונים לה עולם חדש": "Building a whole new world around it",
    "שם האמן. שם השיר. בדיוק במקום.": "Artist name. Song title. Exactly in place.",
    "העטיפה מוכנה לעלות לאוויר": "The cover is ready to go live",
    "בואו נתחיל את הפרויקט": "Let's start the project",
    "גם תמונה מטושטשת מהנייד היא נקודת פתיחה מצוינת. שולחים, ואנחנו לוקחים את זה משם.":
      "Even a blurry phone photo is a great starting point. You send it, we take it from there.",
    "הטשטוש נעלם, הרעש נמחק והאור מתאזן, פיקסל אחר פיקסל.":
      "Blur disappears, noise is erased and the light balances, pixel by pixel.",
    "הרקע הישן נעלם, הקצוות נשארים חדים ונקיים.":
      "The old background dissolves, the edges stay sharp and clean.",
    "רקע קולנועי, תאורה, טקסטורה ועומק, שכבה על גבי שכבה.":
      "A cinematic backdrop, lighting, texture and depth, layer upon layer.",
    'עופר חסון, "עוד ניפגש". הטיפוגרפיה שמשלימה את הסיפור.':
      'Ofer Hasson, "Od Nipagesh". The typography that completes the story.',
    "העטיפה הבאה שתעצור גלילה, יכולה להיות שלכם.":
      "The next scroll-stopping cover could be yours.",
    // ---- contact ----
    "צרו קשר": "Contact",
    "בואו נתחיל את הפרויקט הבא שלכם": "Let's start your next project",
    "מלאו פרטים ונשוב אליכם מיד.": "Leave your details and we'll get right back to you.",
    "שליחה": "Send",
    // ---- footer ----
    "שירותים": "Services",
    "קישורים": "Links",
    "שמרו על קשר": "Stay in touch",
    "צור קשר": "Contact",
    "מדיניות פרטיות": "Privacy policy",
    "תנאי שימוש": "Terms of use",
    "הצהרת נגישות": "Accessibility statement",
    // ---- story step eyebrows ----
    "שלב 1 · העלאה": "Step 1 · Upload",
    "שלב 2 · ניקוי ושיפור": "Step 2 · Clean &amp; enhance",
    "שלב 3 · הסרת רקע": "Step 3 · Background removal",
    "שלב 4 · רקע חדש": "Step 4 · New background",
    "שלב 5 · טיפוגרפיה": "Step 5 · Typography",
    "שלב 6 · מוכן לשחרור": "Step 6 · Ready to release",
    // ---- misc homepage ----
    "הבית של האמן": "A home for the artist",
    "וכשצריך עוד, עיצובי גלויה, מודעה להופעה, פרסומת לקראת סינגל או הופעה, ו־VJ לאירוע חי, אנחנו כבר שם.":
      "And when you need more, postcard designs, show ads, pre-single or event promos, and live-event VJ visuals, we're already there.",
    "הצג עוד": "Show more",
    // strategy card bodies
    "פותחים דלתות ומחברים אתכם לאנשים הנכונים, כדי שהשיר יגיע למי שצריך לשמוע אותו.":
      "Opening doors and connecting you to the right people, so your song reaches those who need to hear it.",
    "אנחנו לצידכם מהרעיון הראשוני ועד התוצר המוגמר, כל החלטה יצירתית נשקלת יחד איתכם.":
      "We're by your side from the first idea to the finished product, every creative decision weighed together with you.",
    "תוכנית פעולה מותאמת אישית לשיר ולקהל שלכם, לא תבנית גנרית שמתאימה לכולם.":
      "A tailor-made action plan for your song and audience, not a one-size-fits-all template.",
    "מתכננים את ההשקעה מראש כדי שכל שקל בהפקה יתורגם לתוצאה שרואים ושומעים.":
      "Planning the investment up front so every shekel spent turns into a result you can see and hear.",
    // service ticker
    "עיצוב עטיפות אלבום וסינגל": "Album &amp; single cover design",
    "מיתוג ולוגו לאמנים": "Artist branding &amp; logo",
    "הפקת קליפים מוזיקליים": "Music video production",
    "הפצה דיגיטלית לספוטיפיי ואפל מיוזיק": "Digital distribution to Spotify &amp; Apple Music",
    "עיצוב באנר יוטיוב": "YouTube banner design",
    "קליפי מילים ואנימציה": "Lyric &amp; animation videos",
    "עיצוב סטורי ופוסטים לאינסטגרם": "Instagram story &amp; post design",
    "ליווי מלא מהרעיון ועד השחרור": "Full guidance from concept to release",
    // a11y panel
    "גודל טקסט": "Text size",
    "ניגודיות גבוהה": "High contrast",
    "גווני אפור": "Grayscale",
    "הדגשת קישורים": "Highlight links",
    "עצירת אנימציות": "Stop animations",
    "פונט קריא": "Readable font",
    "הפעל": "On",
    "איפוס הגדרות": "Reset settings",
    // story intros + contact intro + phone
    "גללו וצפו איך העטיפה נבנית שכבה אחר שכבה, בזמן אמת, מהקנבס הריק ועד הגרסה המוכנה לשחרור.":
      "Scroll and watch the cover being built layer by layer, in real time, from a blank canvas to the release-ready version.",
    "עטיפה אחת. שמונה שכבות. תהליך שלם של עיצוב, נבנה מול העיניים שלכם, בזמן אמת.":
      "One cover. Eight layers. A whole design process, built before your eyes, in real time.",
    "ספרו לנו על השיר, האלבום או הרעיון שלכם, נחזור אליכם עם ההצעה המתאימה.":
      "Tell us about your song, album or idea, we'll get back to you with the right proposal.",
    "055-9383582 (נתנאל)": "055-9383582 (Netanel)"
  };

  // placeholder attribute translations
  var PH = {
    "שם": "Name",
    "טלפון": "Phone",
    "אימייל": "Email",
    "נושא הפנייה, ספרו לנו קצת על הפרויקט":
      "What's it about, tell us a little about the project"
  };

  var htmlEl = document.documentElement;
  var origDir = htmlEl.getAttribute("dir") || "rtl";
  var HE = /[֐-׿]/;
  // Don't machine-translate proper-noun-heavy zones (artist names, song titles,
  // brand marks, PS mockup chrome), they'd get mangled. Curated dict still applies.
  var SKIP = ".cap,.reel-cap,.brand-mark,.footer-logo,code,.ps-file,.story-artist," +
             ".story-title,.story-kicker,.ch,.video-card,.insta-item";
  var MM = "https://api.mymemory.translated.net/get";
  var EMAIL = "yallabooth@gmail.com"; // raises the free MyMemory quota

  // --- collect innermost leaf elements that carry Hebrew text ---
  // dt/dd were missing, so the hero stat labels ("years of experience", …) were
  // never collected and stayed Hebrew on the English page.
  var cands = [].slice
    .call(document.querySelectorAll("a,span,p,h1,h2,h3,h4,h5,h6,button,li,strong,em,label,dt,dd"))
    .filter(function (el) {
      var t = (el.textContent || "").trim();
      return t && HE.test(t) && !el.closest(SKIP);
    });
  var nodes = cands
    .filter(function (el) { return !cands.some(function (o) { return o !== el && el.contains(o); }); })
    .map(function (el) { return { el: el, he: (el.textContent || "").trim(), orig: el.innerHTML }; });

  var phNodes = [].slice
    .call(document.querySelectorAll("[placeholder]"))
    .filter(function (el) { return HE.test(el.getAttribute("placeholder") || ""); })
    .map(function (el) { return { el: el, orig: el.getAttribute("placeholder") }; });

  // --- translation cache (localStorage) ---
  function cget(he) { try { return localStorage.getItem("mt:" + he); } catch (e) { return null; } }
  function cset(he, en) { try { localStorage.setItem("mt:" + he, en); } catch (e) {} }

  // curated dict → cache → live service (MyMemory). Resolves to English text.
  function translate(he) {
    if (PH[he] != null) return Promise.resolve(PH[he]);
    if (DICT[he] != null) return Promise.resolve(DICT[he]);
    var hit = cget(he);
    if (hit) return Promise.resolve(hit);
    var url = MM + "?q=" + encodeURIComponent(he) + "&langpair=he|en&de=" + encodeURIComponent(EMAIL);
    return fetch(url).then(function (r) { return r.json(); }).then(function (d) {
      var en = d && d.responseData && d.responseData.translatedText;
      if (en && !/MYMEMORY WARNING|QUERY LENGTH LIMIT/i.test(en)) { cset(he, en); return en; }
      return he;
    }).catch(function () { return he; });
  }

  // run promise-returning jobs with limited concurrency
  function pool(items, worker, limit) {
    var i = 0;
    function next() {
      if (i >= items.length) return Promise.resolve();
      var job = worker(items[i++]);
      return job.then(next);
    }
    var runners = [];
    for (var k = 0; k < Math.min(limit, items.length); k++) runners.push(next());
    return Promise.all(runners);
  }

  function markSwitch(en) {
    document.querySelectorAll(".lang-switch a").forEach(function (a) {
      a.classList.toggle("active", /en/i.test(a.textContent) === en);
    });
  }

  // Everything that can be swapped synchronously. Runs while the transition
  // veil is up, so the dir flip and the reflow it causes are never seen.
  function toEnglishSync() {
    htmlEl.setAttribute("lang", "en");
    htmlEl.setAttribute("dir", "ltr");
    markSwitch(true);
    try { localStorage.setItem("lang", "en"); } catch (e) {}
    nodes.forEach(function (n) {
      if (DICT[n.he] != null) n.el.innerHTML = DICT[n.he];
      else { var c = cget(n.he); if (c) n.el.textContent = c; }
    });
    phNodes.forEach(function (p) {
      var v = PH[p.orig] != null ? PH[p.orig] : cget(p.orig);
      if (v) p.el.setAttribute("placeholder", v);
    });
  }

  // Whatever the curated dictionary and cache couldn't cover goes to the
  // translation service. Those land after the veil is gone, so each one fades
  // in on arrival instead of popping, the class is removed once it has played
  // so a later switch can replay it.
  function translateRest() {
    var todo = nodes.filter(function (n) { return DICT[n.he] == null && !cget(n.he); });
    phNodes.forEach(function (p) { if (PH[p.orig] == null && !cget(p.orig)) todo.push({ ph: p, he: p.orig }); });
    if (!todo.length) return;
    pool(todo, function (n) {
      return translate(n.he).then(function (en) {
        if (htmlEl.getAttribute("lang") !== "en") return;         // user switched back
        if (n.ph) { n.ph.el.setAttribute("placeholder", en); return; }
        n.el.textContent = en;
        n.el.classList.add("i18n-late");
        n.el.addEventListener("animationend", function () {
          n.el.classList.remove("i18n-late");
        }, { once: true });
      });
    }, 6);
  }

  function toHebrewSync() {
    nodes.forEach(function (n) { n.el.innerHTML = n.orig; });
    phNodes.forEach(function (p) { p.el.setAttribute("placeholder", p.orig); });
    htmlEl.setAttribute("lang", "he");
    htmlEl.setAttribute("dir", origDir);
    markSwitch(false);
    try { localStorage.setItem("lang", "he"); } catch (e) {}
  }

  function applySync(lang) { lang === "en" ? toEnglishSync() : toHebrewSync(); }

  // Switching language is not a navigation, the visitor stays exactly where
  // they were. Swapping every string changes the document height, so pin the
  // scroll offset across the swap and hand GSAP a fresh measurement afterwards.
  function switchTo(lang) {
    if ((htmlEl.getAttribute("lang") || "he") === lang) return;
    var y = window.scrollY || window.pageYOffset || 0;

    // Everything here happens while the veil is opaque.
    //
    // Order matters: ScrollTrigger.refresh() re-measures every pin and moves the
    // scroll position itself while doing so, so it has to run BEFORE the offset
    // is restored, refreshing afterwards threw the visitor ~800px down the page.
    function work() {
      applySync(lang);
      if (window.ScrollTrigger) window.ScrollTrigger.refresh();
      window.scrollTo(0, y);
    }

    var tx = window.pageTransition;
    if (!tx) { work(); translateRest(); return; }

    tx.cover(work).then(function () {
      // Belt and braces: a pinned timeline can still settle a frame late.
      if (Math.abs((window.scrollY || 0) - y) > 1) window.scrollTo(0, y);
      if (lang === "en") translateRest();
    });
  }

  // The HE/EN control is a function now, intercept clicks, never navigate.
  document.querySelectorAll(".lang-switch a").forEach(function (a) {
    a.addEventListener("click", function (e) {
      e.preventDefault();
      switchTo(/en/i.test(a.textContent) ? "en" : "he");
    });
  });

  // On load the veil is already playing its own entry animation, apply the
  // saved language straight away so it is correct in the first visible frame
  // rather than fading twice.
  var saved;
  try { saved = localStorage.getItem("lang"); } catch (e) {}
  if (saved === "en") { applySync("en"); translateRest(); }
})();

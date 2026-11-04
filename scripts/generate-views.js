const fs = require('fs');
const path = require('path');

const contentDir = path.join(__dirname, '../books/content');
const viewsDir = path.join(__dirname, '../books/views');

// Ensure destination directory exists
if (!fs.existsSync(viewsDir)) {
  fs.mkdirSync(viewsDir, { recursive: true });
}

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const files = fs.readdirSync(contentDir).filter(f => f.endsWith('.json'));

let totalProcessed = 0;
let totalGenerated = 0;

for (const file of files) {
  const filePath = path.join(contentDir, file);
  const rawContent = fs.readFileSync(filePath, 'utf8');
  const data = JSON.parse(rawContent);

  totalProcessed++;

  const id = data.id || '';
  const title = data.title || '';

  // Extract chapters and pages
  // Each chapter has: { chapterIndex, title, paragraphs: [string, ...] }
  let chapters = [];

  if (data.story) {
    const levelKey = data.level && data.story[data.level] ? data.level : Object.keys(data.story)[0];
    const storyData = data.story[levelKey];
    if (storyData && Array.isArray(storyData.chapters)) {
      storyData.chapters.forEach((ch, idx) => {
        let chIndex = ch.chapterIndex !== undefined ? ch.chapterIndex : idx + 1;
        let paragraphs = [];
        if (Array.isArray(ch.pages)) {
          for (const item of ch.pages) {
            if (Array.isArray(item)) {
              paragraphs.push(...item);
            } else if (typeof item === 'string') {
              paragraphs.push(item);
            }
          }
        }
        chapters.push({
          chapterIndex: chIndex,
          title: ch.title || title,
          paragraphs
        });
      });
    } else if (Array.isArray(storyData)) {
      let paragraphs = [];
      for (const item of storyData) {
        if (Array.isArray(item)) {
          paragraphs.push(...item);
        } else if (typeof item === 'string') {
          paragraphs.push(item);
        }
      }
      chapters.push({
        chapterIndex: data.chapterIndex !== undefined ? data.chapterIndex : 1,
        title: title,
        paragraphs
      });
    }
  } else if (Array.isArray(data.chapters)) {
    data.chapters.forEach((ch, idx) => {
      let chIndex = ch.chapterIndex !== undefined ? ch.chapterIndex : idx + 1;
      let paragraphs = [];
      if (Array.isArray(ch.pages)) {
        for (const item of ch.pages) {
          if (Array.isArray(item)) {
            paragraphs.push(...item);
          } else if (typeof item === 'string') {
            paragraphs.push(item);
          }
        }
      }
      chapters.push({
        chapterIndex: chIndex,
        title: ch.title || title,
        paragraphs
      });
    });
  } else if (Array.isArray(data.pages)) {
    let paragraphs = [];
    for (const item of data.pages) {
      if (Array.isArray(item)) {
        paragraphs.push(...item);
      } else if (typeof item === 'string') {
        paragraphs.push(item);
      }
    }
    chapters.push({
      chapterIndex: data.chapterIndex !== undefined ? data.chapterIndex : 1,
      title: title,
      paragraphs
    });
  }

  // Build the book story body content containing required h1, h2, and p elements
  let storyContent = `        <h1 class="book-id-heading">${escapeHtml(id)}</h1>\n`;

  chapters.forEach((ch, idx) => {
    const headingText = `${ch.chapterIndex} ${ch.title}`.trim();
    if (idx > 0) {
      storyContent += '\n';
    }
    storyContent += `        <h2 class="chapter-heading">${escapeHtml(headingText)}</h2>\n\n`;
    ch.paragraphs.forEach((p, pIdx) => {
      storyContent += `        <p class="story-paragraph">${escapeHtml(p)}</p>`;
      if (pIdx < ch.paragraphs.length - 1) {
        storyContent += '\n';
      }
    });
    storyContent += '\n';
  });

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
    <title>${escapeHtml(title)}</title>

    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600;700&family=Literata:opsz,wght@6..72,400;6..72,500;6..72,600&family=JetBrains+Mono:wght@500;600&display=swap" rel="stylesheet">

    <style>
      :root{
        --bg-void:#04050A;
        --bg-deep:#0A0C16;
        --bg-elevated:#12141F;
        --bg-reader:#0C0E18;

        --glass-fill: rgba(20,22,36,.55);
        --glass-fill-soft: rgba(20,22,36,.32);
        --glass-border: rgba(255,255,255,.08);
        --glass-border-hi: rgba(255,255,255,.16);

        --text-primary:#F5F7FA;
        --text-secondary:#A7AFC2;
        --text-tertiary:#666E82;
        --text-reader:#EAE6DD;

        --neon-cyan:#4CF5E0;
        --neon-blue:#7CACF8;
        --neon-violet:#9B7BFF;
        --neon-magenta:#F472B6;
        --neon-amber:#FFC876;

        --lvl-A1:#34D399;
        --lvl-A2:#4CF5E0;
        --lvl-B1:#7CACF8;
        --lvl-B2:#9B7BFF;
        --lvl-C1:#F472B6;
        --lvl-C2:#FB7185;

        --radius-card:20px;
        --radius-panel:26px;
        --radius-pill:999px;

        --ease-out-expo:cubic-bezier(.16,1,.3,1);
      }

      *{box-sizing:border-box;}
      html,body{height:100%;}
      body{
        margin:0;
        background:var(--bg-void);
        color:var(--text-primary);
        font-family:'Inter',sans-serif;
        -webkit-font-smoothing:antialiased;
        overflow-x:hidden;
        padding-top:env(safe-area-inset-top,0px);
        padding-bottom:env(safe-area-inset-bottom,0px);
      }
      ::selection{background:rgba(155,123,255,.35); color:#fff;}

      a,button{font-family:inherit;}
      button{cursor:pointer; background:none; border:none; color:inherit;}
      img{max-width:100%; display:block;}

      :focus-visible{
        outline:2px solid var(--neon-cyan);
        outline-offset:3px;
        border-radius:6px;
      }

      h1,h2,h3,h4{font-family:'Space Grotesk',sans-serif; margin:0; letter-spacing:-0.01em;}
      p{margin:0;}

      /* AMBIENT BACKGROUND */
      .ambient{
        position:fixed; inset:0; z-index:0; pointer-events:none; overflow:hidden;
      }
      .ambient::before, .ambient::after{
        content:''; position:absolute; border-radius:50%; filter:blur(90px); opacity:.28;
      }
      .ambient::before{
        width:640px; height:640px; top:-220px; left:-160px;
        background:radial-gradient(circle, var(--neon-violet), transparent 70%);
      }
      .ambient::after{
        width:560px; height:560px; bottom:-260px; right:-140px;
        background:radial-gradient(circle, var(--neon-cyan), transparent 70%);
        opacity:.18;
      }
      .grain{
        position:fixed; inset:0; z-index:1; pointer-events:none;
        opacity:.05; mix-blend-mode:overlay;
        background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
      }

      /* GLASS CONTAINER */
      .glass{
        background:var(--glass-fill);
        backdrop-filter:blur(22px) saturate(140%);
        -webkit-backdrop-filter:blur(22px) saturate(140%);
        border:1px solid var(--glass-border);
      }

      /* TOPBAR */
      .topbar{
        position:sticky; top:0; z-index:40;
        display:flex; align-items:center; justify-content:space-between;
        gap:16px; padding:16px clamp(16px,4vw,48px);
        padding-top:calc(16px + env(safe-area-inset-top,0px));
        background:rgba(4,5,10,.65);
        backdrop-filter:blur(18px);
        -webkit-backdrop-filter:blur(18px);
        border-bottom:1px solid var(--glass-border);
      }
      .brand{display:flex; align-items:center; gap:10px; flex-shrink:0; text-decoration:none; color:inherit;}
      .brand-mark{
        width:34px; height:34px; border-radius:10px;
        background:linear-gradient(145deg, var(--neon-cyan), var(--neon-violet));
        display:flex; align-items:center; justify-content:center;
        box-shadow:0 0 24px -4px rgba(155,123,255,.7);
      }
      .brand-mark svg{width:18px; height:18px; color:#04050A;}
      .brand-name{font-family:'Space Grotesk'; font-weight:600; font-size:1.05rem; letter-spacing:-.01em;}

      .nav-tabs{
        display:flex; gap:4px; padding:3px; border-radius:var(--radius-pill);
        background:var(--glass-fill-soft); border:1px solid var(--glass-border);
        flex-shrink:0;
      }
      .nav-tab-btn{
        padding:6px 14px; border-radius:var(--radius-pill); font-size:.82rem; font-weight:500;
        color:var(--text-secondary); transition:all 180ms var(--ease-out-expo);
        text-decoration:none; display:inline-flex; align-items:center;
      }
      .nav-tab-btn:hover{ color:var(--text-primary); }

      /* MAIN LAYOUT */
      .page-main{
        position:relative; z-index:2;
        max-width:1100px; margin:0 auto;
        padding:32px clamp(16px,4vw,48px) 96px;
      }

      /* BACK LINK */
      .back-link-btn{
        display:inline-flex; align-items:center; gap:8px;
        padding:8px 16px; border-radius:var(--radius-pill);
        background:var(--glass-fill-soft); border:1px solid var(--glass-border);
        font-size:.85rem; font-weight:500; color:var(--text-secondary);
        transition:all 180ms var(--ease-out-expo); margin-bottom:28px;
        text-decoration:none;
      }
      .back-link-btn:hover{ color:var(--text-primary); border-color:var(--glass-border-hi); transform:translateX(-2px); }
      .back-link-btn svg{ width:16px; height:16px; }

      /* HERO META CARD */
      .hero-meta-card{
        position:relative; padding:clamp(24px,4vw,40px);
        border-radius:32px; overflow:hidden;
        margin-bottom:36px;
      }
      .hero-grid{
        display:grid; grid-template-columns:220px 1fr; gap:36px; align-items:start;
      }
      @media (max-width:768px){
        .hero-grid{ grid-template-columns:1fr; gap:24px; justify-items:center; text-align:center; }
        .hero-meta-chips{ justify-content:center; }
        .hero-actions-row{ justify-content:center; }
      }

      .hero-cover{
        width:220px; aspect-ratio:2/3; border-radius:20px; overflow:hidden; position:relative;
        box-shadow:0 24px 60px -16px rgba(0,0,0,.75); flex-shrink:0;
        background:linear-gradient(160deg, #3b2d6b, #151829);
      }
      .hero-cover img{ width:100%; height:100%; object-fit:cover; }
      .hero-cover-fallback{
        position:absolute; inset:0; display:flex; flex-direction:column; justify-content:flex-end;
        padding:18px 16px; background:linear-gradient(0deg, rgba(0,0,0,.85) 0%, transparent 80%);
      }
      .hero-cover-title{ font-family:'Space Grotesk'; font-size:1.05rem; font-weight:600; color:#fff; }
      .hero-cover-author{ font-size:.8rem; color:rgba(255,255,255,.7); }

      .hero-info{ display:flex; flex-direction:column; gap:16px; min-width:0; }
      .book-display-title{ font-size:clamp(1.8rem,3.2vw,2.5rem); font-weight:700; line-height:1.2; }
      .book-display-author{ font-size:1.05rem; color:var(--text-secondary); }

      .hero-meta-chips{ display:flex; flex-wrap:wrap; gap:10px; align-items:center; }
      .meta-chip{
        display:inline-flex; align-items:center; gap:6px;
        font-size:.82rem; font-weight:600; padding:6px 14px; border-radius:var(--radius-pill);
        background:var(--glass-fill-soft); border:1px solid var(--glass-border); color:var(--text-secondary);
      }
      .level-dot{ width:8px; height:8px; border-radius:50%; background:currentColor; display:inline-block; }

      .vocab-meter{ display:flex; gap:4px; width:160px; height:5px; margin-top:2px; }
      .vocab-meter i{ display:block; flex:1; height:100%; border-radius:99px; background:rgba(255,255,255,.1); }
      .vocab-meter i.on{ background:var(--neon-violet); }

      .hero-actions-row{ display:flex; flex-wrap:wrap; gap:14px; align-items:center; margin-top:8px; }
      .btn-primary-lg{
        display:inline-flex; align-items:center; gap:10px;
        padding:14px 28px; border-radius:var(--radius-pill);
        background:linear-gradient(120deg, var(--neon-cyan), var(--neon-violet));
        color:#04050A; font-weight:700; font-size:1rem; text-decoration:none;
        box-shadow:0 12px 36px -8px rgba(155,123,255,.6);
        transition:transform 200ms var(--ease-out-expo), box-shadow 200ms var(--ease-out-expo);
      }
      .btn-primary-lg:hover{ transform:translateY(-2px); box-shadow:0 16px 42px -8px rgba(155,123,255,.75); }
      .btn-primary-lg svg{ width:20px; height:20px; }

      /* METADATA STATS GRID */
      .sections-grid{ display:grid; grid-template-columns:2fr 1fr; gap:28px; margin-bottom:36px; }
      @media (max-width:840px){
        .sections-grid{ grid-template-columns:1fr; }
      }

      .section-box{
        padding:28px; border-radius:24px; display:flex; flex-direction:column; gap:16px;
      }
      .section-box-title{ font-size:1.15rem; font-weight:600; color:var(--text-primary); display:flex; align-items:center; gap:8px; }
      .section-box-title svg{ width:18px; height:18px; color:var(--neon-cyan); }
      .section-box-body{ font-size:.95rem; line-height:1.7; color:var(--text-secondary); }

      .stat-list{ display:flex; flex-direction:column; gap:14px; list-style:none; padding:0; margin:0; }
      .stat-item{ display:flex; justify-content:space-between; align-items:center; padding-bottom:12px; border-bottom:1px solid var(--glass-border); font-size:.88rem; }
      .stat-item:last-child{ border-bottom:none; padding-bottom:0; }
      .stat-label{ color:var(--text-tertiary); }
      .stat-val{ color:var(--text-primary); font-weight:600; }

      /* STORY READER CARD (CONTAINING REQUIRED H1, H2, P ELEMENTS) */
      .story-reader-card{
        border-radius:28px;
        padding:clamp(28px,5vw,60px);
        background:var(--bg-reader);
        border:1px solid var(--glass-border);
        box-shadow:0 30px 80px -20px rgba(0,0,0,.8);
      }
      .story-reader-container{
        max-width:68ch; margin:0 auto;
      }

      /* REQUIRED ELEMENT SPECIFICATIONS */
      h1.book-id-heading{
        font-family:'Space Grotesk',sans-serif;
        font-size:clamp(1.4rem, 2.5vw, 2rem);
        font-weight:700;
        color:var(--text-primary);
        letter-spacing:-0.01em;
        margin-bottom:24px;
        padding-bottom:16px;
        border-bottom:1px solid var(--glass-border);
      }
      h2.chapter-heading{
        font-family:'Space Grotesk',sans-serif;
        font-size:clamp(1.2rem, 2vw, 1.5rem);
        font-weight:600;
        color:var(--neon-cyan);
        letter-spacing:-0.01em;
        margin-top:36px;
        margin-bottom:20px;
      }
      h2.chapter-heading:first-of-type{
        margin-top:12px;
      }
      p.story-paragraph{
        font-family:'Literata',serif;
        font-size:1.12rem;
        line-height:1.9;
        color:var(--text-reader);
        margin-bottom:1.5em;
      }
      p.story-paragraph:last-child{
        margin-bottom:0;
      }

      @media (max-width:768px){
        .topbar{ padding:10px 14px; }
        .page-main{ padding:20px 14px 64px; }
        .hero-meta-card{ padding:20px 16px; border-radius:24px; }
        .section-box{ padding:20px 18px; }
        .story-reader-card{ padding:24px 18px; border-radius:20px; }
        p.story-paragraph{ font-size:1.02rem; line-height:1.75; }
      }
    </style>
</head>
<body>

<div class="ambient" aria-hidden="true"></div>
<div class="grain" aria-hidden="true"></div>

<header class="topbar">
  <a href="../../index.html" class="brand">
    <div class="brand-mark">
      <svg viewBox="0 0 24 24" fill="currentColor"><path d="M4 4h9a3 3 0 0 1 3 3v13H7a3 3 0 0 1-3-3V4z"/><path d="M20 6v14h-4V6a2 2 0 0 1 4 0z" opacity=".55"/></svg>
    </div>
    <span class="brand-name">Lumen</span>
  </a>
  <nav class="nav-tabs">
    <a href="../../index.html" class="nav-tab-btn">Library / Search</a>
    <a href="../../discover.html" class="nav-tab-btn">Discover</a>
  </nav>
</header>

<main class="page-main">

  <a href="../../book.html?id=${encodeURIComponent(id)}" class="back-link-btn" id="backBtn">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M11 6l-6 6 6 6"/></svg>
    Back to Book Details
  </a>

  <!-- HERO METADATA CARD (POPULATED DYNAMICALLY FROM JSON) -->
  <article class="hero-meta-card glass" id="metaHeroCard">
    <div class="hero-grid">
      <div class="hero-cover" id="heroCoverContainer">
        <!-- Render cover image or styled fallback -->
      </div>
      <div class="hero-info">
        <h2 class="book-display-title" id="bookDisplayTitle">${escapeHtml(title)}</h2>
        <p class="book-display-author" id="bookDisplayAuthor">—</p>

        <div class="hero-meta-chips" id="heroMetaChips">
          <span class="meta-chip" id="chipLevel">Level —</span>
          <span class="meta-chip" id="chipGenre">Genre —</span>
          <span class="meta-chip" id="chipReadingTime">⏱ — min read</span>
          <span class="meta-chip" id="chipDateAdded">📅 Added —</span>
          <span class="meta-chip" id="chipVocab">📚 — vocab items</span>
        </div>

        <div>
          <p style="font-size: .78rem; color: var(--text-tertiary); margin-bottom: 6px;">DIFFICULTY RATING</p>
          <div class="vocab-meter" id="vocabMeter" aria-label="Difficulty Rating"></div>
        </div>

        <div class="hero-actions-row">
          <a href="../../book.html?id=${encodeURIComponent(id)}" class="btn-primary-lg" id="readInteractiveBtn">
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
            <span>Interactive Reader</span>
          </a>
        </div>
      </div>
    </div>
  </article>

  <!-- METADATA SECTIONS (ABOUT, LEARNING, STATS) -->
  <div class="sections-grid">
    <div class="section-box glass">
      <h3 class="section-box-title">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
        About This Book
      </h3>
      <p class="section-box-body" id="aboutTextDisplay">
        Loading description…
      </p>

      <h3 class="section-box-title" style="margin-top: 14px;">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
        What You'll Learn
      </h3>
      <p class="section-box-body" id="learnTextDisplay">
        Loading learning objectives…
      </p>
    </div>

    <div class="section-box glass">
      <h3 class="section-box-title">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
        Reading Stats
      </h3>
      <ul class="stat-list">
        <li class="stat-item">
          <span class="stat-label">CEFR Level</span>
          <span class="stat-val" id="statLevel">—</span>
        </li>
        <li class="stat-item">
          <span class="stat-label">Author</span>
          <span class="stat-val" id="statAuthor">—</span>
        </li>
        <li class="stat-item">
          <span class="stat-label">Genre</span>
          <span class="stat-val" id="statGenre">—</span>
        </li>
        <li class="stat-item">
          <span class="stat-label">Estimated Time</span>
          <span class="stat-val" id="statTime">—</span>
        </li>
        <li class="stat-item">
          <span class="stat-label">Word Count</span>
          <span class="stat-val" id="statWordCount">—</span>
        </li>
        <li class="stat-item">
          <span class="stat-label">Vocabulary Items</span>
          <span class="stat-val" id="statVocab">—</span>
        </li>
        <li class="stat-item">
          <span class="stat-label">Date Added</span>
          <span class="stat-val" id="statDateAdded">—</span>
        </li>
      </ul>
    </div>
  </div>

  <!-- STORY CONTENT (CONTAINING REQUIRED H1, H2, P ELEMENTS) -->
  <article class="story-reader-card">
    <div class="story-reader-container">
${storyContent}    </div>
  </article>

</main>

<script>
// Dynamic Metadata Loader
(async function initMetadata() {
  const jsonUrl = '../content/${file}';
  let data = null;

  try {
    const res = await fetch(jsonUrl);
    if (res.ok) {
      data = await res.json();
    }
  } catch (err) {
    console.warn('Could not fetch external JSON, using embedded fallback:', err);
  }

  // Fallback initial data in case fetch is blocked by file:// protocol
  if (!data) {
    data = ${JSON.stringify({
      id: data.id || '',
      title: data.title || '',
      author: data.author || '',
      level: data.level || 'B1',
      genre: data.genre || '',
      minutes: data.minutes || 0,
      vocab: data.vocab || 0,
      dateAdded: data.dateAdded || '',
      coverImage: data.coverImage || '',
      description: data.description || '',
      whatYouWillLearn: data.whatYouWillLearn || ''
    })};
  }

  const genreLabels = {
    scifi: 'Sci-Fi & Future Worlds',
    business: 'Business & Growth',
    classic: 'Classic Literature',
    daily: 'Daily Conversations',
    healthy: 'Health & Wellness'
  };

  const level = (data.level || 'B1').toUpperCase();
  const genreFormatted = genreLabels[data.genre] || (data.genre ? String(data.genre).toUpperCase() : 'General');
  const author = data.author || 'Unknown Author';
  const minutes = data.minutes ? data.minutes + ' min' : '5 min';
  const vocabCount = typeof data.vocab === 'number' ? data.vocab : (Array.isArray(data.vocab) ? data.vocab.length : 0);

  // Format date
  let formattedDate = 'Recently';
  if (data.dateAdded) {
    try {
      const d = new Date(data.dateAdded);
      if (!isNaN(d.getTime())) {
        formattedDate = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      }
    } catch (_) {}
  }

  // Calculate word count from document paragraphs
  const paragraphs = document.querySelectorAll('p.story-paragraph');
  let totalWords = 0;
  paragraphs.forEach(p => {
    const text = p.textContent.trim();
    if (text) totalWords += text.split(/\\s+/).length;
  });

  // Populate hero card
  const titleEl = document.getElementById('bookDisplayTitle');
  if (titleEl && data.title) titleEl.textContent = data.title;

  const authorEl = document.getElementById('bookDisplayAuthor');
  if (authorEl) authorEl.textContent = 'by ' + author;

  const chipLevel = document.getElementById('chipLevel');
  if (chipLevel) {
    chipLevel.innerHTML = '<span class="level-dot"></span> Level ' + level;
    chipLevel.style.color = 'var(--lvl-' + level + ')';
    chipLevel.style.borderColor = 'var(--lvl-' + level + ')';
  }

  const chipGenre = document.getElementById('chipGenre');
  if (chipGenre) chipGenre.textContent = genreFormatted;

  const chipTime = document.getElementById('chipReadingTime');
  if (chipTime) chipTime.textContent = '⏱ ' + minutes + ' read';

  const chipDate = document.getElementById('chipDateAdded');
  if (chipDate) chipDate.textContent = '📅 Added ' + formattedDate;

  const chipVocab = document.getElementById('chipVocab');
  if (chipVocab) chipVocab.textContent = '📚 ' + vocabCount + ' vocab items';

  // Difficulty meter (1 to 6)
  const LEVEL_SEGMENTS = { A1: 1, A2: 2, B1: 3, B2: 4, C1: 5, C2: 6 };
  const meterSegments = LEVEL_SEGMENTS[level] || 3;
  const meterEl = document.getElementById('vocabMeter');
  if (meterEl) {
    let segHtml = '';
    for (let i = 0; i < 6; i++) {
      segHtml += '<i class="' + (i < meterSegments ? 'on' : '') + '"></i>';
    }
    meterEl.innerHTML = segHtml;
  }

  // Cover
  const coverContainer = document.getElementById('heroCoverContainer');
  if (coverContainer) {
    if (data.coverImage) {
      coverContainer.innerHTML = '<img src="../../' + data.coverImage.replace(/^\\/?/, '') + '" alt="' + (data.title || '') + '" onerror="this.style.display=\\'none\\'">';
    } else {
      coverContainer.innerHTML = '<div class="hero-cover-fallback"><div class="hero-cover-title">' + (data.title || '') + '</div><div class="hero-cover-author">' + author + '</div></div>';
    }
  }

  // Descriptions
  const aboutText = data.description || 'Explore "' + (data.title || '') + '", an engaging ' + genreFormatted.toLowerCase() + ' story specifically leveled at the CEFR ' + level + ' proficiency tier.';
  const learnText = data.whatYouWillLearn || 'Master ' + level + '-level grammar structures and vocabulary in authentic context. Designed for English learners wanting to improve vocabulary retention and fluency.';

  const aboutEl = document.getElementById('aboutTextDisplay');
  if (aboutEl) aboutEl.textContent = aboutText;

  const learnEl = document.getElementById('learnTextDisplay');
  if (learnEl) learnEl.textContent = learnText;

  // Stats list
  const statLevel = document.getElementById('statLevel');
  if (statLevel) {
    statLevel.textContent = 'CEFR ' + level;
    statLevel.style.color = 'var(--lvl-' + level + ')';
  }

  const statAuthor = document.getElementById('statAuthor');
  if (statAuthor) statAuthor.textContent = author;

  const statGenre = document.getElementById('statGenre');
  if (statGenre) statGenre.textContent = genreFormatted;

  const statTime = document.getElementById('statTime');
  if (statTime) statTime.textContent = minutes;

  const statWordCount = document.getElementById('statWordCount');
  if (statWordCount) statWordCount.textContent = totalWords.toLocaleString() + ' words';

  const statVocab = document.getElementById('statVocab');
  if (statVocab) statVocab.textContent = vocabCount.toLocaleString() + ' words';

  const statDate = document.getElementById('statDateAdded');
  if (statDate) statDate.textContent = formattedDate;
})();
</script>
</body>
</html>
`;

  const htmlFileName = file.replace(/\.json$/i, '.html');
  const htmlFilePath = path.join(viewsDir, htmlFileName);
  fs.writeFileSync(htmlFilePath, html, 'utf8');
  totalGenerated++;
}

console.log(`Successfully processed ${totalProcessed} JSON files and generated ${totalGenerated} HTML files in books/views.`);

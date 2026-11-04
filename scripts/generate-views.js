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
  // Each chapter has: { chapterIndex, title, pages: [string, string, ...] }
  let chapters = [];

  if (data.story) {
    const levelKey = data.level && data.story[data.level] ? data.level : Object.keys(data.story)[0];
    const storyData = data.story[levelKey];
    if (storyData && Array.isArray(storyData.chapters)) {
      storyData.chapters.forEach((ch, idx) => {
        let chIndex = ch.chapterIndex !== undefined ? ch.chapterIndex : idx + 1;
        // In 0-indexed data files, chapter index can be 0, or 1-based in other formats.
        // We preserve ch.chapterIndex as provided.
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

  // Construct HTML
  let bodyContent = `    <h1>${escapeHtml(id)}</h1>\n`;

  chapters.forEach((ch, idx) => {
    const headingText = `${ch.chapterIndex} ${ch.title}`.trim();
    if (idx > 0) {
      bodyContent += '\n';
    }
    bodyContent += `    <h2>${escapeHtml(headingText)}</h2>\n\n`;
    ch.paragraphs.forEach((p, pIdx) => {
      bodyContent += `    <p>${escapeHtml(p)}</p>`;
      if (pIdx < ch.paragraphs.length - 1) {
        bodyContent += '\n';
      }
    });
    bodyContent += '\n';
  });

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${escapeHtml(title)}</title>
</head>
<body>
${bodyContent}</body>
</html>
`;

  const htmlFileName = file.replace(/\.json$/i, '.html');
  const htmlFilePath = path.join(viewsDir, htmlFileName);
  fs.writeFileSync(htmlFilePath, html, 'utf8');
  totalGenerated++;
}

console.log(`Successfully processed ${totalProcessed} JSON files and generated ${totalGenerated} HTML files in books/views.`);

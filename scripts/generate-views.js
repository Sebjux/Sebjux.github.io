const fs = require('fs');
const path = require('path');

const CONTENT_DIR = path.join(__dirname, '..', 'books', 'content');
const VIEWS_DIR = path.join(__dirname, '..', 'books', 'views');

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function generateHtmlForBook(data) {
  const idVal = data.id !== undefined ? String(data.id) : '';
  const bookTitle = data.title !== undefined ? String(data.title) : '';

  let chapters = [];

  if (Array.isArray(data.chapters)) {
    chapters = data.chapters;
  } else if (data.story && typeof data.story === 'object') {
    const levelKey = data.level && data.story[data.level.toUpperCase()]
      ? data.level.toUpperCase()
      : Object.keys(data.story)[0];
    const storyData = data.story[levelKey] || data.story[Object.keys(data.story)[0]];

    if (storyData && Array.isArray(storyData.chapters)) {
      chapters = storyData.chapters;
    } else if (Array.isArray(storyData)) {
      chapters = [{
        chapterIndex: data.chapterIndex !== undefined ? data.chapterIndex : 1,
        title: data.title || '',
        pages: storyData
      }];
    }
  } else if (Array.isArray(data.pages)) {
    chapters = [{
      chapterIndex: data.chapterIndex !== undefined ? data.chapterIndex : 1,
      title: data.title || '',
      pages: data.pages
    }];
  }

  const bodyParts = [];
  bodyParts.push(`    <h1>${escapeHtml(idVal)}</h1>`);

  for (const ch of chapters) {
    const chIndex = ch.chapterIndex !== undefined ? ch.chapterIndex : 1;
    const chTitle = ch.title !== undefined ? ch.title : bookTitle;
    const h2Text = `${chIndex} ${chTitle}`.trim();
    bodyParts.push(`    <h2>${escapeHtml(h2Text)}</h2>`);
    bodyParts.push('');

    if (Array.isArray(ch.pages)) {
      for (const item of ch.pages) {
        if (Array.isArray(item)) {
          for (const p of item) {
            bodyParts.push(`    <p>${escapeHtml(p)}</p>`);
          }
        } else if (typeof item === 'string') {
          bodyParts.push(`    <p>${escapeHtml(item)}</p>`);
        }
      }
    }
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${escapeHtml(bookTitle)}</title>
</head>
<body>
${bodyParts.join('\n')}
</body>
</html>
`;
}

function processAllFiles() {
  if (!fs.existsSync(VIEWS_DIR)) {
    fs.mkdirSync(VIEWS_DIR, { recursive: true });
  }

  const files = fs.readdirSync(CONTENT_DIR).filter(f => f.endsWith('.json'));
  let processedCount = 0;
  let generatedCount = 0;

  for (const file of files) {
    const jsonPath = path.join(CONTENT_DIR, file);
    const htmlFilename = file.replace(/\.json$/i, '.html');
    const htmlPath = path.join(VIEWS_DIR, htmlFilename);

    const rawData = fs.readFileSync(jsonPath, 'utf8');
    const data = JSON.parse(rawData);

    const htmlContent = generateHtmlForBook(data);
    fs.writeFileSync(htmlPath, htmlContent, 'utf8');

    processedCount++;
    generatedCount++;
  }

  console.log(`Total JSON files processed: ${processedCount}`);
  console.log(`Total HTML files generated: ${generatedCount}`);
}

if (require.main === module) {
  processAllFiles();
}

module.exports = {
  escapeHtml,
  generateHtmlForBook,
  processAllFiles
};

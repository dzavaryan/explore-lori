'use strict';
/**
 * One-time setup: inserts CMS injection markers into the 4 target HTML files.
 * Safe to run multiple times — checks if markers already exist before inserting.
 */
const fs = require('fs');
const path = require('path');

const SITE_ROOT = path.join(__dirname, '..');

const TASKS = [
  {
    file: 'discover/index.html',
    insertions: [
      {
        // Wrap the results-count paragraph
        find: /<p class="results-count"[^>]*>[\s\S]*?<\/p>/,
        replace: (match) => `<!-- CMS:DISCOVER:COUNT:START -->\n    ${match}\n    <!-- CMS:DISCOVER:COUNT:END -->`
      },
      {
        // Wrap cards inside discover__grid — insert markers after opening tag and before closing tag
        find: /(<div class="discover__grid[^"]*"[^>]*>)([\s\S]*?)(<\/div>\s*<\/div>\s*<\/main>)/,
        replace: (match, open, content, close) =>
          `${open}\n  <!-- CMS:CARDS:START -->${content}  <!-- CMS:CARDS:END -->\n${close}`
      }
    ]
  },
  {
    file: 'stories/index.html',
    insertions: [
      {
        find: /(<div class="article-grid"[^>]*>)([\s\S]*?)(<\/div>\s*<\/div>\s*(?:<\/section>|<\/main>))/,
        replace: (match, open, content, close) =>
          `${open}\n  <!-- CMS:CARDS:START -->${content}  <!-- CMS:CARDS:END -->\n${close}`
      }
    ]
  },
  {
    file: 'events/index.html',
    insertions: [
      {
        // Wrap ev-month sections inside events-body__inner
        find: /(<div class="events-body__inner">)([\s\S]*?)(<\/div>\s*<\/main>)/,
        replace: (match, open, content, close) =>
          `${open}\n  <!-- CMS:EVENTS:START -->${content}  <!-- CMS:EVENTS:END -->\n${close}`
      }
    ]
  },
  {
    file: 'plan/index.html',
    insertions: [
      {
        find: /(<div class="stay-grid[^"]*">)([\s\S]*?)(<\/div>)/,
        replace: (match, open, content, close) =>
          `${open}\n  <!-- CMS:CARDS:START -->${content}  <!-- CMS:CARDS:END -->\n${close}`
      }
    ]
  }
];

let allOk = true;

for (const task of TASKS) {
  const filePath = path.join(SITE_ROOT, task.file);
  if (!fs.existsSync(filePath)) {
    console.error(`❌ File not found: ${task.file}`);
    allOk = false;
    continue;
  }

  let html = fs.readFileSync(filePath, 'utf8');
  let changed = false;

  for (const insertion of task.insertions) {
    // Skip if markers already present
    if (html.includes('<!-- CMS:')) {
      // Only check specific marker for this insertion
      console.log(`⏭️  Markers already present in ${task.file} — skipping`);
      break;
    }
    const newHtml = html.replace(insertion.find, insertion.replace);
    if (newHtml !== html) {
      html = newHtml;
      changed = true;
    } else {
      console.warn(`⚠️  Pattern not matched in ${task.file} — manual marker insertion may be needed`);
    }
  }

  if (changed) {
    fs.copyFileSync(filePath, filePath + '.bak');
    fs.writeFileSync(filePath, html, 'utf8');
    console.log(`✅ Markers inserted: ${task.file}`);
  } else if (!html.includes('<!-- CMS:')) {
    console.warn(`⚠️  No changes made to ${task.file}`);
    allOk = false;
  }
}

if (allOk) {
  console.log('\n✅ All markers ready. Start the admin server: node server.js');
} else {
  console.log('\n⚠️  Some files need manual marker insertion. Check warnings above.');
}

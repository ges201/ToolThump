#!/usr/bin/env node
/**
 * ToolThump build script (no dependencies).
 *
 *  - Regenerates sitemap.xml with real lastmod dates taken from git history
 *    (includes every tool in js/tools-data.js, so new tools are never forgotten)
 *  - Injects/refreshes structured data on each tool page:
 *      WebApplication + BreadcrumbList + FAQPage (when the page has FAQs)
 *  - Repoints og:image / twitter:image at the generated cards in /icons/
 *
 * Usage: node build.js [--dry-run]
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = __dirname;
const DRY = process.argv.includes('--dry-run');
const SITE = 'https://toolthump.com';
const PUBLISHER = { '@type': 'Organization', name: 'ToolThump', url: SITE + '/' };

const APPLICATION_CATEGORY = {
  Security: 'SecurityApplication',
  'Text Tools': 'UtilityApplication',
  'Image Tools': 'MultimediaApplication',
  'Data Tools': 'UtilityApplication'
};

/* ---------------------------------------------------------------- helpers */

function read(p) { return fs.readFileSync(path.join(ROOT, p), 'utf8'); }
function write(p, c) {
  if (DRY) { console.log(`  [dry-run] would write ${p}`); return; }
  fs.writeFileSync(path.join(ROOT, p), c);
}

function loadTools() {
  const raw = read('js/tools-data.js');
  // js/tools-data.js is a browser script defining `const toolsData = [...]`
  // with unquoted keys, so evaluate rather than JSON.parse.
  const fn = new Function(`${raw}\n;return toolsData;`);
  return fn();
}

function gitDates(relFile) {
  try {
    const out = execSync(`git log --format=%cI -- "${relFile}"`, { cwd: ROOT, encoding: 'utf8' }).trim();
    if (!out) return {};
    const lines = out.split('\n').filter(Boolean);
    return { modified: lines[0], published: lines[lines.length - 1] };
  } catch {
    return {};
  }
}

function isoDay(iso) { return typeof iso === 'string' ? iso.slice(0, 10) : undefined; }

const NAMED_ENTITIES = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
  mdash: '\u2014', ndash: '\u2013', rsquo: '\u2019', lsquo: '\u2018',
  ldquo: '\u201c', rdquo: '\u201d', hellip: '\u2026', middot: '\u00b7'
};

function decodeEntities(s = '') {
  return s
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&([a-zA-Z]+);/g, (m, n) => Object.prototype.hasOwnProperty.call(NAMED_ENTITIES, n.toLowerCase()) ? NAMED_ENTITIES[n.toLowerCase()] : m)
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractMetaDescription(html) {
  const m = html.match(/<meta\s+name="description"\s+content="([^"]*)"/i);
  return m ? m[1] : '';
}

function extractFaqs(html) {
  const m = html.match(/<script[^>]*type="application\/json"[^>]*id="tool-text-data"[^>]*>([\s\S]*?)<\/script>/i)
    || html.match(/<script[^>]*id="tool-text-data"[^>]*type="application\/json"[^>]*>([\s\S]*?)<\/script>/i);
  if (!m) return null;
  try {
    const data = JSON.parse(m[1]);
    const faqs = [];
    for (const section of data.sections || []) {
      if (section.type === 'faq') {
        for (const f of section.faqs || []) {
          faqs.push({ q: decodeEntities(f.question), a: decodeEntities(f.answer) });
        }
      }
    }
    return faqs.length ? faqs : null;
  } catch {
    console.warn('  ! could not parse tool-text-data JSON');
    return null;
  }
}

/* ------------------------------------------------------------- schema gen */

function buildGraph(tool, meta) {
  const url = SITE + tool.htmlPath;
  const iconUrl = `${SITE}/icons/${tool.id}.png`;
  const graph = [
    {
      '@type': 'WebApplication',
      '@id': url + '#webapp',
      name: tool.name,
      url,
      description: meta.description || tool.description,
      applicationCategory: APPLICATION_CATEGORY[tool.category] || 'UtilityApplication',
      operatingSystem: 'Any',
      browserRequirements: 'Requires JavaScript. All processing runs client-side in your browser.',
      isAccessibleForFree: true,
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
      featureList: tool.keywords,
      screenshot: iconUrl,
      publisher: PUBLISHER
    },
    {
      '@type': 'BreadcrumbList',
      '@id': url + '#breadcrumb',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'ToolThump', item: SITE + '/' },
        { '@type': 'ListItem', position: 2, name: tool.name }
      ]
    }
  ];

  if (meta.dates.published) graph[0].datePublished = isoDay(meta.dates.published);
  if (meta.dates.modified) graph[0].dateModified = isoDay(meta.dates.modified);

  if (meta.faqs) {
    graph.push({
      '@type': 'FAQPage',
      '@id': url + '#faq',
      mainEntity: meta.faqs.map(f => ({
        '@type': 'Question',
        name: f.q,
        acceptedAnswer: { '@type': 'Answer', text: f.a }
      }))
    });
  }

  return { '@context': 'https://schema.org', '@graph': graph };
}

function injectSchema(html, tool) {
  const block = buildGraph(tool, {
    description: extractMetaDescription(html),
    faqs: extractFaqs(html),
    dates: gitDates(tool.htmlPath.replace(/^\//, ''))
  });
  const scriptTag =
    '<script type="application/ld+json">\n    '
    + JSON.stringify(block, null, 2).replace(/\n/g, '\n    ')
    + '\n    </script>';

  const existing = /<script type="application\/ld\+json">[\s\S]*?<\/script>/i;
  if (existing.test(html)) {
    return html.replace(existing, () => scriptTag);
  }
  const canonical = html.match(/<link rel="canonical"[^>]*>/i);
  if (canonical) {
    return html.replace(
      canonical[0],
      () =>
        canonical[0]
        + '\n\n    <!-- Schema.org structured data (generated by build.js - do not edit manually) -->\n    '
        + scriptTag
    );
  }
  throw new Error('no canonical link and no existing ld+json block');
}

function fixSocialImage(html, iconUrl) {
  let fixed = 0;
  for (const prop of ['og:image', 'twitter:image']) {
    const re = new RegExp(`(<meta\\s+(?:property|name)="${prop}"\\s+content=")[^"]*(")`, 'i');
    if (re.test(html)) {
      html = html.replace(re, (_m, a, b) => { fixed++; return a + iconUrl + b; });
    } else {
      console.warn(`  ! ${prop} meta not found in standard form`);
    }
  }
  return { html, fixed };
}

/* ---------------------------------------------------------------- sitemap */

function generateSitemap(tools) {
  const pages = [
    { loc: '/', file: 'index.html', priority: '1.0', freq: 'weekly' },
    ...tools.map(t => ({ loc: t.htmlPath, file: t.htmlPath.replace(/^\//, ''), priority: '0.8', freq: 'monthly' })),
    { loc: '/pages/about.html', file: 'pages/about.html', priority: '0.3', freq: 'yearly' },
    { loc: '/pages/privacy.html', file: 'pages/privacy.html', priority: '0.3', freq: 'yearly' }
  ];

  const urls = pages.map(p => {
    const d = gitDates(p.file);
    const lastmod = isoDay(d.modified) || new Date().toISOString().slice(0, 10);
    return `  <url>
    <loc>${SITE}${p.loc}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${p.freq}</changefreq>
    <priority>${p.priority}</priority>
  </url>`;
  });

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<!-- Generated by build.js - do not edit manually -->
<urlset
  xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9 http://www.sitemaps.org/schemas/sitemap.xsd">

${urls.join('\n')}
</urlset>
`;
  write('sitemap.xml', xml);
  return pages.length;
}

/* ------------------------------------------------------------ validations */

function validateImages(tools) {
  const problems = [];
  for (const t of tools) {
    const rel = path.join('tools', t.htmlPath.split('/').pop());
    void rel;
    const card = path.join(ROOT, 'icons', `${t.id}.png`);
    if (!fs.existsSync(card)) problems.push(`missing OG card: icons/${t.id}.png`);
    const htmlPath = path.join(ROOT, t.htmlPath.replace(/^\//, ''));
    if (!fs.existsSync(htmlPath)) problems.push(`missing page: ${t.htmlPath}`);
  }
  for (const brand of ['ToolThump.png']) {
    if (!fs.existsSync(path.join(ROOT, brand))) problems.push(`missing ${brand}`);
  }
  return problems;
}

function scanExternalIcons(dir, acc) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === '.git' || entry.name === 'node_modules' || entry.name === 'libs') continue;
      scanExternalIcons(full, acc);
    } else if (/\.(html|js)$/.test(entry.name)) {
      const content = fs.readFileSync(full, 'utf8');
      if (/api\.iconify\.design/.test(content)) acc.push(path.relative(ROOT, full));
    }
  }
  return acc;
}

/* ------------------------------------------------------------------- main */

let exitCode = 0;
try {
  const tools = loadTools();
  console.log(`Found ${tools.length} tools.\n`);

  /* 1. structured data + social images per tool page */
  for (const tool of tools) {
    const rel = tool.htmlPath.replace(/^\//, '');
    process.stdout.write(`${rel} ... `);
    try {
      let html = read(rel);

      const res = fixSocialImage(html, `${SITE}/icons/${tool.id}.png`);
      html = res.html;

      html = injectSchema(html, tool);

      write(rel, html);
      const hasFaq = extractFaqs(read(rel)) ? '+FAQ' : '';
      console.log(`ok (${res.fixed} image metas, schema refreshed ${hasFaq})`);
    } catch (e) {
      console.log(`FAILED: ${e.message}`);
      exitCode = 1;
    }
  }

  /* 2. sitemap */
  const count = generateSitemap(tools);
  console.log(`\nsitemap.xml regenerated (${count} URLs, lastmod from git)`);

  /* 3. validation */
  const imgProblems = validateImages(tools);
  const iconifyRefs = scanExternalIcons(ROOT, []);
  if (imgProblems.length) { console.error('\nIMAGE PROBLEMS:'); imgProblems.forEach(p => console.error('  - ' + p)); exitCode = 1; }
  if (iconifyRefs.length) { console.error('\nEXTERNAL ICON REFS REMAIN:'); iconifyRefs.forEach(p => console.error('  - ' + p)); exitCode = 1; }
  if (!imgProblems.length && !iconifyRefs.length) console.log('\nvalidation passed: all OG cards present, no external icon refs.');
} catch (e) {
  console.error('BUILD ERROR:', e.message);
  exitCode = 1;
}
process.exit(exitCode);

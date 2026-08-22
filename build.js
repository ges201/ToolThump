#!/usr/bin/env node
/**
 * ToolThump build script (no dependencies).
 *
 *  - Regenerates sitemap.xml with real lastmod dates taken from git history
 *    (includes every tool in js/tools-data.js, so new tools are never forgotten)
 *  - Injects/refreshes structured data on each tool page:
 *      WebApplication + BreadcrumbList + FAQPage (when the page has FAQs)
 *  - Repoints og:image / twitter:image at the generated cards in /icons/
 *  - Inlines header/footer/tool-text includes so crawlers see nav + FAQs,
 *    features and how-to sections in raw HTML (main.js keeps runtime fetch
 *    as a fallback for anything not yet built)
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

function extractTextData(html) {
  const m = html.match(/<script[^>]*type="application\/json"[^>]*id="tool-text-data"[^>]*>([\s\S]*?)<\/script>/i)
    || html.match(/<script[^>]*id="tool-text-data"[^>]*type="application\/json"[^>]*>([\s\S]*?)<\/script>/i);
  if (!m) return null;
  try { return JSON.parse(m[1]); } catch { return null; }
}

function escapeHtml(s = '') {
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
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

/* ------------------------------------------------------- static includes */

function indentBlock(html, spaces) {
  const pad = ' '.repeat(spaces);
  return html.trimEnd().split('\n').map(l => pad + l).join('\n');
}

// Mirrors initializeToolTextSections() in main.js: textContent fields are
// escaped, while prose/answers are inserted as raw HTML exactly like the
// runtime innerHTML assignment does.
function renderToolTextSections(data, baseIndent = 12) {
  const out = [];
  for (const section of data.sections || []) {
    out.push('<section class="tool-text-section">');
    out.push(`    <h2><span class="section-icon">${escapeHtml(decodeEntities(section.icon))}</span>${escapeHtml(section.title)}</h2>`);
    out.push('    <div class="section-content">');
    if (section.intro) {
      out.push(`        <p>${escapeHtml(section.intro)}</p>`);
    }
    const items = section.steps || section.features;
    if (items && items.length) {
      out.push('        <ul class="features-list">');
      for (const item of items) {
        out.push('            <li class="feature-item">');
        out.push(`                <span class="feature-icon">${escapeHtml(decodeEntities(item.icon))}</span>`);
        out.push('                <div class="feature-text">');
        out.push(`                    <strong>${escapeHtml(item.title)}</strong>`);
        out.push(`                    <p>${escapeHtml(item.description)}</p>`);
        out.push('                </div>');
        out.push('            </li>');
      }
      out.push('        </ul>');
    }
    if (Array.isArray(section.content)) {
      for (const para of section.content) out.push(`        <p>${para}</p>`);
    }
    if (section.faqs && section.faqs.length) {
      out.push('        <div class="accordion-container">');
      for (const faq of section.faqs) {
        out.push('            <div class="accordion-item">');
        out.push('                <button class="accordion-header">');
        out.push(`                    <span class="accordion-icon">${escapeHtml(decodeEntities(faq.icon))}</span>`);
        out.push(`                    <strong>${escapeHtml(faq.question)}</strong>`);
        out.push('                    <span class="arrow-icon"></span>');
        out.push('                </button>');
        out.push('                <div class="accordion-content">');
        out.push(`                    <p>${faq.answer}</p>`);
        out.push('                </div>');
        out.push('            </div>');
      }
      out.push('        </div>');
    }
    out.push('    </div>');
    out.push('</section>');
  }
  return indentBlock(out.join('\n'), baseIndent);
}

const CATEGORY_LABEL = { Security: 'security', 'Text Tools': 'text', 'Image Tools': 'image', 'Data Tools': 'data' };

function buildFooterToolsNav(tools) {
  const cols = [];
  for (const category of Object.keys(CATEGORY_LABEL)) {
    const group = tools.filter(t => t.category === category);
    if (!group.length) continue;
    const links = group.map(t =>
      `            <li><a href="${t.htmlPath}">${escapeHtml(t.name)}</a></li>`).join('\n');
    cols.push(`    <div class="footer-tools-col">
        <h3>${CATEGORY_LABEL[category]}</h3>
        <ul>
${links}
        </ul>
    </div>`);
  }
  return [
    '<nav class="footer-tools" aria-label="All ToolThump tools">',
    ...cols,
    '</nav>',
    '<p class="footer-tagline">100% free &middot; no sign-up &middot; every tool runs entirely in your browser.</p>'
  ].join('\n');
}

function inlineIncludes(html, tool, tools) {
  let inlined = 0;

  /* header */
  if (/<header[^>]*data-include=["']header["'][^>]*>\s*<\/header>/i.test(html)) {
    const content = read('_includes/header.html');
    html = html.replace(
      /<header[^>]*data-include=["']header["'][^>]*>\s*<\/header>/i,
      () => `<header data-include="header" data-static="header" class="terminal-header">\n${indentBlock(content, 4)}\n    </header>`
    );
    if (!html.includes('/_includes/header.css')) {
      html = html.replace(/<\/head>/i, () =>
        '    <link rel="stylesheet" href="/_includes/header.css">\n\n</head>');
    }
    inlined++;
  }

  /* footer (+ crawlable tool directory) */
  if (/<footer[^>]*data-include=["']footer["'][^>]*>\s*<\/footer>/i.test(html)) {
    const content = read('_includes/footer.html')
      .replace('<!--TOOLLINKS-->', () => indentBlock(buildFooterToolsNav(tools), 0));
    html = html.replace(
      /<footer[^>]*data-include=["']footer["'][^>]*>\s*<\/footer>/i,
      () => `<footer data-include="footer" data-static="footer">\n${indentBlock(content, 4)}\n    </footer>`
    );
    inlined++;
  }

  /* tool text sections: render the JSON island into the container */
  const ttRe = /<div[^>]*data-include=["']tool-text-section["'][^>]*>\s*<\/div>/i;
  if (ttRe.test(html)) {
    const data = extractTextData(html);
    if (!data) {
      console.warn('  ! data-include="tool-text-section" but no parsable #tool-text-data - leaving runtime fetch in place');
    } else {
      const include = read('_includes/tool-text-section.html').replace(
        '<div id="tool-text-sections-container"></div>',
        () => `<div id="tool-text-sections-container" data-static="true">\n${renderToolTextSections(data, 8)}\n    </div>`
      );
      html = html.replace(ttRe, () => indentBlock(include, 8));
      inlined++;
    }
  }

  return { html, inlined };
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

  /* 1. structured data + social images + static includes per tool page */
  for (const tool of tools) {
    const rel = tool.htmlPath.replace(/^\//, '');
    process.stdout.write(`${rel} ... `);
    try {
      let html = read(rel);

      const inc = inlineIncludes(html, tool, tools);
      html = inc.html;

      const res = fixSocialImage(html, `${SITE}/icons/${tool.id}.png`);
      html = res.html;

      html = injectSchema(html, tool);

      write(rel, html);
      const hasFaq = extractFaqs(read(rel)) ? '+FAQ' : '';
      console.log(`ok (${inc.inlined} includes, ${res.fixed} image metas, schema refreshed ${hasFaq})`);
    } catch (e) {
      console.log(`FAILED: ${e.message}`);
      exitCode = 1;
    }
  }

  /* 1b. static includes for non-tool pages */
  for (const rel of ['index.html', 'pages/about.html', 'pages/privacy.html']) {
    if (!fs.existsSync(path.join(ROOT, rel))) continue;
    process.stdout.write(`${rel} ... `);
    try {
      const before = read(rel);
      const inc = inlineIncludes(before, null, tools);
      write(rel, inc.html);
      console.log(`ok (${inc.inlined} includes inlined)`);
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

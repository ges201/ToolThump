// =================================================================
// UTILITIES
// =================================================================

const $ = (s, p = document) => p.querySelector(s);
const $$ = (s, p = document) => p.querySelectorAll(s);
const attr = (el, a, v) => v !== undefined ? el.setAttribute(a, v) : el.getAttribute(a);

async function fetchContent(url) {
    try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return await res.text();
    } catch (e) {
        console.error(`Error loading ${url}:`, e);
        return null;
    }
}

// =================================================================
// TERMINAL WINDOW CHROME
// =================================================================

function buildTerminalChrome() {
    const body = document.body;
    const children = [...body.children];

    const win = document.createElement('div');
    win.className = 'terminal-window';

    const titlebar = document.createElement('div');
    titlebar.className = 'terminal-titlebar';
    titlebar.innerHTML = `
        <span class="terminal-dots">
            <span class="dot-close"></span>
            <span class="dot-min"></span>
            <span class="dot-max"></span>
        </span>
        <span class="terminal-title">toolthump — bash — 80×24</span>
        <span></span>
    `;

    const tbody = document.createElement('div');
    tbody.className = 'terminal-body';

    win.appendChild(titlebar);
    win.appendChild(tbody);
    body.appendChild(win);

    children.forEach(child => {
        if (child.tagName === 'SCRIPT' || child.classList.contains('terminal-window')) return;
        tbody.appendChild(child);
    });
}

// =================================================================
// DYNAMIC CONTENT LOADING
// =================================================================

async function loadIncludes() {
    const promises = [...$$('[data-include]')].map(async el => {
        // Content already present (inlined by build.js at build time).
        if (el.hasAttribute('data-static')) return;

        const name = el.dataset.include;
        const content = await fetchContent(`/_includes/${name}.html`);

        if (content) {
            if (name === 'header') {
                const link = document.createElement('link');
                link.rel = 'stylesheet';
                link.href = '/_includes/header.css';
                document.head.appendChild(link);
                el.innerHTML = content;
                el.className = 'terminal-header';
            } else {
                el.innerHTML = content;
            }
        } else {
            el.innerHTML = `<p style='color:var(--red);text-align:center;padding:1em'>Error loading '${name}'</p>`;
        }
    });
    await Promise.all(promises);
}

// =================================================================
// HEADER & NAVIGATION
// =================================================================

function setupHeader() {
    const header = $('.terminal-header');
    if (!header) return;

    const closeDropdowns = (except) => {
        $$('.category-button[aria-expanded="true"]', header).forEach(btn => {
            if (btn !== except) {
                attr(btn, 'aria-expanded', 'false');
                $('#' + attr(btn, 'aria-controls'))?.classList.remove('show');
            }
        });
    };

    $$('.category-button', header).forEach(btn => {
        btn.addEventListener('click', e => {
            e.stopPropagation();
            const expanded = attr(btn, 'aria-expanded') === 'true';
            closeDropdowns(btn);
            attr(btn, 'aria-expanded', !expanded);
            $('#' + attr(btn, 'aria-controls'))?.classList.toggle('show', !expanded);
        });
    });

    document.addEventListener('click', e => !header.contains(e.target) && closeDropdowns());

    $$('.dropdown-menu', header).forEach(m => m.addEventListener('click', e => e.stopPropagation()));

    const currentPath = location.pathname.replace(/\/index\.html$/, '/');
    $$('.tool-link', header).forEach(link => {
        if (new URL(link.href).pathname.replace(/\/index\.html$/, '/') === currentPath) {
            link.classList.add('active-link');
        }
    });
}

// =================================================================
// BLINKING CURSOR ON INPUTS
// =================================================================

function addBlinkingCursor() {
    const style = document.createElement('style');
    style.textContent = `
        @keyframes cursor-blink { 0%,100%{opacity:1} 50%{opacity:0} }
        input:focus, textarea:focus { caret-color: var(--fg); }
        input[type="search"]:focus::placeholder, input:focus::placeholder { animation: cursor-blink 1s step-end infinite; }
    `;
    document.head.appendChild(style);
}

// =================================================================
// TOOL TEXT SECTIONS
// =================================================================

function decodeEntities(str) {
    const el = document.createElement('span');
    el.innerHTML = str;
    return el.textContent;
}

function initializeToolTextSections() {
    const container = $('#tool-text-sections-container');
    if (!container) return;

    const wireAccordions = () => {
        $$('.accordion-header').forEach(h => {
            h.addEventListener('click', () => {
                const content = h.nextElementSibling;
                const opening = !h.classList.contains('active');
                $$('.accordion-header').forEach(other => {
                    if (other !== h) {
                        other.classList.remove('active');
                        other.nextElementSibling.style.maxHeight = null;
                    }
                });
                h.classList.toggle('active', opening);
                content.style.maxHeight = opening ? content.scrollHeight + 'px' : null;
            });
        });
    };

    // Sections were rendered at build time (static HTML) - only the
    // accordion behavior needs wiring.
    if (container.children.length > 0) {
        wireAccordions();
        return;
    }

    const data = $('#tool-text-data');
    if (!data) return;

    const templates = {
        section: $('#template-section'),
        feature: $('#template-feature-item'),
        faq: $('#template-faq-item')
    };

    if (!Object.values(templates).every(t => t)) return;

    try {
        const toolData = JSON.parse(data.textContent);

        toolData.sections.forEach(section => {
            const clone = templates.section.content.cloneNode(true);
            const h2 = $('h2', clone);
            const content = $('.section-content', clone);

            $('.section-icon', h2).textContent = decodeEntities(section.icon);
            h2.append(section.title);

            section.intro && content.appendChild(Object.assign(document.createElement('p'), { textContent: section.intro }));

            const items = section.steps || section.features;
            if (items) {
                const list = Object.assign(document.createElement('ul'), { className: 'features-list' });
                items.forEach(item => {
                    const itemClone = templates.feature.content.cloneNode(true);
                    $('.feature-icon', itemClone).textContent = decodeEntities(item.icon);
                    $('strong', itemClone).textContent = item.title;
                    $('p', itemClone).textContent = item.description;
                    list.appendChild(itemClone);
                });
                content.appendChild(list);
            }

            section.content?.forEach(text => {
                content.appendChild(Object.assign(document.createElement('p'), { innerHTML: text }));
            });

            if (section.faqs) {
                const accordion = Object.assign(document.createElement('div'), { className: 'accordion-container' });
                section.faqs.forEach(faq => {
                    const faqClone = templates.faq.content.cloneNode(true);
                    $('.accordion-icon', faqClone).textContent = decodeEntities(faq.icon);
                    $('strong', faqClone).textContent = faq.question;
                    $('.accordion-content p', faqClone).innerHTML = faq.answer;
                    accordion.appendChild(faqClone);
                });
                content.appendChild(accordion);
            }
            container.appendChild(clone);
        });
    } catch (e) {
        console.error("Error parsing tool text data:", e);
    }

    wireAccordions();
}

// =================================================================
// SVG UTILITIES
// =================================================================

const svgCache = {};
async function inlineSvgImages() {
    for (const img of $$('img.theme-icon-svg')) {
        if (!svgCache[img.src]) {
            const content = await fetchContent(img.src);
            if (content) svgCache[img.src] = content;
        }
        if (svgCache[img.src]) {
            const div = document.createElement('div');
            div.innerHTML = svgCache[img.src];
            const svg = $('svg', div);
            if (svg) {
                ['class', 'id', 'alt'].forEach(a => img.hasAttribute(a) && attr(svg, a, attr(img, a)));
                img.replaceWith(svg);
            }
        }
    }
}

// =================================================================
// THEME MANAGEMENT
// =================================================================

const THEME_KEY = 'toolthump-theme';

function applyTheme(theme) {
    const isDark = theme === 'dark';
    attr(document.documentElement, 'data-theme', theme);
    localStorage.setItem(THEME_KEY, theme);

    const toggle = $('#theme-toggle');
    const sun = $('#theme-icon-sun');
    const moon = $('#theme-icon-moon');

    const themeName = isDark ? 'green' : 'amber';
    toggle && attr(toggle, 'aria-label', `Switch to ${isDark ? 'amber' : 'green'} theme`);

    const titleEl = $('.terminal-title');
    if (titleEl) titleEl.textContent = `toolthump — ${themeName} — 80×24`;

    sun?.classList.toggle('hidden', isDark);
    moon?.classList.toggle('hidden', !isDark);
}

function initializeTheme() {
    const saved = localStorage.getItem(THEME_KEY);
    const theme = saved || (matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
    applyTheme(theme);

    const toggle = $('#theme-toggle');
    toggle?.addEventListener('click', () => {
        applyTheme(attr(document.documentElement, 'data-theme') === 'dark' ? 'light' : 'dark');
    });
}

// =================================================================
// ASCII LOGO
// =================================================================

async function loadAsciiLogo() {
    const el = $('[data-ascii-logo]');
    if (!el) return;
    const logo = await fetchContent('/ASCII_logo.txt');
    if (logo) el.textContent = logo.trimEnd();
}

// =================================================================
// INITIALIZATION
// =================================================================

buildTerminalChrome();
initializeTheme();

document.addEventListener('DOMContentLoaded', async () => {
    await loadIncludes();
    await inlineSvgImages();
    setupHeader();
    $('#current-year') && ($('#current-year').textContent = new Date().getFullYear());
    initializeTheme();
    initializeToolTextSections();
    addBlinkingCursor();
    loadAsciiLogo();
    window.initializeTool?.();
    document.body.style.opacity = '1';
});

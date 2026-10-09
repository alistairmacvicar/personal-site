import { readFile, writeFile, mkdir, cp, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';

export const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const categories = { work: 'Work', research: 'Research', project: 'Projects', education: 'Education', talk: 'Talks' };
export const escape = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export function validate(data) {
  if (!data.profile?.name || !Array.isArray(data.entries) || !data.entries.length) throw Error('A profile and at least one entry are required.');
  const ids = new Set();
  const url = value => { const parsed = new URL(value); if (!['https:', 'http:'].includes(parsed.protocol)) throw Error(`Unsupported URL: ${value}`); };
  for (const entry of data.entries) {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(entry.id) || ids.has(entry.id)) throw Error(`Invalid or duplicate entry ID: ${entry.id}`);
    ids.add(entry.id);
    if (!(entry.kind in categories)) throw Error(`Unknown category: ${entry.kind}`);
    if (entry.categories && (!Array.isArray(entry.categories) || !entry.categories.includes(entry.kind) || entry.categories.some(kind => !(kind in categories)))) throw Error(`Invalid categories: ${entry.id}`);
    if (entry.year !== null && (!Number.isInteger(entry.year) || entry.year < 1900 || entry.year > 2200)) throw Error(`Invalid year: ${entry.id}`);
    for (const key of ['date', 'title', 'organisation', 'summary']) if (typeof entry[key] !== 'string' || !entry[key].trim()) throw Error(`Missing ${key}: ${entry.id}`);
    for (const key of ['body', 'highlights', 'tags']) if (!Array.isArray(entry[key]) || entry[key].some(value => typeof value !== 'string')) throw Error(`Invalid ${key}: ${entry.id}`);
    if (!Array.isArray(entry.links)) throw Error(`Missing links: ${entry.id}`);
    for (const link of entry.links) { if (!link.label) throw Error('A link needs a label.'); url(link.url); }
  }
  for (const key of ['github', 'linkedin', 'orcid', 'youtube', 'website']) if (data.profile[key]) url(data.profile[key]);
  if (data.profile.resumePdf && !/^\/[a-zA-Z0-9_./-]+\.pdf$/.test(data.profile.resumePdf)) throw Error('resumePdf must be a local PDF path, e.g. /resume.pdf');
  if (data.profile.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.profile.email)) throw Error('Invalid email');
  if (data.personal && (!Array.isArray(data.personal.entries) || data.personal.entries.some(entry => !entry.title || typeof entry.description !== 'string'))) throw Error('Personal entries need a title and description.');
  return data;
}

const tag = (text, cls = '') => `<span class="tag ${cls}">${escape(text)}</span>`;
const link = item => `<a class="button external" href="${escape(item.url)}" target="_blank" rel="noopener noreferrer">${escape(item.label)}<span class="sr-only"> (opens in a new tab)</span></a>`;
const paragraphs = values => values.map(text => `<p>${escape(text)}</p>`).join('');

function detail(entry) {
  return `<div class="entry-content" data-kind="${entry.kind}">
    <div class="detail-meta">${tag(categories[entry.kind], entry.kind)}<span>${escape(entry.date)}</span></div>
    <h3>${escape(entry.title)}</h3><p class="detail-org">${escape(entry.organisation)}</p>
    ${entry.label ? `<span class="status-label">${escape(entry.label)}</span>` : ''}
    <div class="detail-body">${paragraphs(entry.body)}</div>
    ${entry.highlights.length ? `<ul class="highlights">${entry.highlights.map(value => `<li>${escape(value)}</li>`).join('')}</ul>` : ''}
    <div class="tags">${entry.tags.map(value => tag(value)).join('')}</div>
    ${entry.links.length ? `<div class="detail-actions">${entry.links.map(link).join('')}</div>` : ''}
    ${entry.citation ? `<details class="citation"><summary>Citation</summary><p>${escape(entry.citation)}</p><button type="button" class="text-button copy-citation" data-copy-citation>Copy citation</button></details>` : ''}
  </div>`;
}

function card(entry) {
  return `<details class="entry ${entry.kind}" id="entry-${entry.id}" data-entry="${entry.id}" data-kind="${entry.kind}" data-categories="${(entry.categories || [entry.kind]).join(' ')}">
    <summary><span class="entry-top">${tag(categories[entry.kind], entry.kind)}<span class="entry-date">${escape(entry.date)}</span></span>
      <span class="entry-title">${escape(entry.title)}</span><span class="entry-org">${escape(entry.organisation)}</span>
      <span class="entry-summary">${escape(entry.summary)}</span><span class="entry-open"><span class="open-label">View details</span><span class="plus" aria-hidden="true">+</span></span>
    </summary>${detail(entry)}
  </details>`;
}

function resume(data) {
  const { profile, entries } = data;
  return `<header class="resume-heading"><p class="eyebrow">Résumé</p><h1>${escape(profile.name)}</h1><p>${escape(profile.title)}</p><p>${profile.email ? escape(profile.email) + ' · ' : ''}${escape(profile.github)}</p></header>
    ${['work', 'education', 'research', 'project', 'talk'].map(kind => {
      const selected = entries.filter(entry => entry.resume && entry.kind === kind);
      return selected.length ? `<section class="resume-section"><h2>${categories[kind] === 'Research' ? 'Publications' : categories[kind]}</h2>${selected.map(entry => `<article><div class="resume-entry-heading"><h3>${escape(entry.title)}</h3><span>${escape(entry.date)}</span></div><p class="resume-org">${escape(entry.organisation)}</p><p>${escape(entry.summary)}</p>${entry.highlights.length ? `<ul>${entry.highlights.map(v => `<li>${escape(v)}</li>`).join('')}</ul>` : ''}${entry.links.map(l => `<p class="resume-url"><a href="${escape(l.url)}">${escape(l.url)}</a></p>`).join('')}</article>`).join('')}</section>` : '';
    }).join('')}`;
}

export async function build() {
  const data = validate(JSON.parse(await readFile(resolve(root, 'content/portfolio.json'), 'utf8')));
  const { profile } = data;
  const entries = [...data.entries].sort((a, b) => (b.year ?? -1) - (a.year ?? -1));
  const groups = [...new Set(entries.map(entry => entry.year))];
  const timeline = groups.map(year => `<section class="year-group" data-year-group><h3 class="year-label">${year ?? 'Other'}</h3><div class="year-entries">${entries.filter(entry => entry.year === year).map(card).join('')}</div></section>`).join('');
  const html = await readFile(resolve(root, 'src/index.html'), 'utf8');
  const personal = data.personal?.entries.length ? `<div class="personal-grid">${data.personal.entries.map(entry => `<article class="personal-card"><h3>${escape(entry.title)}</h3><p>${escape(entry.description)}</p></article>`).join('')}</div>` : '<div class="personal-empty"><p>Hobbies &amp; personal life</p><span>Coming soon.</span></div>';
  const linkItems = [
    { name: 'Email', symbol: '@', css: 'email', url: `mailto:${profile.email}`, caption: profile.email },
    { name: 'GitHub', symbol: '{ }', css: 'github', url: profile.github, caption: 'Code & projects' },
    { name: 'LinkedIn', symbol: 'in', css: 'linkedin', url: profile.linkedin, caption: 'Profile' },
    { name: 'ORCID', symbol: 'iD', css: 'orcid', url: profile.orcid, caption: 'Research record' },
    { name: 'YouTube', symbol: '▶', css: 'youtube', url: profile.youtube, caption: 'Videos' }
  ];
  const links = linkItems.filter(item => item.url).map(item => `<a class="link-card ${item.css}-card" href="${escape(item.url)}"${item.css === 'email' ? '' : ' target="_blank" rel="noopener noreferrer"'}><span class="link-symbol" aria-hidden="true">${escape(item.symbol)}</span><span class="link-name">${item.name}</span><span class="link-caption">${escape(item.caption)}</span>${item.css === 'email' ? '' : '<span class="sr-only"> (opens in a new tab)</span>'}</a>`).join('');
  const replacements = {
    NAME: escape(profile.name), TITLE: escape(profile.title), INTRO: escape(profile.intro),
    TIMELINE: timeline, RESUME: resume({ ...data, entries }), PERSONAL: personal, LINKS: links, EMAIL: escape(profile.email),
    COUNT: String(entries.length), INTERESTS: profile.interests.map(value => `<li>${escape(value)}</li>`).join(''),
    GITHUB: escape(profile.github), RESUME_URL: escape(profile.resumePdf || 'resume.html'),
    CANONICAL: profile.website ? `<link rel="canonical" href="${escape(profile.website)}">` : ''
  };
  const output = html.replace(/\{\{([A-Z_]+)\}\}/g, (_, key) => { if (!(key in replacements)) throw Error(`Unknown template token: ${key}`); return replacements[key]; });
  await rm(resolve(root, 'dist'), { recursive: true, force: true });
  await mkdir(resolve(root, 'dist'), { recursive: true });
  await cp(resolve(root, 'public'), resolve(root, 'dist'), { recursive: true });
  await writeFile(resolve(root, 'dist/index.html'), output);
  await cp(resolve(root, 'src/styles.css'), resolve(root, 'dist/styles.css'));
  await cp(resolve(root, 'src/app.js'), resolve(root, 'dist/app.js'));
  await cp(resolve(root, 'src/contact.mjs'), resolve(root, 'dist/contact.mjs'));
  const resumePage = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Résumé · ${escape(profile.name)}</title><link rel="icon" href="favicon.svg"><link rel="stylesheet" href="styles.css"><script src="resume.js" defer></script></head><body class="resume-page"><nav class="resume-nav"><a class="button" href="./">Back to portfolio</a><button class="button lime" id="print-resume" type="button">Print / save PDF</button></nav><main class="resume-document">${replacements.RESUME}</main></body></html>`;
  await writeFile(resolve(root, 'dist/resume.html'), resumePage);
  await writeFile(resolve(root, 'dist/resume.js'), "document.getElementById('print-resume').addEventListener('click', () => window.print());\n");
  console.log(`Built ${entries.length} entries. Static output: dist/`);
  return output;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await build();

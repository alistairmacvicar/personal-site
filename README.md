# Alistair’s portfolio

A static portfolio with neo-brutalist styling, a category-filtered timeline, selectable details, publication citations, a printable résumé, a personal section, and a direct-submission contact form. No CMS, database, framework, external font, or runtime dependency.

## Run

Use Node.js 22 or later. There is nothing to install.

```sh
npm run dev
```

Open http://localhost:4173. Run `npm run dev` again after editing source or content. `npm run build` writes the deployable site to `dist/`. `npm run check` checks content validation and static rendering.

## Edit the content

Everything lives in `content/portfolio.json`. You can edit this file directly in GitHub on your phone.

- Edit the `profile` to change the intro and contact email. Set `website` to your final HTTPS domain to emit a canonical URL.
- Add, delete, or edit objects in `entries`. Entries are sorted by year, newest first. `year: null` puts an entry under “Other”, avoiding invented project dates.
- Keep each `id` unique and stable: shared entry URLs use `#entry-your-id`.
- Use `kind`: `work`, `research`, `project`, `education`, or `talk`.
- Optional `categories` allows an entry to appear in several filters, e.g. `["project", "research"]`. Include its primary `kind`.
- `body` is an array of plain-text paragraphs. `highlights`, `tags`, and `links` can be empty arrays. Text is escaped at build time.
- `resume: true` includes an entry in the generated résumé.
- Add a `citation` string to show a collapsible citation with a copy button.
- Fill `personal.entries` with objects containing `title` and `description` to add hobbies or personal-life entries to “Outside work”. An empty array shows a “Coming soon” placeholder. For example: `{"title": "Photography", "description": "Your description here."}`. No hobbies have been invented for the initial content.
- To use your own résumé PDF, put it in `public/resume.pdf` and set `profile.resumePdf` to `/resume.pdf`. Otherwise the links open the generated résumé, with a Print / save PDF button. The generated résumé may run to multiple pages; it is not a recreation of your original one-page CV.

Example:

```json
{
  "id": "new-project",
  "year": 2026,
  "date": "2026",
  "kind": "project",
  "title": "A new project",
  "organisation": "Personal project",
  "summary": "One sentence about what it does.",
  "body": ["What you built and why."],
  "highlights": ["One concrete outcome"],
  "tags": ["TypeScript"],
  "links": [{"label": "View the source", "url": "https://github.com/your-name/your-project"}],
  "resume": false
}
```

## Contact form

Submit sends the visitor’s message to FormSubmit for forwarding to `profile.email`, currently Alistair.macvicar@protonmail.com. The optional **Open email draft** button opens their email app instead. JavaScript submissions stay on the page; native POST is the no-JavaScript fallback. The form uses a honeypot, validates fields, prevents simultaneous requests, and preserves the message on errors. In-page submissions use FormSubmit’s AJAX endpoint with CAPTCHA disabled; native submissions retain the provider’s default CAPTCHA.

**Activate before sharing:** submit once from the deployed site, then confirm FormSubmit’s activation email in your ProtonMail inbox. Until confirmation, delivery is not enabled. Check spam if needed. The activation email cannot be confirmed by the site itself. Once activated, submit another message to verify delivery. A new deployment domain may require confirmation again.

FormSubmit is an external service; submissions are processed by it and its documentation says it retains submissions for 30 days. See https://formsubmit.co/documentation. No email API key is needed. Service acceptance is shown as “Message submitted”; inbox delivery is not independently verified. Provider/network failures show an error and the email-draft option remains available.

## Links and motion

Email, GitHub, LinkedIn, ORCID, and YouTube links use the profile settings. Blank links are omitted.

Short viewport-entry fades, hover movements, and timeline detail transitions use native browser APIs and CSS. They respect reduced-motion settings. Content remains visible if animations or JavaScript are unavailable.

## Deploy to Vercel

1. Create a new GitHub repository and upload these files at its root. Keep the old repository separate.
2. In Vercel, import the new repository using a personal account. Use the Hobby plan for a personal, non-commercial portfolio.
3. Framework preset: **Other**. Build command: **npm run build**. Output directory: **dist**. These settings are also supplied in `vercel.json`.
4. Deploy. Future commits rebuild the site automatically. No environment variables, database, or backend service is required.

The output also works with other static hosts. Hosting plan terms and quotas can change; see https://vercel.com/docs/plans/hobby. A custom domain is optional and purchased separately.

## Content to review before publishing

Content combines the original portfolio, supplied résumés, public GitHub source, Flinders’ Cave project record, and ORCID-linked publication records. Raw résumés and private contact details are excluded.

- Confirm whether Tech Lead (from 2024), Research Assistant, and Academic Tutor (from 2023) are still current; add end dates as needed.
- Confirm the current title, authors, status, and link for “Coordinating Multi-LLM Interactions” before adding it as a publication.
- Add project dates where known. Undated repositories are deliberately listed under “Other”.
- Fill in hobbies and personal interests when ready.
- The solar forecasting entry is a preprint; its July and August records are treated as versions of one work.
- Vehicle telemetry is described as a prototype with simulated data. Planned features in project READMEs are not presented as finished features.

Sources: https://github.com/alistairmacvicar/next-portfolio; public project repositories linked from each entry; https://researchnow.flinders.edu.au/en/publications/welcome-to-the-cave/; https://orcid.org/0009-0002-3829-2347; https://doi.org/10.1016/j.patrec.2025.01.008; https://doi.org/10.2139/ssrn.7369951; privately supplied résumés.

## Structure

```text
content/portfolio.json   All editable content
src/index.html           Page layout
src/styles.css           Theme, responsive layout, print styles
src/app.js               Timeline filters, detail panel, mobile dialog
src/contact.mjs          Direct submissions and email drafts
public/                  Static files and optional résumé PDF
scripts/build.mjs        Validates content and renders static HTML
scripts/serve.mjs        Dependency-free development server
scripts/check.test.mjs   Content and build checks
vercel.json              Static deployment settings
```

Timeline content is rendered into HTML during the build, so search engines and visitors without JavaScript can read it. Without JavaScript, each card expands using native HTML details. Desktop selection opens a sticky panel; mobile selection opens a native dialog with keyboard focus handling. Motion respects the system’s reduced-motion setting. No analytics, cookies, or tracking are included.

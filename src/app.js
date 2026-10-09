import { emailDraftUrl, submitContact } from './contact.mjs';

(() => {
  const entries = [...document.querySelectorAll('[data-entry]')];
  const filters = [...document.querySelectorAll('[data-filter]')];
  const panel = document.getElementById('detail-slot');
  const dialog = document.getElementById('detail-dialog');
  const mobilePanel = document.getElementById('mobile-detail-slot');
  const narrow = window.matchMedia('(max-width: 850px)');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let selected = null;
  let filter = 'all';
  let lastTrigger = null;
  let resizeFrame;
  const inCategory = (entry, kind) => (entry.dataset.categories || entry.dataset.kind).split(' ').includes(kind);

  function syncUrl() {
    const url = new URL(location.href);
    if (filter === 'all') url.searchParams.delete('category');
    else url.searchParams.set('category', filter);
    url.hash = selected ? selected.id : 'timeline';
    if (url.href !== location.href) history.pushState(null, '', url);
  }

  function closeDialog() {
    if (dialog.open) dialog.close();
  }

  function select(entry, { openMobile = false, updateHash = true } = {}) {
    if (!entry) return;
    selected = entry;
    for (const item of entries) {
      const active = item === entry;
      item.classList.toggle('selected', active);
      const summary = item.querySelector('summary');
      summary.setAttribute('aria-expanded', String(active && (!narrow.matches || openMobile || dialog.open)));
      summary.setAttribute('aria-controls', narrow.matches ? 'detail-dialog' : 'detail-slot');
      item.querySelector('.open-label').textContent = active ? 'Selected' : 'View details';
    }
    const content = entry.querySelector('.entry-content');
    panel.replaceChildren(content.cloneNode(true));
    mobilePanel.replaceChildren(content.cloneNode(true));
    if (!reducedMotion.matches) {
      const activePanel = narrow.matches ? mobilePanel : panel;
      activePanel.getAnimations().forEach(animation => animation.cancel());
      activePanel.animate([{ opacity: .35, transform: 'translateY(5px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 160, easing: 'ease-out' });
    }
    const visible = entries.filter(item => !item.hidden);
    document.querySelector('.panel-index').textContent = String(Math.max(1, visible.indexOf(entry) + 1)).padStart(2, '0');
    if (updateHash) syncUrl();
    if (narrow.matches && openMobile && !dialog.open) {
      dialog.showModal();
      dialog.scrollTop = 0;
    }
  }

  function applyFilter(kind, updateSelection = true) {
    filter = kind;
    for (const button of filters) button.setAttribute('aria-pressed', String(button.dataset.filter === kind));
    for (const entry of entries) entry.hidden = kind !== 'all' && !inCategory(entry, kind);
    for (const group of document.querySelectorAll('[data-year-group]')) group.hidden = ![...group.querySelectorAll('[data-entry]')].some(entry => !entry.hidden);
    const visible = entries.filter(entry => !entry.hidden);
    document.getElementById('result-count').textContent = String(visible.length);
    if (!visible.length) {
      selected = null;
      closeDialog();
      const empty = document.createElement('p');
      empty.className = 'empty-detail';
      empty.textContent = 'No entries in this category yet.';
      panel.replaceChildren(empty);
      mobilePanel.replaceChildren();
    }
    else if (updateSelection && (!selected || selected.hidden)) select(visible[0], { updateHash: false });
    else if (selected) select(selected, { updateHash: false });
  }

  function readRoute(openMobile) {
    const category = new URL(location.href).searchParams.get('category') || 'all';
    applyFilter(filters.some(button => button.dataset.filter === category) ? category : 'all', false);
    const target = entries.find(entry => `#${entry.id}` === location.hash);
    if (!target) {
      closeDialog();
      select(entries.find(entry => !entry.hidden), { updateHash: false });
      return;
    }
    if (filter !== 'all' && !inCategory(target, filter)) applyFilter('all', false);
    select(target, { openMobile, updateHash: false });
  }

  for (const entry of entries) {
    const summary = entry.querySelector('summary');
    // Enhanced summaries act as selectors; native details remains the no-JS fallback.
    summary.addEventListener('click', event => {
      event.preventDefault();
      lastTrigger = summary;
      select(entry, { openMobile: true });
    });
  }
  for (const button of filters) button.addEventListener('click', () => {
    closeDialog();
    applyFilter(button.dataset.filter);
    syncUrl();
  });
  document.getElementById('close-dialog').addEventListener('click', closeDialog);
  dialog.addEventListener('close', () => {
    if (narrow.matches) for (const entry of entries) entry.querySelector('summary').setAttribute('aria-expanded', 'false');
    if (lastTrigger?.isConnected) lastTrigger.focus({ preventScroll: true });
  });
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const bounds = dialog.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) closeDialog();
  });
  document.addEventListener('click', async event => {
    const button = event.target.closest('[data-copy-citation]');
    if (!button) return;
    const citation = button.closest('.citation').querySelector('p').textContent;
    try {
      await navigator.clipboard.writeText(citation);
      button.textContent = 'Copied';
      document.getElementById('announcement').textContent = 'Citation copied to clipboard.';
    } catch {
      button.textContent = 'Select the citation to copy';
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(button.closest('.citation').querySelector('p'));
      selection.removeAllRanges();
      selection.addRange(range);
    }
  });
  window.addEventListener('popstate', () => readRoute(true));
  window.addEventListener('hashchange', () => readRoute(true));
  narrow.addEventListener('change', () => {
    cancelAnimationFrame(resizeFrame);
    resizeFrame = requestAnimationFrame(() => {
      if (!narrow.matches) closeDialog();
      if (selected) select(selected, { updateHash: false });
    });
  });
  document.documentElement.classList.add('enhanced');
  for (const element of document.querySelectorAll('[data-enhanced]')) element.hidden = false;
  readRoute(true);

  if (!reducedMotion.matches && 'IntersectionObserver' in window) {
    const observer = new IntersectionObserver(items => {
      for (const item of items) {
        if (!item.isIntersecting) continue;
        item.target.animate([{ opacity: 0, transform: 'translateY(10px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 320, easing: 'cubic-bezier(.2,.7,.2,1)' });
        observer.unobserve(item.target);
      }
    }, { threshold: .12 });
    const targets = document.querySelectorAll('.intro-copy, .intro-side, .section-heading, .entry, .personal-empty, .personal-card, .link-card, .contact');
    for (const target of targets) observer.observe(target);
    reducedMotion.addEventListener('change', event => {
      if (event.matches) {
        observer.disconnect();
        for (const target of targets) target.getAnimations().forEach(animation => animation.cancel());
        panel.getAnimations().forEach(animation => animation.cancel());
        mobilePanel.getAnimations().forEach(animation => animation.cancel());
      }
    });
  }

  const form = document.getElementById('contact-form');
  const submitButton = document.getElementById('submit-contact');
  const status = document.getElementById('contact-status');
  let submitting = false;

  document.getElementById('open-email-draft').addEventListener('click', () => {
    const values = Object.fromEntries(new FormData(form));
    const draft = emailDraftUrl(form.dataset.email, values);
    const link = document.createElement('a');
    link.href = draft;
    link.hidden = true;
    document.body.append(link);
    link.click();
    link.remove();
    status.textContent = 'Send the draft in your email app. If it didn’t open, use the email address shown here.';
  });

  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (submitting || !form.reportValidity()) return;
    const values = Object.fromEntries(new FormData(form));
    if (['name', 'email', 'subject', 'message'].some(key => !String(values[key]).trim())) {
      status.textContent = 'Please complete each field.';
      return;
    }
    // The honeypot is deliberately excluded from required-field validation.
    if (values._honey) return;
    submitting = true;
    submitButton.disabled = true;
    submitButton.textContent = 'Submitting…';
    form.setAttribute('aria-busy', 'true');
    status.textContent = '';
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);
    try {
      const result = await submitContact(form.dataset.email, values, { signal: controller.signal });
      if (result.status === 'activation-required') {
        status.textContent = 'This form is awaiting activation. Please use Open email draft for now.';
      } else {
        status.textContent = 'Message submitted. Thank you.';
        // Preserve changes made while the request was in progress.
        const current = Object.fromEntries(new FormData(form));
        if (['name', 'email', 'subject', 'message'].every(key => current[key] === values[key])) form.reset();
      }
    } catch {
      status.textContent = 'Your submission wasn’t confirmed. Your message is still here; try again or choose Open email draft.';
    } finally {
      clearTimeout(timeout);
      submitting = false;
      submitButton.disabled = false;
      submitButton.textContent = 'Submit';
      form.removeAttribute('aria-busy');
    }
  });
})();

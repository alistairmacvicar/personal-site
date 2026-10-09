export function emailDraftUrl(recipient, { name, email, subject, message }) {
  const cleanSubject = String(subject).replace(/[\r\n]/g, ' ').trim();
  const body = `Name: ${String(name).trim()}\nEmail: ${String(email).trim()}\n\n${String(message).trim()}`;
  return `mailto:${recipient}?subject=${encodeURIComponent(cleanSubject)}&body=${encodeURIComponent(body)}`;
}

export async function submitContact(recipient, values, { fetchImpl = fetch, signal } = {}) {
  const payload = {
    name: String(values.name).trim(),
    email: String(values.email).trim(),
    subject: String(values.subject).trim(),
    message: String(values.message).trim(),
    _subject: `Portfolio: ${String(values.subject).replace(/[\r\n]/g, ' ').trim()}`,
    _template: 'table',
    _captcha: 'false',
    _honey: String(values._honey || '')
  };
  const response = await fetchImpl(`https://formsubmit.co/ajax/${encodeURIComponent(recipient)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(payload),
    signal
  });
  if (!response.ok) throw new Error('The form service did not accept the request.');
  const result = await response.json();
  if (typeof result.message === 'string' && /activat|confirm.*email|verify.*email/i.test(result.message)) return { status: 'activation-required' };
  if (result.success !== true && result.success !== 'true') throw new Error('Submission was not confirmed.');
  return { status: 'submitted' };
}

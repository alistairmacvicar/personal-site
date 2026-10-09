import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { validate, build, root } from './build.mjs';
import { emailDraftUrl, submitContact } from '../src/contact.mjs';

const data = JSON.parse(await readFile(resolve(root, 'content/portfolio.json'), 'utf8'));
test('Content changes reject duplicate IDs and executable links', () => {
  const duplicate = structuredClone(data);
  duplicate.entries.push(duplicate.entries[0]);
  assert.throws(() => validate(duplicate), /duplicate/);
  const unsafe = structuredClone(data);
  unsafe.entries[0].links[0].url = 'javascript:alert(1)';
  assert.throws(() => validate(unsafe), /Unsupported URL/);
});

test('Direct submission sends the message and accepts only confirmed service responses', async () => {
  const values = {name: ' Alistair ', email: 'sender@example.com', subject: 'Hello', message: 'A message.'};
  let captured;
  const fakeFetch = async (url, options) => {
    captured = {url, options};
    return {ok: true, json: async () => ({success: 'true', message: 'The form was submitted successfully.'})};
  };
  assert.deepEqual(await submitContact('Alistair.macvicar@protonmail.com', values, {fetchImpl: fakeFetch}), {status: 'submitted'});
  assert.equal(captured.url, 'https://formsubmit.co/ajax/Alistair.macvicar%40protonmail.com');
  const payload = JSON.parse(captured.options.body);
  assert.equal(payload.name, 'Alistair');
  assert.equal(payload.email, values.email);
  assert.equal(payload.message, values.message);
  assert.equal(payload._subject, 'Portfolio: Hello');
  assert.deepEqual(await submitContact('a@example.com', values, {fetchImpl: async () => ({ok: true, json: async () => ({success: 'true', message: 'Please activate your form.'})})}), {status: 'activation-required'});
  for (const result of [{ok: false}, {ok: true, json: async () => ({success: 'false'})}, {ok: true, json: async () => ({})}]) {
    await assert.rejects(submitContact('a@example.com', values, {fetchImpl: async () => result}));
  }
  await assert.rejects(submitContact('a@example.com', values, {fetchImpl: async () => {throw Error('Network failure');}}));
});
test('Build escapes editable text and includes every entry without client-side rendering', async () => {
  const output = await build();
  for (const entry of data.entries) assert.ok(output.includes(`id="entry-${entry.id}"`));
  assert.ok(!/\{\{[A-Z_]+\}\}/.test(output));
  const resume = await readFile(resolve(root, 'dist/resume.html'), 'utf8');
  assert.ok(resume.includes('Alistair Macvicar'));
  assert.ok(resume.includes('Print / save PDF'));
  assert.ok(output.includes('Outside work'));
  assert.ok(output.includes('data-filter="research"'));
  assert.ok(output.includes('data-email="Alistair.macvicar@protonmail.com"'));
  const { escape } = await import('./build.mjs');
  assert.equal(escape('<script>"&'), '&lt;script&gt;&quot;&amp;');
});
test('Email drafts preserve punctuation, Unicode, and line breaks without injecting mail headers', () => {
  const draft = emailDraftUrl('Alistair.macvicar@protonmail.com', {
    name: 'Zoë & Alex', email: 'person+work@example.com',
    subject: 'Question & idea?\r\nBcc: nobody@example.com',
    message: 'Hello!\nA + B = C? #yes'
  });
  const parsed = new URL(draft);
  assert.equal(parsed.pathname, 'Alistair.macvicar@protonmail.com');
  assert.equal(parsed.searchParams.get('subject'), 'Question & idea?  Bcc: nobody@example.com');
  assert.equal(parsed.searchParams.get('body'), 'Name: Zoë & Alex\nEmail: person+work@example.com\n\nHello!\nA + B = C? #yes');
  assert.equal(parsed.searchParams.get('bcc'), null);
});

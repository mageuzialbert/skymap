#!/usr/bin/env node
/**
 * Fails if the English and Swahili dictionaries have drifted apart.
 *
 * Every string in the app is reachable by a dotted key from one merged tree per
 * locale (see lib/i18n/index.tsx). A key that exists in only one locale is a
 * silent bug: t() falls back to English, so a Swahili user sees an English
 * sentence with no warning anywhere. This makes that a build failure instead.
 *
 * Usage: npm run i18n:check
 */

const fs = require('fs');
const path = require('path');

const I18N_DIR = path.join(__dirname, '..', 'lib', 'i18n');
const NS_DIR = path.join(I18N_DIR, 'ns');

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

/** Same deep merge the runtime uses, so this checks what ships. */
function deepMerge(...sources) {
  const out = {};
  for (const src of sources) {
    if (!src || typeof src !== 'object' || Array.isArray(src)) continue;
    for (const key of Object.keys(src)) {
      const v = src[key];
      out[key] =
        v && typeof v === 'object' && !Array.isArray(v) && out[key] && typeof out[key] === 'object'
          ? deepMerge(out[key], v)
          : v;
    }
  }
  return out;
}

function flatten(obj, prefix = '', acc = new Set()) {
  for (const [key, value] of Object.entries(obj)) {
    const full = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object' && !Array.isArray(value)) flatten(value, full, acc);
    else acc.add(full);
  }
  return acc;
}

function dictionaryFor(locale) {
  const namespaces = fs
    .readdirSync(NS_DIR)
    .filter((f) => f.endsWith(`.${locale}.json`))
    .sort()
    .map((f) => readJson(path.join(NS_DIR, f)));
  return deepMerge(readJson(path.join(I18N_DIR, `${locale}.json`)), ...namespaces);
}

const en = flatten(dictionaryFor('en'));
const sw = flatten(dictionaryFor('sw'));

const missingInSw = [...en].filter((k) => !sw.has(k)).sort();
const missingInEn = [...sw].filter((k) => !en.has(k)).sort();

if (missingInSw.length === 0 && missingInEn.length === 0) {
  console.log(`i18n: en and sw both define ${en.size} keys. In sync.`);
  process.exit(0);
}

if (missingInSw.length) {
  console.error(`\nMissing from Swahili (${missingInSw.length}):`);
  missingInSw.forEach((k) => console.error(`  ${k}`));
}
if (missingInEn.length) {
  console.error(`\nMissing from English (${missingInEn.length}):`);
  missingInEn.forEach((k) => console.error(`  ${k}`));
}
console.error('');
process.exit(1);

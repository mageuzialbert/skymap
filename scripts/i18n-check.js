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

const ROOT = path.join(__dirname, '..');
const I18N_DIR = path.join(ROOT, 'lib', 'i18n');
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

/**
 * Keys referenced by the code but defined in neither locale.
 *
 * Comparing en against sw cannot catch these: a key missing from *both* files
 * is perfectly "in sync", yet `t()` falls back to the raw key, so the screen
 * prints e.g. "admin.companyProfile.addressLabel" to the user. Only literal
 * t('a.b') calls are checked; keys built at runtime are skipped.
 */
function usedKeys() {
  const SRC = ['app', 'components', 'lib'];
  const found = new Map();
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (!/node_modules|\.next|\.git/.test(full)) walk(full);
      } else if (/\.tsx?$/.test(entry.name)) {
        const src = fs.readFileSync(full, 'utf8');
        for (const m of src.matchAll(/\bt\(\s*'([a-zA-Z0-9_]+(?:\.[a-zA-Z0-9_]+)+)'/g)) {
          if (!found.has(m[1])) found.set(m[1], path.relative(ROOT, full));
        }
      }
    }
  };
  SRC.forEach((d) => walk(path.join(ROOT, d)));
  return found;
}

const used = usedKeys();
const undefinedKeys = [...used.entries()].filter(([k]) => !en.has(k) && !sw.has(k));

if (missingInSw.length === 0 && missingInEn.length === 0 && undefinedKeys.length === 0) {
  console.log(`i18n: en and sw both define ${en.size} keys. ${used.size} keys used in code are all defined. In sync.`);
  process.exit(0);
}

if (undefinedKeys.length) {
  console.error(`\nUsed in code but defined in neither locale (${undefinedKeys.length}) - these render as the raw key:`);
  undefinedKeys.forEach(([k, f]) => console.error(`  ${k}  <- ${f}`));
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

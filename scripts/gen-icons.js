#!/usr/bin/env node
/*
 * Generate the full PWA / favicon icon set from the source logo.
 * Source: public/icons/skymap_logo_transparent.png (square, transparent)
 *
 *   icon-192 / icon-512            → purpose "any"  (transparent, full-bleed)
 *   icon-maskable-192 / -512       → purpose "maskable" (teal bg, logo in 80% safe zone)
 *   apple-touch-icon (180)         → solid teal bg (iOS renders transparency as black)
 *   favicon-32 / favicon-16        → small, transparent
 *
 * Run: node scripts/gen-icons.js
 */
const sharp = require('sharp');
const path = require('path');

const SRC = path.join(__dirname, '..', 'public', 'icons', 'skymap_logo_transparent.png');
const OUT = path.join(__dirname, '..', 'public', 'icons');
const TEAL = { r: 11, g: 90, b: 84, alpha: 1 }; // #0b5a54 (theme color)
const TRANSPARENT = { r: 0, g: 0, b: 0, alpha: 0 };

// A full-bleed icon: logo scaled to fill the canvas (with optional padding %).
async function plain(size, file, padPct = 0) {
  const inner = Math.round(size * (1 - padPct));
  const logo = await sharp(SRC).resize(inner, inner, { fit: 'contain', background: TRANSPARENT }).toBuffer();
  await sharp({ create: { width: size, height: size, channels: 4, background: TRANSPARENT } })
    .composite([{ input: logo, gravity: 'centre' }])
    .png().toFile(path.join(OUT, file));
  console.log('  ✅', file, `(${size}×${size}, transparent)`);
}

// A maskable / solid icon: logo on a solid background, scaled into the safe zone.
async function solid(size, file, scale, bg) {
  const inner = Math.round(size * scale);
  const logo = await sharp(SRC).resize(inner, inner, { fit: 'contain', background: TRANSPARENT }).toBuffer();
  await sharp({ create: { width: size, height: size, channels: 4, background: bg } })
    .composite([{ input: logo, gravity: 'centre' }])
    .png().toFile(path.join(OUT, file));
  console.log('  ✅', file, `(${size}×${size}, ${bg === TEAL ? 'teal bg' : 'solid'}, logo ${Math.round(scale * 100)}%)`);
}

(async () => {
  console.log('🎨 Generating PWA icon set from', path.basename(SRC));

  // purpose "any" - transparent, near full-bleed
  await plain(192, 'icon-192.png', 0.04);
  await plain(512, 'icon-512.png', 0.04);

  // purpose "maskable" - teal bg, logo within the 80% safe zone
  await solid(192, 'icon-maskable-192.png', 0.80, TEAL);
  await solid(512, 'icon-maskable-512.png', 0.80, TEAL);

  // iOS home-screen icon - solid bg (iOS shows transparency as black), gentle rounding
  await solid(180, 'apple-touch-icon.png', 0.86, TEAL);

  // favicons
  await plain(32, 'favicon-32.png', 0.02);
  await plain(16, 'favicon-16.png', 0.02);

  console.log('🏁 Done.');
})().catch((e) => { console.error('❌', e.message); process.exit(1); });

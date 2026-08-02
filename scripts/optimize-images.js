/**
 * Compress + convert the shipped raster logos to WebP for fast loading.
 * Favicons / PWA icons under public/icons stay PNG (browser/iOS/manifest
 * require it); hero + service images are already WebP; SVGs are left as-is.
 *
 * Run: node scripts/optimize-images.js
 */
const sharp = require('sharp');
const fs = require('fs');

const jobs = [
  { src: 'public/logo-cropped.png', out: 'public/logo-cropped.webp', q: 88 },
  { src: 'public/logo1.jpeg', out: 'public/logo1.webp', q: 85 },
];

(async () => {
  for (const j of jobs) {
    if (!fs.existsSync(j.src)) {
      console.log('skip (missing source):', j.src);
      continue;
    }
    const before = fs.statSync(j.src).size;
    await sharp(j.src).webp({ quality: j.q }).toFile(j.out);
    const after = fs.statSync(j.out).size;
    console.log(
      `${j.src} ${(before / 1024).toFixed(1)}KB -> ${j.out} ${(after / 1024).toFixed(1)}KB (${Math.round(100 - (after / before) * 100)}% smaller)`
    );
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});

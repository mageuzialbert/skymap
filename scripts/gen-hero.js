/**
 * Generate the optimized home-page hero background image.
 *
 * Downloads a royalty-free delivery-rider photo (Unsplash license: free for
 * commercial use, no attribution required) and re-encodes it to compact WebP +
 * AVIF, self-hosted under public/hero/. If every download attempt fails (this
 * environment's network is unreliable), it exits non-zero and the page falls
 * back to a brand gradient — nothing is left half-written.
 *
 * Run: node scripts/gen-hero.js
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const sharp = require('sharp');

const OUT_DIR = path.join(__dirname, '..', 'public', 'hero');
const TMP = path.join(OUT_DIR, '_src.tmp');
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

// Pexels CDN direct URLs (Pexels license: free for commercial use, no
// attribution required). Delivery-rider / courier-on-motorcycle photos.
// Unsplash's CDN is blocked from this network; Pexels is reachable.
const q = 'auto=compress&cs=tinysrgb&w=1920';
const CANDIDATES = [
  `https://images.pexels.com/photos/7363190/pexels-photo-7363190.jpeg?${q}`, // courier driving a motorcycle (urban street)
  `https://images.pexels.com/photos/12203654/pexels-photo-12203654.jpeg?${q}`, // delivery man on a motorcycle on road
  `https://images.pexels.com/photos/7362948/pexels-photo-7362948.jpeg?${q}`, // man with food delivery bag on motorcycle
];

function tryDownload(url) {
  try {
    execSync(
      `curl -L -sS -A "${UA}" --retry 3 --retry-delay 2 --retry-all-errors --max-time 90 -o "${TMP}" "${url}"`,
      { stdio: ['ignore', 'ignore', 'inherit'] }
    );
    if (!fs.existsSync(TMP) || fs.statSync(TMP).size < 10000) return false;
    return true;
  } catch {
    return false;
  }
}

(async () => {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  let got = false;
  for (const url of CANDIDATES) {
    process.stdout.write(`Trying ${url}\n`);
    if (tryDownload(url)) {
      // Validate it's a real raster image sharp can read.
      try {
        const meta = await sharp(TMP).metadata();
        if (meta.width && meta.height) {
          got = true;
          process.stdout.write(`  ok: ${meta.format} ${meta.width}x${meta.height}\n`);
          break;
        }
      } catch {
        /* not an image, try next */
      }
    }
    process.stdout.write('  failed\n');
  }

  if (!got) {
    if (fs.existsSync(TMP)) fs.unlinkSync(TMP);
    console.error('\nHERO_DOWNLOAD_FAILED — no image obtained; use the gradient fallback.');
    process.exit(1);
  }

  // Re-encode: 1920px-wide cover crop (16:9-ish), WebP + AVIF.
  const base = sharp(TMP).rotate().resize(1920, 1280, { fit: 'cover', position: 'centre' });

  await base.clone().webp({ quality: 72 }).toFile(path.join(OUT_DIR, 'rider.webp'));
  await base.clone().avif({ quality: 50 }).toFile(path.join(OUT_DIR, 'rider.avif'));

  fs.unlinkSync(TMP);

  for (const f of ['rider.webp', 'rider.avif']) {
    const p = path.join(OUT_DIR, f);
    console.log(`  wrote public/hero/${f} — ${(fs.statSync(p).size / 1024).toFixed(1)} KB`);
  }
  console.log('HERO_OK');
})();

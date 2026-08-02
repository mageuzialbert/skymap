/**
 * Generate the "What we offer" service thumbnails from royalty-free Pexels
 * photos (Pexels license: free for commercial use, no attribution required).
 * Each is re-encoded to a small 256x256 WebP and self-hosted under
 * public/services/. Any service whose download fails is simply skipped — the
 * home page falls back to its Lucide icon for that tile.
 *
 * Run: node scripts/gen-service-images.js
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const sharp = require('sharp');

const OUT_DIR = path.join(__dirname, '..', 'public', 'services');
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const px = (id) =>
  `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=600`;

// One entry per service; each has a prioritized list of candidate Pexels IDs.
const SERVICES = [
  { key: 'errand', ids: [7362948, 12203654] }, // rider with delivery bag on a motorcycle
  { key: 'delivery', ids: [7843999, 6869065] }, // person handing over / delivering boxes
  { key: 'ride', ids: [5835455, 31101760] }, // passenger in a taxi / car ready for a passenger
  { key: 'hire', ids: [13520550, 5410923, 13008066] }, // cargo trucks on the road
];

function download(url, dest) {
  try {
    execSync(
      `curl -L -sS -A "${UA}" --retry 4 --retry-delay 2 --retry-all-errors --max-time 90 -o "${dest}" "${url}"`,
      { stdio: ['ignore', 'ignore', 'inherit'] }
    );
    return fs.existsSync(dest) && fs.statSync(dest).size > 5000;
  } catch {
    return false;
  }
}

(async () => {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const done = [];
  const failed = [];

  for (const svc of SERVICES) {
    const tmp = path.join(OUT_DIR, `_${svc.key}.tmp`);
    let ok = false;
    for (const id of svc.ids) {
      process.stdout.write(`${svc.key}: trying photo ${id}\n`);
      if (!download(px(id), tmp)) continue;
      try {
        const meta = await sharp(tmp).metadata();
        if (!meta.width) continue;
        await sharp(tmp)
          .resize(256, 256, { fit: 'cover', position: 'centre' })
          .webp({ quality: 72 })
          .toFile(path.join(OUT_DIR, `${svc.key}.webp`));
        ok = true;
        break;
      } catch {
        /* corrupt/partial — try next candidate */
      }
    }
    if (fs.existsSync(tmp)) fs.unlinkSync(tmp);
    (ok ? done : failed).push(svc.key);
  }

  console.log('');
  for (const k of done) {
    const p = path.join(OUT_DIR, `${k}.webp`);
    console.log(`  OK  public/services/${k}.webp — ${(fs.statSync(p).size / 1024).toFixed(1)} KB`);
  }
  if (failed.length) console.log(`  FAILED (will keep icon): ${failed.join(', ')}`);
  console.log(`\nSERVICE_IMAGES_DONE: ${done.join(',') || '(none)'}`);
})();

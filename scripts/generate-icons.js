// Script to generate PWA icons from SVG
// Run with: node scripts/generate-icons.js

const fs = require('fs');
const path = require('path');

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
const iconsDir = path.join(__dirname, '..', 'public', 'icons');

// Ensure icons directory exists
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// Generate PNG placeholder files (these should be replaced with actual icons)
// For now, create simple colored squares as placeholders

function generateIconSVG(size) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#22c55e"/>
      <stop offset="100%" style="stop-color:#16a34a"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="100" fill="url(#bgGradient)"/>
  <text x="256" y="360" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-weight="bold" font-size="300">K</text>
  <path d="M380 200 L420 256 L380 312" stroke="#eab308" stroke-width="24" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
</svg>`;
}

// Create SVG icons for each size (browsers can render SVG, but PNG is preferred)
// Note: For production, use a tool like sharp or canvas to convert SVG to PNG
sizes.forEach(size => {
  const svgContent = generateIconSVG(size);
  const svgPath = path.join(iconsDir, `icon-${size}x${size}.svg`);
  fs.writeFileSync(svgPath, svgContent);
  console.log(`Created ${svgPath}`);
});

// Create a simple HTML file that explains how to generate PNGs
const readmePath = path.join(iconsDir, 'README.md');
fs.writeFileSync(readmePath, `# PWA Icons

This folder contains PWA icons for Kasi Courier Services.

## Current Icons (SVG)
SVG icons have been generated for all required sizes. However, for best PWA compatibility, PNG icons are recommended.

## Generate PNG Icons

To convert SVG to PNG, you can use one of these methods:

### Option 1: Online Converter
1. Open icon.svg in a browser
2. Use an online SVG to PNG converter like https://svgtopng.com/
3. Generate icons for sizes: 72, 96, 128, 144, 152, 192, 384, 512

### Option 2: Using ImageMagick (if installed)
\`\`\`bash
for size in 72 96 128 144 152 192 384 512; do
  convert -background none -resize \${size}x\${size} icon.svg icon-\${size}x\${size}.png
done
\`\`\`

### Option 3: Using sharp (Node.js)
\`\`\`bash
npm install sharp
node -e "
const sharp = require('sharp');
const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
sizes.forEach(size => {
  sharp('public/icons/icon.svg')
    .resize(size, size)
    .png()
    .toFile(\`public/icons/icon-\${size}x\${size}.png\`);
});
"
\`\`\`

## Screenshots
For better PWA install experience, add screenshots:
- screenshot-wide.png (1280x720) - Desktop view
- screenshot-narrow.png (720x1280) - Mobile view
`);

console.log('\\nIcon generation complete!');
console.log('Note: SVG icons created. For production, convert to PNG using instructions in public/icons/README.md');

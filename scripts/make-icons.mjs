// Renders public/brand-mark.svg onto the app background as the installable-app icon set.
// Usage: node scripts/make-icons.mjs
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const BACKGROUND = '#1b1922';
const source = await readFile(new URL('../public/brand-mark.svg', import.meta.url));
const directory = new URL('../public/icons/', import.meta.url);
await mkdir(directory, { recursive: true });

// scale is the share of the canvas the mark occupies; maskable icons keep the mark inside the 80% safe zone.
const targets = [
  { name: 'icon-192.png', size: 192, scale: 0.84 },
  { name: 'icon-512.png', size: 512, scale: 0.84 },
  { name: 'maskable-512.png', size: 512, scale: 0.6 },
  { name: 'apple-touch-icon.png', size: 180, scale: 0.8 },
];

async function render({ name, size, scale }) {
  const inner = Math.round(size * scale);
  // Rasterise the SVG at the final size so edges stay crisp instead of upscaling a small bitmap.
  const mark = await sharp(source, { density: Math.ceil((inner / 40) * 72) }).resize(inner, inner, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
  const offset = Math.round((size - inner) / 2);
  const output = await sharp({ create: { width: size, height: size, channels: 4, background: BACKGROUND } })
    .composite([{ input: mark, left: offset, top: offset }])
    .png({ compressionLevel: 9 })
    .toBuffer();
  const target = new URL(name, directory);
  await writeFile(target, output);
  const meta = await sharp(output).metadata();
  return { file: fileURLToPath(target), width: meta.width, height: meta.height, bytes: output.byteLength };
}

const results = [];
for (const target of targets) results.push(await render(target));
console.log(JSON.stringify(results, null, 2));

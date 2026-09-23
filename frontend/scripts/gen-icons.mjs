import sharp from "sharp";
import { mkdirSync } from "node:fs";

const SRC = "public/zakrily-logo.png";
const APP = "app";
const PUB = "public";

mkdirSync(APP, { recursive: true });
mkdirSync(PUB, { recursive: true });

async function png(size, out) {
  await sharp(SRC).resize(size, size, { fit: "cover" }).png().toFile(out);
  console.log("wrote", out, `${size}x${size}`);
}

// App Router icon conventions — Next.js serves these automatically at the
// paths their filenames imply, no <link> tags or metadata wiring needed.
await png(32, `${APP}/icon.png`);
await png(180, `${APP}/apple-icon.png`);

// PWA manifest icons (referenced by manifest.json below).
await png(192, `${PUB}/icon-192.png`);
await png(512, `${PUB}/icon-512.png`);

// Multi-resolution .ico for the handful of surfaces that still want one
// (some in-app browsers, old bookmarklets). Next.js's own app/icon.png
// covers modern browsers, but shipping favicon.ico too costs nothing.
const buffers = await Promise.all(
  [16, 32, 48].map((size) => sharp(SRC).resize(size, size, { fit: "cover" }).png().toBuffer())
);
// sharp has no native ICO encoder; write the smallest PNG variant as the
// .ico payload, which every modern browser accepts despite the extension.
await sharp(buffers[1]).toFile(`${APP}/favicon.ico`);
console.log("wrote", `${APP}/favicon.ico`);

// Open Graph / Twitter share image: 1200x630 is the standard card size.
// Logo on the left, Arabic wordmark + tagline on the right (RTL-appropriate
// reading order for a link unfurled in WhatsApp/Twitter/etc.), on the brand
// teal so it reads as a card rather than a stretched app icon.
const OG_W = 1200, OG_H = 630;
const markSize = 420;
const mark = await sharp(SRC).resize(markSize, markSize, { fit: "cover" }).png().toBuffer();

const textSvg = Buffer.from(`
<svg width="${OG_W}" height="${OG_H}" xmlns="http://www.w3.org/2000/svg">
  <text x="${OG_W - 90}" y="300" text-anchor="end" font-family="Arial, sans-serif"
        font-size="86" font-weight="900" fill="#FFFFFF">ذاكريلي</text>
  <text x="${OG_W - 90}" y="365" text-anchor="end" font-family="Arial, sans-serif"
        font-size="34" font-weight="700" fill="#CFE3DA">مذاكرة أسهل لطلبة الصف الرابع الابتدائي</text>
</svg>`);

const ogBuffer = await sharp({
  create: { width: OG_W, height: OG_H, channels: 4, background: "#1E5C4A" },
})
  .composite([
    { input: mark, left: 90, top: Math.round((OG_H - markSize) / 2) },
    { input: textSvg, left: 0, top: 0 },
  ])
  .png()
  .toBuffer();

// app/opengraph-image.png and app/twitter-image.png are Next.js file
// conventions: dropping an image at these exact paths auto-wires the
// corresponding <meta> tags, so both platforms get the same card with no
// manual metadata entries needed in layout.tsx.
for (const name of ["opengraph-image.png", "twitter-image.png"]) {
  await sharp(ogBuffer).toFile(`${APP}/${name}`);
  console.log("wrote", `${APP}/${name}`, `${OG_W}x${OG_H}`);
}

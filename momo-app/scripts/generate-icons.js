const sharp = require('sharp');
const path = require('path');

const svg192 = `<svg width="192" height="192" viewBox="0 0 192 192" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="192" height="192" rx="42" fill="#09090b"/>
  <circle cx="96" cy="96" r="75" fill="url(#grad)" stroke="#f59e0b" stroke-width="4"/>
  <defs>
    <linearGradient id="grad" x1="20" y1="20" x2="172" y2="172" gradientUnits="userSpaceOnUse">
      <stop stop-color="#f59e0b"/>
      <stop offset="1" stop-color="#ea580c"/>
    </linearGradient>
  </defs>
  <text x="96" y="118" font-size="64" text-anchor="middle" font-family="Segoe UI Emoji, Apple Color Emoji, sans-serif">🥟</text>
</svg>`;

const svg512 = `<svg width="512" height="512" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="512" height="512" rx="112" fill="#09090b"/>
  <circle cx="256" cy="256" r="200" fill="url(#grad)" stroke="#f59e0b" stroke-width="10"/>
  <defs>
    <linearGradient id="grad" x1="50" y1="50" x2="462" y2="462" gradientUnits="userSpaceOnUse">
      <stop stop-color="#f59e0b"/>
      <stop offset="1" stop-color="#ea580c"/>
    </linearGradient>
  </defs>
  <text x="256" y="315" font-size="170" text-anchor="middle" font-family="Segoe UI Emoji, Apple Color Emoji, sans-serif">🥟</text>
</svg>`;

async function run() {
  await sharp(Buffer.from(svg192)).png().toFile(path.join(__dirname, '../public/icon-192.png'));
  await sharp(Buffer.from(svg512)).png().toFile(path.join(__dirname, '../public/icon-512.png'));
  await sharp(Buffer.from(svg192)).png().toFile(path.join(__dirname, '../public/apple-icon.png'));
  console.log('Icons created successfully!');
}

run().catch(console.error);

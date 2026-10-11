// Builds the README logo lockups (Quad mark + "taskr" as outlines, so GitHub
// renders the real Sora wordmark without loading fonts).
// Run: node scripts/build-readme-logo.mjs
import { readFileSync, writeFileSync } from "node:fs";
import opentype from "opentype.js";

const fontFile = readFileSync(new URL("../node_modules/@fontsource/sora/files/sora-latin-600-normal.woff", import.meta.url));
const font = opentype.parse(fontFile.buffer.slice(fontFile.byteOffset, fontFile.byteOffset + fontFile.byteLength));

const MARK = 64; // the mark's own grid
const SIZE = 64; // wordmark font size, matched to the mark height
const GAP = 22;
const word = font.getPath("taskr", 0, 0, SIZE, { kerning: true });
const box = word.getBoundingBox();
// Sit the word on the mark's optical centre line.
const wordX = MARK + GAP - box.x1;
const wordY = MARK / 2 - (box.y1 + box.y2) / 2;
const wordPath = font.getPath("taskr", wordX, wordY, SIZE, { kerning: true }).toPathData(2);
const width = Math.ceil(MARK + GAP + (box.x2 - box.x1) + 4);

const tiles = `
  <rect x="4" y="4" width="26" height="26" rx="7"/>
  <g transform="rotate(12 47 17)"><rect x="34" y="4" width="26" height="26" rx="7"/></g>
  <rect x="4" y="34" width="26" height="26" rx="7"/>
  <rect x="34" y="34" width="26" height="26" rx="7"/>`;

const lockup = (markColor, wordColor) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-2 -4 ${width + 4} ${MARK + 8}" width="${(width + 4) * 2}" height="${(MARK + 8) * 2}" role="img" aria-label="taskr">
  <g fill="${markColor}">${tiles}
  </g>
  <path fill="${wordColor}" d="${wordPath}"/>
</svg>
`;

writeFileSync(new URL("../docs/images/logo-light.svg", import.meta.url), lockup("#1c1b19", "#1c1b19"));
writeFileSync(new URL("../docs/images/logo-dark.svg", import.meta.url), lockup("#ffc71d", "#fbf9f4"));
writeFileSync(new URL("../docs/images/mark.svg", import.meta.url), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="96" height="96" fill="#1c1b19">${tiles}
</svg>
`);
console.log("wrote logo-light.svg, logo-dark.svg, mark.svg");

/**
 * A 5x7 bitmap font, used to burn the watermark into preview images.
 *
 * The watermark is drawn from these glyphs rather than from a real typeface on
 * purpose: SVG or libvips text rendering depends on fonts being installed on
 * whatever machine runs the build, and a build machine with no fonts renders a
 * watermark of blank space — which would publish unprotected artwork without
 * failing the build. Pixels always render.
 *
 * Each glyph is seven rows of five bits, top row first. `1` is ink.
 */

const GLYPHS = {
  A: "01110/10001/10001/11111/10001/10001/10001",
  B: "11110/10001/10001/11110/10001/10001/11110",
  C: "01110/10001/10000/10000/10000/10001/01110",
  D: "11110/10001/10001/10001/10001/10001/11110",
  E: "11111/10000/10000/11110/10000/10000/11111",
  F: "11111/10000/10000/11110/10000/10000/10000",
  G: "01110/10001/10000/10111/10001/10001/01111",
  H: "10001/10001/10001/11111/10001/10001/10001",
  I: "11111/00100/00100/00100/00100/00100/11111",
  J: "00111/00010/00010/00010/00010/10010/01100",
  K: "10001/10010/10100/11000/10100/10010/10001",
  L: "10000/10000/10000/10000/10000/10000/11111",
  M: "10001/11011/10101/10101/10001/10001/10001",
  N: "10001/11001/10101/10011/10001/10001/10001",
  O: "01110/10001/10001/10001/10001/10001/01110",
  P: "11110/10001/10001/11110/10000/10000/10000",
  Q: "01110/10001/10001/10001/10101/10010/01101",
  R: "11110/10001/10001/11110/10100/10010/10001",
  S: "01111/10000/10000/01110/00001/00001/11110",
  T: "11111/00100/00100/00100/00100/00100/00100",
  U: "10001/10001/10001/10001/10001/10001/01110",
  V: "10001/10001/10001/10001/10001/01010/00100",
  W: "10001/10001/10001/10101/10101/11011/01010",
  X: "10001/10001/01010/00100/01010/10001/10001",
  Y: "10001/10001/01010/00100/00100/00100/00100",
  Z: "11111/00001/00010/00100/01000/10000/11111",
  0: "01110/10001/10011/10101/11001/10001/01110",
  1: "00100/01100/00100/00100/00100/00100/01110",
  2: "01110/10001/00001/00010/00100/01000/11111",
  3: "11111/00010/00100/00010/00001/10001/01110",
  4: "00010/00110/01010/10010/11111/00010/00010",
  5: "11111/10000/11110/00001/00001/10001/01110",
  6: "00110/01000/10000/11110/10001/10001/01110",
  7: "11111/00001/00010/00100/01000/01000/01000",
  8: "01110/10001/10001/01110/10001/10001/01110",
  9: "01110/10001/10001/01111/00001/00010/01100",
  " ": "00000/00000/00000/00000/00000/00000/00000",
  ".": "00000/00000/00000/00000/00000/01100/01100",
  ",": "00000/00000/00000/00000/01100/01100/01000",
  "-": "00000/00000/00000/11111/00000/00000/00000",
  "·": "00000/00000/01100/01100/00000/00000/00000",
  ":": "00000/01100/01100/00000/01100/01100/00000",
  "/": "00001/00010/00010/00100/01000/01000/10000",
  "'": "00100/00100/01000/00000/00000/00000/00000",
  "&": "01100/10010/10010/01100/10101/10010/01101",
  "!": "00100/00100/00100/00100/00100/00000/00100",
  "©": "01110/10001/10111/11011/10111/10001/01110",
};

export const GLYPH_WIDTH = 5;
export const GLYPH_HEIGHT = 7;
/** Blank columns between glyphs, in unscaled font pixels. */
export const GLYPH_GAP = 1;

const FALLBACK = GLYPHS[" "];

/**
 * Rasterises `text` into a coverage mask: one byte per pixel, 255 where ink is.
 *
 * `scale` is how many output pixels one font pixel becomes, so the watermark can
 * grow with the image it is stamped onto without ever going soft.
 */
export function renderText(text, scale) {
  const chars = [...text.toUpperCase()];
  const width = Math.max(1, chars.length * (GLYPH_WIDTH + GLYPH_GAP) - GLYPH_GAP) * scale;
  const height = GLYPH_HEIGHT * scale;
  const mask = new Uint8Array(width * height);

  chars.forEach((char, index) => {
    const rows = (GLYPHS[char] ?? FALLBACK).split("/");
    const originX = index * (GLYPH_WIDTH + GLYPH_GAP) * scale;

    rows.forEach((row, rowIndex) => {
      for (let column = 0; column < GLYPH_WIDTH; column += 1) {
        if (row[column] !== "1") continue;

        // Expand this one font pixel into a scale x scale block.
        for (let y = 0; y < scale; y += 1) {
          const offset = (rowIndex * scale + y) * width + originX + column * scale;
          mask.fill(255, offset, offset + scale);
        }
      }
    });
  });

  return { width, height, mask };
}

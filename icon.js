// icon.js: genera los sprites de 16×16 de WebDex en pixel art.
//   assets/icon.svg             → icono de la pestaña (Pokédex; se incrusta en la página)
//   assets/icon-32.png          → respaldo para navegadores sin iconos SVG
//   assets/icon-180.png         → apple-touch-icon (Safari / "Añadir a pantalla de inicio")
//   assets/pokemonroulette.svg  → logo de la ficha Nº008 (ruleta de generaciones, variante A de Claude Design)
// Uso: node icon.js   (sin dependencias: el PNG se codifica con zlib de Node)

const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const OUT = path.join(__dirname, "assets");

/* ---------- Sprite 1: la Pokédex (cuadrícula a mano; cada carácter es un píxel, "." = transparente) ---------- */
const PALETTE = {
  o: "#5c0d14", // contorno
  r: "#d8232f", // carcasa roja
  h: "#f25a5f", // brillo de la carcasa
  w: "#ece6e1", // marco blanco
  b: "#3fb6f2", // lente azul
  d: "#0f5e95", // sombra de la lente
  l: "#e8f8ff", // reflejo de la lente
  R: "#ff4b4b", // LED rojo
  Y: "#ffd23f", // LED amarillo
  G: "#4cd964", // LED verde
  s: "#a9c49a", // pantalla LCD
  k: "#1d2a1c", // tinta de la pantalla
};
const GRID = [
  "................",
  ".oooooooooooooo.",
  ".ohhhhhhhhhhhro.",
  ".ohrwwwrrrrrrro.",
  ".orwlbbwrRrYrGo.",
  ".orwbbdwrrrrrro.",
  ".orwbddwrrrrrro.",
  ".orrwwwrrrrrrro.",
  ".orrrrrrrrrrrro.",
  ".orwwwwwwwwwwro.",
  ".orwsssssssswro.",
  ".orwsksskksswro.",
  ".orwsssssssswro.",
  ".orwwwwwwwwwwro.",
  ".oooooooooooooo.",
  "................",
];
if (GRID.length !== 16 || GRID.some(r => r.length !== 16)) throw new Error("La cuadrícula debe ser de 16×16");
const pokedex = (x, y) => PALETTE[GRID[y][x]] || null;

/* ---------- Sprite 2: ruleta de generaciones (calculada; misma fórmula que el lienzo de Claude Design) ----------
   Aro oscuro, 9 porciones con los colores de generación de Pokémon Roulette (Kanto → Paldea),
   Poké Ball blanca en el centro y flecha dorada arriba. */
const ROULETTE = {
  ring: "#282828", hubRing: "#282828", hub: "#f8f8f8", arrow: "#f2c14e", arrowEdge: "#282828",
  seg: ["#b3261e", "#e8740c", "#e0b21b", "#2e9e4f", "#14998a", "#1f3a93", "#6a2fb0", "#a12d9a", "#8a3fe0"],
};
function roulette(x, y) {
  const cx = 8, cy = 9, R = 6.6;
  const dx = x + 0.5 - cx, dy = y + 0.5 - cy, d = Math.sqrt(dx * dx + dy * dy);
  let c = null;
  if (d <= R) {
    if (d > R - 1.1) c = ROULETTE.ring;
    else if (d <= 1.0) c = ROULETTE.hub;
    else if (d <= 1.9) c = ROULETTE.hubRing;
    else {
      const n = ROULETTE.seg.length;
      const a = Math.atan2(dy, dx) + Math.PI / 2 + Math.PI / n;
      const t = ((a / (2 * Math.PI)) % 1 + 1) % 1;
      c = ROULETTE.seg[Math.floor(t * n) % n];
    }
  }
  // Flecha indicadora, apuntando a la porción de arriba.
  if (y === 0 && x >= 6 && x <= 9) c = ROULETTE.arrowEdge;
  if (y === 1 && (x === 6 || x === 9)) c = ROULETTE.arrowEdge;
  if (y === 1 && (x === 7 || x === 8)) c = ROULETTE.arrow;
  if (y === 2 && (x === 7 || x === 8)) c = ROULETTE.arrowEdge;
  return c;
}

/* ---------- Exportadores: pixel(x, y) → color o null ---------- */
function svg(pixel) {
  let rects = "";
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    const c = pixel(x, y);
    if (c) rects += `<rect x="${x}" y="${y}" width="1" height="1" fill="${c}"/>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" shape-rendering="crispEdges">${rects}</svg>\n`;
}

// PNG RGBA mínimo: cada píxel del sprite se amplía a un bloque de "scale" px, con margen "pad".
function png(pixel, size) {
  const scale = Math.floor(size / 16), pad = Math.floor((size - scale * 16) / 2);
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0; // filtro "none" por fila
    for (let x = 0; x < size; x++) {
      const gx = Math.floor((x - pad) / scale), gy = Math.floor((y - pad) / scale);
      const c = gx >= 0 && gx < 16 && gy >= 0 && gy < 16 ? pixel(gx, gy) : null;
      const i = y * (size * 4 + 1) + 1 + x * 4;
      if (c) { raw[i] = parseInt(c.slice(1, 3), 16); raw[i + 1] = parseInt(c.slice(3, 5), 16); raw[i + 2] = parseInt(c.slice(5, 7), 16); raw[i + 3] = 255; }
    }
  }
  const chunk = (type, data) => {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const td = Buffer.concat([Buffer.from(type), data]);
    const crc = Buffer.alloc(4); crc.writeUInt32BE(zlib.crc32(td) >>> 0);
    return Buffer.concat([len, td, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 6; // 8 bits, RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr), chunk("IDAT", zlib.deflateSync(raw)), chunk("IEND", Buffer.alloc(0)),
  ]);
}

fs.writeFileSync(path.join(OUT, "icon.svg"), svg(pokedex));
fs.writeFileSync(path.join(OUT, "icon-32.png"), png(pokedex, 32));
fs.writeFileSync(path.join(OUT, "icon-180.png"), png(pokedex, 180));
fs.writeFileSync(path.join(OUT, "pokemonroulette.svg"), svg(roulette));
console.log("Generados: assets/icon.svg, assets/icon-32.png, assets/icon-180.png, assets/pokemonroulette.svg");

// node icon.js --preview → además guarda una vista ampliada del logo de la ruleta (para revisarla).
if (process.argv.includes("--preview")) {
  fs.writeFileSync(path.join(OUT, "pokemonroulette-preview.png"), png(roulette, 176));
  console.log("Vista previa: assets/pokemonroulette-preview.png");
}

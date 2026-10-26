// icon.js: genera el icono de WebDex (una Pokédex en pixel art) a partir de una cuadrícula de 16×16.
//   assets/icon.svg      → icono de la pestaña (se incrusta en la página)
//   assets/icon-32.png   → respaldo para navegadores sin iconos SVG
//   assets/icon-180.png  → apple-touch-icon (Safari / "Añadir a pantalla de inicio")
// Uso: node icon.js   (sin dependencias: el PNG se codifica con zlib de Node)

const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

// Cada carácter es un píxel. "." = transparente.
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

const OUT = path.join(__dirname, "assets");

function svg() {
  let rects = "";
  GRID.forEach((row, y) => [...row].forEach((c, x) => {
    if (PALETTE[c]) rects += `<rect x="${x}" y="${y}" width="1" height="1" fill="${PALETTE[c]}"/>`;
  }));
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" shape-rendering="crispEdges">${rects}</svg>\n`;
}

// PNG RGBA mínimo: cada píxel de la cuadrícula se amplía a un bloque de "scale" px, con margen "pad".
function png(size) {
  const scale = Math.floor(size / 16), pad = Math.floor((size - scale * 16) / 2);
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0; // filtro "none" por fila
    for (let x = 0; x < size; x++) {
      const gx = Math.floor((x - pad) / scale), gy = Math.floor((y - pad) / scale);
      const c = gx >= 0 && gx < 16 && gy >= 0 && gy < 16 ? PALETTE[GRID[gy][gx]] : null;
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

if (GRID.length !== 16 || GRID.some(r => r.length !== 16)) throw new Error("La cuadrícula debe ser de 16×16");
fs.writeFileSync(path.join(OUT, "icon.svg"), svg());
fs.writeFileSync(path.join(OUT, "icon-32.png"), png(32));
fs.writeFileSync(path.join(OUT, "icon-180.png"), png(180));
console.log("Generados: assets/icon.svg, assets/icon-32.png, assets/icon-180.png");

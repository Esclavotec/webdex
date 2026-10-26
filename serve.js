// Servidor estático mínimo para ver WebDex en local: node serve.js  →  http://localhost:8765
const http = require("http"), fs = require("fs"), path = require("path");
const types = { ".html": "text/html; charset=utf-8", ".png": "image/png", ".svg": "image/svg+xml", ".md": "text/markdown; charset=utf-8", ".mp3": "audio/mpeg" };
http.createServer((req, res) => {
  const p = path.join(__dirname, decodeURIComponent(req.url.split("?")[0]) === "/" ? "index.html" : decodeURIComponent(req.url.split("?")[0]));
  if (!p.startsWith(__dirname)) { res.writeHead(403); return res.end(); }
  fs.readFile(p, (err, data) => {
    if (err) { res.writeHead(404); return res.end("No encontrado"); }
    let body = data;
    // index.html no lleva <!doctype> (lo añade el artefacto al publicar); aquí lo envolvemos.
    if (p.endsWith("index.html")) body = '<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"></head><body>' + data + "</body></html>";
    res.writeHead(200, { "Content-Type": types[path.extname(p)] || "application/octet-stream" });
    res.end(body);
  });
}).listen(process.env.PORT || 8765, () => console.log("WebDex en http://localhost:" + (process.env.PORT || 8765)));

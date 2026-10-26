// Servidor estático mínimo para ver WebDex en local, igual que Render (sirve la carpeta dist/).
// Uso: bash build.sh && node serve.js  →  http://localhost:8765   (otro puerto: PORT=8766 node serve.js)
const http = require("http"), fs = require("fs"), path = require("path");
const ROOT = path.join(__dirname, "dist");
const types = { ".html": "text/html; charset=utf-8", ".png": "image/png", ".svg": "image/svg+xml", ".mp3": "audio/mpeg" };
http.createServer((req, res) => {
  const url = decodeURIComponent(req.url.split("?")[0]);
  const p = path.join(ROOT, url === "/" ? "index.html" : url);
  if (!p.startsWith(ROOT)) { res.writeHead(403); return res.end(); }
  fs.readFile(p, (err, data) => {
    if (err) { res.writeHead(404); return res.end("No encontrado"); }
    res.writeHead(200, { "Content-Type": types[path.extname(p)] || "application/octet-stream" });
    res.end(data);
  });
}).listen(process.env.PORT || 8765, () => console.log("WebDex en http://localhost:" + (process.env.PORT || 8765)));

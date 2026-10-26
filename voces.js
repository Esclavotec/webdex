// voces.js: genera con ElevenLabs un MP3 por entrada de la WebDex (assets/voz/<slug>.mp3).
//
// Voz por defecto: "Luisa - Smooth, Friendly and Engaging" (español latinoamericano).
// El script la busca por nombre entre tus voces; antes, añádela desde la Voice Library de ElevenLabs.
//
// Uso (PowerShell, dentro de la carpeta del proyecto):
//   $env:ELEVENLABS_API_KEY = "tu-clave"          # solo para esta ventana; no se guarda en ningún archivo
//   node voces.js                                  # genera con Luisa los MP3 que faltan
//   node voces.js --force                          # vuelve a generarlos todos
//   node voces.js pokeclash                        # genera (o regenera) solo esa entrada
//   node voces.js --list                           # lista tus voces con su ID
//   node voces.js --dry                            # muestra los textos sin gastar créditos (no pide clave)
// Opcional:
//   $env:ELEVENLABS_VOICE_NAME = "Otra voz"        # buscar otra voz por nombre
//   $env:ELEVENLABS_VOICE_ID = "id-de-la-voz"      # usar un ID concreto (tiene prioridad sobre el nombre)
// Después ejecuta: bash build.sh
//
// El texto que se lee es el mismo que usa la voz del navegador (nombre, especie, tipo, creador y descripción).

const fs = require("fs");
const path = require("path");

const KEY = process.env.ELEVENLABS_API_KEY;
const VOICE_ID = process.env.ELEVENLABS_VOICE_ID || "";
const VOICE_NAME = process.env.ELEVENLABS_VOICE_NAME || "Luisa";
const MODEL = "eleven_multilingual_v2";                              // habla español con naturalidad
const OUT = path.join(__dirname, "assets", "voz");
const API = process.env.ELEVENLABS_API_BASE || "https://api.elevenlabs.io/v1"; // la base solo se cambia para pruebas

// Ajustes para Luisa: clara y cercana, con algo de expresión, como una Pokédex amable.
const VOICE_SETTINGS = { stability: 0.45, similarity_boost: 0.8, style: 0.25, use_speaker_boost: true };

const args = process.argv.slice(2);
const force = args.includes("--force");
const only = args.filter(a => !a.startsWith("--"));

// Lee el array WEBS directamente del código fuente, para no duplicar los datos.
function loadWebs() {
  const src = fs.readFileSync(path.join(__dirname, "src", "webdex.template.html"), "utf8");
  const m = src.match(/const WEBS = (\[[\s\S]*?\n\]);/);
  if (!m) throw new Error("No encuentro el array WEBS en src/webdex.template.html");
  return Function(`"use strict"; return ${m[1]};`)();
}

// Mismo guion que speak() en la página.
function script(web) {
  const especie = web.especie.charAt(0).toLowerCase() + web.especie.slice(1);
  const quien = /desconocido/i.test(web.creador) ? "y no se sabe quién la creó" : `y la creó ${web.creador}`;
  return `${web.nombre}, ${especie}. Es de tipo ${web.tipos.join(" y ")}, ${quien}. ${web.descripcion}`;
}

async function api(route) {
  const res = await fetch(`${API}${route}`, { headers: { "xi-api-key": KEY } });
  if (!res.ok) throw new Error(`ElevenLabs respondió ${res.status}: ${await res.text()}`);
  return res.json();
}

async function listVoices() {
  const { voices } = await api("/voices");
  for (const v of voices) {
    const l = v.labels || {};
    console.log(`${v.voice_id}  ${v.name.padEnd(40)} ${[l.gender, l.accent, l.description].filter(Boolean).join(" · ")}`);
  }
}

// Decide qué voz usar: el ID indicado, o la voz de tu cuenta cuyo nombre empieza por VOICE_NAME.
// Si no está en tu cuenta, la busca en la Voice Library y explica cómo añadirla.
async function resolveVoice() {
  if (VOICE_ID) return { id: VOICE_ID, name: "(ID indicado)" };
  const wanted = VOICE_NAME.toLowerCase();
  const { voices } = await api("/voices");
  const mine = voices.find(v => v.name.toLowerCase().startsWith(wanted));
  if (mine) return { id: mine.voice_id, name: mine.name };

  let hint = "";
  try {
    const { voices: shared = [] } = await api(`/shared-voices?search=${encodeURIComponent(VOICE_NAME)}&language=es&page_size=5`);
    if (shared.length) {
      hint = "\nEn la Voice Library aparecen:\n" +
        shared.map(v => `  - ${v.name}${v.accent ? " (" + v.accent + ")" : ""}`).join("\n");
    }
  } catch (e) { /* la búsqueda pública es solo una ayuda */ }
  throw new Error(
    `La voz "${VOICE_NAME}" no está en tus voces de ElevenLabs.${hint}\n` +
    `Abre elevenlabs.io → Voces → Voice Library, busca "${VOICE_NAME}", pulsa "Añadir a mis voces" y vuelve a ejecutar el script.`
  );
}

async function generate(web, voice) {
  const file = path.join(OUT, `${web.slug}.mp3`);
  if (fs.existsSync(file) && !force && !only.length) { console.log(`= ${web.slug} (ya existe)`); return; }
  const res = await fetch(`${API}/text-to-speech/${voice.id}?output_format=mp3_44100_128`, {
    method: "POST",
    headers: { "xi-api-key": KEY, "Content-Type": "application/json", Accept: "audio/mpeg" },
    body: JSON.stringify({ text: script(web), model_id: MODEL, language_code: "es", voice_settings: VOICE_SETTINGS }),
  });
  if (!res.ok) throw new Error(`${web.slug}: ElevenLabs respondió ${res.status}: ${await res.text()}`);
  fs.writeFileSync(file, Buffer.from(await res.arrayBuffer()));
  console.log(`✓ ${web.slug}.mp3 (${Math.round(fs.statSync(file).size / 1024)} KB)`);
}

(async () => {
  try {
    // --dry: muestra los textos que se leerían, sin llamar a ElevenLabs (no necesita clave).
    if (args.includes("--dry")) {
      console.log(`Voz: ${VOICE_ID || VOICE_NAME}, modelo ${MODEL}\n`);
      for (const w of loadWebs()) console.log(`[${w.slug}] (${script(w).length} caracteres)\n${script(w)}\n`);
      return;
    }
    if (!KEY) throw new Error('Falta la clave. En PowerShell: $env:ELEVENLABS_API_KEY = "tu-clave"');
    if (args.includes("--list")) return await listVoices();

    const webs = loadWebs().filter(w => !only.length || only.includes(w.slug));
    if (!webs.length) throw new Error(`Ninguna entrada se llama: ${only.join(", ")}`);
    const voice = await resolveVoice();
    console.log(`Voz: ${voice.name} (${voice.id}), modelo ${MODEL}`);
    fs.mkdirSync(OUT, { recursive: true });
    for (const w of webs) await generate(w, voice);
    console.log("Listo. Ahora ejecuta: bash build.sh");
  } catch (e) {
    console.error("Error:", e.message);
    process.exitCode = 1;
  }
})();

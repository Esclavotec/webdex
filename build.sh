#!/usr/bin/env bash
# Construye index.html a partir de src/webdex.template.html,
# incrustando cada logo de assets/ como data URI (el artefacto bloquea imágenes externas).
set -e
cd "$(dirname "$0")"
out=$(cat src/webdex.template.html)
embed() { # $1 = marcador, $2 = archivo, $3 = tipo MIME
  local data="data:$3;base64,$(base64 -w0 "$2")"
  out="${out//\{\{$1\}\}/$data}"
}
embed LOGO_POKEDOKU     assets/pokedoku.svg     image/svg+xml
embed LOGO_POKEROGUE    assets/pokerogue.png    image/png
embed LOGO_POKESURVIVOR assets/pokesurvivor.png image/png
embed LOGO_POKEBONK      assets/pokebonk.ico      image/x-icon
embed LOGO_POKECLASH     assets/pokeclash.png     image/png
embed LOGO_SURVIVORTIERS assets/survivortiers.svg image/svg+xml
embed LOGO_POKEISAAC     assets/pokeisaac.png     image/png
embed ICON_SVG           assets/icon.svg          image/svg+xml   # icono de la pestaña (icon.js)

# Voces de ElevenLabs: cada assets/voz/<slug>.mp3 que exista se incrusta en VOICE_MP3.
voices=""
for f in assets/voz/*.mp3; do
  [ -f "$f" ] || continue
  voices+="\"$(basename "$f" .mp3)\":\"data:audio/mpeg;base64,$(base64 -w0 "$f")\","
done
out="${out//\/\*\{\{VOICES\}\}\*\//$voices}"
echo "voces incrustadas: $(ls assets/voz/*.mp3 2>/dev/null | wc -l)"

printf '%s\n' "$out" > index.html
echo "index.html generado ($(wc -c < index.html) bytes)"

# Copia independiente con <!doctype> para abrirla con doble clic (sin servidor).
mkdir -p dist
# Lo que va antes del primer <style> (título, metas, iconos y fuentes) se coloca en <head>.
head_end=$(grep -n -m1 '^<style>' index.html | cut -d: -f1)
{ printf '<!doctype html>\n<html lang="es">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n'
  head -n $((head_end - 1)) index.html
  printf '</head>\n<body>\n'
  tail -n +"$head_end" index.html
  printf '</body>\n</html>\n'; } > dist/index.html
echo "dist/index.html generado"

# Iconos PNG (Safari, pantalla de inicio del móvil) junto a la web publicada.
mkdir -p dist/assets
cp assets/icon-32.png assets/icon-180.png dist/assets/
echo "iconos copiados a dist/assets/"

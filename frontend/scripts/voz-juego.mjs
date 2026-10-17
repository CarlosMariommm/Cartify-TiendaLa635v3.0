// LA VOZ GRABADA DEL RETO DE TIQUI — scripts/voz-juego.mjs
// El juego del stand (pages/JuegoTiqui.jsx) no le pide la voz al servidor cada vez que alguien
// juega: la reproduce grabada desde public/juego/voz/.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { clipsDeVoz, archivoDeVoz } from '../src/utils/juegoTiqui.js';
import { paraDecir } from '../src/utils/vozTiqui.js';

const SERVIDOR = process.env.SERVIDOR || 'https://cartify-tiendala635.onrender.com/api';
const CARPETA = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'public', 'juego', 'voz');
// 30 frases por minuto: el servidor corta a las 40 (topeCharla en routes/ai.js).
const PAUSA_MS = 2000;
// Lo que suma la etiqueta del ánimo ("[excited] ") a lo que cobra ElevenLabs.
const POR_ETIQUETA = 12;

const opciones = new Set(process.argv.slice(2));
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

fs.mkdirSync(CARPETA, { recursive: true });
const clips = clipsDeVoz();
const enDisco = new Set(fs.readdirSync(CARPETA).filter((f) => f.endsWith('.mp3')));
const usados = new Set(clips.map(archivoDeVoz));
const faltan = clips.filter((c) => !enDisco.has(archivoDeVoz(c)));
const viejos = [...enDisco].filter((f) => !usados.has(f));
const caracteres = faltan.reduce((s, c) => s + paraDecir(c.texto).length + (c.animo ? POR_ETIQUETA : 0), 0);

console.log(`Frases del juego: ${clips.length}. Ya grabadas: ${clips.length - faltan.length}. Faltan: ${faltan.length}.`);
console.log(`Caracteres por grabar (más o menos, contando la etiqueta del ánimo): ${caracteres}.`);

if (viejos.length) {
  if (opciones.has('--limpiar')) {
    for (const f of viejos) fs.unlinkSync(path.join(CARPETA, f));
    console.log(`Borrados ${viejos.length} audios viejos.`);
  } else {
    console.log(`Hay ${viejos.length} audios viejos que ya no usa ninguna frase (se borran con npm run voz-juego:limpiar).`);
  }
}

if (!opciones.has('--grabar')) {
  if (faltan.length) console.log('\nNo se grabó nada. Para grabar: npm run voz-juego:grabar');
  process.exit(0);
}
if (!faltan.length) process.exit(0);

// Despierta el servidor (Render se duerme) y confirma que la voz está encendida.
console.log('\nDespertando el servidor…');
const listo = await fetch(`${SERVIDOR}/ai/listo`).then((r) => r.json()).catch(() => null);
if (!listo?.voz) {
  console.error('El servidor no tiene la voz de Tiqui encendida (ELEVENLABS_API_KEY en Render). Enciéndela y vuelve a correrlo.');
  process.exit(1);
}

let grabadas = 0;
for (const clip of faltan) {
  const url = `${SERVIDOR}/ai/voz?t=${encodeURIComponent(clip.texto)}${clip.animo ? `&a=${clip.animo}` : ''}`;
  try {
    const r = await fetch(url);
    const tipo = r.headers.get('content-type') || '';
    if (r.status === 429) {
      console.log('El servidor pidió una pausa; espero un minuto…');
      await esperar(60000);
    }
    if (!r.ok || !tipo.startsWith('audio')) {
      console.error(`✗ ${clip.id}: el servidor respondió ${r.status}`);
      continue;
    }
    const audio = Buffer.from(await r.arrayBuffer());
    if (audio.length < 2000) {
      console.error(`✗ ${clip.id}: el audio llegó vacío`);
      continue;
    }
    fs.writeFileSync(path.join(CARPETA, archivoDeVoz(clip)), audio);
    grabadas += 1;
    console.log(`✓ ${clip.id} (${Math.round(audio.length / 1024)} KB)`);
  } catch (error) {
    console.error(`✗ ${clip.id}: ${error.message}`);
  }
  await esperar(PAUSA_MS);
}

console.log(`\nListo: ${grabadas} de ${faltan.length} grabadas en public/juego/voz/.`);
if (grabadas < faltan.length) console.log('Las que fallaron se pueden volver a pedir corriendo lo mismo (no repite las que ya están).');

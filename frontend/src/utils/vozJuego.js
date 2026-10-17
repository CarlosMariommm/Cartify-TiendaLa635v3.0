import { decirConTiqui, callarTiqui, paraDecir } from './vozTiqui';
import { archivoDeVoz } from './juegoTiqui';

// LA VOZ DE TIQUI EN EL RETO DEL STAND — vozJuego.js
// En el juego Tiqui NO pide su voz al servidor: todo lo que dice está grabado de antemano en
// public/juego/voz/ (ver scripts/voz-juego.mjs).

const grabadas = new Map(); // id de la frase → URL del audio en memoria

export const cargarVozGrabada = async (clips) => {
  await Promise.all(clips.map(async (clip) => {
    if (grabadas.has(clip.id)) return;
    try {
      const r = await fetch(`/juego/voz/${archivoDeVoz(clip)}`);
      // Un audio que no existe vuelve como la página (index.html) y no como audio.
      if (!r.ok || !(r.headers.get('content-type') || '').startsWith('audio')) return;
      grabadas.set(clip.id, URL.createObjectURL(await r.blob()));
    } catch {
      // Sin ese audio, habla el navegador.
    }
  }));
  return clips.filter((c) => grabadas.has(c.id)).length;
};

// La voz del navegador, por si falta un audio: una en español, de mujer si hay (Tiqui es ella), un
// poco más aguda.
const vozDelNavegador = () => {
  const voces = window.speechSynthesis?.getVoices?.() || [];
  const enEspanol = voces.filter((v) => /^es/i.test(v.lang));
  return enEspanol.find((v) => /(sabina|paulina|dalia|elena|helena|laura|m[oó]nica|elvira|paloma|female|mujer)/i.test(v.name))
    || enEspanol[0]
    || null;
};

let turno = 0;
let seguro = null;
// Chrome suelta la frase si nadie la sostiene, y entonces nunca avisa que terminó.
let fraseActual = null;

export const callar = () => {
  turno += 1;
  clearTimeout(seguro);
  callarTiqui();
  try { window.speechSynthesis?.cancel(); } catch { /* nada que callar */ }
};

// Dice la frase. `alEmpezar(real)`: ya se oye (real = con su voz grabada, que mueve la boca con el
// volumen). `alTerminar`: terminó o no se pudo.
export const decir = (clip, { alEmpezar, alTerminar } = {}) => {
  callar();
  const mio = turno;
  const vigente = () => mio === turno;
  let terminado = false;
  const terminar = () => {
    if (!vigente() || terminado) return;
    terminado = true;
    clearTimeout(seguro);
    alTerminar?.();
  };
  // Por si el navegador nunca avisa que terminó: el juego no se queda esperando.
  seguro = setTimeout(terminar, 4000 + clip.texto.length * 110);

  const conElNavegador = () => {
    if (!vigente()) return;
    const s = window.speechSynthesis;
    if (!s) return terminar();
    const frase = new SpeechSynthesisUtterance(paraDecir(clip.texto));
    const v = vozDelNavegador();
    if (v) frase.voice = v;
    frase.lang = v?.lang || 'es-MX';
    frase.pitch = 1.3;
    frase.rate = 1.04;
    frase.onstart = () => vigente() && alEmpezar?.(false);
    frase.onend = terminar;
    frase.onerror = terminar;
    fraseActual = frase;
    s.cancel();
    s.speak(fraseActual);
  };

  const url = grabadas.get(clip.id);
  if (!url) return conElNavegador();
  decirConTiqui(url, {
    alEmpezar: () => vigente() && alEmpezar?.(true),
    alTerminar: terminar,
    alFallar: conElNavegador,
  });
};

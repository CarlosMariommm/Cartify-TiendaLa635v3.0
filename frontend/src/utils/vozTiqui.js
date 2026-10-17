// LA VOZ DE TIQUI EN EL NAVEGADOR — vozTiqui.js
// Reproduce lo que dice Tiqui con su voz (la del video), pedida al servidor en /api/ai/voz. El
// <audio> empieza a sonar con los primeros pedazos: no espera a que llegue la frase entera.

// Lo que se escribe no siempre es lo que se dice, también con la voz del navegador. Sin esto, las
// voces en español de México o Estados Unidos leían "$12.50" como "doce PESOS cincuenta": la
// tienda cobra en dólares.
const dineroParaDecir = (_, enteros, decimales = '') => {
  const d = Number(enteros);
  const c = decimales ? Number(decimales.padEnd(2, '0')) : 0;
  const dolares = d === 1 ? '1 dólar' : `${d} dólares`;
  const centavos = c === 1 ? '1 centavo' : `${c} centavos`;
  if (!c) return dolares;
  if (!d) return centavos;
  return `${dolares} con ${centavos}`;
};

export const paraDecir = (texto) =>
  String(texto || '')
    .replace(/\b635\b/g, 'seis tres cinco')
    .replace(/\b(\d+)\s?[xX×]\s?(\d+)\b/g, '$1 por $2')
    .replace(/\$\s?(\d+)(?:[.,](\d{1,2}))?/g, dineroParaDecir)
    .replace(/\s+/g, ' ')
    .trim();

const ESPERA_MAXIMA_MS = 4000;

let audio = null;
let contexto = null;
let analizador = null;
let muestras = null;
let cuadro = 0;
let turno = 0; // cada frase nueva invalida los avisos de la anterior

const raiz = () => document.documentElement;

const ponerBoca = (nivel) => raiz().style.setProperty('--voz-tiqui', nivel.toFixed(3));

// El analizador se arma una sola vez y recién al primer uso: el navegador no deja crear audio
// antes de que la persona toque algo, y para cuando Tiqui habla ya tocó el micrófono.
const prepararAnalizador = () => {
  if (analizador || !audio) return;
  try {
    const Contexto = window.AudioContext || window.webkitAudioContext;
    if (!Contexto) return;
    contexto = new Contexto();
    const fuente = contexto.createMediaElementSource(audio);
    analizador = contexto.createAnalyser();
    analizador.fftSize = 512;
    muestras = new Uint8Array(analizador.fftSize);
    fuente.connect(analizador);
    analizador.connect(contexto.destination);
  } catch {
    // Sin analizador la voz suena igual; la boca se mueve con la animación de siempre.
    analizador = null;
  }
};

const seguirBoca = () => {
  if (!analizador) return;
  analizador.getByteTimeDomainData(muestras);
  let suma = 0;
  for (let i = 0; i < muestras.length; i++) {
    const v = (muestras[i] - 128) / 128;
    suma += v * v;
  }
  // El volumen de la voz ronda 0,05–0,3: se estira a 0–1 para que la boca se note.
  ponerBoca(Math.min(1, Math.sqrt(suma / muestras.length) * 4));
  cuadro = requestAnimationFrame(seguirBoca);
};

const pararBoca = () => {
  cancelAnimationFrame(cuadro);
  ponerBoca(0);
};

// Dice `url` (de aiService.urlVoz). Devuelve una función para callarla. velocidad: 1 es normal (el
// audio conserva el tono al acelerar). alEmpezar: ya se oye. alTerminar: terminó bien. alFallar:
// no se pudo.
export const decirConTiqui = (url, { velocidad = 1, alEmpezar, alTerminar, alFallar } = {}) => {
  const miTurno = ++turno;
  const vigente = () => miTurno === turno;

  if (!audio) {
    audio = new Audio();
    // Sin esto el analizador no puede leer un audio que viene de otro dominio.
    audio.crossOrigin = 'anonymous';
    audio.preload = 'auto';
  }
  prepararAnalizador();
  contexto?.resume?.().catch(() => {});

  let empezo = false;
  const espera = setTimeout(() => {
    if (!vigente() || empezo) return;
    audio.pause();
    pararBoca();
    alFallar?.();
  }, ESPERA_MAXIMA_MS);

  audio.onplaying = () => {
    if (!vigente()) return;
    empezo = true;
    clearTimeout(espera);
    cancelAnimationFrame(cuadro);
    seguirBoca();
    alEmpezar?.();
  };
  audio.onended = () => {
    if (!vigente()) return;
    clearTimeout(espera);
    pararBoca();
    alTerminar?.();
  };
  audio.onerror = () => {
    if (!vigente()) return;
    clearTimeout(espera);
    pararBoca();
    // Si ya se estaba oyendo y se cortó, se da por dicho; si nunca sonó, que hable el sistema.
    if (empezo) alTerminar?.();
    else alFallar?.();
  };

  audio.src = url;
  audio.playbackRate = velocidad;
  audio.preservesPitch = true;
  audio.play().catch(() => {
    if (!vigente()) return;
    clearTimeout(espera);
    pararBoca();
    alFallar?.();
  });

  return () => {
    if (!vigente()) return;
    turno += 1;
    clearTimeout(espera);
    audio.pause();
    pararBoca();
  };
};

// Calla lo que esté diciendo, sin avisar a nadie (interrumpir, cerrar, silenciar).
export const callarTiqui = () => {
  turno += 1;
  if (audio) audio.pause();
  pararBoca();
};

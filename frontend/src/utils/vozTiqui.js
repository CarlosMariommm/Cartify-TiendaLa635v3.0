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

// En el iPhone el analizador deja la voz muda (el audio de otro dominio sale en silencio): ahí la
// boca se mueve con la animación de siempre.
const esIphone = () =>
  typeof navigator !== 'undefined' &&
  (/iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));

const crearAudio = () => {
  if (audio) return;
  audio = new Audio();
  // Sin esto el analizador no puede leer un audio que viene de otro dominio.
  audio.crossOrigin = 'anonymous';
  audio.preload = 'auto';
};

// Una décima de segundo de silencio: se toca en el mismo toque del micrófono para que el teléfono
// deje sonar después la voz que llega de la IA.
let silencio = '';
const urlSilencio = () => {
  if (silencio) return silencio;
  const n = 800;
  const bytes = new Uint8Array(44 + n);
  const vista = new DataView(bytes.buffer);
  const texto = (pos, s) => [...s].forEach((c, i) => vista.setUint8(pos + i, c.charCodeAt(0)));
  texto(0, 'RIFF'); vista.setUint32(4, 36 + n, true); texto(8, 'WAVEfmt ');
  vista.setUint32(16, 16, true); vista.setUint16(20, 1, true); vista.setUint16(22, 1, true);
  vista.setUint32(24, 8000, true); vista.setUint32(28, 8000, true);
  vista.setUint16(32, 1, true); vista.setUint16(34, 8, true);
  texto(36, 'data'); vista.setUint32(40, n, true); bytes.fill(128, 44);
  silencio = URL.createObjectURL(new Blob([bytes], { type: 'audio/wav' }));
  return silencio;
};

// El analizador se arma una sola vez, dentro de un toque: fuera de él el teléfono deja el
// contexto de audio pausado y todo lo que pasa por ahí sale mudo.
const prepararAnalizador = () => {
  if (analizador || !audio || esIphone()) return;
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

  crearAudio();
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

// Se llama en el toque del micrófono: destraba el audio y la voz del sistema en el teléfono, que
// solo dejan sonar si el primer sonido sale de un toque. Sin esto Tiqui quedaba muda en el celular.
export const desbloquearAudio = () => {
  if (typeof window === 'undefined') return;
  try {
    crearAudio();
    prepararAnalizador();
    contexto?.resume?.().catch(() => {});
    if (audio.paused) {
      audio.src = urlSilencio();
      audio.play().catch(() => {});
    }
  } catch { /* sin audio, habla el sistema */ }
  try {
    const synth = window.speechSynthesis;
    if (synth && !synth.speaking) {
      const nada = new SpeechSynthesisUtterance(' ');
      nada.volume = 0;
      synth.speak(nada);
    }
  } catch { /* el navegador no tiene voz propia */ }
};

// Calla lo que esté diciendo, sin avisar a nadie (interrumpir, cerrar, silenciar).
export const callarTiqui = () => {
  turno += 1;
  if (audio) audio.pause();
  pararBoca();
};

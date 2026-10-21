// LA VOZ DE TIQUI EN EL TELÉFONO — vozTiqui.js
// El equivalente de `frontend/src/utils/vozTiqui.js`: reproduce lo que dice Tiqui con su voz (la
// del video), pedida al servidor en /api/ai/voz.

let ExpoAudio = null;
try {
  ExpoAudio = require('expo-audio');
} catch {
  ExpoAudio = null;
}

export const vozTiquiPosible = Boolean(ExpoAudio?.createAudioPlayer);

// Lo que se escribe no siempre es lo que se dice, también con la voz del teléfono. Sin esto,
// "$12.50" salía como "doce PESOS cincuenta": la tienda cobra en dólares. "$12.50" → "12 dólares
// con 50 centavos" "$0.41" → "41 centavos" "635" → "seis tres cinco" "2x1" → "2 por 1"
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

const ESPERA_MAXIMA_MS = 5000;

let reproductor = null;
let suscripcion = null;
let turno = 0;

const soltar = () => {
  suscripcion?.remove?.();
  suscripcion = null;
  try { reproductor?.pause?.(); } catch { /* ya estaba parado */ }
  try { reproductor?.remove?.(); } catch { /* ya estaba liberado */ }
  reproductor = null;
};

// Dice `url` (de asistenteApi.urlVoz). Devuelve una función para callarla. velocidad: 1 es normal.
// alEmpezar: ya se oye. alTerminar: terminó bien. alFallar: no se pudo (hablar con el teléfono).
export const decirConTiqui = async (url, { velocidad = 1, alEmpezar, alTerminar, alFallar } = {}) => {
  const miTurno = ++turno;
  const vigente = () => miTurno === turno;

  if (!vozTiquiPosible) {
    alFallar?.();
    return;
  }

  soltar();

  try {
    // Antes de cada frase: el reconocedor deja el audio en modo "grabar" y la voz salía bajito por el
    // auricular. Así suena por el parlante, aunque el iPhone esté en silencio.
    await ExpoAudio.setAudioModeAsync({ playsInSilentMode: true, allowsRecording: false, interruptionMode: 'duckOthers' });
    if (!vigente()) return;

    const jugador = ExpoAudio.createAudioPlayer({ uri: url });
    reproductor = jugador;
    let empezo = false;

    const espera = setTimeout(() => {
      if (!vigente() || empezo) return;
      soltar();
      alFallar?.();
    }, ESPERA_MAXIMA_MS);

    suscripcion = jugador.addListener('playbackStatusUpdate', (estado) => {
      if (!vigente()) return;
      if (estado?.playing && !empezo) {
        empezo = true;
        clearTimeout(espera);
        alEmpezar?.();
      }
      if (estado?.didJustFinish) {
        clearTimeout(espera);
        soltar();
        alTerminar?.();
      }
    });

    try { jugador.setPlaybackRate(velocidad); } catch { /* algunas versiones solo aceptan 1 */ }
    jugador.play();
  } catch {
    if (!vigente()) return;
    soltar();
    alFallar?.();
  }
};

// Calla lo que esté diciendo, sin avisar a nadie (interrumpir, cerrar, silenciar).
export const callarTiqui = () => {
  turno += 1;
  soltar();
};

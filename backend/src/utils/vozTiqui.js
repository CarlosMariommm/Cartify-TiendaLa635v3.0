// LA VOZ DE TIQUI — vozTiqui.js
// El asistente de voz habla con la voz de Tiqui, la mascota: la misma del video de presentación.

const VOZ_POR_DEFECTO = "HZX0g2vsDbKCRzHJAQ20";
const MODELO_POR_DEFECTO = "eleven_flash_v2_5";

export const modeloDeVoz = () => process.env.ELEVENLABS_MODEL || MODELO_POR_DEFECTO;

// ── El ánimo de cada frase ── Tiqui no dice todo igual: se alegra al agregar algo, se emociona al
// cerrar la compra, se asombra con una oferta, se apena si no hay lo que pidieron, duda si no
// entendió y, muy de vez en cuando, se ríe.
const ETIQUETAS = {
  alegre: "[cheerfully]",
  emocionada: "[excited]",
  asombrada: "[surprised]",
  rie: "[laughs]",
  apenada: "[sad]",
  dudosa: "[curious]",
  // Recién la despertaron (la app, al tocarla dormida): bosteza.
  despertando: "[yawns]",
};
export const ANIMOS = ["normal", ...Object.keys(ETIQUETAS)];
// Los que puede elegir la IA. "despertando" lo pone la app, no la charla.
export const ANIMOS_IA = ANIMOS.filter((a) => a !== "despertando");
const MODELOS_CON_EMOCION = ["eleven_v4_turbo", "eleven_v3_conversational", "eleven_v3"];

export const animoValido = (animo) => (ANIMOS.includes(animo) ? animo : "normal");

export const conEmocion = (texto, animo, modelo = modeloDeVoz()) =>
  ETIQUETAS[animo] && MODELOS_CON_EMOCION.includes(modelo) ? `${ETIQUETAS[animo]} ${texto}` : texto;

// ── ¿De verdad hay voz? ── Tener la llave no basta. Con la cuenta en el plan gratis ElevenLabs
// contesta 402 a cada frase, pero /ai/listo decía "hay voz" igual: la web y la app pedían el audio
// en cada respuesta, esperaban el error y recién ahí hablaban con la voz del dispositivo.
const MEDIA_HORA = 30 * 60 * 1000;
let rotaHasta = 0;
let comprobadaEn = 0;

const recordarRechazo = (estado) => {
  if ([401, 402, 403].includes(estado)) rotaHasta = Date.now() + MEDIA_HORA;
  else if (estado === 429) rotaHasta = Date.now() + 60 * 1000;
};

export const vozDisponible = () => Boolean(process.env.ELEVENLABS_API_KEY) && Date.now() >= rotaHasta;

// Lo que se escribe no siempre es lo que se dice. - La tienda se llama "la seis tres cinco", NUNCA
// "seiscientos treinta y cinco" (lo pidió la tienda para el video y vale igual aquí).
const dineroParaDecir = (_, enteros, decimales = "") => {
  const d = Number(enteros);
  const c = decimales ? Number(decimales.padEnd(2, "0")) : 0;
  const dolares = d === 1 ? "1 dólar" : `${d} dólares`;
  const centavos = c === 1 ? "1 centavo" : `${c} centavos`;
  if (!c) return dolares;
  if (!d) return centavos;
  return `${dolares} con ${centavos}`;
};

export const paraDecir = (texto) =>
  String(texto || "")
    .replace(/\b635\b/g, "seis tres cinco")
    .replace(/\b(\d+)\s?[xX×]\s?(\d+)\b/g, "$1 por $2")
    .replace(/\$\s?(\d+)(?:[.,](\d{1,2}))?/g, dineroParaDecir)
    .replace(/\s+/g, " ")
    .trim();

// Las frases que se repiten ("¿Algo más?", "Vacié tu carrito…") se guardan ya generadas: suenan al
// instante y no se pagan dos veces. Solo en memoria — si el servidor se reinicia, se vuelven a
// pedir y listo.
const MAX_FRASES = 300;
const MAX_BYTES_FRASE = 400 * 1024;
const frases = new Map();

export const frasePrevia = (texto) => {
  const audio = frases.get(texto);
  if (!audio) return null;
  // La más usada se queda: se mueve al final para que no la saque la limpieza.
  frases.delete(texto);
  frases.set(texto, audio);
  return audio;
};

export const guardarFrase = (texto, audio) => {
  if (!audio?.length || audio.length > MAX_BYTES_FRASE) return;
  frases.set(texto, audio);
  while (frases.size > MAX_FRASES) frases.delete(frases.keys().next().value);
};

// Pide el audio a ElevenLabs y devuelve la respuesta tal cual, para que la ruta la vaya pasando al
// cliente mientras llega. `signal` corta el pedido si el cliente se va (lo interrumpieron, cerró
// el asistente).
export const pedirVoz = async (texto, { signal } = {}) => {
  const voz = process.env.ELEVENLABS_VOICE_ID || VOZ_POR_DEFECTO;
  const url =
    `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voz)}/stream` +
    "?output_format=mp3_44100_64";

  const respuesta = await fetch(url, {
    method: "POST",
    headers: {
      "xi-api-key": process.env.ELEVENLABS_API_KEY,
      "Content-Type": "application/json",
      Accept: "audio/mpeg",
    },
    body: JSON.stringify({
      text: texto,
      model_id: modeloDeVoz(),
      language_code: "es",
    }),
    signal,
  });

  if (!respuesta.ok) {
    recordarRechazo(respuesta.status);
    const detalle = await respuesta.text().catch(() => "");
    throw new Error(`ElevenLabs ${respuesta.status}: ${detalle.slice(0, 200)}`);
  }
  comprobadaEn = Date.now();
  return respuesta;
};

// Lo que contestan /ai/listo y /tiqui-panel/listo. Si la voz funcionó hace poco, sí; si se sabe
// rota, no; y si no se sabe, se prueba con una palabra (cuesta cinco caracteres cada media hora).
// Máximo 4 segundos: si ElevenLabs no contesta a tiempo, mejor la voz del dispositivo.
export const comprobarVoz = async () => {
  if (!vozDisponible()) return false;
  if (Date.now() - comprobadaEn < MEDIA_HORA) return true;
  try {
    const respuesta = await pedirVoz("Hola.", { signal: AbortSignal.timeout(4000) });
    await respuesta.body?.cancel?.();
    return true;
  } catch {
    // Si fue un rechazo, pedirVoz ya lo recordó.
    return false;
  }
};

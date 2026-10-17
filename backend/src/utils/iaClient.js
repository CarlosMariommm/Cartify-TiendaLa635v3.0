import { GoogleGenAI } from "@google/genai";

// Cliente de Gemini (Google) — redacta el texto de las promociones. La llave se saca gratis en
// https://aistudio.google.com/apikey (sin tarjeta) y va en el .env como GEMINI_API_KEY.
let cliente = null;

export const getIA = () => {
  if (!process.env.GEMINI_API_KEY) return null;
  if (!cliente) {
    cliente = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return cliente;
};

// Flash es el modelo rápido y con capa gratuita. Se puede cambiar desde el .env si algún día
// quieren uno más potente sin tocar código.
export const MODELO_IA = process.env.GEMINI_MODEL || "gemini-flash-lite-latest";

// El modelo de respaldo, para cuando el primero está saturado. No es "uno peor por si acaso": es
// OTRO modelo, con su propia capacidad. La capa gratuita de Google se congestiona POR MODELO, no
// en conjunto.
export const MODELO_IA_RESPALDO = process.env.GEMINI_MODEL_RESPALDO || "gemini-flash-latest";

// El respaldo del ASISTENTE es otro: Gemma, un modelo abierto de Google que se usa con la misma
// llave. No es tan fino como lite, pero una respuesta en dos segundos le gana a un "se me cortó" a
// los siete.
export const MODELO_ASISTENTE_RESPALDO = process.env.GEMINI_MODEL_ASISTENTE_RESPALDO || "gemma-4-26b-a4b-it";

// Un tercero en la carrera del asistente, entre lite y Gemma. Tiqui esperaba 7 s entre los dos que
// tenía y le decía a todos "me distraje". Con un modelo más (otra capacidad, la congestión es por
// modelo) es más probable que alguno llegue a tiempo.
export const MODELO_ASISTENTE_SEGUNDO = process.env.GEMINI_MODEL_ASISTENTE_SEGUNDO || "gemini-3.5-flash";

// REINTENTOS — el 503 de Google no tiene por qué llegar al cliente
// EL PROBLEMA La capa gratuita de Gemini devuelve 503 UNAVAILABLE ("this model is currently
// experiencing high demand") de forma intermitente.
const TRANSITORIOS = [429, 500, 503];

// El código de error de Google viene dentro del mensaje, como JSON. Se lee con cuidado porque no
// siempre es JSON —a veces es un fallo de red pelado— y aquí reventar sería peor que no saber el
// código.
const codigoDeError = (error) => {
  if (typeof error?.status === "number") return error.status;
  try {
    return JSON.parse(error.message)?.error?.code ?? null;
  } catch {
    return null;
  }
};

const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

// CON PLAZO — para el asistente de voz
// Prueba los modelos uno tras otro con un tiempo máximo y se rinde al acabarse el plazo, para no
// dejar a la persona esperando.

// Llama a la IA aguantando los tropiezos de Google. `peticion` es lo mismo que recibe
// generateContent, PERO sin `model`: el modelo lo elige esta función, que para eso prueba los dos.
// `intentos` es por modelo.
export const generarConIA = async (peticion, { intentos = 3, tiempoMaximo, plazoTotal } = {}) => {
  const ia = getIA();
  if (!ia) throw new Error("La IA no está configurada");

  const limite = plazoTotal ? Date.now() + plazoTotal : Infinity;
  const quedan = () => limite - Date.now();
  let ultimoError = null;

  for (const model of [MODELO_IA, MODELO_IA_RESPALDO]) {
    for (let intento = 1; intento <= intentos; intento++) {
      // Con menos de 800 ms no alcanza ni para una respuesta rápida: se corta.
      if (quedan() < 800) throw ultimoError || new Error("Se acabó el plazo para la IA");

      const corte = tiempoMaximo || plazoTotal ? Math.min(tiempoMaximo || Infinity, quedan()) : null;
      try {
        const config = corte
          ? { ...(peticion.config || {}), abortSignal: AbortSignal.timeout(corte) }
          : peticion.config;
        return await ia.models.generateContent({ ...peticion, config, model });
      } catch (error) {
        ultimoError = error;
        const codigo = codigoDeError(error);

        // Lo que no se arregla solo: se corta aquí y no se hace esperar a nadie.
        if (codigo != null && !TRANSITORIOS.includes(codigo)) throw error;

        // La espera crece entre intentos: si el modelo está congestionado, volver a golpearlo al instante
        // lo encuentra igual de congestionado. Con plazo, la espera es corta: el tiempo es de quien está
        // hablando.
        if (intento < intentos) await esperar(plazoTotal ? 250 : 400 * intento);
      }
    }
    console.log(`IA: "${model}" no respondió en ${intentos} intentos, probando el siguiente modelo`);
  }

  throw ultimoError;
};

// CON COBERTURA — el asistente no espera a un modelo trabado
// `generarConIA` prueba los modelos UNO DETRÁS DE OTRO.
export const generarConCobertura = (
  peticion,
  // 13 s de plazo: la web y la app esperan la respuesta 15 s. Con 7 s, en los días en que Google
  // tarda 8 s, Tiqui se rendía antes de que llegara.
  { modelos = [MODELO_IA, MODELO_ASISTENTE_SEGUNDO, MODELO_ASISTENTE_RESPALDO], cobertura = 1500, plazoTotal = 13000 } = {}
) => {
  const ia = getIA();
  if (!ia) return Promise.reject(new Error("La IA no está configurada"));

  const lista = modelos.filter((m, i) => m && modelos.indexOf(m) === i);
  const general = new AbortController();

  return new Promise((resolver, rechazar) => {
    let siguiente = 0;
    let pendientes = 0;
    let terminado = false;
    let ultimoError = null;
    let reloj = null;

    const plazo = setTimeout(() => {
      if (terminado) return;
      terminado = true;
      clearTimeout(reloj);
      general.abort();
      rechazar(ultimoError || new Error("Se acabó el plazo para la IA"));
    }, plazoTotal);

    const cerrar = () => {
      terminado = true;
      clearTimeout(plazo);
      clearTimeout(reloj);
      // Corta los pedidos que siguen en camino: su respuesta ya no sirve.
      general.abort();
    };

    const lanzar = () => {
      if (terminado || siguiente >= lista.length) return;
      const model = lista[siguiente++];
      pendientes += 1;
      clearTimeout(reloj);
      // Si este no contesta en `cobertura`, entra el siguiente en paralelo.
      reloj = setTimeout(lanzar, cobertura);

      ia.models
        .generateContent({ ...peticion, model, config: { ...(peticion.config || {}), abortSignal: general.signal } })
        .then((respuesta) => {
          if (terminado) return;
          cerrar();
          resolver(respuesta);
        })
        .catch((error) => {
          pendientes -= 1;
          if (terminado) return;
          ultimoError = error;
          console.log(`IA (asistente): "${model}" falló — ${String(codigoDeError(error) ?? error.message).slice(0, 60)}`);
          // Falló rápido: el siguiente entra ya, sin esperar la cobertura.
          if (siguiente < lista.length) lanzar();
          else if (pendientes === 0) {
            cerrar();
            rechazar(ultimoError);
          }
        });
    };

    lanzar();
  });
};

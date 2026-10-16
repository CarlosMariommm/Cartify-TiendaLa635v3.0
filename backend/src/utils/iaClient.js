import { GoogleGenAI } from "@google/genai";

/*
 * Cliente de Gemini (Google) — redacta el texto de las promociones.
 *
 * La llave se saca gratis en https://aistudio.google.com/apikey (sin tarjeta) y
 * va en el .env como GEMINI_API_KEY. Si no está configurada devolvemos null y
 * el controlador cae en las plantillas locales: la tienda nunca se queda sin
 * el botón funcionando.
 */
let cliente = null;

export const getIA = () => {
  if (!process.env.GEMINI_API_KEY) return null;
  if (!cliente) {
    cliente = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return cliente;
};

/*
 * Flash es el modelo rápido y con capa gratuita. Se puede cambiar desde el .env
 * si algún día quieren uno más potente sin tocar código.
 *
 * Va el alias "latest" y no una versión clavada a propósito: estaba fijo en
 * gemini-2.5-flash, Google lo retiró para llaves nuevas y la API empezó a
 * responder 404. Como el controlador cae en las plantillas cuando la IA falla,
 * nadie se enteró: el botón "Generar con IA" seguía funcionando y devolvía
 * texto de reglas. El alias se mueve solo cuando Google jubila una versión.
 */
export const MODELO_IA = process.env.GEMINI_MODEL || "gemini-flash-lite-latest";

/*
 * El modelo de respaldo, para cuando el primero está saturado.
 *
 * No es "uno peor por si acaso": es OTRO modelo, con su propia capacidad. La
 * capa gratuita de Google se congestiona POR MODELO, no en conjunto.
 *
 * El orden salió de medirlo, no de suponerlo: en 8 llamadas seguidas,
 * "gemini-flash-latest" fallo con 503 sus tres intentos LAS OCHO VECES, y las
 * ocho las contesto "lite" al primer intento. Asi que lite va de primero y
 * flash de respaldo, no al reves.
 *
 * Si algun dia se da vuelta —la congestion se mueve— se cambia sin tocar
 * codigo, con GEMINI_MODEL y GEMINI_MODEL_RESPALDO en el .env.
 */
export const MODELO_IA_RESPALDO = process.env.GEMINI_MODEL_RESPALDO || "gemini-flash-latest";

/*
 * El respaldo del ASISTENTE es otro: Gemma, un modelo abierto de Google que
 * se usa con la misma llave. Medido el 23-09-2026, con TODOS los Gemini
 * "flash" devolviendo 503 a la vez (lite, flash, 3.1, 3.5, 3.7, 3.8): Gemma
 * contestó cada vez, en 1–2,6 s, con las herramientas y tuteando bien. No es
 * tan fino como lite, pero una respuesta en dos segundos le gana a un
 * "se me cortó" a los siete.
 */
export const MODELO_ASISTENTE_RESPALDO = process.env.GEMINI_MODEL_ASISTENTE_RESPALDO || "gemma-4-26b-a4b-it";

/*
 * Un tercero en la carrera del asistente, entre lite y Gemma. Medido el
 * 16-10-2026, con Google saturado: lite tardaba 7,5–13 s, Gemma 27 s y
 * "flash-latest" daba 503; "gemini-3.5-flash" contestó en 3 y 8 s. Tiqui
 * esperaba 7 s entre los dos que tenía y le decía a todos "me distraje".
 * Con un modelo más (otra capacidad, la congestión es por modelo) es más
 * probable que alguno llegue a tiempo. Se cambia con GEMINI_MODEL_ASISTENTE_SEGUNDO.
 */
export const MODELO_ASISTENTE_SEGUNDO = process.env.GEMINI_MODEL_ASISTENTE_SEGUNDO || "gemini-3.5-flash";

/*
 * ============================================================
 * REINTENTOS — el 503 de Google no tiene por qué llegar al cliente
 * ============================================================
 * EL PROBLEMA
 * La capa gratuita de Gemini devuelve 503 UNAVAILABLE ("this model is
 * currently experiencing high demand") de forma intermitente. Medido en esta
 * tienda: 2 de cada 4 llamadas seguidas fallaban, sin que nada estuviera mal
 * configurado. El código se rendía al primer intento y caía a las plantillas,
 * así que el dueño tocaba "Generar con IA" y le salía un texto de reglas una
 * de cada dos veces, sin entender por qué.
 *
 * Un 503 es justamente el error que se reintenta: es temporal, y el siguiente
 * intento suele pasar. Con la mitad de fallos, tres intentos llevan el acierto
 * de ~50% a ~87%, y probar además el otro modelo lo sube más.
 *
 * QUÉ SE REINTENTA Y QUÉ NO
 * Solo lo transitorio: 503 (saturado), 429 (pasó el límite por minuto) y 500
 * (error interno de Google). Una llave inválida (403), un modelo que ya no
 * existe (404) o un prompt mal armado (400) NO se reintentan: no se van a
 * arreglar solos y repetirlos solo hace esperar al que está mirando.
 * ============================================================
 */
const TRANSITORIOS = [429, 500, 503];

/*
 * El código de error de Google viene dentro del mensaje, como JSON. Se lee con
 * cuidado porque no siempre es JSON —a veces es un fallo de red pelado— y aquí
 * reventar sería peor que no saber el código.
 */
const codigoDeError = (error) => {
  if (typeof error?.status === "number") return error.status;
  try {
    return JSON.parse(error.message)?.error?.code ?? null;
  } catch {
    return null;
  }
};

const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

/*
 * ============================================================
 * CON PLAZO — para el asistente de voz
 * ============================================================
 * Medido en esta tienda (septiembre 2026): "flash-lite" contesta al
 * asistente en 0,5–1 s tal como viene. El que tardaba era el RESPALDO:
 * "flash-latest" no contestó en 9 s ni una vez de tres. Y el respaldo
 * entraba apenas lite tropezaba con un 503 —cosa de todos los días en la
 * capa gratis—, así que la persona se quedaba callada mirando la pantalla.
 *
 * Se probó también apagar el razonamiento interno y no sirve: lite rechaza
 * thinkingBudget: 0 con un 400, y flash no acepta el nivel mínimo. Lite ya
 * es rápido sin tocarle nada; el problema era cuánto se esperaba.
 *
 * Con `plazoTotal` (ms) la función deja de probar cuando se acaba el tiempo,
 * y cada llamada se corta por su cuenta con `tiempoMaximo`. El asistente
 * reintenta lite (que es el que contesta) y solo si sobra tiempo prueba el
 * respaldo. Pasado el plazo se rinde: más vale decir "se me cortó" que
 * dejar a alguien esperando medio minuto.
 *
 * El corte es de NUESTRO lado (abortSignal), no con httpOptions.timeout:
 * ese viaja a Google como plazo de la petición, y Google rechaza con 400
 * cualquier plazo menor a 10 segundos.
 * ============================================================
 */

/*
 * Llama a la IA aguantando los tropiezos de Google.
 *
 * `peticion` es lo mismo que recibe generateContent, PERO sin `model`: el
 * modelo lo elige esta función, que para eso prueba los dos.
 *
 * `intentos` es por modelo. Se deja configurable porque no todas las llamadas
 * pueden esperar lo mismo: al asistente de voz le habla alguien en la cara y
 * tiene que contestar ya, mientras que redactar una promoción puede tardar
 * unos segundos más si a cambio sale con IA de verdad.
 *
 * `tiempoMaximo` y `plazoTotal`: ver CON PLAZO, arriba.
 */
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

        /*
         * La espera crece entre intentos: si el modelo está congestionado,
         * volver a golpearlo al instante lo encuentra igual de congestionado.
         * Con plazo, la espera es corta: el tiempo es de quien está hablando.
         */
        if (intento < intentos) await esperar(plazoTotal ? 250 : 400 * intento);
      }
    }
    console.log(`IA: "${model}" no respondió en ${intentos} intentos, probando el siguiente modelo`);
  }

  throw ultimoError;
};

/*
 * ============================================================
 * CON COBERTURA — el asistente no espera a un modelo trabado
 * ============================================================
 * `generarConIA` prueba los modelos UNO DETRÁS DE OTRO. Con Gemini saturado
 * eso no sirve para una conversación: el primero se cuelga hasta que se le
 * acaba el tiempo, y para cuando le toca al respaldo ya no queda plazo. Se
 * vio en el registro: "no respondió en 2 intentos, probando el siguiente
 * modelo" y enseguida "se acabó el plazo".
 *
 * Aquí el primero sale solo y, si en `cobertura` ms no contestó (o falló),
 * sale el siguiente EN PARALELO. Gana el primero que conteste y a los demás
 * se les corta el pedido. Cuando Gemini anda bien contesta él en menos de un
 * segundo y el respaldo ni se entera; cuando no, contesta el respaldo sin
 * haber esperado al que estaba trabado.
 * ============================================================
 */
export const generarConCobertura = (
  peticion,
  /*
   * 13 s de plazo: la web y la app esperan la respuesta 15 s. Con 7 s, en
   * los días en que Google tarda 8 s, Tiqui se rendía antes de que llegara.
   */
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

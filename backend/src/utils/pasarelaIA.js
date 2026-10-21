// LA PASARELA DE IA — pasarelaIA.js
// Respaldo de Gemini: OpenRouter (modelos gratis) o LLM Gateway, que hablan "estilo OpenAI". Traduce
// la petición de Gemini a ese formato y la respuesta de vuelta, para que Tiqui no note la diferencia.

// Los modelos gratis de OpenRouter que aceptan herramientas (revisado el 21-10-2026). Se cambian
// con OPENROUTER_MODELOS="a,b,c" sin tocar código; OpenRouter prueba el siguiente si uno falla.
const MODELOS_OPENROUTER = [
  "minimax/minimax-m3.1-flash:free",
  "nvidia/nemotron-3-super-120b-a12b:free",
  "google/gemma-4-31b-it:free",
];

const lista = (texto) => String(texto || "").split(",").map((m) => m.trim()).filter(Boolean);

// Cuál está configurada: OpenRouter si tiene llave; si no, LLM Gateway. null si ninguna.
export const pasarela = () => {
  if (process.env.OPENROUTER_API_KEY) {
    const modelos = lista(process.env.OPENROUTER_MODELOS);
    return {
      nombre: "OpenRouter",
      url: "https://openrouter.ai/api/v1/chat/completions",
      llave: process.env.OPENROUTER_API_KEY,
      modelos: modelos.length ? modelos : MODELOS_OPENROUTER,
    };
  }
  if (process.env.LLMGATEWAY_API_KEY) {
    const modelos = lista(process.env.LLMGATEWAY_MODELOS);
    return {
      nombre: "LLM Gateway",
      url: "https://api.llmgateway.io/v1/chat/completions",
      llave: process.env.LLMGATEWAY_API_KEY,
      modelos: modelos.length ? modelos : ["auto"],
    };
  }
  return null;
};

// El esquema de Gemini (Type.OBJECT = "OBJECT") al JSON Schema de siempre ("object").
export const esquemaJson = (esquema) => {
  if (!esquema || typeof esquema !== "object") return esquema;
  if (Array.isArray(esquema)) return esquema.map(esquemaJson);
  const salida = {};
  for (const [clave, valor] of Object.entries(esquema)) {
    if (clave === "type" && typeof valor === "string") salida.type = valor.toLowerCase();
    else if (clave === "properties") {
      salida.properties = Object.fromEntries(Object.entries(valor).map(([k, v]) => [k, esquemaJson(v)]));
    } else if (clave === "items") salida.items = esquemaJson(valor);
    else salida[clave] = valor;
  }
  return salida;
};

// Lo que viene en `contents`: un texto o la lista de Gemini ({ role, parts: [{ text }] }).
const aMensajes = (contents) => {
  if (typeof contents === "string") return [{ role: "user", content: contents }];
  return (Array.isArray(contents) ? contents : [contents]).map((c) => ({
    role: c?.role === "model" ? "assistant" : "user",
    content: (c?.parts || []).map((p) => p.text || "").join("\n") || String(c?.text || c || ""),
  }));
};

// La petición de Gemini ({ contents, config }) en formato OpenAI.
export const traducirPeticion = ({ contents, config = {} }, modelos) => {
  const cuerpo = {
    messages: [
      ...(config.systemInstruction ? [{ role: "system", content: String(config.systemInstruction) }] : []),
      ...aMensajes(contents),
    ],
  };
  if (modelos.length > 1) cuerpo.models = modelos;
  else cuerpo.model = modelos[0];
  if (config.temperature != null) cuerpo.temperature = config.temperature;

  const funciones = (config.tools || []).flatMap((t) => t.functionDeclarations || []);
  if (funciones.length) {
    cuerpo.tools = funciones.map((f) => ({
      type: "function",
      function: { name: f.name, description: f.description || "", parameters: esquemaJson(f.parameters) },
    }));
    // ANY de Gemini = tiene que llamar alguna; con una sola permitida, esa.
    const llamada = config.toolConfig?.functionCallingConfig || {};
    const permitidas = llamada.allowedFunctionNames || [];
    if (permitidas.length === 1) cuerpo.tool_choice = { type: "function", function: { name: permitidas[0] } };
    else if (String(llamada.mode || "").toUpperCase() === "ANY") cuerpo.tool_choice = "required";
  }
  if (config.responseMimeType === "application/json") cuerpo.response_format = { type: "json_object" };
  return cuerpo;
};

// La respuesta en la forma que leen los controladores: `text` y `functionCalls` como en Gemini.
export const traducirRespuesta = (datos) => {
  const mensaje = datos?.choices?.[0]?.message || {};
  const functionCalls = (mensaje.tool_calls || []).map((t) => {
    let args = {};
    try {
      args = JSON.parse(t.function?.arguments || "{}");
    } catch {
      // Argumentos rotos: la llamada se queda sin ellos y el controlador decide.
    }
    return { name: t.function?.name, args };
  });
  return { text: typeof mensaje.content === "string" ? mensaje.content : "", functionCalls, pasarela: datos?.model || "" };
};

// Pide a la pasarela. Lanza error si no hay ninguna configurada o si contesta mal.
export const generarConPasarela = async (peticion, { signal, extra = {} } = {}) => {
  const p = pasarela();
  if (!p) throw new Error("No hay pasarela de IA configurada");
  const respuesta = await fetch(p.url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${p.llave}`,
      "Content-Type": "application/json",
      // OpenRouter muestra la app en su panel con estos dos.
      "HTTP-Referer": "https://cartify-tienda-la635.vercel.app",
      "X-Title": "Tienda la 635",
    },
    body: JSON.stringify({ ...traducirPeticion(peticion, p.modelos), ...extra }),
    signal,
  });
  if (!respuesta.ok) {
    const detalle = await respuesta.text().catch(() => "");
    const error = new Error(`${p.nombre} ${respuesta.status}: ${detalle.slice(0, 200)}`);
    error.status = respuesta.status;
    throw error;
  }
  return traducirRespuesta(await respuesta.json());
};

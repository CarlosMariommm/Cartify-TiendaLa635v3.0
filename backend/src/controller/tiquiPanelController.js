import { FunctionCallingConfigMode, Type } from "@google/genai";
import adminModel from "../models/admin.js";
import employeeModel from "../models/employee.js";
import { getIA, generarConCobertura } from "../utils/iaClient.js";
import { comprobarVoz } from "../utils/vozTiqui.js";
import { panoramaDelNegocio, productosDeLaCharla } from "../utils/panoramaNegocio.js";
import { consejoPrincipal } from "../utils/consejosVentas.js";
import { calentarPronostico, pronosticoParaTiqui } from "../utils/pronostico.js";
import {
  CAMBIOS_ADMIN, CAMBIOS_EMPLEADO, ESTADOS_DESTINO, aplicarCambio, firmarPropuesta, leerPropuesta, proponerCambio,
} from "../utils/cambiosTiqui.js";

/*
 * ============================================================
 * TIQUI DEL PANEL — la asistente del equipo
 * ============================================================
 * Es OTRA asistente, aparte de la de la tienda (aiController.asistente), y a
 * propósito no comparten nada más que la cara y la voz:
 *
 *   - Otra ruta (/api/tiqui-panel), que solo abre una sesión de personal. Un
 *     cliente no puede preguntarle a esta cuánto vendió la tienda, y la de la
 *     tienda nunca ve un número del negocio.
 *   - Otras instrucciones: aquí Tiqui no vende ni arma carritos. Es la que se
 *     sabe todos los números, como un Jarvis de la tienda: cuenta cómo va el
 *     día, qué pedidos esperan, qué se está acabando, a quién se le debe.
 *   - Otras herramientas: llevar a una pantalla del panel, abrir los pedidos
 *     filtrados, buscar en el inventario.
 *   - Otra memoria: su charla vive en el panel y no se mezcla con la de nadie.
 *
 * Contesta en UNA vuelta al modelo, con el panorama del negocio ya armado
 * (utils/panoramaNegocio.js): en voz, cada consulta de más se nota.
 *
 * Lo que ve depende de quién pregunta. El empleado ve lo del dashboard y los
 * pedidos; clientes, proveedores, promociones y costos son del administrador,
 * igual que sus pantallas (ver ProtectedRoute soloAdmin en el frontend).
 *
 * También CAMBIA cosas cuando se lo piden (mover pedidos; y el administrador,
 * además, existencias, precios, productos, promociones y temporada), pero
 * nunca de una: propone, la persona confirma y recién ahí se aplica, con la
 * misma lógica que las pantallas. Ver utils/cambiosTiqui.js.
 *
 * La usan el panel web y, para el administrador, la app del teléfono.
 * ============================================================
 */

const tiquiPanelController = {};

/*
 * Las pantallas a las que puede llevar. La ruta la arma el servidor: el
 * navegador solo navega a lo que le llega, y lo que no es de su rol ni se le
 * ofrece al modelo.
 */
const SECCIONES = {
  dashboard: { ruta: "/dashboard", nombre: "el dashboard" },
  pedidos: { ruta: "/pedidos", nombre: "los pedidos" },
  cuenta: { ruta: "/cuenta", nombre: "tu cuenta" },
  ayuda: { ruta: "/ayuda", nombre: "la ayuda" },
  inventario: { ruta: "/inventario", nombre: "el inventario", soloAdmin: true },
  categorias: { ruta: "/categorias", nombre: "las categorías", soloAdmin: true },
  marcas: { ruta: "/marcas", nombre: "las marcas", soloAdmin: true },
  modulos: { ruta: "/modulos", nombre: "los módulos", soloAdmin: true },
  impresiones: { ruta: "/servicios-impresion", nombre: "las impresiones", soloAdmin: true },
  promociones: { ruta: "/promociones", nombre: "las promociones", soloAdmin: true },
  pronostico: { ruta: "/pronostico", nombre: "el pronóstico", soloAdmin: true },
  fidelidad: { ruta: "/fidelidad", nombre: "la fidelidad", soloAdmin: true },
  tarjetas: { ruta: "/tarjetas", nombre: "las tarjetas de regalo", soloAdmin: true },
  personalizacion: { ruta: "/personalizacion", nombre: "la personalización", soloAdmin: true },
  clientes: { ruta: "/clientes", nombre: "los clientes", soloAdmin: true },
  empleados: { ruta: "/empleados", nombre: "los empleados", soloAdmin: true },
  proveedores: { ruta: "/proveedores", nombre: "los proveedores", soloAdmin: true },
};

/*
 * Los temas de la ayuda del panel (frontend/src/utils/ayudaPanel.js, mismas
 * claves): "¿cómo se usa el inventario?" abre /ayuda?tema=inventario. Si allá
 * se agrega un tema, se agrega aquí.
 */
const TEMAS_AYUDA = [
  "primeros-pasos", "tiqui", "dashboard", "pedidos", "inventario", "categorias", "marcas", "modulos",
  "impresiones", "promociones", "pronostico", "fidelidad", "tarjetas", "personalizacion", "clientes", "empleados",
  "proveedores", "cuenta",
];
// Los que el empleado no ve (sus pantallas son del administrador).
const TEMAS_AYUDA_ADMIN = [
  "inventario", "categorias", "marcas", "modulos", "impresiones", "promociones", "pronostico", "fidelidad", "tarjetas",
  "personalizacion", "clientes", "empleados", "proveedores",
];

const seccionesDe = (esAdmin) =>
  Object.keys(SECCIONES).filter((k) => esAdmin || !SECCIONES[k].soloAdmin);

const ESTADOS_PEDIDO = ["pagado", "preparando", "en_camino", "listo", "entregado", "todos"];
const NOMBRE_FILTRO = {
  pagado: "los pedidos por preparar", preparando: "los pedidos en preparación", en_camino: "los pedidos en camino",
  listo: "los pedidos listos para recoger", entregado: "los pedidos entregados", todos: "todos los pedidos",
};

/*
 * UNA sola herramienta, `responder`, con la pantalla a abrir como parte de la
 * respuesta. Con una herramienta por cosa (ir_a, ver_pedidos… y responder
 * aparte), el modelo a veces llamaba solo la de abrir y se olvidaba de hablar:
 * a "¿cómo vamos hoy?" contestaba abriendo los pedidos, sin decir nada del
 * día. Así, lo que dice es obligatorio y abrir algo es opcional.
 */
const herramientasDe = (esAdmin) => [
  {
    functionDeclarations: [
      {
        name: "responder",
        description: "Lo que Tiqui dice en voz alta y, solo si hace falta, la pantalla del panel que abre.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            texto: { type: Type.STRING, description: "Una a tres frases cortas, máximo 280 caracteres. Se escucha, no se lee." },
            abrir: {
              type: Type.STRING,
              enum: ["nada", ...seccionesDe(esAdmin)],
              description: "La pantalla a abrir. 'nada' salvo que te pidan ver o abrir algo, o que la respuesta sea una lista larga.",
            },
            estado_pedidos: {
              type: Type.STRING,
              enum: ESTADOS_PEDIDO,
              description: "Solo si abrir = pedidos: pagado = por preparar; preparando; en_camino; listo = listo para recoger; entregado; todos.",
            },
            buscar: {
              type: Type.STRING,
              description: (esAdmin
                ? "Solo si abrir = pedidos (nombre del cliente o número sin #) o inventario (el producto, como en un buscador: 'leche')."
                : "Solo si abrir = pedidos: nombre del cliente o número del pedido sin #.") +
                ` Si abrir = ayuda: el tema, uno de ${TEMAS_AYUDA.filter((t) => esAdmin || !TEMAS_AYUDA_ADMIN.includes(t)).join(", ")}.`,
            },
            // ── Lo que pide cambiar (se propone; la tienda pide confirmación) ──
            cambio: {
              type: Type.STRING,
              enum: ["nada", ...(esAdmin ? CAMBIOS_ADMIN : CAMBIOS_EMPLEADO)],
              description: "Solo si te PIDEN cambiar algo. 'nada' en cualquier otro caso.",
            },
            pedido: { type: Type.STRING, description: "Para estado_pedido: el número del pedido, sin #." },
            estado_nuevo: {
              type: Type.STRING,
              enum: ESTADOS_DESTINO,
              description: "Para estado_pedido: preparando, en_camino (a domicilio), listo (para recoger), entregado o cancelado.",
            },
            codigo_entrega: { type: Type.STRING, description: "Para entregar: los 4 dígitos que dijo el cliente. Vacío si no lo dijeron." },
            motivo: {
              type: Type.STRING,
              description: "Para cancelar: por qué se cancela, en una frase para el cliente ('nos quedamos sin leche'). Vacío si no lo dijeron: no lo inventes.",
            },
            ...(esAdmin
              ? {
                  producto: {
                    type: Type.STRING,
                    description: "Para existencias, precio, mostrar u ocultar: el nombre EXACTO del producto. En precio_promocion, solo si el cambio es para UN producto de la promo; vacío = toda la promo.",
                  },
                  cantidad: { type: Type.NUMBER, description: "Para existencias: cuántas unidades (o libras)." },
                  modo: {
                    type: Type.STRING,
                    enum: ["fijar", "sumar", "restar"],
                    description: "Para existencias: fijar ('déjalo en 40'), sumar ('llegaron 20') o restar ('se dañaron 3').",
                  },
                  precio: { type: Type.NUMBER, description: "Para precio (del producto) o para precio_promocion de una promo de precio fijo: el precio nuevo en dólares." },
                  promocion: { type: Type.STRING, description: "Para activar, desactivar o precio_promocion: el nombre EXACTO de la promoción." },
                  descuento: { type: Type.NUMBER, description: "Para precio_promocion de una promo de descuento: el porcentaje nuevo (20 = 20%)." },
                  lleva: { type: Type.NUMBER, description: "Para precio_promocion de una promo NxM: cuántos lleva (el 3 de un 3x2)." },
                  paga: { type: Type.NUMBER, description: "Para precio_promocion de una promo NxM: cuántos paga (el 2 de un 3x2)." },
                  temporada: { type: Type.STRING, description: "Para temporada: la clave de la lista (navidad, halloween…), automatica o ninguna." },
                }
              : {}),
          },
          required: ["texto", "abrir", "cambio"],
        },
      },
    ],
  },
];

// La pantalla que pidió el modelo, ya validada y convertida en ruta.
const accionDe = ({ abrir, estado_pedidos: estadoPedidos, buscar }, esAdmin) => {
  const s = SECCIONES[abrir];
  if (!s || (s.soloAdmin && !esAdmin)) return null;
  const texto = String(buscar || "").replace(/^#/, "").trim().slice(0, 60);

  if (abrir === "pedidos") {
    const estado = ESTADOS_PEDIDO.includes(estadoPedidos) ? estadoPedidos : "todos";
    const q = new URLSearchParams({ estado, ...(texto ? { buscar: texto } : {}) });
    return { tipo: "ir", ruta: `/pedidos?${q}`, que: NOMBRE_FILTRO[estado] };
  }
  if (abrir === "inventario" && texto) {
    return { tipo: "ir", ruta: `/inventario?${new URLSearchParams({ buscar: texto })}`, que: `${texto} en el inventario` };
  }
  // La ayuda, abierta en el tema de la pantalla por la que preguntaron.
  if (abrir === "ayuda") {
    const tema = TEMAS_AYUDA.includes(texto) && (esAdmin || !TEMAS_AYUDA_ADMIN.includes(texto)) ? texto : "primeros-pasos";
    return { tipo: "ir", ruta: `/ayuda?${new URLSearchParams({ tema })}`, que: "la ayuda" };
  }
  return { tipo: "ir", ruta: s.ruta, que: s.nombre };
};

/*
 * Cómo es Tiqui en el panel. Tuteando a propósito, como la de la tienda: si
 * las instrucciones van de "usted", al modelo se le pega.
 */
const instrucciones = ({ esAdmin, nombre }) => [
  "Eres Tiqui, la mascota de Tienda la 635 (la etiqueta de precio del logo, con cara).",
  "Aquí no atiendes clientes: eres la asistente del equipo en el panel de administración,",
  "como un Jarvis de la tienda. Te sabes los números del negocio y los cuentas claro y rápido.",
  `Hablas con ${nombre || "alguien del equipo"}, ${esAdmin ? "el administrador de la tienda" : "empleado de la tienda"}.`,
  "",
  "CÓMO HABLAS:",
  "- En primera persona y tuteando. Tiqui es ELLA: si hablas de ti con adjetivos, en femenino.",
  "- De la persona NO sabes si es hombre o mujer: nada de adjetivos con género para ella",
  "  ('tú misma', 'estás listo'). Di 'tú', 'hazlo tú', 'si quieres'.",
  "- Lo que dices se ESCUCHA: de una a tres frases cortas (máximo 280 caracteres), sin listas,",
  "  sin emojis, sin asteriscos. Directa, como una buena jefa de turno: primero el dato, luego",
  "  lo que conviene hacer. Cálida pero sin rodeos.",
  "- Las cifras SIEMPRE con números, nunca en letras: 26, $12.50, 4 pedidos. Se leen en",
  "  pantalla y la voz ya sabe decirlas. Dinero con signo de dólar y dos decimales. Los",
  "  pedidos por su número: #A1B2C3.",
  "- Si piden un resumen ('¿cómo vamos?', 'buenos días', 'resumen del día'): ventas de hoy",
  "  contra ayer, pedidos que esperan y lo más urgente (un pedido viejo sin preparar, algo",
  esAdmin
    ? "  agotado, una deuda vencida, algo que caduca, una promoción que deja pérdida)."
    : "  agotado, algo que caduca).",
  "",
  ...(esAdmin
    ? [
        "AYUDANTE DE VENTAS:",
        "- Además de contar los números, ayudas a vender mejor. En 'CONSEJOS DE VENTAS' te paso lo",
        "  que conviene revisar, ya calculado: promociones que dejan pérdida o no venden, productos",
        "  vendidos por debajo del costo, lo que caduca y lo que no se mueve. En 'CÓMO VAN LAS",
        "  PROMOCIONES' está a cuánto sale cada producto con la promo y lo que cuesta.",
        "- Si te preguntan qué recomiendas, cómo van las promociones, cómo vender más o si algo",
        "  conviene: da el consejo más importante con sus números y lo que harías, como una buena",
        "  gerente de ventas: 'El 2x1 de Coca deja pérdida: cada una sale a $0.50 y cuesta $0.70.",
        "  Un 3x2 todavía deja 10%. ¿Lo cambio?'.",
        "- Los consejos marcados [URGENTE] (algo que deja pérdida) los mencionas también en un",
        "  resumen del día, aunque no te pregunten por promociones.",
        "- Usa SOLO las cuentas que te paso; no calcules porcentajes ni precios por tu cuenta.",
        "- Si te dice que sí a un ajuste que sugeriste, propón el cambio con 'precio_promocion' (o",
        "  'precio' si es el precio de un producto) con los números que sugeriste.",
        "",
        "PRONÓSTICO (si te lo paso):",
        "- En 'PRONÓSTICO' está lo que calculó el servicio de análisis con el historial de ventas: la",
        "  venta esperada con su rango, lo que se agotaría y la compra sugerida por proveedor. Si te",
        "  preguntan qué pedir, qué se va a acabar o cuánto se va a vender, contesta con eso: lo más",
        "  urgente con sus números ('A Distribuidora La Constancia: 12 Lays y 6 Queso Crema, $16.50') y",
        "  ofrece abrir el pronóstico completo (abrir = pronostico) si la lista es larga.",
        "- La venta esperada va con su rango ('entre $894 y $1,298'): es una estimación, no una promesa.",
        "- Si dice PRELIMINAR, avisa que todavía hay pocos datos. Si dice que se está calculando, dilo",
        "  así y pide que te pregunten de nuevo en un minuto. Nunca inventes cifras del pronóstico.",
        "",
      ]
    : []),
  "DE DÓNDE SACAS LOS DATOS:",
  "- SOLO del panorama del negocio y de los productos que te paso. Nunca inventes cifras,",
  "  pedidos, productos ni nombres. Si te preguntan algo que no está ahí, dilo y ofrece abrir",
  "  la pantalla donde se ve.",
  "- Si una lista es larga, di los dos o tres más importantes y cuántos son en total, y abre",
  "  la pantalla con la lista completa.",
  esAdmin
    ? ""
    : "- No tienes datos de proveedores, clientes, promociones ni costos: son del administrador. Si preguntan o piden cambiarlos, di que eso lo ve o lo cambia el administrador, sin ofrecer abrir pantallas que no son suyas.",
  "",
  "QUÉ PUEDES HACER (siempre con 'responder'):",
  "- Contestar con los datos. Y además, en 'abrir', llevar a una pantalla del panel: los",
  esAdmin
    ? "  pedidos filtrados por estado, cliente o número, el inventario buscando un producto, u otra."
    : "  pedidos filtrados por estado, cliente o número, o el dashboard.",
  "- 'abrir' va en 'nada' casi siempre. Solo abres algo si te piden verlo ('muéstrame',",
  "  'ábreme', 'llévame') o si la respuesta es una lista larga. Un resumen o una pregunta",
  "  ('¿cómo vamos?', '¿cuánto vendimos?', '¿cuánta leche queda?') se contesta hablando,",
  "  sin abrir nada.",
  "- Si abres algo, dilo en el texto ('te abro los pedidos por preparar').",
  "- Si preguntan cómo se usa una pantalla o dónde se hace algo ('¿cómo creo una promoción?',",
  "  '¿dónde cambio el envío?'): explícalo en una o dos frases y abre la ayuda en ese tema",
  "  (abrir = ayuda, buscar = el tema) diciendo 'te abro la ayuda con los pasos'.",
  "",
  "CAMBIAR COSAS (en 'cambio', solo si te lo PIDEN):",
  esAdmin
    ? "- Puedes mover pedidos de estado, cambiar existencias o precios, mostrar u ocultar productos, encender o apagar promociones, ajustar el precio de una promoción ('precio_promocion': el % de un descuento, el precio de un precio fijo o el NxM de un 2x1, sin cambiarle el tipo) y cambiar la temporada de la tienda."
    : "- Puedes mover pedidos de estado. Lo demás (precios, existencias, promociones) es del administrador.",
  "- Tú solo PROPONES: la tienda le pregunta a la persona si lo confirma y lo hace ella. Nunca",
  "  digas que ya lo hiciste. Usa los nombres y números EXACTOS de las listas.",
  "- Para entregar un pedido hacen falta los 4 dígitos que el cliente ve en su pedido: si no te",
  "  los dijeron, pregúntalos (cambio = nada). Nunca inventes un código.",
  "- Si no sabes qué pedido o qué producto es, pregunta en vez de adivinar (cambio = nada).",
  "- Crear o borrar cosas, cambiar fotos o datos de clientes todavía no lo puedes hacer: dilo y",
  "  abre la pantalla donde se hace.",
  "",
  "LA CONVERSACIÓN:",
  "- Te paso lo último que se habló. Úsalo para entender respuestas cortas ('¿y ayer?', 'ábrelo',",
  "  'el primero') que dependen de lo anterior. No repitas lo que dijiste en el turno anterior.",
  "- Si la frase no se entiende (se cortó, no tiene sentido), pide que la repita.",
].filter((l) => l !== "").join("\n");

// El nombre con que Tiqui trata a quien le habla: el primero, no el completo.
const nombres = new Map();
const nombreDe = async ({ id, tipo }) => {
  const clave = `${tipo}:${id}`;
  if (nombres.has(clave)) return nombres.get(clave);
  let nombre = "";
  try {
    const doc = tipo === "Admin"
      ? await adminModel.findById(id, "userName").lean()
      : await employeeModel.findById(id, "fullnName userName").lean();
    nombre = String(doc?.fullnName || doc?.userName || "").trim().split(/\s+/)[0] || "";
  } catch {
    // Sin nombre, Tiqui habla igual.
  }
  nombres.set(clave, nombre);
  return nombre;
};

const MENSAJES_DE_MEMORIA = 6;

const charlaReciente = (historial, nombre) =>
  (Array.isArray(historial) ? historial : [])
    .slice(-MENSAJES_DE_MEMORIA)
    .map((m) => ({
      quien: m?.quien === "tiqui" ? "Tiqui" : nombre || "Persona",
      texto: String(m?.texto || "").replace(/\s+/g, " ").trim().slice(0, 300),
    }))
    .filter((m) => m.texto);

const PANTALLAS = {
  "/dashboard": "Dashboard", "/pedidos": "Pedidos", "/inventario": "Inventario", "/cuenta": "Mi cuenta",
  "/categorias": "Categorías", "/marcas": "Marcas", "/modulos": "Módulos", "/servicios-impresion": "Impresiones",
  "/promociones": "Promociones", "/pronostico": "Pronóstico", "/fidelidad": "Fidelidad", "/tarjetas": "Tarjetas de regalo",
  "/personalizacion": "Personalización", "/clientes": "Clientes", "/empleados": "Empleados", "/proveedores": "Proveedores",
  "/ayuda": "Ayuda",
};

const armarPregunta = ({ frase, charla, panorama, productos, pantalla, pronostico = "" }) => {
  const ahora = new Date().toLocaleString("es-SV", {
    weekday: "long", day: "numeric", month: "long", hour: "numeric", minute: "2-digit", timeZone: "America/El_Salvador",
  });
  return [
    `Ahora es ${ahora}.`,
    PANTALLAS[pantalla] ? `Está viendo la pantalla: ${PANTALLAS[pantalla]}.` : "",
    // Desde la app del teléfono solo está Tiqui: no hay pantallas del panel que abrir.
    pantalla === "app" ? "Te habla desde la app del teléfono, donde solo estás tú: no hay pantallas que abrir (abrir = nada) y no digas 'te abro…'." : "",
    "",
    charla.length
      ? `Lo último que se habló (de lo más viejo a lo más nuevo):\n${charla.map((m) => `${m.quien}: ${m.texto}`).join("\n")}`
      : "Es lo primero que te dice en esta charla.",
    "",
    `Te dijo ahora: "${frase}"`,
    "",
    "PANORAMA DEL NEGOCIO:",
    panorama,
    ...(productos.length
      ? ["", "PRODUCTOS DE LOS QUE SE ESTÁ HABLANDO (nombre · existencia · precio · categoría · marca):", ...productos]
      : []),
    ...(pronostico ? ["", "PRONÓSTICO (próximas semanas, calculado por el servicio de análisis):", pronostico] : []),
  ].filter((l, i, arr) => l !== "" || arr[i - 1] !== "").join("\n");
};

// El estado al que se quiere mover un pedido, dicho con palabras de todos los días.
const estadoDeLaFrase = (frase) => {
  const t = String(frase).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  if (/cancel/.test(t)) return "cancelado";
  if (/entreg/.test(t)) return "entregado";
  if (/camino|sali[oa]|despach|reparto/.test(t)) return "en_camino";
  if (/listo|recoger|retir/.test(t)) return "listo";
  if (/prepar|armando|armar/.test(t)) return "preparando";
  return "";
};

// Lo que dice Tiqui si el modelo abrió algo pero se olvidó de hablar.
const fraseDeRespaldo = (accion) => (accion ? `Te abro ${accion.que}.` : "");

/*
 * POST /api/tiqui-panel
 * Body: { frase, historial: [{ quien: 'tiqui'|'persona', texto }], pantalla }
 * Devuelve: { acciones: [{ tipo: 'ir', ruta, que }], respuesta, entendido, origen }
 */
tiquiPanelController.conversar = async (req, res) => {
  try {
    const frase = String(req.body?.frase || "").trim().slice(0, 400);
    if (!frase) return res.status(400).json({ message: "Hace falta la frase" });

    if (!getIA()) {
      return res.status(200).json({ acciones: [], respuesta: "", entendido: false, origen: "sin-ia" });
    }

    const esAdmin = req.usuario.tipo === "Admin";
    const pantalla = String(req.body?.pantalla || "").split("?")[0];
    const nombre = await nombreDe(req.usuario);
    const charla = charlaReciente(req.body?.historial, nombre);

    const [panorama, productos, pronostico] = await Promise.all([
      panoramaDelNegocio({ esAdmin }),
      // Lo que se está hablando decide qué productos van: la frase y lo último.
      productosDeLaCharla([frase, ...charla.slice(-2).map((m) => m.texto)].join(" "), { esAdmin }),
      // Compras y proveedores: solo el administrador. Ver utils/pronostico.js.
      esAdmin ? pronosticoParaTiqui(frase) : Promise.resolve(""),
    ]);

    try {
      const respuesta = await generarConCobertura({
        contents: armarPregunta({ frase, charla, panorama, productos, pantalla, pronostico }),
        config: {
          systemInstruction: instrucciones({ esAdmin, nombre }),
          tools: herramientasDe(esAdmin),
          toolConfig: { functionCallingConfig: { mode: FunctionCallingConfigMode.ANY, allowedFunctionNames: ["responder"] } },
          temperature: 0.3,
        },
      }, { plazoTotal: 9000 });

      const llamada = (respuesta.functionCalls || []).find((l) => l.name === "responder");
      if (!llamada) throw new Error("La IA no llamó 'responder'");

      /*
       * La pantalla sale validada contra su rol: el modelo solo vio las que le
       * tocan, pero no se le cree a ciegas.
       */
      const args = llamada.args || {};
      const accion = pantalla === "app" ? null : accionDe(args, esAdmin);
      let dice = String(args.texto || "").trim();

      /*
       * Pidió cambiar algo: lo que se dice lo arma el servidor, no el modelo.
       * Si la propuesta vale, es la frase exacta de lo que se va a hacer más
       * "¿Lo hago?" (y viaja firmada para confirmarla); si no, por qué no se
       * puede o qué falta saber. Así el modelo nunca dice "listo, ya lo hice"
       * por algo que todavía nadie confirmó.
       */
      if (args.cambio && args.cambio !== "nada") {
        /*
         * A veces el modelo entiende "pasa el 88D230 a listo" pero deja el
         * estado vacío (o lo pone en el filtro de pedidos). Se completa con
         * la frase: pedirle a la persona que lo repita sería absurdo.
         */
        if (args.cambio === "estado_pedido" && !ESTADOS_DESTINO.includes(args.estado_nuevo)) {
          args.estado_nuevo = ESTADOS_DESTINO.includes(args.estado_pedidos) ? args.estado_pedidos : estadoDeLaFrase(frase);
        }
        const propuesta = await proponerCambio(args, { esAdmin });
        if (!propuesta.ok) {
          return res.status(200).json({ acciones: accion ? [accion] : [], respuesta: propuesta.mensaje, entendido: true, origen: "ia" });
        }
        return res.status(200).json({
          acciones: accion ? [accion] : [],
          respuesta: `${propuesta.resumen} ¿Lo hago?`,
          confirmar: { token: firmarPropuesta(propuesta.cambio, req.usuario), resumen: propuesta.resumen, tipo: propuesta.cambio.tipo },
          entendido: true,
          origen: "ia",
        });
      }

      if (!dice) dice = fraseDeRespaldo(accion);
      if (!dice) {
        return res.status(200).json({ acciones: [], respuesta: "", entendido: false, origen: "vacia" });
      }

      return res.status(200).json({ acciones: accion ? [accion] : [], respuesta: dice, entendido: true, origen: "ia" });
    } catch (errorIA) {
      console.log("IA no disponible para Tiqui del panel: " + errorIA.message);
      return res.status(200).json({ acciones: [], respuesta: "", entendido: false, origen: "error" });
    }
  } catch (error) {
    console.log("error " + error);
    return res.status(500).json({ message: "Error interno del servidor" });
  }
};

/*
 * POST /api/tiqui-panel/confirmar
 * Body: { token } — la propuesta firmada que devolvió /api/tiqui-panel.
 * La persona dijo que sí: se aplica (ver utils/cambiosTiqui.js). La firma dice
 * qué y para quién; si venció o es de otra sesión, no se aplica nada.
 */
tiquiPanelController.confirmar = async (req, res) => {
  try {
    const cambio = leerPropuesta(req.body?.token, req.usuario);
    if (!cambio) {
      return res.status(200).json({ ok: false, respuesta: "Esa confirmación ya venció. Pídemelo otra vez y lo hago." });
    }
    const r = await aplicarCambio(cambio, {
      esAdmin: req.usuario.tipo === "Admin",
      nombre: await nombreDe(req.usuario),
    });
    return res.status(200).json({ ok: r.ok, respuesta: r.mensaje, tipo: cambio.tipo });
  } catch (error) {
    console.log("error " + error);
    return res.status(500).json({ message: "Error interno del servidor" });
  }
};

/*
 * GET /api/tiqui-panel/listo
 * Se toca al despertarla: despierta el servidor (Render lo duerme), deja el
 * panorama armado para la primera pregunta y dice si hay voz de Tiqui.
 *
 * Al administrador, además, `consejo`: lo más importante que Tiqui ve para
 * vender mejor (una promo que deja pérdida, algo que caduca). Lo muestra en
 * vez del saludo: una ayudante de ventas no espera a que le pregunten si se
 * está perdiendo plata. Vacío si no hay nada que lo amerite.
 *
 * Y se manda a calcular el pronóstico, sin esperarlo: el servicio de análisis
 * duerme y tarda en despertar, así que para cuando le pregunten "¿qué tengo
 * que pedir?" ya debería estar listo.
 */
tiquiPanelController.listo = async (req, res) => {
  const esAdmin = req.usuario.tipo === "Admin";
  if (esAdmin) calentarPronostico();
  let consejo = "";
  try {
    const [, principal] = await Promise.all([
      panoramaDelNegocio({ esAdmin }),
      esAdmin ? consejoPrincipal() : Promise.resolve(""),
    ]);
    consejo = principal;
  } catch {
    // Si la base tarda, igual se contesta: el objetivo era despertar el servidor.
  }
  return res.status(200).json({ listo: true, voz: await comprobarVoz(), consejo });
};

export default tiquiPanelController;

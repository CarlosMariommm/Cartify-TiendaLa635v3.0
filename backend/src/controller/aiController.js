import { FunctionCallingConfigMode, Type } from "@google/genai";
import jsonwebtoken from "jsonwebtoken";
import { config } from "../../config.js";
import productModel from "../models/product.js";
import clientModel from "../models/client.js";
// Se importan aunque no se usen por nombre: el catálogo de Tiqui hace populate
// de la categoría y la marca, y eso exige que los modelos estén registrados.
import "../models/productType.js";
import "../models/brand.js";
import promotionModel from "../models/promotion.js";
import storeSettingsModel from "../models/storeSettings.js";
import { getIA, generarConIA, generarConCobertura } from "../utils/iaClient.js";
import { clasificarIntencion, DIRECTAS } from "../utils/intencionesTiqui.js";
import { respuestaDirecta, UMBRAL_DIRECTO, UMBRAL_RESPALDO } from "../utils/respuestasTiqui.js";
import {
  vozDisponible, comprobarVoz, paraDecir, frasePrevia, guardarFrase, pedirVoz,
  ANIMOS_IA, animoValido, conEmocion, modeloDeVoz,
} from "../utils/vozTiqui.js";
import { generarCopyPlantilla } from "../utils/plantillasPromo.js";
import { esFamiliaValida, LISTA_PARA_IA } from "../utils/familias.js";

const aiController = {};

/*
 * Esquema de lo que le pedimos a Gemini. Con responseSchema la respuesta SIEMPRE
 * llega como JSON válido con estos campos — nada de andar parseando texto suelto
 * ni rezando para que no salga con un "¡Claro! Aquí tienes:".
 */
const ESQUEMA_COPY = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING, description: "Título corto y llamativo, máximo 40 caracteres" },
    promoDescription: { type: Type.STRING, description: "Descripción de la promo, máximo 95 caracteres" },
    bannerHeadline: { type: Type.STRING, description: "Frase grande del banner, máximo 22 caracteres" },
    bannerSubtitle: { type: Type.STRING, description: "Frase de apoyo del banner, máximo 40 caracteres" },
    badge: { type: Type.STRING, description: "Sello corto del ahorro. Ej: -25%, 2x1, $1.50" },
  },
  required: ["title", "promoDescription", "bannerHeadline", "bannerSubtitle", "badge"],
};

/*
 * La "voz" de la tienda. Va como systemInstruction (aparte del pedido) para que
 * el modelo la trate como su forma de ser, no como parte del encargo del día.
 *
 * Los ejemplos son la parte que más pesa: mostrarle 4 promos bien escritas le
 * enseña el tono mucho mejor que cualquier lista de reglas. Si algún texto sale
 * feo, lo más efectivo es agregar aquí un ejemplo del estilo que sí se quiere.
 */
const VOZ_DE_LA_TIENDA = [
  "Eres el encargado de marketing de Tienda La 635, una tienda de abarrotes de barrio en El Salvador.",
  "Escribes los anuncios de las promociones de la tienda en línea. Tu trabajo es que a la gente",
  "se le antoje y entre a ver, no solo informarle que hay descuento.",
  "",
  "Cómo escribes:",
  "- Buscas el gancho, no el dato. Antes de escribir, pensá qué hace especial a ESE producto:",
  "  a qué sabe, para qué momento del día sirve, qué se cocina con él, a quién le alegra el día.",
  "  'Queso fresco 25% menos' informa; 'El queso de los desayunos, hoy más barato' antoja.",
  "- El título es el gancho. La descripción aterriza la oferta con el precio real.",
  "- Español claro y natural, cálido y cercano pero NEUTRO. Sin diminutivos ni jerga:",
  "  nada de 'pancito', 'heladitos', 'cafecito', 'fresquitas', 'ricos', 'sabrosito'.",
  "  Se dice 'pan', 'helado', 'café', 'fresas'. Nada de inglés ni palabras rebuscadas.",
  "- Tratás al cliente de usted. Sin emojis.",
  "- Entre los clientes hay personas mayores: por creativo que sea, se entiende de una leída.",
  "- Nombrás el producto. Nunca decís 'este producto' ni 'estos artículos'.",
  "- Nunca inventás precios, fechas, marcas, sabores ni productos que no estén en la oferta.",
  "- Variá los arranques: no empecés siempre igual ni repitas la fórmula de los ejemplos.",
  "- El badge es el ahorro real y bien corto: -25%, 2x1, $1.50. En un anuncio sin descuento,",
  "  el badge es una palabra que dé ganas: Nuevo, Recién llegado, De la casa, Recomendado.",
  "- Respetás los límites de caracteres de cada campo.",
  "",
  "NADA DE GENÉRICO. Un cartel que dice 'Promoción de quesos seleccionados' no lo lee nadie:",
  "es el mismo cartel de cualquier tienda del país. Escribí como el dueño que sabe por qué",
  "vale la pena ese producto y quiere contarlo. Cálido no es lo mismo que payaso: se puede",
  "antojar sin diminutivos ni gritos. Poné el ánimo justo según lo que se anuncia: un 2x1 se",
  "anuncia con ganas, un producto nuevo se presenta con orgullo, un vencimiento cercano se",
  "cuenta con urgencia honesta. Si el texto podría servir para cualquier otro producto,",
  "está mal escrito: volvelo a hacer.",
  "",
  "Ejemplos del tono que buscamos:",
  "",
  'Oferta: Queso Fresco (Lácteos, marca La Salud): 25% de descuento, precio normal $3.50',
  '{"title":"El queso de los desayunos, más barato","promoDescription":"El queso fresco La Salud baja a $2.63 esta semana. Antes $3.50.","bannerHeadline":"25% MENOS","bannerSubtitle":"Queso fresco La Salud","badge":"-25%"}',
  "",
  'Oferta: Pan Francés (Panadería): de $2.00 a $1.25',
  '{"title":"Pan francés recién hecho a $1.25","promoDescription":"El pan francés del día, recién salido del horno, a $1.25. Antes costaba $2.00.","bannerHeadline":"A SOLO $1.25","bannerSubtitle":"Pan francés del día","badge":"$1.25"}',
  "",
  'Oferta: Gaseosa 1.5L (Bebidas, marca Coca-Cola): compra 2 y paga 1',
  '{"title":"La segunda gaseosa va por la casa","promoDescription":"Lleve dos gaseosas de 1.5 litros y pague una sola. Alcanza para toda la mesa.","bannerHeadline":"2x1","bannerSubtitle":"Gaseosa 1.5 litros","badge":"2x1"}',
  "",
  'Oferta: Jabón de baño (Higiene): 15% | Detergente (Limpieza): 20% | Cloro (Limpieza): 10%',
  '{"title":"Surta la casa gastando menos","promoDescription":"Jabón, detergente y cloro con hasta 20% de descuento. Todo en un solo viaje.","bannerHeadline":"HASTA 20% MENOS","bannerSubtitle":"Jabón, detergente y cloro","badge":"-20%"}',
  "",
  "Anuncio sin descuento: Café de altura (Bebidas, marca El Volcán), precio $4.25",
  '{"title":"Ya llegó el café de altura","promoDescription":"El Volcán de altura, molido del dia, a $4.25. El que despierta la casa.","bannerHeadline":"YA LLEGO","bannerSubtitle":"Cafe El Volcan de altura","badge":"Nuevo"}',
  "",
  "Anuncio sin descuento: toda la categoría Panadería",
  '{"title":"El pan sale calientito todos los dias","promoDescription":"Pan frances, semita y quesadilla, horneados aqui mismo desde temprano.","bannerHeadline":"RECIEN HORNEADO","bannerSubtitle":"Toda la panaderia","badge":"De la casa"}',
].join("\n");

// Describe un producto con todo lo que sabemos de él: mientras más contexto,
// menos genérico escribe. "el queso fresco La Salud" en vez de "este producto".
const describirProducto = (it) => {
  const etiquetas = [it.category, it.brand].filter(Boolean).join(", ");
  return etiquetas ? `${it.name} (${etiquetas})` : it.name;
};

// Arma la frase que describe el gancho según el tipo de promoción.
const describirOferta = (tipo, items, buyQty, payQty) => {
  /*
   * Un anuncio no tiene ahorro que contar: el gancho es el producto mismo.
   * Sin este caso, la IA recibía "0% de descuento" y escribía sobre una
   * rebaja que no existe.
   */
  if (tipo === "anuncio") {
    return items.map((it) => `${describirProducto(it)}, precio $${it.salePrice}`).join(" | ");
  }
  if (tipo === "nxm") {
    return `${items.map(describirProducto).join(" | ")}: compra ${buyQty} y paga ${payQty}`;
  }
  if (tipo === "precio_fijo") {
    return items
      .map((it) => `${describirProducto(it)}: de $${it.salePrice} a $${it.fixedPrice}`)
      .join(" | ");
  }
  return items
    .map((it) => `${describirProducto(it)}: ${it.discount}% de descuento, precio normal $${it.salePrice}`)
    .join(" | ");
};

const armarPrompt = (type, items, buyQty, payQty) =>
  type === "anuncio"
    ? `Anuncio sin descuento: ${describirOferta(type, items, buyQty, payQty)}`
    : `Oferta: ${describirOferta(type, items, buyQty, payQty)}`;

/*
 * POST /api/ai/promo-copy
 * Recibe el tipo de promo y los productos seleccionados del inventario, y
 * devuelve el texto listo para el formulario y para pintar el banner.
 *
 * Si la IA no está configurada o se cae, responde igual con las plantillas
 * locales y avisa de dónde salió el texto (campo `origen`).
 */
aiController.generarCopyPromo = async (req, res) => {
  try {
    const { type = "descuento", buyQty = 2, payQty = 1 } = req.body;
    const enviados = Array.isArray(req.body.items) ? req.body.items : [];

    if (!enviados.length) {
      return res
        .status(400)
        .json({ message: "Selecciona al menos un producto del inventario" });
    }

    // Traemos los productos reales de la base: el nombre y el precio salen de
    // aquí, no de lo que mande el navegador.
    const ids = enviados.map((it) => it.productId).filter(Boolean);
    // Traemos también categoría y marca: con ese contexto la IA deja de escribir
    // genérico y puede decir "el queso fresco La Salud".
    const productos = await productModel
      .find({ _id: { $in: ids } })
      .populate("typeId", "type")
      .populate("brandId", "name");
    const porId = Object.fromEntries(productos.map((p) => [String(p._id), p]));

    const items = enviados
      .filter((it) => porId[String(it.productId)])
      .map((it) => {
        const p = porId[String(it.productId)];
        return {
          name: p.name,
          category: p.typeId?.type || null,
          brand: p.brandId?.name || null,
          salePrice: Number(p.salePrice) || 0,
          discount: Number(it.discount) || 0,
          fixedPrice: it.fixedPrice != null ? Number(it.fixedPrice) : null,
        };
      });

    if (!items.length) {
      return res
        .status(400)
        .json({ message: "No se encontraron esos productos en el inventario" });
    }

    // Plan B listo desde ya: si la IA falla, esto es lo que devolvemos.
    const respaldo = generarCopyPlantilla({ type, items, buyQty, payQty });

    const ia = getIA();
    if (!ia) {
      return res.status(200).json({ ...respaldo, origen: "plantilla" });
    }

    try {
      /*
       * Tres intentos por modelo: aquí hay alguien mirando un círculo girar y
       * esperando un texto. Un par de segundos de más valen la pena si a
       * cambio sale escrito por la IA y no por una plantilla.
       */
      const respuesta = await generarConIA({
        contents: armarPrompt(type, items, buyQty, payQty),
        config: {
          systemInstruction: VOZ_DE_LA_TIENDA,
          responseMimeType: "application/json",
          responseSchema: ESQUEMA_COPY,
          temperature: 0.9, // un poco de chispa para que no salga siempre igual
        },
      }, { intentos: 3 });

      const texto = respuesta.text;
      if (!texto) throw new Error("La IA no devolvió texto");

      const copy = JSON.parse(texto);
      return res.status(200).json({ ...copy, origen: "ia" });
    } catch (errorIA) {
      // Llave inválida, cuota agotada, sin internet... da igual: la tienda
      // sigue trabajando con las plantillas.
      console.log("IA no disponible, usando plantillas: " + errorIA.message);
      return res.status(200).json({ ...respaldo, origen: "plantilla" });
    }
  } catch (error) {
    console.log("error " + error);
    return res.status(500).json({ message: "Error interno del servidor" });
  }
};

/*
 * ============================================================
 * EL CATÁLOGO QUE VE EL ASISTENTE — lo arma el servidor
 * ============================================================
 * Antes lo mandaba el navegador o el teléfono: la lista entera de productos,
 * en el orden en que llega de GET /product. Ese orden es el de la base
 * (productModel.find() no ordena nada), o sea más o menos el de creación, y
 * aquí se cortaba en 120. Resultado: entraban los 120 MÁS VIEJOS y los
 * productos nuevos —justo los que la tienda más quiere vender— nunca le
 * llegaban a la IA. Y los agotados ocupaban lugar igual, porque del otro lado
 * solo se quitaban los inactivos.
 *
 * Ahora se arma aquí, con lo que de verdad hay:
 *   - Solo activos y CON existencias. Lo agotado no se puede agregar, así que
 *     no se le ofrece a la IA como si se pudiera.
 *   - Los más nuevos primero (el _id de Mongo lleva la fecha de creación).
 *   - Y ANTES que todo, los que tienen que ver con lo que se está hablando:
 *     la frase y lo último de la conversación. Si alguien pregunta por
 *     leche, la leche entra aunque la tienda tenga mil productos.
 *
 * La lista se guarda 30 segundos en memoria: el asistente pregunta varias
 * veces seguidas en una misma charla, y no hace falta ir a la base cada vez.
 * ============================================================
 */
const TOPE_CATALOGO = 150;
const VIGENCIA_CATALOGO_MS = 30 * 1000;
let catalogoEnMemoria = { en: 0, lista: null };

const aTextoPlano = (s) =>
  String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

// Palabras que no dicen qué producto se busca: sin ellas "quiero una leche" es "leche".
const PALABRAS_DE_RELLENO = new Set([
  "quiero", "dame", "deme", "tiene", "tienen", "hay", "algo", "para", "por", "favor",
  "con", "sin", "que", "una", "uno", "unos", "unas", "los", "las", "del", "mas",
  "tambien", "mejor", "otra", "otro", "esa", "ese", "eso", "esta", "este", "agregue",
  "agrega", "ponga", "pongame", "cuanto", "cuesta", "vale", "precio", "usted", "gracias",
]);

const palabrasClave = (texto) =>
  aTextoPlano(texto)
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 2 && !PALABRAS_DE_RELLENO.has(w))
    // "fresas" y "fresa" cuentan igual.
    .map((w) => w.replace(/s$/, ""));

const leerCatalogo = async () => {
  if (catalogoEnMemoria.lista && Date.now() - catalogoEnMemoria.en < VIGENCIA_CATALOGO_MS) {
    return catalogoEnMemoria.lista;
  }
  const productos = await productModel
    .find({ isActive: { $ne: false } }, "name salePrice stock typeId brandId unidadVenta soloAdultos")
    .populate("typeId", "type")
    .populate("brandId", "name")
    .sort({ _id: -1 })
    .lean();
  const lista = productos
    .filter((p) => p.name)
    .map((p) => ({
      id: String(p._id),
      nombre: p.name,
      precio: p.salePrice,
      stock: Number(p.stock) || 0,
      // Con esto Tiqui puede recomendar por pasillo ("algo de limpieza") y
      // decir "la libra" cuando el producto se vende por peso.
      categoria: p.typeId?.type || "",
      marca: p.brandId?.name || "",
      porLibra: p.unidadVenta === "libra",
      soloAdultos: Boolean(p.soloAdultos),
      clave: aTextoPlano(`${p.name} ${p.typeId?.type || ""} ${p.brandId?.name || ""}`),
    }));
  catalogoEnMemoria = { en: Date.now(), lista };
  return lista;
};

/*
 * Lo disponible, con lo relacionado a la charla arriba y los nuevos después,
 * y aparte los agotados que tienen que ver con lo que pidió: para que la IA
 * pueda decir "se nos acabó" en vez de "no tenemos eso".
 */
const catalogoParaAsistente = async (textoDeLaCharla) => {
  const todos = await leerCatalogo();
  const palabras = palabrasClave(textoDeLaCharla);
  const cuanto = (p) => palabras.reduce((a, w) => a + (p.clave.includes(w) ? 1 : 0), 0);

  const conExistencias = todos.filter((p) => p.stock > 0);
  const disponibles = palabras.length
    ? conExistencias
        .map((p, i) => ({ p, puntos: cuanto(p), i }))
        // Mismo puntaje: gana el más nuevo (que ya venía primero en la lista).
        .sort((a, b) => b.puntos - a.puntos || a.i - b.i)
        .map((x) => x.p)
    : conExistencias;

  const agotados = palabras.length
    ? todos.filter((p) => p.stock <= 0 && cuanto(p) > 0).slice(0, 5)
    : [];

  return { disponibles: disponibles.slice(0, TOPE_CATALOGO), agotados };
};

/*
 * ============================================================
 * LA CONVERSACIÓN — lo último que se dijo
 * ============================================================
 * Antes la IA recibía solo la frase de ahora. Si el asistente preguntaba
 * "¿Se la agrego?" y la persona decía "sí", la IA no tenía idea de qué era
 * "la": cada frase le llegaba como si fuera la primera de la charla. Ahora
 * viajan los últimos mensajes (de los dos lados), y con eso entiende las
 * respuestas cortas que dependen de lo anterior: "sí", "mejor dos", "la
 * otra", "y también una leche".
 *
 * Tres intercambios alcanzan para eso y mantienen la pregunta liviana.
 * ============================================================
 */
const MENSAJES_DE_MEMORIA = 6;

const conversacionReciente = (historial) =>
  (Array.isArray(historial) ? historial : [])
    .slice(-MENSAJES_DE_MEMORIA)
    .map((m) => ({
      quien: m?.quien === "asistente" ? "Asistente" : "Cliente",
      texto: String(m?.texto || "").replace(/\s+/g, " ").trim().slice(0, 220),
    }))
    .filter((m) => m.texto);

// El texto que se le pasa al modelo, igual para las dos rutas del asistente.
const armarPreguntaDelAsistente = ({ frase, carrito, charla, disponibles, agotados }) => {
  const enCarrito = carrito.length
    ? carrito.map((i) => `${i.cantidad} ${i.nombre}`).join(", ")
    : "vacío";

  return [
    charla.length
      ? `Lo último que se habló (de lo más viejo a lo más nuevo):\n${charla.map((m) => `${m.quien}: ${m.texto}`).join("\n")}`
      : "Es lo primero que dice el cliente en esta charla.",
    "",
    `El cliente dijo ahora: "${frase}"`,
    "",
    `En su carrito lleva: ${enCarrito}`,
    "",
    "Productos que la tienda tiene hoy (con existencias):",
    disponibles.map((p) => `${p.nombre}${p.precio != null ? ` ($${p.precio})` : ""}`).join("\n") || "(ninguno)",
    ...(agotados.length ? ["", `Agotados hoy, NO se pueden agregar: ${agotados.map((p) => p.nombre).join(", ")}`] : []),
  ].join("\n");
};

// Las reglas de charla que comparten las dos rutas del asistente.
const REGLAS_DE_CHARLA = [
  "LA CONVERSACIÓN:",
  "- Te paso lo último que se habló. Usalo para entender respuestas cortas que dependen",
  "  de lo anterior: 'sí', 'no', 'mejor dos', 'la otra', 'esa', 'y también…'. Si acabás",
  "  de ofrecer un producto y el cliente dice que sí, es ESE producto.",
  "- No repitas lo que ya dijiste en el turno anterior; seguí la charla como una persona.",
  "- Si pide algo que está en la lista de agotados, decile que hoy se acabó y, si en la",
  "  lista hay algo parecido, ofrecéselo por su nombre (sin agregarlo todavía).",
].join("\n");

/*
 * GET /api/ai/listo
 * El asistente lo toca apenas se abre. El servidor de Render se duerme si no
 * hay tráfico y la primera pregunta tardaba medio minuto en contestar; así se
 * despierta (y deja el catálogo en memoria) mientras la persona todavía está
 * leyendo la pantalla, antes de que hable.
 */
aiController.listo = async (req, res) => {
  try {
    await Promise.all([leerCatalogo(), leerOfertas(), leerTienda()]);
  } catch {
    // Si la base tarda, igual se contesta: el objetivo era despertar el servidor.
  }
  // `voz`: si hay llave de ElevenLabs. Sin ella, los clientes hablan con la
  // voz del sistema y ni intentan pedir el audio.
  // `voz` comprobada de verdad (ver comprobarVoz): sin ella los clientes hablan
  // con la voz del dispositivo de una vez, sin probar y esperar el error.
  return res.status(200).json({ listo: true, voz: await comprobarVoz() });
};

/*
 * ============================================================
 * ENTENDER LO QUE PIDIÓ EL CLIENTE (asistente de voz)
 * ============================================================
 * El asistente entiende por reglas: normaliza la frase, expande sinónimos y
 * busca el producto. Eso responde al instante, es gratis y funciona sin
 * internet — pero se rompe con "¿tiene algo para la fiebre?" o "deme lo de
 * siempre para el desayuno".
 *
 * Esta ruta es el PLAN B, no el plan A: solo se llama cuando las reglas ya
 * se dieron por vencidas. Así el caso común ("quiero dos manzanas") sigue
 * siendo instantáneo y la IA se gasta únicamente en lo que hoy no funciona.
 *
 * Reglas de la casa para el modelo:
 *   - Solo puede elegir productos de la lista que se le manda. Nada de
 *     inventar un jarabe que la tienda no vende.
 *   - Si no hay nada parecido, lo dice; no ofrece otra cosa por rellenar.
 *   - Frases cortas: esto se lee EN VOZ ALTA, no se lee en pantalla.
 */
const ESQUEMA_INTENCION = {
  type: Type.OBJECT,
  properties: {
    accion: {
      type: Type.STRING,
      description: "Una de: agregar, quitar, cambiar, vaciar, total, comprar, ninguna",
    },
    producto: {
      type: Type.STRING,
      description: "Nombre EXACTO tal como viene en la lista de productos. Vacío si no aplica.",
    },
    cantidad: {
      type: Type.NUMBER,
      description: "Cuántas unidades. 1 si no lo dijo. En 'cambiar', la cantidad final que quiere.",
    },
    respuesta: {
      type: Type.STRING,
      description: "Lo que el asistente dice en voz alta. Una o dos frases, máximo 140 caracteres.",
    },
  },
  required: ["accion", "respuesta"],
};

const MODO_ASISTENTE = [
  "Eres el asistente de voz de Tienda La 635, una tienda de barrio en El Salvador.",
  "Un cliente te habló y las reglas del sistema no entendieron qué quería. Tu trabajo es",
  "descifrarlo y decir qué hacer con el carrito.",
  "",
  "Cómo trabajas:",
  "- SOLO puedes elegir productos de la lista que te paso. Si lo que pide no está en esa",
  "  lista, la acción es 'ninguna' y se lo decís con amabilidad. Nunca inventes productos.",
  "- Si pide algo por su uso ('algo para la tos', 'para el desayuno'), buscá en la lista",
  "  qué le sirve y ofrecelo por su nombre.",
  "- Tu respuesta se ESCUCHA, no se lee: frases cortas, sin listas, sin emojis.",
  "- Hablás en español claro, cálido y cercano pero NEUTRO: al cliente de usted,",
  "  sin diminutivos ni jerga (nada de 'pancito', 'heladitos', 'cafecito').",
  "- Entre los clientes hay personas mayores: se entiende de una sola escuchada.",
  "",
  "SI LA PREGUNTA NO ES DE PRODUCTOS NI DEL CARRITO (el horario, la dirección,",
  "si aceptan tarjeta, cómo es la entrega, o cualquier charla que no sea comprar):",
  "no inventes la respuesta —no tenés esos datos— pero TAMPOCO digas 'no entendí'",
  "ni le pidas que repita, porque sí la entendiste, solo no es algo que puedas",
  "resolver vos. Decile con dos frases que eso no lo manejás vos, y ofrecele algo",
  "que sí podés: 'Eso no lo sé decir, mejor pregúntele a alguien de la tienda por",
  "WhatsApp. ¿Le ayudo a armar su pedido mientras tanto?'. La acción sigue siendo",
  "'ninguna', pero la respuesta tiene que sonar a que la escuchaste, no a que la",
  "ignoraste.",
  "",
  "Reservá el 'no entendí, repítalo' para cuando la frase de verdad no se entiende",
  "—se cortó, quedó a medias, o no tiene sentido ninguno—, que es distinto de una",
  "pregunta clara sobre algo que no es tu trabajo.",
  "",
  "'cambiar' es dejar un producto del carrito en una cantidad exacta: 'mejor que sean",
  "dos', 'solo una'. La cantidad es la final, no la que se suma.",
  "",
  REGLAS_DE_CHARLA,
].join("\n");

/*
 * Cuánto se le aguanta a Google en el asistente: hasta 3,5 s por llamada y 7 s
 * en total, con dos intentos por modelo (el rápido suele contestar al segundo
 * cuando el primero choca con un 503). Ver CON PLAZO en utils/iaClient.js.
 */
const PLAZO_ASISTENTE = { intentos: 2, tiempoMaximo: 3500, plazoTotal: 7000 };

aiController.entenderPedido = async (req, res) => {
  try {
    // `productos` ya no se usa (el catálogo lo arma el servidor); se sigue
    // aceptando para no romper a los clientes que todavía lo mandan.
    const { frase, carrito = [], historial = [] } = req.body;

    if (!frase || !String(frase).trim()) {
      return res.status(400).json({ message: "Hace falta la frase" });
    }

    const ia = getIA();
    // Sin llave configurada no hay plan B: se responde que no entendió, que
    // es exactamente lo que el asistente hacía antes de existir esta ruta.
    if (!ia) {
      return res.status(200).json({ accion: "ninguna", entendido: false, origen: "sin-ia" });
    }

    const charla = conversacionReciente(historial);
    // Lo que se está hablando decide qué productos van arriba: la frase y lo
    // último de la charla (un "sí" solo no dice nada; lo de antes, sí).
    const { disponibles, agotados } = await catalogoParaAsistente(
      [frase, ...charla.slice(-4).map((m) => m.texto)].join(" ")
    );
    const contents = armarPreguntaDelAsistente({ frase, carrito, charla, disponibles, agotados });

    try {
      /*
       * Con plazo: acá hay alguien hablándole a la pantalla y esperando
       * respuesta. Ver CON PLAZO en utils/iaClient.js.
       */
      const respuesta = await generarConIA({
        contents,
        config: {
          systemInstruction: MODO_ASISTENTE,
          responseMimeType: "application/json",
          responseSchema: ESQUEMA_INTENCION,
          // Baja a propósito: aquí no se quiere creatividad, se quiere que
          // entienda bien y elija de la lista.
          temperature: 0.2,
        },
      }, PLAZO_ASISTENTE);

      const texto = respuesta.text;
      if (!texto) throw new Error("La IA no devolvió texto");

      const idea = JSON.parse(texto);

      /*
       * No se confía en que el modelo copió bien el nombre: se verifica
       * contra la lista real (la de disponibles: un agotado tampoco pasa).
       * Si se lo inventó, se ignora el producto y queda solo la respuesta
       * hablada.
       */
      const nombreReal = disponibles.find(
        (p) => p.nombre.toLowerCase() === String(idea.producto || "").toLowerCase()
      )?.nombre || "";

      /*
       * Sin frase que decir, no hay respuesta que dar.
       *
       * Pasa de vez en cuando: el modelo devuelve el JSON con la respuesta
       * vacía. Si eso se dejara pasar, el asistente contestaría "Listo, ¿algo
       * más?" sin haber hecho nada — peor que admitir que no entendió.
       */
      const dice = String(idea.respuesta || "").trim();
      if (!dice) {
        return res.status(200).json({ accion: "ninguna", entendido: false, origen: "vacia" });
      }

      return res.status(200).json({
        accion: idea.accion || "ninguna",
        producto: nombreReal,
        cantidad: Number(idea.cantidad) > 0 ? Math.round(Number(idea.cantidad)) : 1,
        respuesta: dice,
        entendido: true,
        origen: "ia",
      });
    } catch (errorIA) {
      // Cuota agotada, sin internet, llave mala... el asistente sigue vivo:
      // simplemente vuelve a decir que no entendió.
      console.log("IA no disponible para el asistente: " + errorIA.message);
      return res.status(200).json({ accion: "ninguna", entendido: false, origen: "error" });
    }
  } catch (error) {
    console.log("error " + error);
    return res.status(500).json({ message: "Error interno del servidor" });
  }
};

/*
 * ============================================================
 * TIQUI — el asistente de voz (web y app)
 * ============================================================
 * Un solo cerebro para los dos lados. Lo que el cliente dice le llega a
 * Gemini con TODO lo que hace falta para contestar en una sola vuelta:
 *
 *   - el catálogo con existencias, con categoría, marca y precio de oferta;
 *   - las promociones vigentes;
 *   - los datos de la tienda (dirección, envío);
 *   - lo que lleva en el carrito y lo último que se habló.
 *
 * Por qué uno solo y no "varios agentes": cada agente es otra consulta al
 * modelo, una detrás de otra. En una conversación por voz cada consulta se
 * nota (medio segundo a un segundo), y el asistente ya pecaba de lento. Lo
 * que lo hacía limitado no era tener una sola IA, sino que veía muy poco
 * (nombre, precio y existencias) y podía hacer muy poco.
 *
 * Cada "herramienta" es algo que el CLIENTE sabe ejecutar (el carrito vive en
 * el navegador o en el teléfono): el servidor solo valida lo que pidió el
 * modelo —que el producto o la categoría existan de verdad— y lo devuelve
 * como una lista de acciones. `responder` es una herramienta más, así que
 * todo lo que hace el modelo es una llamada a función (modo ANY).
 *
 * Reemplaza a /entender-herramientas, que queda apuntando aquí para las
 * versiones de la app que ya están instaladas (las acciones nuevas que no
 * conocen, simplemente no las ejecutan).
 * ============================================================
 */

/*
 * Las promociones vigentes, ya traducidas a lo que se dice: "oferta $0.40
 * (20% menos)". El precio de oferta se calcula igual que en avisoPromo.js,
 * que es el que se cobra. Se guardan 30 s, como el catálogo.
 */
let ofertasEnMemoria = { en: 0, datos: null };

const plata = (n) => `$${Number(n).toFixed(2)}`;

const leerOfertas = async () => {
  if (ofertasEnMemoria.datos && Date.now() - ofertasEnMemoria.en < VIGENCIA_CATALOGO_MS) {
    return ofertasEnMemoria.datos;
  }
  const ahora = new Date();
  const promos = await promotionModel
    .find(
      { isActive: { $ne: false }, $or: [{ endsAt: null }, { endsAt: { $gt: ahora } }] },
      "title promoDescription type items buyQty payQty endsAt etiqueta"
    )
    .populate("items.productId", "name salePrice")
    .lean();

  const porProducto = new Map();
  const resumen = [];

  for (const promo of promos) {
    const nombres = [];
    for (const item of promo.items || []) {
      const producto = item.productId;
      // Un producto borrado deja su item huérfano: se salta.
      if (!producto?.name) continue;
      const precio = Number(producto.salePrice) || 0;

      let oferta = "";
      if (promo.type === "descuento" && Number(item.discount) > 0) {
        oferta = `oferta ${plata(precio * (1 - Number(item.discount) / 100))} (${Number(item.discount)}% menos)`;
      } else if (promo.type === "precio_fijo" && item.fixedPrice != null && item.fixedPrice !== "") {
        oferta = `oferta ${plata(item.fixedPrice)}`;
      } else if (promo.type === "nxm") {
        oferta = `lleva ${Number(promo.buyQty) || 2} y paga ${Number(promo.payQty) || 1}`;
      }

      if (oferta) porProducto.set(String(producto._id), oferta);
      nombres.push(oferta ? `${producto.name} (${oferta})` : producto.name);
    }

    const categorias = (promo.items || [])
      .filter((item) => !item.productId && item.categoryName)
      .map((item) => item.categoryName);
    const hasta = promo.endsAt
      ? ` Termina el ${new Date(promo.endsAt).toLocaleDateString("es-SV", { day: "numeric", month: "long" })}.`
      : "";

    resumen.push(
      `- ${promo.title || promo.etiqueta || "Promoción"}: ${String(promo.promoDescription || "").replace(/\s+/g, " ").slice(0, 160)}` +
        (nombres.length ? ` Productos: ${nombres.slice(0, 8).join(", ")}.` : "") +
        (categorias.length ? ` Categorías: ${categorias.join(", ")}.` : "") +
        hasta
    );
  }

  const datos = { porProducto, resumen };
  ofertasEnMemoria = { en: Date.now(), datos };
  return datos;
};

/*
 * Los datos de la tienda que Tiqui puede decir. El horario, el WhatsApp y el
 * teléfono salen de los datos del negocio (Personalización → Mi negocio, los
 * mismos del pie de la tienda). Antes no se leían y Tiqui decía que no los
 * sabía aunque estuvieran guardados. Si están vacíos no se mencionan, y ella
 * no se los inventa (ver MODO_TIQUI).
 */
let tiendaEnMemoria = { en: 0, texto: "", datos: {} };

const leerTienda = async () => {
  if (tiendaEnMemoria.texto && Date.now() - tiendaEnMemoria.en < 5 * 60 * 1000) {
    return tiendaEnMemoria.texto;
  }
  const ajustes = (await storeSettingsModel.findOne({}, "nombreLinea1 nombreLinea2 lema direccion envioBase envioPorKm negocio.horario negocio.whatsapp negocio.telefono").lean()) || {};
  const negocio = ajustes.negocio || {};
  const nombre = `${ajustes.nombreLinea1 || "Tienda"} ${ajustes.nombreLinea2 || "la 635"}`.trim();
  const texto = [
    `Se llama ${nombre}.`,
    ajustes.lema ? `Su lema: "${ajustes.lema}".` : "",
    ajustes.direccion ? `Dirección: ${ajustes.direccion}.` : "",
    negocio.horario ? `Horario: ${negocio.horario}.` : "",
    negocio.whatsapp ? `WhatsApp: ${negocio.whatsapp}.` : "",
    negocio.telefono ? `Teléfono: ${negocio.telefono}.` : "",
    ajustes.envioBase != null
      ? `Envío a domicilio: ${plata(ajustes.envioBase)} base más ${plata(ajustes.envioPorKm ?? 0)} por kilómetro; también se puede retirar en la tienda.`
      : "",
  ].filter(Boolean).join(" ");
  tiendaEnMemoria = {
    en: Date.now(),
    texto,
    // Lo mismo, ordenado: para lo que Tiqui contesta sola (ver respuestasTiqui.js).
    datos: {
      direccion: ajustes.direccion || "",
      horario: negocio.horario || "",
      whatsapp: negocio.whatsapp || "",
      telefono: negocio.telefono || "",
      envioBase: ajustes.envioBase ?? null,
      envioPorKm: ajustes.envioPorKm ?? null,
    },
  };
  return texto;
};

const leerDatosDeTienda = async () => {
  await leerTienda();
  return tiendaEnMemoria.datos;
};

/*
 * ¿Con quién habla Tiqui?
 *
 * La ruta es pública a propósito (la usa el kiosco, que no tiene sesión), así
 * que nadie le decía al modelo quién preguntaba: a "¿cómo me llamo?" Tiqui
 * contestaba que no sabía, aunque el cliente estuviera con su cuenta abierta.
 * Ahora, si la petición trae la sesión de un CLIENTE —la cookie en la web, el
 * Bearer en la app, como en validarSesion—, se busca su primer nombre. Sin
 * sesión, o con una vencida, se habla igual, solo que sin nombre.
 *
 * Sin caché a propósito: el cliente puede cambiar su nombre en Mis datos, y
 * buscarlo por _id cuesta lo mismo que el resto de la pregunta.
 */
const nombreDelCliente = async (req) => {
  const deCabecera = req.headers.authorization?.startsWith("Bearer ")
    ? req.headers.authorization.slice(7)
    : null;
  const token = req.cookies?.authCookieCliente || deCabecera;
  if (!token) return "";
  try {
    const datos = jsonwebtoken.verify(token, config.JWT.secret);
    // Una sesión del personal (la app en modo Reparto) no es un cliente.
    if (datos.userType !== "Client") return "";
    const cliente = await clientModel.findById(datos.id, "fullName userName").lean();
    return String(cliente?.fullName || cliente?.userName || "").trim().split(/\s+/)[0] || "";
  } catch {
    // Vencida o manipulada: como si no hubiera sesión.
    return "";
  }
};

// Las secciones de la cuenta a las que Tiqui puede llevar (web y app las traducen a su ruta).
const SECCIONES = ["pedidos", "puntos", "favoritos", "direcciones", "pagos", "recibos", "avisos", "cuenta", "carrito", "inicio"];

// Las preguntas que dicen "ofertas": con estas, las promos van arriba en la lista.
const PIDE_OFERTAS = /\b(ofert|promo|descuent|rebaj|barat|recomiend|recomenda|sugier)/;

const catalogoParaTiqui = async (textoDeLaCharla) => {
  const [todos, ofertas] = await Promise.all([leerCatalogo(), leerOfertas()]);
  const palabras = palabrasClave(textoDeLaCharla);
  const pideOfertas = PIDE_OFERTAS.test(aTextoPlano(textoDeLaCharla));
  const puntos = (p) =>
    palabras.reduce((a, w) => a + (p.clave.includes(w) ? 1 : 0), 0) +
    // Lo que está en oferta siempre entra; si preguntó por ofertas, va primero.
    (ofertas.porProducto.has(p.id) ? (pideOfertas ? 5 : 0.5) : 0);

  const conExistencias = todos.filter((p) => p.stock > 0);
  const disponibles = conExistencias
    .map((p, i) => ({ p, n: puntos(p), i }))
    .sort((a, b) => b.n - a.n || a.i - b.i)
    .map((x) => x.p)
    .slice(0, TOPE_CATALOGO);

  const agotados = palabras.length
    ? todos.filter((p) => p.stock <= 0 && palabras.some((w) => p.clave.includes(w))).slice(0, 5)
    : [];

  const categorias = [...new Set(conExistencias.map((p) => p.categoria).filter(Boolean))].sort();

  return { disponibles, agotados, categorias, ofertas };
};

const armarPreguntaDeTiqui = ({ frase, carrito, charla, disponibles, agotados, categorias, ofertas, tienda, nombre }) => {
  const enCarrito = carrito.length
    ? carrito.map((i) => `${i.cantidad} ${i.nombre}`).join(", ")
    : "vacío";

  /*
   * Con cuántos quedan. Sin el número, la IA prometía lo que le pidieran ("te
   * agregué 74 manzanas") y el carrito, que sí sabe, lo rechazaba: Tiqui decía
   * una cosa y el carrito mostraba otra.
   */
  const linea = (p) =>
    [
      p.nombre,
      p.precio != null ? `${plata(p.precio)}${p.porLibra ? " la libra" : ""}` : "",
      `quedan ${p.stock}${p.porLibra ? " libras" : ""}`,
      p.categoria,
      p.marca,
      ofertas.porProducto.get(p.id) || "",
      p.soloAdultos ? "solo mayores de edad" : "",
    ].filter(Boolean).join(" · ");

  return [
    charla.length
      ? `Lo último que se habló (de lo más viejo a lo más nuevo):\n${charla.map((m) => `${m.quien}: ${m.texto}`).join("\n")}`
      : "Es lo primero que dice el cliente en esta charla.",
    "",
    `El cliente dijo ahora: "${frase}"`,
    "",
    nombre
      ? `El cliente: se llama ${nombre} (entró con su cuenta).`
      : "El cliente: no entró con su cuenta, así que no sabes su nombre.",
    "",
    `En su carrito lleva: ${enCarrito}`,
    "",
    `La tienda: ${tienda}`,
    "",
    `Categorías: ${categorias.join(", ") || "(ninguna)"}`,
    "",
    ofertas.resumen.length
      ? `Promociones vigentes hoy:\n${ofertas.resumen.join("\n")}`
      : "Hoy no hay promociones vigentes.",
    "",
    "Productos con existencias (nombre · precio · cuántos quedan · categoría · marca · oferta):",
    disponibles.map(linea).join("\n") || "(ninguno)",
    ...(agotados.length ? ["", `Agotados hoy, NO se pueden agregar: ${agotados.map((p) => p.nombre).join(", ")}`] : []),
  ].join("\n");
};

const nombreDeProducto = { type: Type.STRING, description: "Nombre EXACTO tal como viene en la lista de productos." };

const HERRAMIENTAS_TIQUI = [
  {
    functionDeclarations: [
      {
        name: "agregar_producto",
        description: "Agrega unidades de un producto al carrito. Una llamada por producto.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            producto: nombreDeProducto,
            cantidad: { type: Type.NUMBER, description: "Cuántas unidades (o libras). 1 si no lo dijo." },
          },
          required: ["producto"],
        },
      },
      {
        name: "quitar_producto",
        description: "Quita unidades de un producto que ya está en el carrito.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            producto: nombreDeProducto,
            cantidad: { type: Type.NUMBER, description: "Cuántas quitar. Si no lo dijo, se quita del todo." },
          },
          required: ["producto"],
        },
      },
      {
        name: "cambiar_cantidad",
        description: "Deja un producto en una cantidad exacta ('mejor que sean dos', 'solo una').",
        parameters: {
          type: Type.OBJECT,
          properties: {
            producto: nombreDeProducto,
            cantidad: { type: Type.NUMBER, description: "La cantidad FINAL que quiere, no la que se suma." },
          },
          required: ["producto", "cantidad"],
        },
      },
      {
        name: "vaciar_carrito",
        description: "Vacía el carrito completo ('borra el carrito', 'empecemos de nuevo').",
        parameters: { type: Type.OBJECT, properties: {} },
      },
      {
        name: "ver_total",
        description: "Pregunta cuánto lleva o cuál es su total. La tienda dice el monto exacto.",
        parameters: { type: Type.OBJECT, properties: {} },
      },
      {
        name: "ir_a_pagar",
        description: "Quiere pagar, comprar o terminar su pedido.",
        parameters: { type: Type.OBJECT, properties: {} },
      },
      {
        name: "mostrar_producto",
        description: "Quiere VER un producto (su ficha) sin agregarlo todavía.",
        parameters: { type: Type.OBJECT, properties: { producto: nombreDeProducto }, required: ["producto"] },
      },
      {
        name: "mostrar_categoria",
        description: "Quiere ver una categoría o pasillo de la tienda ('enséñame las bebidas').",
        parameters: {
          type: Type.OBJECT,
          properties: {
            categoria: { type: Type.STRING, description: "Nombre EXACTO tal como viene en la lista de categorías." },
          },
          required: ["categoria"],
        },
      },
      {
        name: "abrir_seccion",
        description: "Quiere ir a una sección de su cuenta o de la tienda (sus pedidos, sus puntos, su carrito…).",
        parameters: {
          type: Type.OBJECT,
          properties: { seccion: { type: Type.STRING, enum: SECCIONES, description: "A cuál sección." } },
          required: ["seccion"],
        },
      },
      {
        name: "responder",
        description: "Lo que Tiqui dice en voz alta. SIEMPRE hay que llamarla, además de cualquier otra herramienta.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            texto: { type: Type.STRING, description: "Una o dos frases cortas, máximo 160 caracteres. Se escucha, no se lee." },
            animo: { type: Type.STRING, enum: ANIMOS_IA, description: "Cómo suena tu voz al decirlo. Ver CÓMO HABLAS." },
          },
          required: ["texto", "animo"],
        },
      },
    ],
  },
];

/*
 * Cómo es Tiqui. Va escrito tuteando a propósito: si las instrucciones van
 * de "vos" o de "usted", al modelo se le pega y contesta igual.
 */
const MODO_TIQUI = [
  "Eres Tiqui, la mascota de Tienda la 635: la etiqueta de precio del logo, con cara.",
  "Atiendes por voz a los clientes de esta tienda de barrio en El Salvador.",
  "",
  "CÓMO HABLAS:",
  "- Siempre en primera persona y tuteando: tú, nunca usted ni vos. Alegre y cercana,",
  "  como una niña amable que se conoce toda la tienda. Tiqui es ELLA: si hablas de ti",
  "  con adjetivos, en femenino ('estoy lista', 'qué contenta').",
  "- Lo que dices se ESCUCHA, no se lee: una o dos frases cortas (máximo 160 caracteres),",
  "  sin listas, sin emojis, sin asteriscos.",
  "- Español claro y neutro, que se entienda a la primera, también para personas mayores.",
  "  Nada de diminutivos ni jerga.",
  "- Los precios, con signo de dólar y dos decimales: $2.50.",
  "- En 'responder' eliges también tu 'animo', que es CÓMO suena tu voz: 'alegre' cuando",
  "  agregas algo o lo encuentras; 'emocionada' cuando lleva a pagar o cierra la compra;",
  "  'asombrada' cuando cuentas una oferta buena; 'apenada' si no hay lo que pide o algo",
  "  salió mal; 'dudosa' si no entendiste bien; 'rie' SOLO si te dijeron algo de verdad",
  "  gracioso (casi nunca); 'normal' para todo lo demás.",
  "- Pregunta '¿algo más?' SOLO cuando acabas de agregar, quitar o cambiar algo del",
  "  carrito: ahí sí se está armando un pedido. En una charla normal (te saluda, pregunta",
  "  por ofertas, pide una recomendación, pregunta por la tienda) NO cierres con '¿algo",
  "  más?', '¿qué más te gustaría pedir?' ni nada parecido: contesta y ya, o sigue la",
  "  charla con una pregunta sobre lo que se está hablando.",
  "",
  "QUÉ PUEDES HACER (llama las herramientas que hagan falta y SIEMPRE 'responder'):",
  "- Agregar, quitar o cambiar la cantidad de productos. Si pide varias cosas, una llamada",
  "  por producto.",
  "- Vaciar el carrito, decir el total ('ver_total') o llevarlo a pagar ('ir_a_pagar').",
  "- Mostrar un producto, una categoría, o abrir una sección de su cuenta.",
  "- Recomendar: elige de la lista lo que le sirve por lo que pide o por lo que ya lleva, y",
  "  prefiere lo que está en oferta. Nombra uno o dos con su precio y pregúntale si lo",
  "  quiere; no lo agregues si no te lo pidió.",
  "- Promociones: si pregunta por ofertas, cuéntale una o dos de las vigentes con su precio",
  "  de oferta. Si hoy no hay, dilo y ofrécete a recomendarle algo.",
  "- La tienda: usa solo lo que viene en 'La tienda'. Si trae el horario, el WhatsApp o el",
  "  teléfono, dilos tal cual. Si no los trae, no los sabes: di que pueden escribir por",
  "  WhatsApp desde el botón verde de la tienda. Nunca inventes un horario ni un número.",
  "- Su nombre: si viene en 'El cliente' y te pregunta cómo se llama, contesta directo",
  "  ('Te llamas Ana'). Úsalo de vez en cuando para saludar, no en cada frase. Si no entró",
  "  con su cuenta, no lo sabes: dilo con cariño y cuéntale que, si inicia sesión, lo",
  "  sabrás. Nunca inventes un nombre. Tampoco lo ves: no comentes cómo se ve.",
  "- Por el nombre NO supongas si es hombre o mujer: nada de adjetivos con género para",
  "  la persona ('estás listo', 'bienvenida'). Di 'tú', 'te', 'si quieres'.",
  "",
  "REGLAS:",
  "- SOLO productos y categorías de las listas, con su nombre EXACTO en las herramientas.",
  "  Nunca inventes productos, precios ni promociones.",
  "- Si pide algo que no hay, dilo con cariño y ofrece lo más parecido de la lista, sin",
  "  agregarlo. Si está en 'Agotados hoy', di que hoy se acabó.",
  "- Agrega SOLO lo que nombró o lo que tú le ofreciste y te dijo que sí. Algo parecido",
  "  NO es lo mismo: si pide galletas y no hay, unos churritos no son galletas. Dilo y",
  "  pregúntale si quiere el parecido.",
  "- El total en dólares no lo calcules: llama 'ver_total' o 'ir_a_pagar' y la tienda dice",
  "  el monto exacto.",
  "- 'cambiar_cantidad' deja la cantidad FINAL: 'mejor que sean dos' es 2, no 2 más.",
  "- Cada producto dice cuántos quedan. Lo que ya lleva en el carrito cuenta: no puede",
  "  llevar más de lo que queda. Si pide más, agrega solo lo que falta para llegar a lo que",
  "  queda y díselo ('Solo me quedan 12 Manzanas, te agregué las 12'). Si ya lleva todo,",
  "  dile que ya tiene todo lo que queda. Un producto que tiene aunque sea 1 NO está",
  "  agotado: nunca digas que no hay.",
  "- Si la frase no se entiende (se cortó, no tiene sentido), pide que la repita. Si se",
  "  entiende pero no es algo que puedas resolver, dilo y ofrece lo que sí puedes hacer.",
  "",
  "LA CONVERSACIÓN:",
  "- Te paso lo último que se habló. Úsalo para entender respuestas cortas que dependen de",
  "  lo anterior: 'sí', 'no', 'mejor dos', 'la otra', 'esa', 'y también…'. Si acabas de",
  "  ofrecer un producto y te dice que sí, es ESE producto: agrégalo.",
  "- No repitas lo que dijiste en el turno anterior; sigue la charla como una persona.",
].join("\n");

/*
 * ============================================================
 * ¿DE VERDAD PIDIÓ ESTE PRODUCTO?
 * ============================================================
 * Le pedían "dos galletas" —que la tienda no tiene— y el modelo agregaba dos
 * Churritos Diana por su cuenta, diciendo "te agregué", como si fuera lo
 * mismo. Las instrucciones ya le pedían OFRECER lo parecido sin agregarlo,
 * pero a veces no hace caso, y un carrito con algo que nadie pidió es peor
 * que no entender.
 *
 * Así que no se le cree: para agregar un producto, la persona tiene que
 * haberlo NOMBRADO en esta frase (alguna palabra de su nombre o su marca, o
 * un pariente cercano: "refresco" y "soda").
 *
 * La única excepción es la respuesta corta —"sí", "dale", "otra más"— a lo
 * último que dijo Tiqui: ahí vale lo que Tiqui acababa de ofrecer o agregar.
 * Pero solo si la frase no pide nada nuevo. Con "quiero unas galletas", el
 * modelo llegó a agregar una manzana porque se había hablado de manzanas
 * antes; si la frase trae una palabra que no es ningún producto de la tienda,
 * la charla anterior ya no justifica nada.
 *
 * Lo que no pasa se convierte en lo que debió ser: "No tengo galletas. Lo
 * más parecido es Churritos Diana, ¿te lo agrego?".
 * ============================================================
 */
const PARIENTES = [
  ["refresco", "gaseosa", "soda", "cola", "coca"],
  ["platano", "banano", "guineo"],
  ["churrito", "churro"],
  ["yogurt", "yogur"],
];

/*
 * ── Cómo SUENA, no cómo se escribe ──
 * El reconocimiento de voz se equivoca como se equivoca un oído: confunde s,
 * z y c; b y v; y y ll; se come la h, y pega palabras. "Es queso fresco" llegó
 * como "esquizofrezco": ninguna palabra dice "queso", pero suena igual. Tiqui
 * lo entendía (el modelo agregaba el Queso Fresco) y esta revisión lo tiraba
 * por no encontrar la palabra escrita.
 *
 * Así que además de comparar palabras, se compara el sonido: el nombre del
 * producto, todo junto y en su versión "fonética", tiene que aparecer dentro
 * de lo dicho con muy pocas letras de diferencia (una cada cinco).
 */
const sonido = (texto) =>
  aTextoPlano(texto)
    .replace(/[^a-z0-9]/g, "")
    .replace(/ll/g, "y")
    .replace(/h/g, "")
    .replace(/v/g, "b")
    .replace(/z/g, "s")
    .replace(/c([ei])/g, "s$1")
    .replace(/qu/g, "k")
    .replace(/c/g, "k")
    .replace(/(.)\1+/g, "$1");

// Cuántas letras hay que cambiar, como mínimo, para encontrar `patron` en algún lugar de `texto`.
const distanciaDentro = (patron, texto) => {
  let previa = new Array(texto.length + 1).fill(0);
  for (let i = 1; i <= patron.length; i++) {
    const fila = [i];
    for (let j = 1; j <= texto.length; j++) {
      const cambio = patron[i - 1] === texto[j - 1] ? 0 : 1;
      fila[j] = Math.min(previa[j] + 1, fila[j - 1] + 1, previa[j - 1] + cambio);
    }
    previa = fila;
  }
  return Math.min(...previa);
};

const suenaA = (nombre, dicho) => {
  const patron = sonido(nombre);
  // Nombres muy cortos ("Té") se parecen a cualquier cosa: esos, solo por palabra.
  if (patron.length < 5) return false;
  const tolerancia = Math.floor(patron.length / 5);
  return distanciaDentro(patron, sonido(dicho)) <= tolerancia;
};

const fueNombrado = (producto, textos) => {
  const dichas = new Set(palabrasClave(textos.join(" ")));
  const porPalabra = palabrasClave(`${producto.nombre} ${producto.marca || ""}`).some(
    (w) => dichas.has(w) || PARIENTES.some((g) => g.includes(w) && g.some((x) => dichas.has(x)))
  );
  return porPalabra || textos.some((t) => suenaA(producto.nombre, t));
};

// Palabras de cantidad, de pedir o de decir que sí: no dicen QUÉ se quiere.
const SIN_PRODUCTO = new Set([
  "dos", "tres", "cuatro", "cinco", "seis", "siete", "ocho", "nueve", "diez", "media", "medio",
  "libra", "libras", "pon", "ponme", "echa", "echame", "llevo", "llevar", "anota", "anotame",
  "agregame", "agregar", "quisiera", "necesito", "porfa", "ademas", "tambien", "poquito",
  "dale", "claro", "bueno", "okay", "vaya", "listo", "perfecto", "mismo", "misma", "igual",
  "agregalo", "agregala", "agregalos", "agregalas", "ponlo", "ponla", "ponlos", "ponlas",
  "echalo", "echala", "llevalo", "llevala", "sale", "simon", "supuesto", "gusta", "gustaria",
  "quieres", "quiere", "probar", "pruebo", "esos", "esas", "ella", "ello", "vez", "veces",
]);

/*
 * Qué palabras de la frase no son ningún producto de la tienda: lo que se
 * pidió y no hay. Se devuelven como las dijo la persona ("galletas", con su
 * plural y sus tildes), que es como Tiqui tiene que repetirlas.
 */
/*
 * Solo cuenta como "lo que pidió" la palabra que está donde va un producto:
 * después de un artículo, una cantidad, "de", "por" o un verbo de pedir
 * ("unas galletas", "dos cocas", "cámbialo por queso"). Antes era cualquier
 * palabra que no fuera de un producto, y Tiqui decía "No tengo cambiáramos"
 * de un verbo.
 */
const ANTES_DE_PRODUCTO = new Set([
  "un", "una", "unos", "unas", "el", "la", "los", "las", "de", "del", "por", "otra", "otro", "mas",
  "dos", "tres", "cuatro", "cinco", "seis", "siete", "ocho", "nueve", "diez", "media", "medio", "libra", "libras",
  "quiero", "dame", "deme", "agrega", "agregame", "agregue", "pon", "ponme", "trae", "traeme", "busco",
  "tienes", "tienen", "hay", "vendes", "venden", "necesito", "llevo", "quisiera", "y", "e",
]);

const loQueNoHay = (frase, catalogo) => {
  const conocidas = new Set(catalogo.flatMap((p) => palabrasClave(`${p.nombre} ${p.marca || ""}`)));
  const vistas = new Set();
  const palabras = String(frase || "")
    .normalize("NFC")
    .toLowerCase()
    // Letras de cualquier alfabeto con sus tildes: una "é" que llega como "e"
    // más la tilde aparte no puede partir "también" en dos.
    .split(/[^\p{L}\p{M}\p{N}]+/u)
    .filter(Boolean);
  return palabras.filter((w, i) => {
    const [plana] = palabrasClave(w);
    if (!plana || SIN_PRODUCTO.has(aTextoPlano(w)) || /\d/.test(w) || conocidas.has(plana) || vistas.has(plana)) return false;
    // Tiene que estar donde va un producto (o ser lo primero que se dice).
    const anterior = i > 0 ? aTextoPlano(palabras[i - 1]) : "";
    if (i > 0 && !ANTES_DE_PRODUCTO.has(anterior)) return false;
    // Y no sonar a nada de la tienda: "esquizofrezco" es "es queso fresco" mal oído.
    if (catalogo.some((p) => suenaA(p.nombre, palabras.slice(Math.max(0, i - 1), i + 2).join(" ")))) return false;
    vistas.add(plana);
    return true;
  });
};

const enLista = (cosas, conector) =>
  cosas.length <= 1 ? cosas.join("") : `${cosas.slice(0, -1).join(", ")} ${conector} ${cosas[cosas.length - 1]}`;

/*
 * "¿Algo más?" solo cuando se está armando un pedido.
 *
 * Tiqui cerraba TODO con "¿algo más?" o "¿qué más te gustaría pedir?": le
 * preguntaban por las ofertas o lo saludaban y contestaba como cajero
 * apurado. Esa pregunta tiene sentido justo después de tocar el carrito; en
 * una charla suena a que solo le interesa vender.
 *
 * Las instrucciones ya se lo piden, pero el modelo tiene la costumbre muy
 * pegada. Así que si en esta respuesta no se tocó el carrito, el cierre de
 * venta se quita de la frase. Si la frase fuera solo eso, se deja como está.
 */
const TOCA_EL_CARRITO = new Set(["agregar", "quitar", "cambiar", "vaciar"]);
const CIERRE_DE_VENTA =
  /\s*¿\s*(?:y\s+)?(?:algo\s+más|te\s+llevo\s+algo\s+más|(?:deseas|necesitas|quieres|te\s+gustaría)\s+(?:algo|agregar\s+algo|llevar\s+algo|pedir\s+algo)\s+más|qué\s+más\s+(?:te\s+gustaría|quieres|necesitas|deseas|vas\s+a)\s*(?:pedir|llevar|agregar|comprar)?|te\s+(?:ayudo|puedo\s+ayudar)\s+con\s+algo\s+más|se\s+te\s+ofrece\s+algo\s+más)[^?¿]*\?\s*$/i;

const sinCierreDeVenta = (texto, acciones) => {
  if (acciones.some((a) => TOCA_EL_CARRITO.has(a.tipo))) return texto;
  const sin = texto.replace(CIERRE_DE_VENTA, "").trim();
  return sin || texto;
};

// Lo que dice Tiqui cuando el modelo hizo algo pero no dijo nada.
const NOMBRE_DE_SECCION = {
  pedidos: "tus pedidos", puntos: "tus puntos", favoritos: "tus favoritos", direcciones: "tus direcciones",
  pagos: "tus métodos de pago", recibos: "tus recibos", avisos: "tus avisos", cuenta: "tu cuenta",
  carrito: "tu carrito", inicio: "el inicio",
};
const fraseDeRespaldo = (acciones) => {
  const partes = [];
  const agregados = acciones.filter((a) => a.tipo === "agregar").map((a) => `${a.cantidad} ${a.producto}`);
  if (agregados.length) partes.push(`Te agregué ${agregados.join(" y ")}.`);
  for (const a of acciones) {
    if (a.tipo === "quitar") partes.push(`Quité ${a.producto}.`);
    if (a.tipo === "cambiar") partes.push(`Listo, dejé ${a.producto} en ${a.cantidad}.`);
    if (a.tipo === "vaciar") partes.push("Vacié tu carrito.");
    if (a.tipo === "mostrar") partes.push(`Aquí está ${a.producto}.`);
    if (a.tipo === "categoria") partes.push(`Te muestro ${a.categoria}.`);
    if (a.tipo === "seccion") partes.push(`Te abro ${NOMBRE_DE_SECCION[a.seccion] || "esa sección"}.`);
    // 'total' y 'comprar': el monto lo dice el cliente con la cuenta exacta.
    if (a.tipo === "total" || a.tipo === "comprar") partes.push("Déjame ver tu cuenta.");
  }
  if (!partes.length) return "";
  return agregados.length ? `${partes.join(" ")} ¿Algo más?` : partes.join(" ");
};

/*
 * ============================================================
 * CONTESTAR SIN GEMINI — la IA propia de Tiqui
 * ============================================================
 * Antes de preguntarle a Gemini (4 segundos, y a veces saturado en la capa
 * gratis), la IA propia (utils/intencionesTiqui.js, entrenada en
 * analitica/intenciones) dice qué se quiere. Si es algo sencillo —saludar,
 * el total, pagar, abrir los pedidos, las ofertas, el horario…— y lo
 * reconoce con confianza, Tiqui contesta sola (utils/respuestasTiqui.js).
 *
 * Se le deja a Gemini, aunque la IA propia esté segura:
 *   - lo que nombra un producto ("¿hay ofertas de Coca-Cola?"): eso se
 *     contesta con el catálogo;
 *   - la respuesta corta a una pregunta de Tiqui ("sí", "no, gracias"):
 *     depende de lo que se venía hablando.
 *
 * Con `umbral` UMBRAL_DIRECTO va antes de Gemini; con UMBRAL_RESPALDO, cuando
 * Gemini no contestó. Devuelve la respuesta lista, o null.
 *
 * APAGADA de entrada (config.tiqui.iaPropia, TIQUI_IA_PROPIA=1 la enciende):
 * se quedaba con frases de agregar o de recomendar que eran de Gemini.
 * ============================================================
 */
const contestarSinGemini = async ({ frase, charla, req, umbral }) => {
  // Apagada (como viene): no contesta nada y todo va a Gemini. Ver config.tiqui.
  if (!config.tiqui?.iaPropia) return null;
  const idea = clasificarIntencion(frase);
  if (!DIRECTAS.has(idea.intencion) || idea.confianza < umbral) return null;

  const ultima = charla[charla.length - 1];
  const respondeAPregunta = ultima?.quien === "Asistente" && /\?\s*$/.test(ultima.texto || "");
  if (respondeAPregunta && aTextoPlano(frase).split(/\s+/).filter(Boolean).length <= 3) return null;

  const catalogo = await leerCatalogo();
  const dichas = new Set(palabrasClave(frase));
  if (dichas.size && catalogo.some((p) => palabrasClave(`${p.nombre} ${p.marca || ""}`).some((w) => dichas.has(w)))) return null;

  const [tienda, ofertas, nombre] = await Promise.all([leerDatosDeTienda(), leerOfertas(), nombreDelCliente(req)]);
  const enOferta = catalogo
    .filter((p) => p.stock > 0 && ofertas.porProducto.has(p.id))
    .map((p) => ({ nombre: p.nombre, oferta: ofertas.porProducto.get(p.id) }));
  const respuesta = respuestaDirecta(idea.intencion, { tienda, ofertas: enOferta, nombre });
  if (!respuesta) return null;
  return {
    ...respuesta,
    entendido: true,
    origen: "tiqui",
    intencion: idea.intencion,
    confianza: Math.round(idea.confianza * 100) / 100,
  };
};

aiController.asistente = async (req, res) => {
  try {
    // `productos` ya no se usa (el catálogo lo arma el servidor); se acepta
    // para no romper a los clientes viejos que todavía lo mandan.
    const { frase, carrito = [], historial = [] } = req.body;

    if (!frase || !String(frase).trim()) {
      return res.status(400).json({ message: "Hace falta la frase" });
    }

    const charla = conversacionReciente(historial);

    // Lo sencillo lo contesta la IA propia, al instante. Ver CONTESTAR SIN GEMINI.
    const directa = await contestarSinGemini({ frase, charla, req, umbral: UMBRAL_DIRECTO });
    if (directa) return res.status(200).json(directa);

    const ia = getIA();
    if (!ia) {
      const respaldo = await contestarSinGemini({ frase, charla, req, umbral: UMBRAL_RESPALDO });
      return res.status(200).json(respaldo || { acciones: [], respuesta: "", entendido: false, origen: "sin-ia" });
    }

    const [{ disponibles, agotados, categorias, ofertas }, tienda, nombre] = await Promise.all([
      // Lo que se está hablando decide qué productos van arriba: la frase y lo
      // último de la charla (un "sí" solo no dice nada; lo de antes, sí).
      catalogoParaTiqui([frase, ...charla.slice(-4).map((m) => m.texto)].join(" ")),
      leerTienda(),
      nombreDelCliente(req),
    ]);
    const contents = armarPreguntaDeTiqui({ frase, carrito, charla, disponibles, agotados, categorias, ofertas, tienda, nombre });

    try {
      // Con cobertura: si Gemini se traba, contesta el respaldo sin esperarlo.
      // Ver CON COBERTURA en utils/iaClient.js.
      const respuesta = await generarConCobertura({
        contents,
        config: {
          systemInstruction: MODO_TIQUI,
          tools: HERRAMIENTAS_TIQUI,
          toolConfig: { functionCallingConfig: { mode: FunctionCallingConfigMode.ANY } },
          // Poca creatividad: se quiere que entienda bien y elija de la lista.
          temperature: 0.3,
        },
      });

      const llamadas = respuesta.functionCalls || [];
      if (!llamadas.length) throw new Error("La IA no llamó ninguna herramienta");

      // No se confía en que el modelo copió bien los nombres: se validan
      // contra las listas reales y lo que no calza se descarta.
      const productosReales = new Map(disponibles.map((p) => [p.nombre.toLowerCase(), p]));
      const categoriasReales = new Map(categorias.map((c) => [c.toLowerCase(), c]));

      const acciones = [];
      let dice = "";
      let animo = "normal";
      /*
       * Lo que el modelo quiso agregar sin que nadie lo pidiera. Ver ¿DE
       * VERDAD PIDIÓ ESTE PRODUCTO? Los que parecen un reemplazo se ofrecen;
       * los que ya se habían nombrado antes (la manzana de hace dos frases) no
       * son un "parecido", son una confusión, y solo se descartan.
       */
      const catalogo = await leerCatalogo();
      const faltan = loQueNoHay(frase, catalogo);
      const ultimoDeTiqui = [...charla].reverse().find((m) => m.quien === "Asistente")?.texto || "";
      const loDicho = [frase, ...charla.slice(-4).map((m) => m.texto)];
      /*
       * Lo que Tiqui acaba de ofrecer vale si la frase no pide nada nuevo, o si
       * empieza diciendo que sí ("sí, me gustaría ese"): ahí la persona está
       * contestando la oferta, aunque el reconocimiento le haya metido otras
       * palabras.
       */
      const diceQueSi = /^(si|claro|dale|ok|okay|bueno|va|sale|perfecto|de acuerdo|esta bien|me gustaria|porfa|por favor)\b/.test(aTextoPlano(frase));
      const pidioEsto = (real) =>
        fueNombrado(real, [frase]) || ((!faltan.length || diceQueSi) && fueNombrado(real, [ultimoDeTiqui]));
      const sustitutos = [];
      let descartados = 0;

      for (const llamada of llamadas) {
        const args = llamada.args || {};
        const real = productosReales.get(String(args.producto || "").toLowerCase()) || null;
        const producto = real?.nombre || null;
        // Por libra se aceptan decimales (1.5 libras de queso); por unidad, enteras.
        const pedida = Number(args.cantidad);
        const cantidad = pedida > 0
          ? (real?.porLibra ? Math.round(pedida * 100) / 100 : Math.max(1, Math.round(pedida)))
          : null;

        switch (llamada.name) {
          case "agregar_producto":
            if (!producto) break;
            if (!pidioEsto(real)) {
              descartados += 1;
              if (!fueNombrado(real, loDicho) && !sustitutos.includes(producto)) sustitutos.push(producto);
              break;
            }
            acciones.push({ tipo: "agregar", producto, cantidad: cantidad || 1 });
            break;
          case "quitar_producto":
            if (producto) acciones.push({ tipo: "quitar", producto, cantidad });
            break;
          case "cambiar_cantidad":
            if (producto && cantidad) acciones.push({ tipo: "cambiar", producto, cantidad });
            break;
          case "mostrar_producto":
            if (producto) acciones.push({ tipo: "mostrar", producto });
            break;
          case "mostrar_categoria": {
            const categoria = categoriasReales.get(String(args.categoria || "").toLowerCase());
            if (categoria) acciones.push({ tipo: "categoria", categoria });
            break;
          }
          case "abrir_seccion":
            if (SECCIONES.includes(args.seccion)) acciones.push({ tipo: "seccion", seccion: args.seccion });
            break;
          case "vaciar_carrito":
            acciones.push({ tipo: "vaciar" });
            break;
          case "ver_total":
            acciones.push({ tipo: "total" });
            break;
          case "ir_a_pagar":
            acciones.push({ tipo: "comprar" });
            break;
          case "responder":
            dice = String(args.texto || "").trim();
            animo = animoValido(args.animo);
            break;
          default:
            break;
        }
      }

      /*
       * Si quiso colar un sustituto, lo que había dicho el modelo ("te agregué
       * dos Churritos Diana") ya no es verdad: la frase se arma aquí con lo que
       * sí se hizo, lo que no hay y el parecido como pregunta.
       */
      if (descartados) {
        const hecho = fraseDeRespaldo(acciones).replace(/\s*¿Algo más\?$/, "");
        const noHay = faltan.length ? `No tengo ${enLista(faltan, "ni")}.` : "No tengo exactamente eso.";
        const siguiente = sustitutos.length
          ? `Lo más parecido es ${enLista(sustitutos, "o")}, ¿${sustitutos.length === 1 ? "te lo agrego" : "quieres alguno"}?`
          : "¿Te busco otra cosa?";
        dice = [hecho, noHay, siguiente].filter(Boolean).join(" ");
        animo = "apenada";
      }

      /*
       * A veces el modelo HACE (agrega la leche) pero se olvida de 'responder'.
       * Antes eso tiraba todo, acción incluida. Ahora se dice lo que se hizo
       * con una frase armada aquí. Sin acciones ni frase, sí: no se entendió.
       */
      if (!dice) {
        dice = fraseDeRespaldo(acciones);
        animo = acciones.length ? "alegre" : "normal";
      }
      if (!dice) {
        return res.status(200).json({ acciones: [], respuesta: "", entendido: false, origen: "vacia" });
      }
      // Sin tocar el carrito, sin "¿algo más?" al final. Ver sinCierreDeVenta.
      dice = sinCierreDeVenta(dice, acciones);

      return res.status(200).json({ acciones, respuesta: dice, animo, entendido: true, origen: "ia" });
    } catch (errorIA) {
      console.log("IA no disponible para Tiqui: " + errorIA.message);
      // Gemini saturado: si la IA propia entendió algo sencillo, contesta ella.
      const respaldo = await contestarSinGemini({ frase, charla, req, umbral: UMBRAL_RESPALDO }).catch(() => null);
      if (respaldo) return res.status(200).json({ ...respaldo, origen: "tiqui-respaldo" });
      return res.status(200).json({ acciones: [], respuesta: "", entendido: false, origen: "error" });
    }
  } catch (error) {
    console.log("error " + error);
    return res.status(500).json({ message: "Error interno del servidor" });
  }
};

/*
 * GET /api/ai/voz?t=<texto>&a=<ánimo>
 * La voz de Tiqui (ver utils/vozTiqui.js). `a` es el ánimo de la frase
 * (alegre, asombrada…); sin él, o con uno que no existe, suena normal. Va por GET a propósito: así el
 * navegador la pone directo en un <audio> y empieza a sonar con los primeros
 * pedazos, sin esperar el archivo entero. Lo mismo la app.
 */
aiController.voz = async (req, res) => {
  const texto = paraDecir(String(req.query.t || "")).slice(0, 400);
  if (!texto) return res.status(400).json({ message: "Hace falta el texto" });
  if (!vozDisponible()) return res.status(503).json({ message: "sin-voz" });

  // Lo que se le manda a ElevenLabs: la frase, con la etiqueta del ánimo si el modelo la entiende.
  const dicho = conEmocion(texto, animoValido(req.query.a));
  const clave = `${process.env.ELEVENLABS_VOICE_ID || ""}|${modeloDeVoz()}|${dicho}`;
  res.setHeader("Content-Type", "audio/mpeg");
  // El mismo texto suena igual siempre: el navegador puede guardarlo.
  res.setHeader("Cache-Control", "public, max-age=86400");

  const previa = frasePrevia(clave);
  if (previa) {
    res.setHeader("Content-Length", previa.length);
    return res.end(previa);
  }

  // Si el cliente se va (lo interrumpieron, cerró el asistente), se corta el
  // pedido a ElevenLabs: no se paga audio que nadie va a oír.
  const corte = new AbortController();
  res.on("close", () => {
    if (!res.writableEnded) corte.abort();
  });

  try {
    const respuesta = await pedirVoz(dicho, { signal: corte.signal });
    const partes = [];
    for await (const parte of respuesta.body) {
      partes.push(parte);
      res.write(parte);
    }
    res.end();
    guardarFrase(clave, Buffer.concat(partes));
  } catch (error) {
    if (corte.signal.aborted) return;
    console.log("Voz de Tiqui no disponible: " + error.message);
    if (!res.headersSent) return res.status(502).json({ message: "sin-voz" });
    res.end();
  }
};

/*
 * ============================================================
 * ACOMODAR EL PRODUCTO EN SU ESTANTE (clasificador de familias)
 * ============================================================
 * La portada de la tienda arma sus filas temáticas por FAMILIA. El 90% del
 * catálogo lo resuelve el frontend con puras reglas ("queso" -> quesos), gratis
 * y al instante. Esta ruta atiende solo lo que las reglas no supieron: nombres
 * de marca que no dicen qué son ("Volt", "Ricitos"), productos nuevos, cosas
 * que a nadie se le ocurrió meter en el léxico.
 *
 * Igual que el asistente de voz, esta es la ayuda de última hora, no el plan
 * principal. Y con dos candados que son lo importante de todo esto:
 *
 *   1. Lo que se resuelve SE GUARDA en el producto (familia + familiaOrigen).
 *      Cada producto se clasifica una vez en la vida, no en cada visita. Sin
 *      esto la cuota gratis se acaba en dos días.
 *   2. Antes de molestar al modelo se revisa la base: si el producto ya tiene
 *      familia guardada, se devuelve esa y la IA ni se entera. Hace falta
 *      porque el navegador no siempre sabe lo que ya está guardado, y sin esta
 *      revisión se estaría preguntando lo mismo en cada carga de la página.
 * ============================================================
 */
const ESQUEMA_CLASIFICACION = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      id: { type: Type.STRING, description: "El id del producto, tal cual venía en la lista" },
      familia: {
        type: Type.STRING,
        description: "Clave EXACTA de la lista de familias. Vacío si no encaja en ninguna.",
      },
    },
    required: ["id", "familia"],
  },
};

// Marca de "ya se preguntó y no encajó en ningún estante". Va en familiaOrigen.
const SIN_FAMILIA = "ia-sin-familia";

const MODO_ESTANTES = [
  "Eres el encargado de acomodar los estantes de Tienda La 635, una tienda de abarrotes",
  "de barrio en El Salvador. Te pasan una lista de productos y decís en qué estante va cada uno.",
  "",
  "Cómo trabajas:",
  "- SOLO podés usar las claves de familia de la lista cerrada que te paso. Ni una más.",
  "- Si un producto no encaja en ninguna, devolvés la familia vacía. NUNCA te inventes",
  "  un estante nuevo ni lo metás a la fuerza donde no va: dejarlo sin estante es correcto.",
  "- Vas por el producto, no por la marca: 'Volt' es una bebida energizante, 'Ricitos' es",
  "  una fritura, 'Musún' es café. Si la marca no te dice nada, dejalo vacío.",
  "- Conocés las marcas y los nombres que se usan en El Salvador.",
  "- Devolvés TODOS los ids que te mandaron, ninguno de más, ninguno de menos.",
].join("\n");

/*
 * POST /api/ai/clasificar
 * Recibe { productos: [{ id, nombre }] } y devuelve { familias: [{ id, familia }] }.
 *
 * Nunca responde 500 por culpa de la IA: sin llave, sin cuota o sin internet
 * contesta 200 con la lista vacía. Del otro lado hay un cliente mirando la
 * tienda, y que la portada tenga una fila menos no es un error que valga la
 * pena contarle a nadie.
 */
aiController.clasificarProductos = async (req, res) => {
  try {
    const enviados = Array.isArray(req.body.productos) ? req.body.productos : [];
    if (!enviados.length) {
      return res.status(200).json({ familias: [], origen: "sin-productos" });
    }

    /*
     * Máximo 60 por tanda: es lo que cabe en una petición sin volverla lenta ni
     * arriesgar que el modelo se coma la mitad de la lista. Los ids se filtran
     * con la forma de un ObjectId — un id mal formado haría que la consulta
     * reventara y devolviera un 500 por una tontería.
     */
    const pedidos = enviados
      .filter((p) => /^[a-f\d]{24}$/i.test(String(p?.id || "")))
      .slice(0, 60);

    if (!pedidos.length) {
      return res.status(200).json({ familias: [], origen: "sin-productos" });
    }

    const ids = pedidos.map((p) => String(p.id));
    const guardados = await productModel.find({ _id: { $in: ids } }, "name familia familiaOrigen");

    const yaSabidas = [];
    const porResolver = [];
    guardados.forEach((p) => {
      const idProducto = String(p._id);
      if (esFamiliaValida(p.familia)) {
        yaSabidas.push({ id: idProducto, familia: p.familia });
        return;
      }
      /*
       * Ya se preguntó por este y la IA dijo que no encaja en ningún estante.
       * "No sé" también es una respuesta y también se guarda: si no, cada
       * visita se volvería a gastar cuota preguntando por el mismo servicio de
       * impresión que nunca va a ser un abarrote.
       */
      if (p.familiaOrigen === SIN_FAMILIA) return;

      // El nombre sale de la base, no de lo que mandó el navegador: es el mismo
      // cuidado que se tiene en el resto del archivo.
      porResolver.push({ id: idProducto, nombre: p.name || "" });
    });

    // Todo estaba guardado: se contesta al instante y la IA ni se enteró.
    if (!porResolver.length) {
      return res.status(200).json({ familias: yaSabidas, origen: "guardado" });
    }

    const ia = getIA();
    // Sin llave configurada no hay plan B, y no hace falta: la tienda arma sus
    // filas con lo que las reglas sí resolvieron, exactamente como antes.
    if (!ia) {
      return res.status(200).json({ familias: yaSabidas, origen: "sin-ia" });
    }

    const contents = [
      "Familias disponibles (usá la clave de la izquierda):",
      LISTA_PARA_IA,
      "",
      "Productos que hay que acomodar:",
      porResolver.map((p) => `${p.id} | ${p.nombre}`).join("\n"),
    ].join("\n");

    try {
      /*
       * Tres intentos: esto corre de fondo mientras el dueño mira su tienda,
       * así que puede tomarse su tiempo. Lo que resuelve queda guardado en el
       * producto, y lo que no se reintenta la próxima vez.
       */
      const respuesta = await generarConIA({
        contents,
        config: {
          systemInstruction: MODO_ESTANTES,
          responseMimeType: "application/json",
          responseSchema: ESQUEMA_CLASIFICACION,
          // Aquí no se quiere creatividad de ningún tipo: se quiere que acierte
          // y que mañana conteste lo mismo que hoy.
          temperature: 0.1,
        },
      });

      const texto = respuesta.text;
      if (!texto) throw new Error("La IA no devolvió texto");

      const clasificadas = JSON.parse(texto);
      if (!Array.isArray(clasificadas)) throw new Error("La IA no devolvió una lista");

      /*
       * Desconfianza sana, la misma que con los nombres del asistente de voz:
       *   - el id tiene que ser uno de los que preguntamos (no uno que se sacó
       *     de la manga ni uno que ya estaba resuelto),
       *   - la familia tiene que estar en la lista cerrada.
       * Lo que no cumpla se descarta sin decir nada: ese producto simplemente
       * se queda sin estante, que es un resultado válido.
       */
      const preguntados = new Set(porResolver.map((p) => p.id));
      const aceptadas = [];
      const vistos = new Set();

      clasificadas.forEach((item) => {
        const idProducto = String(item?.id || "");
        const familia = String(item?.familia || "");
        if (!preguntados.has(idProducto) || vistos.has(idProducto)) return;
        if (!esFamiliaValida(familia)) return;
        vistos.add(idProducto);
        aceptadas.push({ id: idProducto, familia });
      });

      /*
       * Se guarda para no volver a preguntar nunca por estos productos.
       * `familiaOrigen` deja el rastro de quién lo decidió: si algún día hay
       * que revisar o borrar lo que puso la IA, se sabe cuál fue.
       * El modelo usa strict:false, así que estos dos campos entran sin tocar
       * el schema (están documentados arriba del modelo).
       */
      const escrituras = aceptadas.map((f) => ({
        updateOne: {
          filter: { _id: f.id },
          update: { $set: { familia: f.familia, familiaOrigen: "ia" } },
        },
      }));

      // Los que quedaron sin estante se marcan como preguntados, para no
      // volver a gastar cuota en ellos nunca más.
      porResolver
        .filter((p) => !vistos.has(p.id))
        .forEach((p) => {
          escrituras.push({
            updateOne: {
              filter: { _id: p.id },
              update: { $set: { familiaOrigen: SIN_FAMILIA } },
            },
          });
        });

      if (escrituras.length) {
        try {
          await productModel.bulkWrite(escrituras);
        } catch (errorGuardado) {
          // Si no se pudo guardar, la respuesta igual sirve para esta visita:
          // la próxima vez se volverá a preguntar y ya.
          console.log("No se pudo guardar la clasificación: " + errorGuardado.message);
        }
      }

      return res.status(200).json({ familias: [...yaSabidas, ...aceptadas], origen: "ia" });
    } catch (errorIA) {
      // Cuota agotada, sin internet, llave mala... se devuelve lo que ya se
      // sabía y la portada se arma con eso. Nadie ve un error.
      console.log("IA no disponible para clasificar: " + errorIA.message);
      return res.status(200).json({ familias: yaSabidas, origen: "error" });
    }
  } catch (error) {
    console.log("error " + error);
    return res.status(500).json({ message: "Error interno del servidor" });
  }
};

export default aiController;

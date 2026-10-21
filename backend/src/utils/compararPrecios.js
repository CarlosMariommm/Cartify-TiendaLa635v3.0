import { getIA, generarConIA } from "./iaClient.js";

// COMPARAR PRECIOS CON OTRAS TIENDAS — compararPrecios.js
// Busca el producto en los súper de El Salvador que tienen buscador público (gratis, sin llave) y
// la IA elige el mismo producto y tamaño para compararlo con el precio de la tienda.

export const TIENDAS = [
  { nombre: "Walmart", dominio: "www.walmart.com.sv" },
  { nombre: "La Despensa de Don Juan", dominio: "www.ladespensadedonjuan.com.sv" },
  { nombre: "Maxi Despensa", dominio: "www.maxidespensa.com.sv" },
];

const VIGENCIA_MS = 6 * 60 * 60 * 1000;
const enMemoria = new Map();

const plata = (n) => `$${Number(n).toFixed(2)}`;
const plano = (t) => String(t || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

// Lo que se escribe en el buscador: el nombre sin signos ni medidas sueltas.
export const terminoDeBusqueda = (nombre) =>
  plano(nombre).replace(/[^a-z0-9.\s]/g, " ").replace(/\s+/g, " ").trim().split(" ").slice(0, 5).join(" ");

// Los primeros resultados de una tienda: nombre, precio y si hay. [] si no contesta.
export const buscarEnTienda = async (tienda, termino, { pedir = fetch } = {}) => {
  try {
    const url = `https://${tienda.dominio}/api/catalog_system/pub/products/search?ft=${encodeURIComponent(termino)}&_from=0&_to=7`;
    const r = await pedir(url, { headers: { "User-Agent": "Mozilla/5.0" }, signal: AbortSignal.timeout(6000) });
    if (!r.ok) return [];
    const lista = await r.json();
    return (Array.isArray(lista) ? lista : [])
      .map((p) => {
        const oferta = p.items?.[0]?.sellers?.[0]?.commertialOffer || {};
        return { nombre: p.productName, precio: Number(oferta.Price), hay: Number(oferta.AvailableQuantity) > 0 };
      })
      .filter((p) => p.nombre && p.precio > 0);
  } catch {
    return [];
  }
};

// Sin IA: en cada tienda, el resultado que más palabras comparte con el nombre.
export const parecidoSinIA = (nombre, resultados) => {
  const palabras = plano(nombre).split(/[^a-z0-9]+/).filter((w) => w.length > 1);
  const puntos = (r) => palabras.filter((w) => plano(r.nombre).includes(w)).length;
  const mejor = [...resultados].sort((a, b) => puntos(b) - puntos(a))[0];
  return mejor && puntos(mejor) >= Math.min(2, palabras.length) ? mejor : null;
};

const fraseSinIA = (producto, porTienda) => {
  const hallados = porTienda
    .map(({ tienda, resultados }) => ({ tienda, igual: parecidoSinIA(producto.nombre, resultados) }))
    .filter((x) => x.igual);
  if (!hallados.length) return `No encontré ${producto.nombre} en Walmart ni en las Despensas para comparar.`;
  const lista = hallados.map((x) => `${plata(x.igual.precio)} en ${x.tienda.nombre}`).join(", ");
  return `Tú lo vendes a ${plata(producto.precio)}. Encontré algo parecido a ${lista}; revisa que sea el mismo tamaño.`;
};

const pregunta = (producto, porTienda) => [
  `Producto de Tienda la 635: ${producto.nombre}, a ${plata(producto.precio)}${producto.porLibra ? " la libra" : ""}.`,
  "",
  "Lo que salió en los buscadores de otros supermercados de El Salvador (nombre · precio):",
  ...porTienda.map(({ tienda, resultados }) =>
    `${tienda.nombre}:\n${resultados.length ? resultados.map((r) => `- ${r.nombre} · ${plata(r.precio)}${r.hay ? "" : " (agotado)"}`).join("\n") : "- (nada)"}`
  ),
].join("\n");

const INSTRUCCIONES = [
  "Eres Tiqui, la asistente del dueño de Tienda la 635, una tienda de barrio en El Salvador.",
  "Compara el precio de su producto con el de otros supermercados.",
  "- De cada supermercado usa SOLO el producto que sea el mismo: misma marca, sabor y tamaño.",
  "  Un paquete de 6 o una presentación distinta NO es el mismo. Si no hay igual, ese no cuenta.",
  "- Contesta en 'texto' con 2 o 3 frases cortas, tuteando, para decirlas en voz alta: los precios",
  "  encontrados con el nombre del súper, y si el de la tienda está más caro, más barato o",
  "  parecido. Si conviene, una idea corta (una tienda de barrio puede cobrar un poco más por la",
  "  cercanía). Cifras con números y signo de dólar. Sin listas ni asteriscos.",
  "- Si no hay ninguno igual, dilo y nombra el más parecido aclarando que no es el mismo.",
  "- No sabes si es hombre o mujer: nada de 'jefe', 'jefa' ni adjetivos con género. Di 'tú'.",
  "- Nunca inventes precios ni tiendas.",
].join("\n");

// La comparación lista para decir. `producto`: { nombre, precio, porLibra }.
export const compararPrecio = async (producto, { pedir } = {}) => {
  const clave = plano(producto.nombre);
  const guardado = enMemoria.get(clave);
  if (guardado && Date.now() - guardado.en < VIGENCIA_MS && guardado.precio === producto.precio) return guardado.texto;

  const termino = terminoDeBusqueda(producto.nombre);
  const porTienda = await Promise.all(
    TIENDAS.map(async (tienda) => ({ tienda, resultados: await buscarEnTienda(tienda, termino, { pedir }) }))
  );
  if (!porTienda.some((t) => t.resultados.length)) {
    return `No pude encontrar ${producto.nombre} en Walmart ni en las Despensas ahora mismo. Prueba con otro nombre o en un rato.`;
  }

  let texto = "";
  if (getIA()) {
    try {
      // Gemini y, si se satura, la pasarela (OpenRouter). Ver utils/iaClient.js.
      const respuesta = await generarConIA({
        contents: pregunta(producto, porTienda),
        config: {
          systemInstruction: INSTRUCCIONES,
          responseMimeType: "application/json",
          temperature: 0.2,
        },
      }, { intentos: 2, plazoTotal: 12000 });
      texto = String(JSON.parse(respuesta.text || "{}").texto || "").trim();
    } catch {
      // Sin IA a tiempo, la comparación sencilla.
    }
  }
  if (!texto) texto = fraseSinIA(producto, porTienda);

  enMemoria.set(clave, { en: Date.now(), precio: producto.precio, texto });
  return texto;
};

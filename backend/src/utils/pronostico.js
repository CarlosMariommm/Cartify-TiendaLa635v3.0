/*
 * ============================================================
 * EL PRONÓSTICO, DEL LADO DE LA TIENDA — pronostico.js
 * ============================================================
 * La estadística vive en otro servicio, en Python (analitica/): ahí están
 * Holt-Winters, la demanda intermitente y la simulación. Este archivo es el
 * puente:
 *
 *   1. junta de la base lo que hace falta, ya agrupado por día (en la hora
 *      de El Salvador): lo vendido por la tienda, las unidades de cada
 *      producto, la existencia de cada uno y cuándo se le compró a cada
 *      proveedor;
 *   2. se lo manda al servicio con la clave compartida;
 *   3. guarda la respuesta un rato, porque el pronóstico no cambia de un
 *      minuto a otro y el servicio puede estar dormido (Render gratis).
 *
 * El servicio no toca la base ni ve datos de clientes: solo números por día.
 *
 * Se pronostica con lo vendido HASTA AYER: el día de hoy va a medias y haría
 * parecer que hoy se vende poco.
 * ============================================================
 */

import orderModel from "../models/order.js";
import productModel from "../models/product.js";
import supplierModel from "../models/supplier.js";
import shoppingModel from "../models/shoppings.js";
import { readFileSync } from "node:fs";
import { config } from "../../config.js";

const ZONA = "America/El_Salvador";
// El Salvador no cambia de hora en el año: siempre seis horas antes de UTC.
const DESFASE = "-06:00";
const DIA = 24 * 60 * 60 * 1000;
const DIAS_DE_HISTORIAL = 180;
const HORIZONTE = 28;
// Lo que se guarda la respuesta antes de volver a calcular.
const VIGENCIA_MS = 15 * 60 * 1000;
/*
 * Cuánto se le espera al servicio. Antes era minuto y medio, y en Render
 * gratis un cálculo con historia larga (Holt-Winters más la prueba de
 * precisión) tarda más que eso: se cortaba, el cálculo se perdía y el
 * siguiente intento empezaba de cero, así que nunca terminaba. Ahora se le
 * da tiempo de sobra y el panel no se queda esperando: pregunta cada pocos
 * segundos si ya está (ver dashboardController.getPronostico).
 */
const ESPERA_MS = 5 * 60 * 1000;
// Un cálculo que falló se le dice al que pregunte durante este rato, en vez de reintentar en bucle.
const RECUERDO_DEL_ERROR_MS = 60 * 1000;
// Lo que contesta Render mientras el servicio despierta, y cuánto se espera antes de cada reintento.
const DESPERTANDO = new Set([429, 502, 503, 504]);
const REINTENTOS_MS = [3000, 6000, 10000, 15000, 20000, 30000];
const esperar = (ms) => new Promise((listo) => setTimeout(listo, ms));

export class ErrorPronostico extends Error {
  constructor(codigo, mensaje) {
    super(mensaje);
    this.codigo = codigo;
  }
}

// "2026-10-12": la fecha de El Salvador de un momento dado.
export const diaLocal = (fecha) => new Date(fecha).toLocaleDateString("en-CA", { timeZone: ZONA });

const sumarDias = (dia, n) => new Date(Date.parse(`${dia}T00:00:00Z`) + n * DIA).toISOString().slice(0, 10);

// Un número aunque venga guardado como texto (hay existencias así; ver orderController).
const aNumero = (campo) => ({ $convert: { input: campo, to: "double", onError: 0, onNull: 0 } });

// De dónde salen los datos: los modelos de la tienda (lo normal).
const DE_LA_TIENDA = { pedidos: orderModel, productos: productModel, proveedores: supplierModel, compras: shoppingModel };

/*
 * Lo mismo, pero de otra base (la de demostración, para exportarla; ver
 * scripts/exportarDemoPronostico.js): las colecciones crudas con la misma
 * forma de uso que los modelos (aggregate, y find().select().lean()).
 */
export const fuenteDeBase = (db) => {
  const coleccion = (nombre) => ({
    aggregate: (pipeline) => db.collection(nombre).aggregate(pipeline).toArray(),
    find: (filtro = {}) => ({
      select: (campos) => ({
        lean: () => db.collection(nombre)
          .find(filtro, { projection: Object.fromEntries(campos.split(/\s+/).map((c) => [c, 1])) })
          .toArray(),
      }),
    }),
  });
  return { pedidos: coleccion("Orders"), productos: coleccion("Products"), proveedores: coleccion("Suppliers"), compras: coleccion("Shoppings") };
};

/*
 * Lo que se le manda al servicio. `ahora` se puede pasar para las pruebas.
 * Devuelve null si todavía no hay ventas de las que aprender.
 */
export const armarSolicitud = async (ahora = new Date(), fuente = DE_LA_TIENDA) => {
  const hoy = diaLocal(ahora);
  const hasta = sumarDias(hoy, -1);
  const finDeAyer = new Date(`${hoy}T00:00:00${DESFASE}`);
  const inicio = new Date(`${sumarDias(hoy, -DIAS_DE_HISTORIAL)}T00:00:00${DESFASE}`);
  const vendidos = { status: { $ne: "cancelado" }, createdAt: { $gte: inicio, $lt: finDeAyer } };
  const diaDelPedido = { $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: ZONA } };

  const [tienda, ventas, productos, proveedores, compras] = await Promise.all([
    fuente.pedidos.aggregate([
      { $match: vendidos },
      { $group: { _id: diaDelPedido, total: { $sum: aNumero("$total") }, pedidos: { $sum: 1 } } },
    ]),
    fuente.pedidos.aggregate([
      { $match: vendidos },
      { $unwind: "$items" },
      { $match: { "items.productId": { $ne: null } } },
      { $group: { _id: { dia: diaDelPedido, producto: "$items.productId" }, unidades: { $sum: aNumero("$items.amount") } } },
    ]),
    fuente.productos.find({ isActive: { $ne: false } })
      .select("name stock unidadVenta salePrice priceCost supplierId createdAt")
      .lean(),
    fuente.proveedores.find().select("name").lean(),
    fuente.compras.find({ date: { $gte: inicio } }).select("supplierId date").lean(),
  ]);

  if (!tienda.length) return null;

  return {
    // Desde la primera venta, no desde hace 180 días: si la tienda abrió hace
    // un mes, los cinco meses de antes no son "días sin vender".
    desde: tienda.map((t) => t._id).sort()[0],
    hasta,
    horizonte: HORIZONTE,
    tienda: tienda.map((t) => ({ dia: t._id, total: Number(t.total.toFixed(2)), pedidos: t.pedidos })),
    ventas: ventas
      .filter((v) => v.unidades > 0)
      .map((v) => ({ dia: v._id.dia, producto: String(v._id.producto), unidades: v.unidades })),
    productos: productos.map((p) => ({
      id: String(p._id),
      nombre: p.name || "",
      stock: Number(p.stock) || 0,
      unidad: p.unidadVenta === "libra" ? "libra" : "unidad",
      precio: Number(p.salePrice) || 0,
      costo: Number(p.priceCost) || 0,
      proveedor: p.supplierId ? String(p.supplierId) : null,
      creado: p.createdAt ? diaLocal(p.createdAt) : null,
    })),
    proveedores: proveedores.map((s) => ({ id: String(s._id), nombre: s.name || "" })),
    compras: compras
      .filter((c) => c.supplierId && c.date)
      .map((c) => ({ proveedor: String(c.supplierId), dia: diaLocal(c.date) })),
  };
};

/*
 * ¿A la tienda real le faltan todavía 4 semanas de ventas? Se averigua en la
 * base, sin el servicio (que solo llena "las 4 semanas anteriores" desde 28
 * días de historia). Así, mientras el cálculo real tarda —Render despertando—,
 * el panel ya sabe que va a abrir con la demostración y no la hace esperar.
 */
export const faltanCuatroSemanasEnLaBase = async (ahora = new Date(), pedidos = orderModel) => {
  const [primero] = await pedidos
    .find({ status: { $ne: "cancelado" } })
    .sort({ createdAt: 1 })
    .limit(1)
    .select("createdAt")
    .lean();
  if (!primero?.createdAt) return true;
  const hasta = sumarDias(diaLocal(ahora), -1);
  const dias = Math.round((Date.parse(`${hasta}T00:00:00Z`) - Date.parse(`${diaLocal(primero.createdAt)}T00:00:00Z`)) / DIA) + 1;
  return dias < HORIZONTE;
};

/* ══════════ La demostración ══════════ */

/*
 * Para mostrar el pronóstico con una historia de varios meses (la Expo) sin
 * meter ventas inventadas en la tienda real: datos/pronosticoDemo.json trae
 * la base de demostración ya resumida por día —lo vendido por día y por
 * producto, existencias, proveedores y compras; nada de clientes—, exportada
 * con scripts/exportarDemoPronostico.js.
 *
 * Sus fechas se corren solas para que la historia termine AYER, la abran
 * cuando la abran: no hay que volver a exportarla el día que se presenta.
 */
const ARCHIVO_DEMO = new URL("../datos/pronosticoDemo.json", import.meta.url);
let demoLeida;

export const hayDemostracion = () => {
  try {
    leerDemo();
    return true;
  } catch {
    return false;
  }
};

const leerDemo = () => {
  if (!demoLeida) demoLeida = JSON.parse(readFileSync(ARCHIVO_DEMO, "utf8"));
  return demoLeida;
};

// Cuántos días hay que correr una fecha para que caiga en ayer.
const diasHastaAyer = (ahora, hasta) =>
  Math.round((Date.parse(`${sumarDias(diaLocal(ahora), -1)}T00:00:00Z`) - Date.parse(`${hasta}T00:00:00Z`)) / DIA);

// La demostración, con todas sus fechas corridas para que termine ayer.
export const solicitudDeDemostracion = (ahora = new Date(), demo = leerDemo()) => {
  const ayer = sumarDias(diaLocal(ahora), -1);
  const corrimiento = diasHastaAyer(ahora, demo.hasta);
  const correr = (dia) => (dia ? sumarDias(dia, corrimiento) : dia);
  return {
    ...demo,
    desde: correr(demo.desde),
    hasta: ayer,
    tienda: demo.tienda.map((t) => ({ ...t, dia: correr(t.dia) })),
    ventas: demo.ventas.map((v) => ({ ...v, dia: correr(v.dia) })),
    productos: demo.productos.map((p) => ({ ...p, creado: correr(p.creado) })),
    compras: demo.compras.map((c) => ({ ...c, dia: correr(c.dia) })),
  };
};

/*
 * ── El resultado de la demostración, ya calculado ──
 *
 * La demostración son siempre las mismas ventas inventadas, así que su
 * pronóstico no hace falta pedírselo al servicio cada vez: en Render gratis
 * ese cálculo (105 días, Holt-Winters y la prueba de precisión) tardaba más
 * de minuto y medio y el panel se quedaba sin nada. Se calcula UNA vez con
 * scripts/calcularDemoPronostico.js y aquí solo se corren sus fechas, igual
 * que las de la solicitud: sale al instante, el día que sea.
 *
 * Correr las fechas mueve también los días de la semana (lo que era sábado
 * cae otro día), así que el perfil de la semana se gira lo mismo. Es lo que
 * daría el servicio si calculara la historia corrida.
 */
const ARCHIVO_RESULTADO_DEMO = new URL("../datos/pronosticoDemoResultado.json", import.meta.url);
let resultadoDemoLeido;

const leerResultadoDemo = () => {
  if (resultadoDemoLeido === undefined) {
    try {
      resultadoDemoLeido = JSON.parse(readFileSync(ARCHIVO_RESULTADO_DEMO, "utf8"));
    } catch {
      resultadoDemoLeido = null;
    }
  }
  return resultadoDemoLeido;
};

const ES_FECHA = /^\d{4}-\d{2}-\d{2}$/;

// Todas las fechas "AAAA-MM-DD" de un resultado, corridas `dias`, y el perfil de la semana girado.
export const correrResultado = (resultado, dias) => {
  const correr = (valor) => {
    if (typeof valor === "string" && ES_FECHA.test(valor)) return sumarDias(valor, dias);
    if (Array.isArray(valor)) return valor.map(correr);
    if (valor && typeof valor === "object") return Object.fromEntries(Object.entries(valor).map(([k, v]) => [k, correr(v)]));
    return valor;
  };
  const corrido = correr(resultado);
  const perfil = resultado?.perfil_semana;
  if (Array.isArray(perfil) && perfil.length === 7) {
    // El día que era de la semana `i` ahora es `i + giro`: su factor se va con él.
    const giro = ((dias % 7) + 7) % 7;
    corrido.perfil_semana = perfil.map((_, i) => perfil[(i - giro + 7) % 7]);
  }
  return corrido;
};

// El resultado guardado, con sus fechas hasta ayer; null si no hay o no es de esta demostración.
export const resultadoDeDemostracion = (ahora = new Date(), guardado = leerResultadoDemo(), demo = leerDemo()) => {
  if (!guardado?.resultado || guardado.hasta !== demo.hasta) return null;
  return correrResultado(guardado.resultado, diasHastaAyer(ahora, guardado.hasta));
};

/*
 * Por dónde se le pide a cada proveedor de la compra sugerida (WhatsApp, una
 * app como BEES o llamada; ver utils/pedidoProveedor.js), para el botón
 * "Pedir" de la pantalla Pronóstico. Va aparte de lo que se guarda: si el
 * administrador lo cambia, se ve al instante. La demostración lo trae en su
 * archivo.
 */
const canalDe = (doc) => (doc ? {
  canal: doc.pedidos?.canal || "",
  whatsapp: doc.pedidos?.whatsapp || "",
  app: doc.pedidos?.app || "",
  enlace: doc.pedidos?.enlace || "",
  telefono: doc.phoneNumber || "",
} : null);

export const conCanalesDePedido = async (datos, { demo = false } = {}) => {
  if (!datos?.proveedores?.length) return datos;
  let canales;
  if (demo) {
    canales = new Map(leerDemo().proveedores.map((p) => [p.id, p.pedido || null]));
  } else {
    const ids = datos.proveedores.map((g) => g.id).filter(Boolean);
    const docs = await supplierModel.find({ _id: { $in: ids } }).select("pedidos phoneNumber").lean();
    canales = new Map(docs.map((d) => [String(d._id), canalDe(d)]));
  }
  return { ...datos, proveedores: datos.proveedores.map((g) => ({ ...g, pedido: canales.get(g.id) || null })) };
};

/* ══════════ Lo calculado, guardado un rato ══════════ */

// Cada uno por su lado: la tienda real y la demostración.
const estado = {
  real: { guardado: null, enCamino: null, errorSuelto: null },
  demo: { guardado: null, enCamino: null, errorSuelto: null },
};

export const olvidarPronostico = () => {
  for (const e of Object.values(estado)) {
    e.guardado = null;
    e.enCamino = null;
    e.errorSuelto = null;
  }
};

/*
 * El pronóstico, del servicio o del rato que se guarda. `forzar` lo vuelve a
 * calcular (el botón "Actualizar" del panel); `demo`, con la demostración.
 * Si piden otro mientras uno está en camino (el panel y Tiqui a la vez), se
 * espera ese mismo en vez de lanzar dos.
 */
export const obtenerPronostico = async ({ forzar = false, ahora = new Date(), demo = false } = {}) => {
  const e = estado[demo ? "demo" : "real"];
  if (!forzar && e.guardado && ahora.getTime() - e.guardado.en < VIGENCIA_MS) return e.guardado.datos;
  if (!forzar && e.enCamino) return e.enCamino;
  e.enCamino = calcular(ahora, demo).finally(() => { e.enCamino = null; });
  return e.enCamino;
};

/*
 * Para el panel: espera el pronóstico hasta `ms`. Si para entonces no
 * terminó, NO se corta: sigue calculándose en segundo plano (y se guarda al
 * terminar) y esto devuelve null, para que el panel conteste "calculando" y
 * vuelva a preguntar en unos segundos. Si ese cálculo de fondo falla, el
 * error se le dice a la siguiente pregunta, una vez.
 */
const EN_CAMINO = Symbol("en camino");

export const pronosticoSinEsperarDeMas = async (opciones = {}, ms = 20 * 1000) => {
  const e = estado[opciones.demo ? "demo" : "real"];
  if (e.errorSuelto) {
    const { error, en } = e.errorSuelto;
    e.errorSuelto = null;
    if (Date.now() - en < RECUERDO_DEL_ERROR_MS && !opciones.forzar) throw error;
  }
  const calculo = obtenerPronostico(opciones);
  let reloj;
  const plazo = new Promise((listo) => { reloj = setTimeout(() => listo(EN_CAMINO), ms); });
  const primero = await Promise.race([calculo, plazo]).finally(() => clearTimeout(reloj));
  if (primero !== EN_CAMINO) return primero;
  calculo.catch((error) => { e.errorSuelto = { error, en: Date.now() }; });
  return null;
};

/*
 * Lo último que se calculó, sin pedir nada: para Tiqui, que no puede quedarse
 * esperando a un servicio dormido. Vale hasta 6 horas (dice de cuándo es).
 */
const VIGENCIA_PARA_TIQUI_MS = 6 * 60 * 60 * 1000;
export const pronosticoReciente = (ahora = new Date()) => {
  const { guardado } = estado.real;
  return guardado && ahora.getTime() - guardado.en < VIGENCIA_PARA_TIQUI_MS ? guardado : null;
};

// Que se vaya calculando, sin esperarlo (al despertar a Tiqui del panel).
export const calentarPronostico = () => {
  if (!config.analitica.url) return null;
  return obtenerPronostico().catch((error) => {
    console.log(`pronóstico en segundo plano: ${error?.codigo || "error"} ${error?.message || error}`);
    return null;
  });
};

const calcular = async (ahora, demo) => {
  if (demo && !hayDemostracion()) {
    throw new ErrorPronostico("sin-demo", "No está el archivo de la demostración (datos/pronosticoDemo.json)");
  }
  // La demostración ya calculada: al instante y sin depender del servicio.
  if (demo) {
    const yaCalculado = resultadoDeDemostracion(ahora);
    if (yaCalculado) {
      const datos = { ...yaCalculado, generado: ahora.toISOString(), demo: true };
      estado.demo.guardado = { datos, en: ahora.getTime() };
      return datos;
    }
  }
  if (!config.analitica.url) {
    throw new ErrorPronostico("sin-servicio", "El servicio de analítica no está configurado (ANALITICA_URL)");
  }

  const solicitud = demo ? solicitudDeDemostracion(ahora) : await armarSolicitud(ahora);
  if (!solicitud) {
    return { vacio: true, generado: ahora.toISOString() };
  }

  /*
   * Render gratis duerme el servicio, y mientras despierta su portero puede
   * contestar 502/503 al instante o cortar la conexión: pasó el 14-10-2026 y
   * el panel decía "No se pudo calcular" aunque un minuto después ya andaba.
   * Esas fallas se reintentan con calma (el panel no espera: ve "calculando").
   * Un error del cálculo mismo (un 500, la clave equivocada) no se reintenta.
   */
  let respuesta;
  for (let intento = 0; ; intento += 1) {
    try {
      respuesta = await fetch(`${config.analitica.url}/pronostico`, {
        method: "POST",
        headers: { "content-type": "application/json", "x-clave-analitica": config.analitica.clave },
        body: JSON.stringify(solicitud),
        signal: AbortSignal.timeout(ESPERA_MS),
      });
    } catch (error) {
      const tardo = error?.name === "TimeoutError" || error?.name === "AbortError";
      if (tardo || intento >= REINTENTOS_MS.length) {
        throw new ErrorPronostico(tardo ? "lento" : "sin-conexion", error?.message || "sin conexión");
      }
      await esperar(REINTENTOS_MS[intento]);
      continue;
    }
    if (respuesta.ok || !DESPERTANDO.has(respuesta.status) || intento >= REINTENTOS_MS.length) break;
    await esperar(REINTENTOS_MS[intento]);
  }
  if (!respuesta.ok) {
    throw new ErrorPronostico("fallo", `El servicio de analítica contestó ${respuesta.status}`);
  }

  const datos = { ...(await respuesta.json()), generado: ahora.toISOString(), ...(demo ? { demo: true } : {}) };
  estado[demo ? "demo" : "real"].guardado = { datos, en: ahora.getTime() };
  return datos;
};

/* ══════════ Lo que se le cuenta a Tiqui del panel ══════════ */

const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const fecha = (dia) => {
  const [, m, d] = String(dia).slice(0, 10).split("-").map(Number);
  return `${d} de ${MESES[m - 1]}`;
};
const MONEDA = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const dinero = (n) => MONEDA.format(Number(n) || 0);
const porciento = (x) => `${Math.round(Math.abs(x) * 100)}%`;
const cuanto = (n, unidad) => (unidad === "libra" ? `${Number(n).toFixed(1)} lb` : String(Math.round(n)));
const lista = (nombres, maximo = 4) =>
  nombres.slice(0, maximo).join(", ") + (nombres.length > maximo ? ` y ${nombres.length - maximo} más` : "");

/*
 * El pronóstico en renglones cortos, con las cuentas ya hechas: Tiqui solo
 * los cuenta (igual que los consejos de ventas, ver consejosVentas.js). Los
 * montos van siempre con su rango, y si todavía no se pudo medir qué tan bien
 * acierta, lo dice: "preliminar".
 */
export const textoDelPronostico = (datos, calculadoEn, ahora = Date.now()) => {
  if (!datos) return "";
  if (datos.vacio) return "Todavía no hay ventas de las que aprender: no hay pronóstico.";
  const { tienda, historial, precision } = datos;
  const semanas = Math.round((tienda.dias?.length || 28) / 7);
  const minutos = Math.round((ahora - calculadoEn) / 60000);
  const renglones = [];

  const confiable = precision?.probado && precision.semanas >= 2;
  renglones.push(
    `Calculado ${minutos < 2 ? "hace un momento" : minutos < 90 ? `hace ${minutos} min` : `hace ${Math.round(minutos / 60)} h`} con ${historial.dias} días de ventas (${historial.pedidos} pedidos). ` +
      (confiable
        ? `Probado contra ${precision.semanas} semanas pasadas: se equivocó un ${porciento(precision.tienda.error)} en la venta semanal de la tienda (repetir la semana anterior: ${porciento(precision.tienda.error_ingenuo)})` +
          (precision.productos?.error != null && precision.productos?.error_ingenuo != null
            ? ` y un ${porciento(precision.productos.error)} en la de cada producto (repetir la semana anterior: ${porciento(precision.productos.error_ingenuo)}).`
            : ".")
        : "Es PRELIMINAR: todavía hay pocas semanas para medir qué tan bien acierta.")
  );

  renglones.push(
    `Venta esperada las próximas ${semanas} semanas: ${dinero(tienda.periodo.esperado)} (entre ${dinero(tienda.periodo.bajo)} y ${dinero(tienda.periodo.alto)})` +
      (tienda.periodo_anterior ? `; las ${semanas} semanas anteriores fueron ${dinero(tienda.periodo_anterior)}.` : ".")
  );
  const proxima = tienda.semanas?.[0];
  if (proxima) {
    renglones.push(`Próxima semana (${fecha(proxima.desde)} al ${fecha(proxima.hasta)}): ${dinero(proxima.esperado)} (entre ${dinero(proxima.bajo)} y ${dinero(proxima.alto)}).`);
  }

  const productos = datos.productos || [];
  const agotados = productos.filter((p) => p.se_acaba?.agotado).map((p) => p.nombre);
  if (agotados.length) renglones.push(`Ya agotados, y se venden: ${lista(agotados)}.`);
  const seAgotan = productos.filter((p) => !p.se_acaba?.agotado && p.se_acaba?.probable);
  if (seAgotan.length) {
    renglones.push(`Se agotarían: ${lista(seAgotan.map((p) =>
      `${p.nombre} hacia el ${fecha(p.se_acaba.probable)}${p.se_acaba.pronto && p.se_acaba.pronto !== p.se_acaba.probable ? ` (tan pronto como el ${fecha(p.se_acaba.pronto)})` : ""}`))}.`);
  } else if (!agotados.length) {
    renglones.push(`Ningún producto se agotaría en las próximas ${semanas} semanas.`);
  }

  const proveedores = datos.proveedores || [];
  if (proveedores.length) {
    proveedores.slice(0, 4).forEach((g) => {
      renglones.push(`Compra sugerida a ${g.nombre || "(sin proveedor asignado)"} (se le compra cada ${g.ciclo_dias} días): ${lista(g.productos.map((p) => `${p.nombre} ${cuanto(p.pedir, p.unidad)}`), 6)} = ${dinero(g.costo_total)}.`);
    });
    const total = proveedores.reduce((s, g) => s + g.costo_total, 0);
    renglones.push(`Compra sugerida en total: ${dinero(total)} con ${proveedores.length} ${proveedores.length === 1 ? "proveedor" : "proveedores"}.`);
  } else {
    renglones.push("Compra sugerida: nada por ahora; la existencia alcanza hasta la próxima compra.");
  }

  const sinBase = productos.filter((p) => p.pedir === null).map((p) => p.nombre);
  if (sinBase.length) renglones.push(`Con muy pocas ventas para sugerir cuánto pedir: ${lista(sinBase)}.`);

  const masVendidos = [...productos].sort((a, b) => b.semana.esperado - a.semana.esperado).slice(0, 3);
  if (masVendidos.length) {
    renglones.push(`Lo que más se va a vender la próxima semana: ${masVendidos.map((p) => `${p.nombre} (${p.unidad === "libra" ? `${p.semana.esperado.toFixed(1)} lb` : p.semana.esperado.toFixed(1)})`).join(", ")}.`);
  }
  return renglones.join("\n");
};

// "¿Qué tengo que pedir?", "¿qué se va a acabar?", "¿cuánto vamos a vender?"
const PIDE_PRONOSTICO = /pronostic|predic|proyecc|\bpedir|\bpido\b|pidamos|surtir|reabastec|abastec|compra sugerid|que (tengo|debo|hay) que comprar|agot|acab|vamos a vender|voy a vender|vender[aá]|proxima semana|proximo mes|proveedor/;
const aPlano = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
// Lo que Tiqui espera al servicio, solo si la pregunta es justo del pronóstico.
const ESPERA_TIQUI_MS = 5000;

/*
 * El bloque PRONÓSTICO para la pregunta de Tiqui (solo el administrador).
 * Si ya hay uno calculado, va siempre. Si no, se manda a calcular sin
 * esperarlo; y si la pregunta es justo de eso, se le dan unos segundos por si
 * el servicio estaba despierto. Si tampoco llega, Tiqui dice que lo está
 * calculando, en vez de inventar.
 */
export const pronosticoParaTiqui = async (frase, ahora = new Date()) => {
  const reciente = pronosticoReciente(ahora);
  if (reciente) return textoDelPronostico(reciente.datos, reciente.en, ahora.getTime());
  if (!config.analitica.url) return "";

  const enCalculo = calentarPronostico();
  if (!PIDE_PRONOSTICO.test(aPlano(frase))) return "";

  const listo = await Promise.race([enCalculo, new Promise((r) => setTimeout(() => r(null), ESPERA_TIQUI_MS))]);
  const ya = pronosticoReciente();
  if (listo && ya) return textoDelPronostico(ya.datos, ya.en);
  return "Se está calculando en este momento (el servicio de análisis estaba en reposo y tarda cerca de un minuto en despertar). No hay cifras todavía.";
};

import orderModel from "../models/order.js";
import productModel from "../models/product.js";
// Registrados para los populate de categoría y marca.
import "../models/productType.js";
import "../models/brand.js";
import clientModel from "../models/client.js";
import supplierModel from "../models/supplier.js";
import supplierMovementModel from "../models/supplierMovement.js";
import promotionModel from "../models/promotion.js";
import storeSettingsModel, { CLAVE_UNICA } from "../models/storeSettings.js";
import { estadoCuenta } from "./cuentaProveedor.js";
import { DIAS_CADUCA, filtroStockBajo, inicioDelDia, numero } from "../controller/dashboardController.js";
import { analizarVentas, olvidarConsejos } from "./consejosVentas.js";

// EL PANORAMA DEL NEGOCIO — lo que Tiqui sabe en el panel
// Arma en texto un resumen del negocio (pedidos, ventas, existencias, deudas…) para que la Tiqui
// del panel conteste en una sola vuelta al modelo.

const VIGENCIA_MS = 20 * 1000;
const enMemoria = new Map(); // "admin" | "empleado" -> { en, texto }

const plata = (n) => `$${(Number(n) || 0).toFixed(2)}`;
const redondo = (n) => Number((Number(n) || 0).toFixed(2));

export const ESTADOS_ACTIVOS = ["pagado", "preparando", "en_camino", "listo"];

const NOMBRE_ESTADO = {
  pagado: "por preparar",
  preparando: "en preparación",
  en_camino: "en camino",
  listo: "listo para recoger",
  entregado: "entregado",
  cancelado: "cancelado",
};

// El mismo número que se ve en la tarjeta del pedido: #A1B2C3.
export const codigoDePedido = (id) => String(id).slice(-6).toUpperCase();

const haceCuanto = (fecha) => {
  const min = Math.max(0, Math.round((Date.now() - new Date(fecha).getTime()) / 60000));
  if (min < 1) return "recién";
  if (min < 60) return `hace ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `hace ${h} h`;
  return `hace ${Math.round(h / 24)} días`;
};

const fechaCorta = (d) =>
  new Date(d).toLocaleDateString("es-SV", { day: "numeric", month: "long", timeZone: "America/El_Salvador" });

const noCancelado = { status: { $ne: "cancelado" } };

const ventasEntre = async (desde, hasta) => {
  const [r] = await orderModel.aggregate([
    { $match: { ...noCancelado, createdAt: { $gte: desde, $lt: hasta } } },
    { $group: { _id: null, total: { $sum: "$total" }, pedidos: { $sum: 1 } } },
  ]);
  return { total: redondo(r?.total), pedidos: r?.pedidos || 0 };
};

// Lo que costaron los productos vendidos: ingresos menos esto es la ganancia
// (misma cuenta que el dashboard; las impresiones no tienen costo cargado).
const costoEntre = async (desde, hasta) => {
  const [r] = await orderModel.aggregate([
    { $match: { ...noCancelado, createdAt: { $gte: desde, $lt: hasta } } },
    { $unwind: "$items" },
    { $match: { "items.productId": { $ne: null } } },
    { $lookup: { from: "Products", localField: "items.productId", foreignField: "_id", as: "p" } },
    { $unwind: "$p" },
    { $group: { _id: null, total: { $sum: { $multiply: [numero("$p.priceCost"), numero("$items.amount")] } } } },
  ]);
  return redondo(r?.total);
};

const lineaDeVentas = (nombre, v, costo) => {
  if (!v.pedidos) return `- ${nombre}: sin ventas.`;
  const partes = [`${plata(v.total)} en ${v.pedidos} pedido${v.pedidos === 1 ? "" : "s"}`];
  if (costo != null) {
    const ganancia = v.total - costo;
    const margen = v.total > 0 ? Math.round((ganancia / v.total) * 100) : 0;
    partes.push(`ganancia ${plata(ganancia)} (${margen}% de margen)`);
  }
  return `- ${nombre}: ${partes.join(", ")}.`;
};

const armarPanorama = async ({ esAdmin }) => {
  const ahora = new Date();
  const hoy = inicioDelDia(ahora);
  const manana = new Date(hoy); manana.setDate(manana.getDate() + 1);
  const ayer = new Date(hoy); ayer.setDate(ayer.getDate() - 1);
  const hace7 = new Date(hoy); hace7.setDate(hace7.getDate() - 6);
  const hace30 = new Date(hoy); hace30.setDate(hace30.getDate() - 30);
  const inicioMes = new Date(hoy); inicioMes.setDate(1);
  const caducaHasta = new Date(ahora); caducaHasta.setDate(caducaHasta.getDate() + DIAS_CADUCA);

  const [
    activos,
    ventasHoy, ventasAyer, ventas7, ventasMes,
    costoHoy, costoMes,
    entregadosHoy, canceladosHoy,
    porReponer, agotados, porCaducar,
    masVendidos,
  ] = await Promise.all([
    orderModel
      .find({ status: { $in: ESTADOS_ACTIVOS } }, "status deliveryType channel total createdAt items clientId")
      .populate("clientId", "fullName")
      .sort({ createdAt: 1 })
      .limit(80)
      .lean(),
    ventasEntre(hoy, manana), ventasEntre(ayer, hoy), ventasEntre(hace7, manana), ventasEntre(inicioMes, manana),
    costoEntre(hoy, manana), costoEntre(inicioMes, manana),
    orderModel.countDocuments({ status: "entregado", updatedAt: { $gte: hoy, $lt: manana } }),
    orderModel.countDocuments({ status: "cancelado", updatedAt: { $gte: hoy, $lt: manana } }),
    productModel.find(filtroStockBajo, "name stock maxQuantity unidadVenta").sort({ stock: 1 }).limit(40).lean(),
    productModel.countDocuments({ isActive: { $ne: false }, $expr: { $lte: [numero("$stock"), 0] } }),
    productModel
      .find({ isActive: { $ne: false }, expirationDate: { $gte: ahora, $lte: caducaHasta } }, "name expirationDate stock")
      .sort({ expirationDate: 1 })
      .limit(8)
      .lean(),
    orderModel.aggregate([
      { $match: { ...noCancelado, createdAt: { $gte: hace30 } } },
      { $unwind: "$items" },
      { $match: { "items.productId": { $ne: null } } },
      { $group: { _id: "$items.productId", nombre: { $last: "$items.name" }, vendidos: { $sum: numero("$items.amount") }, ingreso: { $sum: { $multiply: [numero("$items.price"), numero("$items.amount")] } } } },
      { $sort: { vendidos: -1 } },
      { $limit: 5 },
    ]),
  ]);

  const lineas = [];

  // ── Pedidos por atender ──
  const porEstado = Object.fromEntries(ESTADOS_ACTIVOS.map((e) => [e, activos.filter((o) => o.status === e)]));
  lineas.push(
    "PEDIDOS POR ATENDER (del más viejo al más nuevo):",
    `Por preparar: ${porEstado.pagado.length} · En preparación: ${porEstado.preparando.length} · En camino: ${porEstado.en_camino.length} · Listos para recoger: ${porEstado.listo.length}`
  );
  for (const estado of ESTADOS_ACTIVOS) {
    for (const o of porEstado[estado].slice(0, 6)) {
      const cuantos = (o.items || []).length;
      const tipo = o.channel === "impresion" ? "impresión" : o.deliveryType === "delivery" ? "a domicilio" : "para recoger";
      lineas.push(
        `- #${codigoDePedido(o._id)} · ${String(o.clientId?.fullName || "").trim() || "cliente sin nombre"} · ${NOMBRE_ESTADO[estado]} · ${tipo} · ${cuantos} producto${cuantos === 1 ? "" : "s"} · ${plata(o.total)} · ${haceCuanto(o.createdAt)}`
      );
    }
  }
  lineas.push(`Hoy: ${entregadosHoy} entregados y ${canceladosHoy} cancelados.`);

  // ── Ventas ──
  lineas.push(
    "",
    "VENTAS (sin contar cancelados):",
    lineaDeVentas("Hoy", ventasHoy, costoHoy),
    lineaDeVentas("Ayer", ventasAyer),
    lineaDeVentas("Últimos 7 días", ventas7),
    lineaDeVentas("Este mes", ventasMes, costoMes)
  );
  if (ventasHoy.pedidos) lineas.push(`Ticket promedio de hoy: ${plata(ventasHoy.total / ventasHoy.pedidos)}.`);

  // ── Existencias ──
  const bajos = porReponer.filter((p) => (Number(p.stock) || 0) > 0);
  lineas.push(
    "",
    `INVENTARIO: ${agotados} productos agotados y ${bajos.length} con poco stock (25% o menos de su máximo).`,
    ...bajos.slice(0, 10).map((p) => `- Poco stock: ${p.name}, quedan ${Number(p.stock) || 0}${p.unidadVenta === "libra" ? " libras" : ""}${Number(p.maxQuantity) > 0 ? ` de ${Number(p.maxQuantity)}` : ""}`),
    ...porReponer.filter((p) => (Number(p.stock) || 0) <= 0).slice(0, 8).map((p) => `- Agotado: ${p.name}`),
    ...(porCaducar.length
      ? porCaducar.map((p) => `- Caduca el ${fechaCorta(p.expirationDate)}: ${p.name} (${Number(p.stock) || 0} en existencia)`)
      : [`- Nada caduca en los próximos ${DIAS_CADUCA} días.`])
  );

  lineas.push(
    "",
    "LO MÁS VENDIDO (últimos 30 días):",
    ...(masVendidos.length
      ? masVendidos.map((m) => `- ${m.nombre}: ${redondo(m.vendidos)} vendidos, ${plata(m.ingreso)}`)
      : ["- Sin ventas en los últimos 30 días."])
  );

  if (!esAdmin) return lineas.join("\n");

  // ── Solo para el administrador ──
  const [clientesTotal, clientesNuevos, proveedores, movimientos, promos, vendidosIds, ventas] = await Promise.all([
    clientModel.countDocuments({ isActive: { $ne: false } }),
    clientModel.countDocuments({ createdAt: { $gte: hace7 } }),
    supplierModel.find({}, "name").lean(),
    supplierMovementModel.find().lean(),
    promotionModel.find({}, "title etiqueta endsAt isActive").lean(),
    orderModel.distinct("items.productId", noCancelado),
    // Cómo va cada promo y qué conviene hacer (ver utils/consejosVentas.js).
    analizarVentas(),
  ]);

  // Lo que se puede prender, apagar o cambiar (ver tiquiPanelController).
  const vigente = (p) => p.isActive !== false && (!p.endsAt || new Date(p.endsAt) > ahora);
  const promosVigentes = promos.filter(vigente);
  const promosApagadas = promos.filter((p) => !vigente(p));
  const [ocultos, ajustes] = await Promise.all([
    productModel.find({ isActive: false }, "name").limit(20).lean(),
    storeSettingsModel.findOne({ clave: CLAVE_UNICA }, "temporada").lean(),
  ]);
  const temporadas = temporadasDisponibles(ajustes?.temporada);

  const sinMovimiento = await productModel
    .find({ isActive: { $ne: false }, _id: { $nin: vendidosIds.filter(Boolean) } }, "name")
    .limit(6)
    .lean();

  // La deuda con cada proveedor, con la misma cuenta que su estado de cuenta.
  const porProveedor = new Map();
  for (const m of movimientos) {
    const k = String(m.supplierId);
    if (!porProveedor.has(k)) porProveedor.set(k, []);
    porProveedor.get(k).push(m);
  }
  const cuentas = proveedores
    .map((p) => ({ nombre: p.name, ...estadoCuenta(porProveedor.get(String(p._id)) || []) }))
    .filter((c) => c.deuda > 0)
    .sort((a, b) => b.montoVencido - a.montoVencido || b.deuda - a.deuda);
  const deuda = cuentas.reduce((a, c) => a + c.deuda, 0);
  const vencido = cuentas.reduce((a, c) => a + c.montoVencido, 0);

  lineas.push(
    "",
    ...(sinMovimiento.length ? [`NUNCA SE HAN VENDIDO: ${sinMovimiento.map((p) => p.name).join(", ")}.`, ""] : []),
    `CLIENTES: ${clientesTotal} en total, ${clientesNuevos} nuevos en los últimos 7 días.`,
    "",
    cuentas.length
      ? `PROVEEDORES: se les debe ${plata(deuda)} en total; ${plata(vencido)} ya vencido.`
      : "PROVEEDORES: no se les debe nada.",
    ...cuentas.slice(0, 4).map((c) =>
      `- ${c.nombre}: debe ${plata(c.deuda)}${c.montoVencido > 0 ? `, ${plata(c.montoVencido)} vencido` : ""}`
    ),
    "",
    promosVigentes.length
      ? `PROMOCIONES VIGENTES: ${promosVigentes.map((p) => `${p.title || p.etiqueta || "Promoción"}${p.endsAt ? ` (termina el ${fechaCorta(p.endsAt)})` : ""}`).join("; ")}.`
      : "PROMOCIONES VIGENTES: ninguna.",
    ...(promosApagadas.length
      ? [`PROMOCIONES APAGADAS O VENCIDAS: ${promosApagadas.map((p) => `${p.title || p.etiqueta || "Promoción"}${p.endsAt && new Date(p.endsAt) <= ahora ? ` (venció el ${fechaCorta(p.endsAt)})` : ""}`).join("; ")}.`]
      : []),
    ...(ventas.resumenPromos.length
      ? ["", "CÓMO VAN LAS PROMOCIONES QUE TOCAN EL PRECIO (precio al que sale cada unidad contra lo que cuesta):", ...ventas.resumenPromos]
      : []),
    "",
    "CONSEJOS DE VENTAS (de lo más urgente a lo menos; las cuentas ya están hechas, úsalas tal cual):",
    ...(ventas.consejos.length
      ? ventas.consejos.map((c) => `- ${c.prioridad === 3 ? "[URGENTE] " : ""}${c.texto}`)
      : ["- Nada que corregir: las promociones dejan ganancia y ningún producto se vende por debajo del costo."]),
    `Margen típico de la tienda: ${Math.round(ventas.margenTipico * 100)}% (lo que deja un producto normal sobre su precio).`,
    "",
    ocultos.length ? `PRODUCTOS OCULTOS (no salen en la tienda): ${ocultos.map((p) => p.name).join(", ")}.` : "PRODUCTOS OCULTOS: ninguno.",
    "",
    `TEMPORADA DE LA TIENDA: ${describirTemporada(ajustes?.temporada, temporadas)}. Se puede poner: ${temporadas.map((t) => `${t.nombre} (${t.clave})`).join(", ")}, automática (según la fecha) o ninguna.`
  );

  return lineas.join("\n");
};

// Las temporadas que se pueden poner: las de fábrica (las mismas de
// frontend/src/utils/temporadas.js: si allá se agrega una, se agrega aquí) y las que el dueño creó
// en Personalización.
const TEMPORADAS_DE_FABRICA = [
  { clave: "navidad", nombre: "Navidad" },
  { clave: "halloween", nombre: "Halloween" },
  { clave: "independencia", nombre: "Independencia" },
  { clave: "san-valentin", nombre: "San Valentín" },
];

export const temporadasDisponibles = (temporada) => [
  ...TEMPORADAS_DE_FABRICA,
  ...(temporada?.personalizados || []).map((t) => ({ clave: t.clave, nombre: t.nombre })),
];

const describirTemporada = (temporada, lista) => {
  const modo = temporada?.modo || "automatico";
  if (modo === "ninguno") return "ninguna (los colores de siempre)";
  if (modo === "automatico") return "automática (la elige la fecha)";
  return `${lista.find((t) => t.clave === temporada?.tema)?.nombre || "ninguna"}, puesta a mano`;
};

// Después de cambiar algo, el siguiente panorama se arma de cero: Tiqui no
// puede contestar con el número de antes del cambio que ella misma hizo.
export const olvidarPanorama = () => {
  enMemoria.clear();
  catalogo = { en: 0, lista: null };
  olvidarConsejos();
};

export const panoramaDelNegocio = async ({ esAdmin }) => {
  const clave = esAdmin ? "admin" : "empleado";
  const guardado = enMemoria.get(clave);
  if (guardado && Date.now() - guardado.en < VIGENCIA_MS) return guardado.texto;
  const texto = await armarPanorama({ esAdmin });
  enMemoria.set(clave, { en: Date.now(), texto });
  return texto;
};

// ── Las existencias de lo que se está hablando ── "¿Cuánta leche nos queda?", "¿a cuánto vendemos
// el queso?": los productos cuyo nombre, categoría o marca aparecen en la charla, con su
// existencia y su precio (y el costo, solo para el administrador).
let catalogo = { en: 0, lista: null };

const aPlano = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

const DE_RELLENO = new Set([
  "cuanto", "cuanta", "cuantos", "cuantas", "queda", "quedan", "hay", "tenemos", "tengo", "stock",
  "existencia", "existencias", "inventario", "producto", "productos", "que", "del", "las", "los",
  "una", "uno", "para", "por", "con", "como", "vamos", "esta", "este", "estan", "precio", "vende",
  "vendemos", "cuesta", "costo", "tiqui", "dime", "muestrame", "busca", "buscar", "ver", "abre",
]);

const palabrasDe = (texto) =>
  aPlano(texto)
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 2 && !DE_RELLENO.has(w))
    .map((w) => w.replace(/s$/, ""));

export const productosDeLaCharla = async (texto, { esAdmin }) => {
  const palabras = palabrasDe(texto);
  if (!palabras.length) return [];

  if (!catalogo.lista || Date.now() - catalogo.en > 30 * 1000) {
    const productos = await productModel
      .find({ isActive: { $ne: false } }, "name stock maxQuantity salePrice priceCost unidadVenta typeId brandId")
      .populate("typeId", "type")
      .populate("brandId", "name")
      .lean();
    catalogo = {
      en: Date.now(),
      lista: productos.filter((p) => p.name).map((p) => ({
        ...p,
        clave: aPlano(`${p.name} ${p.typeId?.type || ""} ${p.brandId?.name || ""}`),
      })),
    };
  }

  return catalogo.lista
    .map((p) => ({ p, puntos: palabras.reduce((a, w) => a + (p.clave.includes(w) ? 1 : 0), 0) }))
    .filter((x) => x.puntos > 0)
    .sort((a, b) => b.puntos - a.puntos)
    .slice(0, 20)
    .map(({ p }) => {
      const libra = p.unidadVenta === "libra";
      return [
        p.name,
        `${Number(p.stock) || 0}${libra ? " libras" : ""} en existencia${Number(p.maxQuantity) > 0 ? ` (máximo ${Number(p.maxQuantity)})` : ""}`,
        `precio ${plata(p.salePrice)}${libra ? " la libra" : ""}`,
        esAdmin && p.priceCost != null ? `costo ${plata(p.priceCost)}` : "",
        p.typeId?.type || "",
        p.brandId?.name || "",
      ].filter(Boolean).join(" · ");
    });
};

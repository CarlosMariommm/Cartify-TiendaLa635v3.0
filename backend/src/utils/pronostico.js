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
import { config } from "../../config.js";

const ZONA = "America/El_Salvador";
// El Salvador no cambia de hora en el año: siempre seis horas antes de UTC.
const DESFASE = "-06:00";
const DIA = 24 * 60 * 60 * 1000;
const DIAS_DE_HISTORIAL = 180;
const HORIZONTE = 28;
// Lo que se guarda la respuesta antes de volver a calcular.
const VIGENCIA_MS = 15 * 60 * 1000;
// Si el servicio estaba dormido, despertar le toma cerca de un minuto.
const ESPERA_MS = 90 * 1000;

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

/*
 * Lo que se le manda al servicio. `ahora` se puede pasar para las pruebas.
 * Devuelve null si todavía no hay ventas de las que aprender.
 */
export const armarSolicitud = async (ahora = new Date()) => {
  const hoy = diaLocal(ahora);
  const hasta = sumarDias(hoy, -1);
  const finDeAyer = new Date(`${hoy}T00:00:00${DESFASE}`);
  const inicio = new Date(`${sumarDias(hoy, -DIAS_DE_HISTORIAL)}T00:00:00${DESFASE}`);
  const vendidos = { status: { $ne: "cancelado" }, createdAt: { $gte: inicio, $lt: finDeAyer } };
  const diaDelPedido = { $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: ZONA } };

  const [tienda, ventas, productos, proveedores, compras] = await Promise.all([
    orderModel.aggregate([
      { $match: vendidos },
      { $group: { _id: diaDelPedido, total: { $sum: aNumero("$total") }, pedidos: { $sum: 1 } } },
    ]),
    orderModel.aggregate([
      { $match: vendidos },
      { $unwind: "$items" },
      { $match: { "items.productId": { $ne: null } } },
      { $group: { _id: { dia: diaDelPedido, producto: "$items.productId" }, unidades: { $sum: aNumero("$items.amount") } } },
    ]),
    productModel.find({ isActive: { $ne: false } })
      .select("name stock unidadVenta salePrice priceCost supplierId createdAt")
      .lean(),
    supplierModel.find().select("name").lean(),
    shoppingModel.find({ date: { $gte: inicio } }).select("supplierId date").lean(),
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

let guardado = null; // { datos, en }

export const olvidarPronostico = () => {
  guardado = null;
};

/*
 * El pronóstico, del servicio o del rato que se guarda. `forzar` lo vuelve a
 * calcular (el botón "Actualizar" del panel).
 */
export const obtenerPronostico = async ({ forzar = false, ahora = new Date() } = {}) => {
  if (!forzar && guardado && ahora.getTime() - guardado.en < VIGENCIA_MS) return guardado.datos;
  if (!config.analitica.url) {
    throw new ErrorPronostico("sin-servicio", "El servicio de analítica no está configurado (ANALITICA_URL)");
  }

  const solicitud = await armarSolicitud(ahora);
  if (!solicitud) {
    return { vacio: true, generado: ahora.toISOString() };
  }

  let respuesta;
  try {
    respuesta = await fetch(`${config.analitica.url}/pronostico`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-clave-analitica": config.analitica.clave },
      body: JSON.stringify(solicitud),
      signal: AbortSignal.timeout(ESPERA_MS),
    });
  } catch (error) {
    const tardo = error?.name === "TimeoutError" || error?.name === "AbortError";
    throw new ErrorPronostico(tardo ? "lento" : "sin-conexion", error?.message || "sin conexión");
  }
  if (!respuesta.ok) {
    throw new ErrorPronostico("fallo", `El servicio de analítica contestó ${respuesta.status}`);
  }

  const datos = { ...(await respuesta.json()), generado: ahora.toISOString() };
  guardado = { datos, en: ahora.getTime() };
  return datos;
};

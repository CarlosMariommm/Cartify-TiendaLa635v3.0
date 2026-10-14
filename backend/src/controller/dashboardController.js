import orderModel from "../models/order.js";
import productModel from "../models/product.js";
import supplierMovementModel from "../models/supplierMovement.js";
import clientModel from "../models/client.js";
import { conCanalesDePedido, hayDemostracion, pronosticoSinEsperarDeMas } from "../utils/pronostico.js";

/*
 * Dashboard del admin — arma TODO el resumen en una sola llamada.
 * La idea es que no sean números bonitos, sino cosas accionables: qué reponer,
 * qué caduca, qué preparar y qué ya no se vende.
 */

/*
 * Umbrales del negocio.
 * "Stock bajo" NO es un número fijo: depende del máximo de cada producto.
 * No es lo mismo que queden 10 refrescos de un máximo de 1000 (crítico) que
 * 10 televisores de un máximo de 12 (normal). Por eso comparamos contra su
 * propio maxQuantity; si el producto no lo tiene, usamos el respaldo fijo.
 */
export const RATIO_BAJO = 0.25;      // le queda 25% o menos de su máximo
export const STOCK_BAJO_ABS = 10;    // respaldo cuando no hay máximo definido
export const DIAS_CADUCA = 7;        // "caduca esta semana"

/*
 * Convierte un campo a número dentro de la consulta. Hace falta porque algunos
 * productos guardaron stock/maxQuantity como texto (vienen de un formulario con
 * archivos), y Mongo no puede multiplicar cadenas.
 */
export const numero = (campo) => ({ $convert: { input: campo, to: "double", onError: 0, onNull: 0 } });

// Condición de "stock bajo" relativa al máximo de cada producto.
export const filtroStockBajo = {
  isActive: { $ne: false },
  $expr: {
    $lte: [
      numero("$stock"),
      {
        $cond: [
          { $gt: [numero("$maxQuantity"), 0] },
          { $multiply: [numero("$maxQuantity"), RATIO_BAJO] },
          STOCK_BAJO_ABS,
        ],
      },
    ],
  },
};

/*
 * Serie de la gráfica (ventas vs compras). Vive aparte porque el front la pide
 * sola cuando cambias de Semana/Mes/Año — así no recarga todo el dashboard.
 *
 * "Compras" salía SIEMPRE en cero: la consulta apuntaba a `Shoppings`, una
 * colección que nadie llena — registrar una compra a un proveedor (Suppliers
 * → estado de cuenta) crea un `SupplierMovement` con type:'compra', no un
 * `Shopping`. Ahora la gráfica lee de donde de verdad se guardan las compras.
 */
const construirSerie = async (periodo, desde) => {
  const porDia = periodo === "semana";
  const formato = porDia ? "%d/%m" : "%Y-%m";

  const [serieVentas, serieCompras] = await Promise.all([
    orderModel.aggregate([
      { $match: { status: { $ne: "cancelado" }, createdAt: { $gte: desde } } },
      { $group: { _id: { $dateToString: { format: formato, date: "$createdAt" } }, total: { $sum: "$total" } } },
      { $sort: { _id: 1 } },
    ]),
    supplierMovementModel.aggregate([
      { $match: { type: "compra", date: { $gte: desde } } },
      { $group: { _id: { $dateToString: { format: formato, date: "$date" } }, total: { $sum: "$amount" } } },
      { $sort: { _id: 1 } },
    ]),
  ]);

  const etiquetas = Array.from(
    new Set([...serieVentas.map((s) => s._id), ...serieCompras.map((s) => s._id)])
  ).sort();

  return etiquetas.map((etiqueta) => ({
    etiqueta,
    ventas: Number((serieVentas.find((s) => s._id === etiqueta)?.total || 0).toFixed(2)),
    compras: Number((serieCompras.find((s) => s._id === etiqueta)?.total || 0).toFixed(2)),
  }));
};

// Desde qué fecha arranca la serie según el periodo elegido.
const inicioSerie = (periodo, hoy) => {
  const desde = new Date(hoy);
  if (periodo === "semana") desde.setDate(desde.getDate() - 6);
  else desde.setMonth(desde.getMonth() - (periodo === "anio" ? 11 : 5));
  return desde;
};

export const inicioDelDia = (d) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};

// Variación porcentual entre dos periodos (protegida contra dividir entre 0).
const variacion = (actual, anterior) => {
  if (!anterior) return actual > 0 ? 100 : 0;
  return Math.round(((actual - anterior) / anterior) * 100);
};

const dashboardController = {};

dashboardController.getSummary = async (req, res) => {
  try {
    const periodo = req.query.periodo || "mes"; // 'semana' | 'mes' | 'anio'

    const ahora = new Date();
    const hoy = inicioDelDia(ahora);
    const manana = new Date(hoy); manana.setDate(manana.getDate() + 1);
    const ayer = new Date(hoy); ayer.setDate(ayer.getDate() - 1);
    const hace7 = new Date(hoy); hace7.setDate(hace7.getDate() - 7);
    const hace14 = new Date(hoy); hace14.setDate(hace14.getDate() - 14);
    const hace30 = new Date(hoy); hace30.setDate(hace30.getDate() - 30);
    const caducaHasta = new Date(ahora); caducaHasta.setDate(caducaHasta.getDate() + DIAS_CADUCA);

    const noCancelado = { status: { $ne: "cancelado" } };

    const [
      pedidosHoy, pedidosAyer,
      dineroHoy, dineroAyer,
      costoHoy, costoAyer,
      entregadosSemana, entregadosSemanaPrevia,
      productosPorReponer, lotesPorCaducar,
      pedidosPorPreparar, impresionesPendientes,
      clientesNuevos, canjes,
      masVendidos, ventasPorModulo,
      grafica,
      totalProductos, totalClientes,
    ] = await Promise.all([
      // ── Pedidos de hoy vs ayer ──
      orderModel.countDocuments({ createdAt: { $gte: hoy, $lt: manana } }),
      orderModel.countDocuments({ createdAt: { $gte: ayer, $lt: hoy } }),

      // ── INGRESOS del día vs ayer (lo que entró a la caja) ──
      orderModel.aggregate([
        { $match: { ...noCancelado, createdAt: { $gte: hoy, $lt: manana } } },
        { $group: { _id: null, total: { $sum: "$total" }, cantidad: { $sum: 1 } } },
      ]),
      orderModel.aggregate([
        { $match: { ...noCancelado, createdAt: { $gte: ayer, $lt: hoy } } },
        { $group: { _id: null, total: { $sum: "$total" } } },
      ]),

      /*
       * ── INVERSIÓN del día vs ayer ──
       * Lo que le costaron a la tienda los productos que vendió: el precio de
       * costo por la cantidad. Restándoselo a los ingresos sale la ganancia
       * de verdad — antes se llamaba "ganancia" a los ingresos a secas, que es
       * como decir que vender a $2 algo que costó $1.80 dejó $2 de ganancia.
       *
       * Las impresiones no entran: no tienen producto ni costo cargado (el
       * papel y la tinta no están modelados), así que su margen no se puede
       * calcular y sumarles costo cero inflaría la ganancia.
       */
      orderModel.aggregate([
        { $match: { ...noCancelado, createdAt: { $gte: hoy, $lt: manana } } },
        { $unwind: "$items" },
        { $match: { "items.productId": { $ne: null } } },
        { $lookup: { from: "Products", localField: "items.productId", foreignField: "_id", as: "p" } },
        { $unwind: "$p" },
        { $group: { _id: null, total: { $sum: { $multiply: [numero("$p.priceCost"), numero("$items.amount")] } } } },
      ]),
      orderModel.aggregate([
        { $match: { ...noCancelado, createdAt: { $gte: ayer, $lt: hoy } } },
        { $unwind: "$items" },
        { $match: { "items.productId": { $ne: null } } },
        { $lookup: { from: "Products", localField: "items.productId", foreignField: "_id", as: "p" } },
        { $unwind: "$p" },
        { $group: { _id: null, total: { $sum: { $multiply: [numero("$p.priceCost"), numero("$items.amount")] } } } },
      ]),

      // ── Entregados esta semana vs la anterior (por fecha de entrega) ──
      orderModel.countDocuments({ status: "entregado", updatedAt: { $gte: hace7 } }),
      orderModel.countDocuments({ status: "entregado", updatedAt: { $gte: hace14, $lt: hace7 } }),

      // ── Por reponer (bajo respecto a SU propio máximo) ──
      productModel
        .find(filtroStockBajo)
        .select("name stock maxQuantity salePrice")
        .sort({ stock: 1 })
        .limit(50),

      // ── Lotes que caducan esta semana ──
      productModel
        .find({ isActive: { $ne: false }, expirationDate: { $gte: ahora, $lte: caducaHasta } })
        .select("name expirationDate stock")
        .sort({ expirationDate: 1 })
        .limit(50),

      // ── Trabajo pendiente ──
      orderModel.countDocuments({ status: { $in: ["pagado", "preparando", "en_camino", "listo"] } }),
      orderModel.countDocuments({ channel: "impresion", status: { $in: ["pagado", "preparando", "en_camino", "listo"] } }),

      // ── Clientes nuevos esta semana ──
      clientModel.countDocuments({ createdAt: { $gte: hace7 } }),

      // ── Puntos canjeados en los últimos 30 días ──
      orderModel.aggregate([
        { $match: { createdAt: { $gte: hace30 } } },
        { $group: { _id: null, puntos: { $sum: "$pointsRedeemed" }, descuento: { $sum: "$discount" } } },
      ]),

      /*
       * ── Productos más vendidos ──
       *
       * Solo del catálogo ACTUAL: un producto borrado no vuelve a aparecer
       * aquí, así el top-8 son 8 productos reales, no un hueco ocupado por
       * "Clarence (eliminado)" desplazando a uno que sí se puede reponer.
       */
      orderModel.aggregate([
        { $match: noCancelado },
        { $unwind: "$items" },
        { $match: { "items.productId": { $ne: null } } },
        {
          $group: {
            _id: "$items.productId",
            vendidos: { $sum: "$items.amount" },
            ingreso: { $sum: { $multiply: [numero("$items.price"), numero("$items.amount")] } },
          },
        },
        { $sort: { vendidos: -1 } },
        /*
         * Pedimos de más y recortamos a 8 hasta el final: algunos de los
         * primeros pueden caer en el $match de abajo por ser de un producto
         * ya borrado, y cortar antes dejaría la tabla en menos de 8 sin razón
         * visible.
         */
        { $limit: 24 },
        { $lookup: { from: "Products", localField: "_id", foreignField: "_id", as: "p" } },
        { $unwind: "$p" },
        { $lookup: { from: "ProductTypes", localField: "p.typeId", foreignField: "_id", as: "t" } },
        { $unwind: { path: "$t", preserveNullAndEmptyArrays: true } },
        {
          $project: {
            vendidos: 1, ingreso: 1,
            nombre: "$p.name",
            stock: "$p.stock", maxQuantity: "$p.maxQuantity",
            precio: "$p.salePrice",
            categoria: "$t.type",
          },
        },
        { $limit: 8 },
      ]),

      // ── Ventas por módulo (Tienda, Impresiones, y los que creen) ──
      orderModel.aggregate([
        { $match: noCancelado },
        { $unwind: "$items" },
        { $lookup: { from: "Products", localField: "items.productId", foreignField: "_id", as: "p" } },
        { $unwind: { path: "$p", preserveNullAndEmptyArrays: true } },
        { $lookup: { from: "Modules", localField: "p.moduleId", foreignField: "_id", as: "m" } },
        { $unwind: { path: "$m", preserveNullAndEmptyArrays: true } },
        {
          /*
           * Antes todo lo que no tenía módulo caía en un cajón llamado
           * "Impresiones / otros", que mezclaba dos cosas muy distintas: las
           * impresiones (que legítimamente no tienen producto) y productos a
           * los que se les olvidó asignar módulo. Lo primero es normal; lo
           * segundo es un dato que hay que corregir en el inventario.
           *
           * Lo que no tiene módulo se agrupa bajo _id null a propósito: sale de
           * la comparación entre áreas (donde solo estorbaba, aplastando las
           * barras de las que sí están asignadas) pero viaja aparte, para poder
           * decir en voz alta cuánta plata es.
           */
          $group: {
            _id: {
              $cond: [
                { $eq: ["$channel", "impresion"] },
                "Impresiones",
                { $ifNull: ["$m.name", null] },
              ],
            },
            total: { $sum: { $multiply: [numero("$items.price"), numero("$items.amount")] } },
          },
        },
        { $sort: { total: -1 } },
      ]),

      // ── Gráfica de ventas vs compras ──
      construirSerie(periodo, inicioSerie(periodo, hoy)),

      productModel.countDocuments({ isActive: { $ne: false } }),
      clientModel.countDocuments({ isActive: { $ne: false } }),
    ]);

    // ── Productos sin movimiento (nadie los ha comprado nunca) ──
    const vendidosIds = await orderModel.distinct("items.productId", noCancelado);
    const sinMovimiento = await productModel
      .find({ isActive: { $ne: false }, _id: { $nin: vendidosIds.filter(Boolean) } })
      .select("name stock salePrice")
      .limit(8);

    /*
     * Ingresos - inversión = ganancia. Tres números distintos que antes se
     * mostraban como uno solo llamado "ganancia".
     */
    const ingresosHoy = Number((dineroHoy[0]?.total || 0).toFixed(2));
    const ingresosAyer = Number((dineroAyer[0]?.total || 0).toFixed(2));
    const inversionHoy = Number((costoHoy[0]?.total || 0).toFixed(2));
    const inversionAyer = Number((costoAyer[0]?.total || 0).toFixed(2));

    const gananciaHoy = Number((ingresosHoy - inversionHoy).toFixed(2));
    const gananciaAyer = Number((ingresosAyer - inversionAyer).toFixed(2));

    // Margen: de cada dólar que entró, cuánto quedó. Sin ingresos no hay margen
    // que calcular (dividir entre cero daría Infinity).
    const margen = ingresosHoy > 0
      ? Number(((gananciaHoy / ingresosHoy) * 100).toFixed(1))
      : 0;

    const pedidosConMonto = dineroHoy[0]?.cantidad || 0;

    /*
     * Las ventas sin módulo salen de la gráfica pero NO del reporte: son ventas
     * viejas, de productos que nunca tuvieron módulo, y esconderlas sin decir
     * nada dejaría al encargado creyendo que la tienda vendió mucho menos de lo
     * que vendió. Van aparte para que el front las anuncie en una línea.
     */
    const modulosConVentas = ventasPorModulo.filter((m) => m._id);
    const ventasHuerfanas = ventasPorModulo.find((m) => !m._id)?.total || 0;

    return res.status(200).json({
      // Tarjetas principales
      pedidosHoy: {
        valor: pedidosHoy,
        variacion: variacion(pedidosHoy, pedidosAyer),
      },
      entregados: {
        valor: entregadosSemana,
        variacion: variacion(entregadosSemana, entregadosSemanaPrevia),
      },
      // Lo que entró a la caja.
      ingresos: {
        valor: ingresosHoy,
        delta: Number((ingresosHoy - ingresosAyer).toFixed(2)),
      },
      // Lo que costaron los productos vendidos.
      inversion: {
        valor: inversionHoy,
        delta: Number((inversionHoy - inversionAyer).toFixed(2)),
      },
      // Lo que de verdad quedó, y qué porcentaje representa.
      ganancia: {
        valor: gananciaHoy,
        delta: Number((gananciaHoy - gananciaAyer).toFixed(2)),
        margen,
      },
      // El ticket se calcula sobre lo que pagó el cliente, no sobre la ganancia.
      ticketPromedio: pedidosConMonto ? Number((ingresosHoy / pedidosConMonto).toFixed(2)) : 0,

      // Requiere atención
      porReponer: { total: productosPorReponer.length, lista: productosPorReponer },
      porCaducar: { total: lotesPorCaducar.length, lista: lotesPorCaducar },
      pedidosPorPreparar,
      impresionesPendientes,

      // Extras
      clientesNuevos,
      puntosCanjeados: canjes[0]?.puntos || 0,
      descuentoPorPuntos: Number((canjes[0]?.descuento || 0).toFixed(2)),
      totalProductos,
      totalClientes,

      // Tablas y gráficas
      masVendidos,
      sinMovimiento,
      ventasPorModulo: modulosConVentas.map((m) => ({ modulo: m._id, total: Number(m.total.toFixed(2)) })),
      ventasSinModulo: Number(ventasHuerfanas.toFixed(2)),
      grafica,
      periodo,
      umbrales: { ratioBajo: RATIO_BAJO, stockBajoAbs: STOCK_BAJO_ABS, diasCaduca: DIAS_CADUCA },
    });
  } catch (error) {
    console.log("error " + error);
    return res.status(500).json({ message: "Error interno del servidor" });
  }
};

/*
 * Solo la gráfica. Lo usa el front al cambiar Semana/Mes/Año, para no volver a
 * pedir (ni repintar) todo el dashboard por un cambio que afecta una sola caja.
 */
dashboardController.getChart = async (req, res) => {
  try {
    const periodo = req.query.periodo || "mes";
    const hoy = inicioDelDia(new Date());
    const grafica = await construirSerie(periodo, inicioSerie(periodo, hoy));
    return res.status(200).json({ grafica, periodo });
  } catch (error) {
    console.log("error " + error);
    return res.status(500).json({ message: "Error interno del servidor" });
  }
};

/*
 * El pronóstico de ventas y la lista de compras, calculados por el servicio
 * de analítica (Python). Cada falla dice qué pasó: no es lo mismo que el
 * servicio no esté conectado a que esté despertando.
 */
const MENSAJES_PRONOSTICO = {
  "sin-servicio": [503, "El pronóstico todavía no está conectado: falta configurar el servicio de analítica."],
  lento: [504, "El servicio de pronóstico tardó demasiado; puede estar despertando. Intente de nuevo en un minuto."],
  "sin-conexion": [502, "No se pudo conectar con el servicio de pronóstico. Intente de nuevo en un minuto."],
  "sin-demo": [404, "La demostración del pronóstico no está disponible."],
};

/*
 * `?demo=1`: con la demostración (ventas inventadas de varios meses, para
 * mostrar el pronóstico sin tocar la tienda real; ver utils/pronostico.js).
 * `demoDisponible` le dice al panel si puede ofrecer ese modo.
 *
 * Si el cálculo pasa de 20 segundos (Render gratis, con historia larga), se
 * contesta 202 `{ calculando: true }` y el cálculo SIGUE: el panel vuelve a
 * preguntar en unos segundos y, cuando termina, lo recibe guardado. Antes se
 * esperaba minuto y medio, se cortaba y el cálculo se perdía.
 */
const ESPERA_DEL_PANEL_MS = 20 * 1000;

dashboardController.getPronostico = async (req, res) => {
  try {
    const demo = req.query.demo === "1";
    const calculado = await pronosticoSinEsperarDeMas({ forzar: req.query.forzar === "1", demo }, ESPERA_DEL_PANEL_MS);
    if (!calculado) return res.status(202).json({ calculando: true, demoDisponible: hayDemostracion() });
    const datos = await conCanalesDePedido(calculado, { demo });
    return res.status(200).json({ ...datos, demoDisponible: hayDemostracion() });
  } catch (error) {
    const [estado, mensaje] = MENSAJES_PRONOSTICO[error?.codigo] || [502, "No se pudo calcular el pronóstico."];
    console.log(`pronóstico: ${error?.codigo || "error"} ${error?.message || error}`);
    return res.status(estado).json({ message: mensaje });
  }
};

export default dashboardController;

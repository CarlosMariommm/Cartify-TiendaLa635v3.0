import orderModel from "../models/order.js";
import productModel from "../models/product.js";
import promotionModel from "../models/promotion.js";
import { DIAS_CADUCA, numero } from "../controller/dashboardController.js";

// CONSEJOS DE VENTAS — Tiqui del panel como ayudante de ventas
// Tiqui contaba los números del negocio, pero de las promociones solo sabía el nombre: no podía
// decir que un 2x1 estaba dejando pérdida.

const DIA = 24 * 60 * 60 * 1000;
// Lo mínimo que se le pide a una promo para darla por sana: 10% de ganancia.
const MARGEN_PROMO = 0.1;
// Por debajo de esto, "casi no deja nada".
const CASI_NADA = 0.05;
// Si la tienda no tiene de dónde sacarlo, el margen de un súper de barrio.
const MARGEN_DE_RESPALDO = 0.25;

const plata = (n) => `$${(Number(n) || 0).toFixed(2)}`;
const centavos = (n) => Math.round(Number(n) * 100) / 100;
// Hacia arriba al centavo: un precio sugerido nunca puede quedar un pelo corto.
const redondearArriba = (n) => Math.ceil(Number(n) * 100 - 1e-9) / 100;
const porciento = (x) => `${Math.round(x * 100)}%`;
const fechaCorta = (d) =>
  new Date(d).toLocaleDateString("es-SV", { day: "numeric", month: "long", timeZone: "America/El_Salvador" });

export const nombreDePromo = (p) => p.title || p.etiqueta || "Promoción";

export const describirOferta = (promo, item) => {
  if (promo.type === "nxm") return `${Number(promo.buyQty) || 2}x${Number(promo.payQty) || 1}`;
  if (promo.type === "descuento") return `${Number(item?.discount) || 0}% de descuento`;
  if (promo.type === "precio_fijo") return `precio fijo de ${plata(item?.fixedPrice)}`;
  return "anuncio";
};

// A cuánto sale UNA unidad con la promo (en un NxM, llevando el grupo completo).
export const precioEnPromo = (promo, item, producto) => {
  const precio = Number(producto?.salePrice) || 0;
  if (promo.type === "descuento") return precio * (1 - (Number(item.discount) || 0) / 100);
  if (promo.type === "precio_fijo") {
    return item.fixedPrice != null && item.fixedPrice !== "" ? Number(item.fixedPrice) : precio;
  }
  if (promo.type === "nxm") return (precio * (Number(promo.payQty) || 1)) / (Number(promo.buyQty) || 2);
  return precio;
};

const vigente = (p, ahora) => p.isActive !== false && (!p.endsAt || new Date(p.endsAt) > ahora);
const TOCA_PRECIO = ["descuento", "precio_fijo", "nxm"];

// Unidades vendidas y lo cobrado por producto, entre dos fechas.
const ventasPorProducto = async (ids, desde, hasta) => {
  if (!ids.length) return new Map();
  const filas = await orderModel.aggregate([
    { $match: { status: { $ne: "cancelado" }, createdAt: { $gte: desde, $lt: hasta }, "items.productId": { $in: ids } } },
    { $unwind: "$items" },
    { $match: { "items.productId": { $in: ids } } },
    {
      $group: {
        _id: "$items.productId",
        unidades: { $sum: numero("$items.amount") },
        ingreso: { $sum: { $multiply: [numero("$items.price"), numero("$items.amount")] } },
      },
    },
  ]);
  return new Map(filas.map((f) => [String(f._id), f]));
};

// Qué cambiar para que la promo deje al menos MARGEN_PROMO en TODOS los productos que hoy quedan
// cortos. Devuelve la frase o "" si no hay arreglo.
const arregloDePromo = (promo, cortos) => {
  const conMargen = (costo) => costo / (1 - MARGEN_PROMO);
  if (promo.type === "descuento") {
    // El descuento más alto que todavía deja 10% en todos.
    const maximo = Math.min(...cortos.map(({ producto }) =>
      Math.floor((1 - conMargen(producto.priceCost) / Number(producto.salePrice)) * 100)));
    return maximo >= 5
      ? { texto: `Con ${maximo}% de descuento todavía dejaría 10% de ganancia.`, descuento: maximo }
      : { texto: "Ni con 5% de descuento deja ganancia: conviene apagarla o subir el precio normal." };
  }
  if (promo.type === "precio_fijo") {
    if (cortos.length !== 1) return { texto: "Conviene subir su precio fijo o apagarla." };
    const { producto } = cortos[0];
    const minimo = redondearArriba(conMargen(producto.priceCost));
    return minimo < Number(producto.salePrice)
      ? { texto: `A ${plata(minimo)} dejaría 10% de ganancia.`, precio: minimo }
      : { texto: "Con ese costo no hay precio de promoción que deje ganancia: conviene apagarla." };
  }
  if (promo.type === "nxm") {
    for (const [lleva, paga] of [[3, 2], [4, 3], [5, 4]]) {
      const alcanza = cortos.every(({ producto }) =>
        (Number(producto.salePrice) * paga) / lleva >= conMargen(producto.priceCost));
      if (alcanza) return { texto: `Un ${lleva}x${paga} todavía dejaría 10% de ganancia.`, lleva, paga };
    }
    return { texto: "Ningún NxM deja ganancia con ese costo: conviene cambiarla por un descuento chico o apagarla." };
  }
  return { texto: "" };
};

const mediana = (xs) => {
  if (!xs.length) return null;
  const o = [...xs].sort((a, b) => a - b);
  const m = Math.floor(o.length / 2);
  return o.length % 2 ? o[m] : (o[m - 1] + o[m]) / 2;
};

export const analizarVentas = async () => {
  const ahora = new Date();
  const hace30 = new Date(ahora.getTime() - 30 * DIA);
  const caducaHasta = new Date(ahora.getTime() + DIAS_CADUCA * DIA);

  const [promos, productos, vendidos30] = await Promise.all([
    promotionModel.find({}, "title etiqueta type items buyQty payQty isActive endsAt createdAt")
      .populate("items.productId", "name salePrice priceCost stock unidadVenta")
      .lean(),
    productModel.find({ isActive: { $ne: false } }, "name salePrice priceCost stock expirationDate createdAt unidadVenta").lean(),
    orderModel.distinct("items.productId", { status: { $ne: "cancelado" }, createdAt: { $gte: hace30 } }),
  ]);

  const conCosto = (p) => Number(p?.priceCost) > 0 && Number(p?.salePrice) > 0;
  const margenTipico = mediana(
    productos.filter((p) => conCosto(p) && Number(p.salePrice) > Number(p.priceCost))
      .map((p) => (Number(p.salePrice) - Number(p.priceCost)) / Number(p.salePrice))
  ) ?? MARGEN_DE_RESPALDO;

  const promosPrecio = promos.filter((p) => vigente(p, ahora) && TOCA_PRECIO.includes(p.type));
  const enPromo = new Set(promosPrecio.flatMap((p) => (p.items || []).map((i) => String(i.productId?._id || ""))));

  const consejos = [];
  const resumenPromos = [];

  // ── Promociones huérfanas ── Encendidas, pero su producto ya no existe (se borró y se volvió a
  // crear con otro id, por ejemplo). En la tienda siguen anunciando "a $4.50" y no le rebajan nada a
  // nadie, y el aviso a los clientes ni sale.
  for (const promo of promos.filter((p) => vigente(p, ahora) && (p.items || []).length)) {
    if ((promo.items || []).some((i) => i.productId?._id)) continue;
    consejos.push({
      prioridad: 2,
      impacto: 1,
      texto:
        `La promoción ${nombreDePromo(promo)} está encendida, pero sus productos ya no existen en el inventario: ` +
        "en la tienda se anuncia y no rebaja nada. Vuelve a agregarle los productos en Promociones, o apágala.",
      accion: "",
    });
  }

  // ── Las promociones vigentes que tocan el precio ──
  for (const promo of promosPrecio) {
    const items = (promo.items || []).filter((i) => i.productId?._id);
    if (!items.length) continue;
    const nombre = nombreDePromo(promo);
    const desde = new Date(promo.createdAt || ahora);
    const dias = Math.max(1, Math.round((ahora - desde) / DIA));
    const ids = items.map((i) => i.productId._id);
    const antesDesde = new Date(desde.getTime() - dias * DIA);
    const [durante, antes] = await Promise.all([
      ventasPorProducto(ids, desde, ahora),
      dias <= 60 ? ventasPorProducto(ids, antesDesde, desde) : Promise.resolve(new Map()),
    ]);

    const filas = items.map((item) => {
      const producto = item.productId;
      const efectivo = precioEnPromo(promo, item, producto);
      const costo = Number(producto.priceCost) || 0;
      const v = durante.get(String(producto._id));
      const unidades = Number(v?.unidades) || 0;
      return {
        item, producto, efectivo, costo, unidades,
        antes: Number(antes.get(String(producto._id))?.unidades) || 0,
        ganancia: efectivo - costo,
        margen: efectivo > 0 ? (efectivo - costo) / efectivo : -1,
        // Lo que se ganó o perdió DE VERDAD, con lo que se cobró en cada pedido.
        realizado: v ? Number(v.ingreso) - costo * unidades : 0,
      };
    });

    const totalUnidades = filas.reduce((a, f) => a + f.unidades, 0);
    const totalAntes = filas.reduce((a, f) => a + f.antes, 0);
    resumenPromos.push(
      `- ${nombre} (${promo.type === "nxm" ? describirOferta(promo) : promo.type === "descuento" ? "descuento" : "precio fijo"}, desde el ${fechaCorta(desde)}): ` +
      filas.slice(0, 4).map((f) =>
        `${f.producto.name} ${promo.type === "nxm" ? "" : `con ${describirOferta(promo, f.item)} `}sale a ${plata(f.efectivo)} c/u` +
        (f.costo ? `, cuesta ${plata(f.costo)} (${f.ganancia >= 0 ? "deja" : "pierde"} ${plata(Math.abs(f.ganancia))})` : ", sin costo cargado")
      ).join("; ") +
      `${filas.length > 4 ? ` y ${filas.length - 4} más` : ""}. Vendió ${centavos(totalUnidades)} en ${dias} día${dias === 1 ? "" : "s"}` +
      (dias <= 60 ? ` (en los ${dias} días de antes: ${centavos(totalAntes)})` : "") + "."
    );

    const pierden = filas.filter((f) => f.costo && f.ganancia < 0);
    const casiNada = filas.filter((f) => f.costo && f.ganancia >= 0 && f.margen < CASI_NADA);
    const cortos = [...pierden, ...casiNada];

    if (cortos.length) {
      const peor = [...cortos].sort((a, b) => a.ganancia - b.ganancia)[0];
      const perdido = -cortos.reduce((a, f) => a + Math.min(0, f.realizado), 0);
      const arreglo = arregloDePromo(promo, cortos);
      const quien = cortos.length === 1
        ? `${peor.producto.name} sale a ${plata(peor.efectivo)} y cuesta ${plata(peor.costo)}`
        : `${cortos.length} de sus productos quedan cortos; el peor, ${peor.producto.name}, sale a ${plata(peor.efectivo)} y cuesta ${plata(peor.costo)}`;
      consejos.push({
        prioridad: pierden.length ? 3 : 2,
        impacto: perdido || Math.abs(peor.ganancia),
        texto:
          `La promoción ${nombre} ${pierden.length ? "está dejando pérdida" : "casi no deja ganancia"}: ${quien}` +
          (peor.ganancia < 0 ? `, pierdes ${plata(-peor.ganancia)} en cada una` : "") + "." +
          (perdido > 0 ? ` Desde el ${fechaCorta(desde)} ya se perdieron ${plata(perdido)}.` : "") +
          (arreglo.texto ? ` ${arreglo.texto}` : ""),
        accion: arreglo.descuento || arreglo.precio || arreglo.lleva ? "ajustar_promocion" : "",
      });
    } else if (dias >= 3 && totalUnidades === 0) {
      consejos.push({
        prioridad: 1,
        impacto: 0,
        texto: `La promoción ${nombre} lleva ${dias} días y no ha vendido nada. Quizá no se ve o la oferta no convence: revisa que tenga imagen o prueba una rebaja más clara.`,
        accion: "",
      });
    }
  }

  // ── Productos que se venden por debajo de lo que cuestan ──
  for (const p of productos.filter((x) => conCosto(x) && Number(x.salePrice) < Number(x.priceCost))) {
    const sugerido = redondearArriba(Number(p.priceCost) / (1 - margenTipico));
    consejos.push({
      prioridad: 3,
      impacto: (Number(p.priceCost) - Number(p.salePrice)) * Math.max(1, Number(p.stock) || 0),
      texto:
        `${p.name} se vende a ${plata(p.salePrice)} y cuesta ${plata(p.priceCost)}: pierdes ${plata(Number(p.priceCost) - Number(p.salePrice))} en cada una. ` +
        `A ${plata(sugerido)} dejaría el ${porciento(margenTipico)} que dejan tus demás productos.`,
      accion: "precio",
    });
  }

  // ── Lo que caduca pronto y no tiene descuento ──
  const porCaducar = productos
    .filter((p) => p.expirationDate && new Date(p.expirationDate) >= ahora && new Date(p.expirationDate) <= caducaHasta)
    .filter((p) => (Number(p.stock) || 0) > 0 && !enPromo.has(String(p._id)))
    .sort((a, b) => new Date(a.expirationDate) - new Date(b.expirationDate))
    .slice(0, 3);
  for (const p of porCaducar) {
    const stock = Number(p.stock) || 0;
    const tope = conCosto(p) ? Math.floor((1 - Number(p.priceCost) / Number(p.salePrice)) * 100) : null;
    consejos.push({
      prioridad: 2,
      impacto: (Number(p.priceCost) || Number(p.salePrice) || 0) * stock,
      texto:
        `${p.name} caduca el ${fechaCorta(p.expirationDate)} y quedan ${stock}. Ponle un descuento antes de que se pierda` +
        (tope != null && tope >= 5 ? `: hasta ${tope}% todavía cubres lo que costó.` : "."),
      accion: "",
    });
  }

  // ── Existencias paradas: sin ventas en 30 días ──
  const vendidos = new Set(vendidos30.map(String));
  const parados = productos
    .filter((p) => (Number(p.stock) || 0) >= 5 && !vendidos.has(String(p._id)) && !enPromo.has(String(p._id)))
    .filter((p) => !p.createdAt || new Date(p.createdAt) < hace30)
    .map((p) => ({ p, invertido: (Number(p.priceCost) || 0) * (Number(p.stock) || 0) }))
    .sort((a, b) => b.invertido - a.invertido)
    .slice(0, 3);
  for (const { p, invertido } of parados) {
    const descuento = conCosto(p)
      ? Math.min(30, Math.floor((1 - Number(p.priceCost) / (Number(p.salePrice) * (1 - MARGEN_PROMO))) * 100))
      : null;
    consejos.push({
      prioridad: 1,
      impacto: invertido,
      texto:
        `${p.name}: tienes ${Number(p.stock)} sin vender en 30 días${invertido ? ` (${plata(invertido)} invertidos)` : ""}. ` +
        (descuento != null && descuento >= 5
          ? `Una promoción de ${descuento}% lo movería y seguiría dejando 10% de ganancia.`
          : "No aguanta mucho descuento: prueba ponerlo al frente con un anuncio."),
      accion: "",
    });
  }

  consejos.sort((a, b) => b.prioridad - a.prioridad || b.impacto - a.impacto);
  return { consejos: consejos.slice(0, 6), resumenPromos, margenTipico };
};

// El consejo que Tiqui dice al abrirla, si hay algo que de verdad lo amerite (una pérdida o algo
// que caduca): no se le salta encima a nadie por una existencia parada. Se guarda un minuto para
// no rehacer las cuentas en cada apertura.
let principal = { en: 0, texto: "" };
export const consejoPrincipal = async () => {
  if (Date.now() - principal.en < 60 * 1000) return principal.texto;
  const { consejos } = await analizarVentas();
  const top = consejos.find((c) => c.prioridad >= 2);
  const pregunta = top?.accion === "ajustar_promocion" ? " ¿La ajusto?" : top?.accion === "precio" ? " ¿Le cambio el precio?" : "";
  principal = { en: Date.now(), texto: top ? `Tengo un consejo de ventas: ${top.texto}${pregunta}` : "" };
  return principal.texto;
};

// Después de un cambio, las cuentas se rehacen (ver olvidarPanorama).
export const olvidarConsejos = () => {
  principal = { en: 0, texto: "" };
};

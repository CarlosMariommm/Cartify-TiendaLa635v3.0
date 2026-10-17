import jsonwebtoken from "jsonwebtoken";
import { config } from "../../config.js";
import orderModel from "../models/order.js";
import productModel from "../models/product.js";
import promotionModel from "../models/promotion.js";
import storeSettingsModel, { CLAVE_UNICA } from "../models/storeSettings.js";
import { cambiarEstadoDePedido } from "./estadoPedido.js";
import { codigoCoincide } from "./codigoEntrega.js";
import { avisarPromoNuevaEnSegundoPlano } from "./avisoPromo.js";
import { codigoDePedido, olvidarPanorama, temporadasDisponibles } from "./panoramaNegocio.js";
import { describirOferta, nombreDePromo, precioEnPromo } from "./consejosVentas.js";

// LO QUE TIQUI DEL PANEL PUEDE CAMBIAR — cambiosTiqui.js
// Nunca cambia nada por su cuenta: primero propone el cambio (firmado, dura 5 minutos) y solo lo
// aplica si la persona confirma.

export const CAMBIOS_ADMIN = [
  "estado_pedido", "existencias", "precio", "mostrar_producto", "ocultar_producto",
  "activar_promocion", "desactivar_promocion", "precio_promocion", "temporada",
];
export const CAMBIOS_EMPLEADO = ["estado_pedido"];

export const ESTADOS_DESTINO = ["preparando", "en_camino", "listo", "entregado", "cancelado"];

const NOMBRE_ESTADO = {
  pagado: "por preparar", preparando: "en preparación", en_camino: "en camino",
  listo: "listo para recoger", entregado: "entregado", cancelado: "cancelado",
};

const plata = (n) => `$${(Number(n) || 0).toFixed(2)}`;
const escaparRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const aPlano = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

// El pedido por su número (#A1B2C3, los últimos 6 del id). Si hay más de uno
// que calce, no se adivina: se pide el número completo.
const buscarPedido = async (numero) => {
  const limpio = String(numero || "").replace(/[^a-f0-9]/gi, "").slice(-6);
  if (limpio.length < 4) return { error: "¿Qué pedido? Dime su número, el que empieza con numeral en la tarjeta." };
  const encontrados = await orderModel
    .find({ $expr: { $regexMatch: { input: { $toString: "$_id" }, regex: `${limpio}$`, options: "i" } } })
    .select("+deliveryCode")
    .populate("clientId", "fullName")
    .limit(2);
  if (!encontrados.length) return { error: `No encuentro el pedido #${limpio.toUpperCase()}. ¿Me repites el número?` };
  if (encontrados.length > 1) return { error: `Hay más de un pedido que termina en ${limpio.toUpperCase()}. Dime el número completo.` };
  return { pedido: encontrados[0] };
};

// El producto por su nombre EXACTO (sin distinguir mayúsculas ni tildes).
const buscarProducto = async (nombre) => {
  const texto = String(nombre || "").trim();
  if (!texto) return { error: "¿De qué producto? Dime su nombre como está en el inventario." };
  const candidatos = await productModel
    .find({ name: { $regex: escaparRegex(texto.split(/\s+/)[0]), $options: "i" } }, "name stock maxQuantity salePrice priceCost unidadVenta isActive")
    .limit(50);
  const producto = candidatos.find((p) => aPlano(p.name) === aPlano(texto));
  if (!producto) return { error: `No encuentro "${texto}" en el inventario. Dime el nombre exacto.` };
  return { producto };
};

const buscarPromo = async (titulo) => {
  const texto = aPlano(titulo);
  if (!texto) return { error: "¿Cuál promoción? Dime su nombre." };
  const promos = await promotionModel.find({}, "title etiqueta isActive endsAt avisoEnviadoEn");
  const promo = promos.find((p) => aPlano(p.title) === texto || aPlano(p.etiqueta) === texto);
  if (!promo) return { error: `No encuentro la promoción "${titulo}". Dime su nombre como está en Promociones.` };
  return { promo };
};

const nombreCliente = (pedido) => String(pedido.clientId?.fullName || "").trim().split(/\s+/)[0] || "";

// ── Ajustar el precio de una promoción ── Lo que Tiqui sugiere como ayudante de ventas ("con 20%
// todavía deja 10%") se puede hacer aquí, dentro del MISMO tipo de promo: el descuento de un
// descuento, el precio de un precio fijo o el NxM de un NxM.
const promoParaAjustar = async (titulo) => {
  const { promo, error } = await buscarPromo(titulo);
  if (error) return { error };
  const completa = await promotionModel.findById(promo._id)
    .populate("items.productId", "name salePrice priceCost unidadVenta");
  return { promo: completa };
};

const itemsElegidos = (promo, nombreProducto) => {
  const items = (promo.items || []).filter((i) => i.productId?._id);
  if (!nombreProducto) return { items };
  const buscado = aPlano(nombreProducto);
  const elegidos = items.filter((i) => aPlano(i.productId.name) === buscado);
  if (!elegidos.length) return { error: `${nombreProducto} no está en la promoción ${nombreDePromo(promo)}.` };
  return { items: elegidos };
};

// Cómo queda cada producto con el valor nuevo: a cuánto sale y cuánto deja.
const comoQueda = (promo, items, nuevo) => {
  const simulada = { ...promo.toObject(), ...(nuevo.lleva ? { buyQty: nuevo.lleva, payQty: nuevo.paga } : {}) };
  const filas = items.map((i) => {
    const item = { ...i.toObject(), ...(nuevo.descuento != null ? { discount: nuevo.descuento } : {}), ...(nuevo.precio != null ? { fixedPrice: nuevo.precio } : {}) };
    const efectivo = precioEnPromo(simulada, item, i.productId);
    const costo = Number(i.productId.priceCost) || 0;
    return { nombre: i.productId.name, efectivo, costo, ganancia: efectivo - costo };
  });
  if (filas.length === 1) {
    const f = filas[0];
    return ` ${f.nombre} quedaría a ${plata(f.efectivo)}` +
      (f.costo ? (f.ganancia >= 0 ? ` y deja ${plata(f.ganancia)} por unidad.` : `, todavía ${plata(-f.ganancia)} por debajo de lo que cuesta.`) : ".");
  }
  const cortos = filas.filter((f) => f.costo && f.ganancia < 0);
  return cortos.length
    ? ` Ojo: ${cortos.map((f) => f.nombre).slice(0, 2).join(" y ")} seguiría${cortos.length === 1 ? "" : "n"} por debajo del costo.`
    : " Con eso ninguno queda por debajo de lo que cuesta.";
};

// Revisa que el cambio tenga sentido con lo que hay AHORA y lo describe. Devuelve { ok: true,
// cambio, resumen } o { ok: false, mensaje }. `cambio` es lo mínimo para aplicarlo después (ids,
// no nombres).
export const proponerCambio = async (args, { esAdmin }) => {
  const tipo = args.cambio;
  const permitidos = esAdmin ? CAMBIOS_ADMIN : CAMBIOS_EMPLEADO;
  if (!permitidos.includes(tipo)) {
    return { ok: false, mensaje: "Eso solo lo puede cambiar el administrador." };
  }

  switch (tipo) {
    case "estado_pedido": {
      const { pedido, error } = await buscarPedido(args.pedido);
      if (error) return { ok: false, mensaje: error };
      const estado = args.estado_nuevo;
      const numero = `#${codigoDePedido(pedido._id)}`;
      const de = nombreCliente(pedido) ? ` de ${nombreCliente(pedido)}` : "";

      if (!ESTADOS_DESTINO.includes(estado)) return { ok: false, mensaje: `¿A qué estado paso el pedido ${numero}?` };
      if (pedido.status === estado) return { ok: false, mensaje: `El pedido ${numero} ya está ${NOMBRE_ESTADO[estado]}.` };
      if (["entregado", "cancelado"].includes(pedido.status)) {
        return { ok: false, mensaje: `El pedido ${numero} ya está ${NOMBRE_ESTADO[pedido.status]}. Si hay que corregirlo, hazlo en Pedidos.` };
      }
      // Los mismos caminos que la pantalla de Pedidos (ver utils/pasosPedido.js del frontend).
      if (estado === "en_camino" && pedido.deliveryType !== "delivery") {
        return { ok: false, mensaje: `El pedido ${numero} es para recoger en la tienda: no sale en camino. Puede pasar a listo para recoger.` };
      }
      if (estado === "listo" && pedido.deliveryType === "delivery") {
        return { ok: false, mensaje: `El pedido ${numero} es a domicilio: no se marca listo para recoger. Puede pasar a en camino.` };
      }
      if (estado === "entregado" && pedido.deliveryCode) {
        const codigo = String(args.codigo_entrega || "").replace(/\D/g, "");
        if (!codigo) {
          return { ok: false, mensaje: `Para entregar el pedido ${numero} necesito los 4 dígitos que${de ? ` ${nombreCliente(pedido)}` : " el cliente"} ve en su pedido.` };
        }
        if (!codigoCoincide(pedido.deliveryCode, codigo)) {
          return { ok: false, mensaje: `Ese código no coincide con el del pedido ${numero}. Pídele otra vez los 4 dígitos.` };
        }
        return {
          ok: true,
          cambio: { tipo, pedidoId: String(pedido._id), estado, codigo },
          resumen: `Marco el pedido ${numero}${de} como entregado, con el código correcto.`,
        };
      }
      // Cancelar pide el porqué, igual que el botón de Pedidos: al cliente le llega en la notificación y
      // en el correo. Si no lo dijeron, se pregunta; inventarlo sería peor que no decir nada.
      if (estado === "cancelado") {
        const motivo = String(args.motivo || "").trim().replace(/\s+/g, " ");
        if (motivo.length < 4) {
          return { ok: false, mensaje: `¿Por qué cancelo el pedido ${numero}? Al cliente le llega el motivo.` };
        }
        return {
          ok: true,
          cambio: { tipo, pedidoId: String(pedido._id), estado, motivo: motivo.slice(0, 300) },
          resumen: `Cancelo el pedido ${numero}${de}. Le aviso el motivo, «${motivo.slice(0, 120)}», y se le devuelve lo que pagó.`,
        };
      }
      return {
        ok: true,
        cambio: { tipo, pedidoId: String(pedido._id), estado },
        resumen: `Paso el pedido ${numero}${de} de ${NOMBRE_ESTADO[pedido.status]} a ${NOMBRE_ESTADO[estado]}.`,
      };
    }

    case "existencias": {
      const { producto, error } = await buscarProducto(args.producto);
      if (error) return { ok: false, mensaje: error };
      const modo = ["fijar", "sumar", "restar"].includes(args.modo) ? args.modo : "fijar";
      const cantidad = Number(args.cantidad);
      if (!(cantidad >= 0) || cantidad > 100000) return { ok: false, mensaje: `¿Cuántas unidades de ${producto.name}?` };
      const libra = producto.unidadVenta === "libra";
      const cant = libra ? Math.round(cantidad * 100) / 100 : Math.round(cantidad);
      const unidad = libra ? "libras" : "unidades";
      const ahora = Number(producto.stock) || 0;
      const queda = modo === "fijar" ? cant : Math.max(0, modo === "sumar" ? ahora + cant : ahora - cant);
      const accion = modo === "fijar" ? `Dejo ${producto.name} en ${cant} ${unidad}`
        : modo === "sumar" ? `Sumo ${cant} ${unidad} a ${producto.name}` : `Resto ${cant} ${unidad} a ${producto.name}`;
      return {
        ok: true,
        cambio: { tipo, productoId: String(producto._id), modo, cantidad: cant },
        resumen: `${accion}: tiene ${ahora} y quedaría en ${Math.round(queda * 100) / 100}.`,
      };
    }

    case "precio": {
      const { producto, error } = await buscarProducto(args.producto);
      if (error) return { ok: false, mensaje: error };
      const precio = Math.round(Number(args.precio) * 100) / 100;
      if (!(precio > 0) || precio > 100000) return { ok: false, mensaje: `¿A qué precio dejo ${producto.name}?` };
      const costo = Number(producto.priceCost) || 0;
      const libra = producto.unidadVenta === "libra" ? " la libra" : "";
      return {
        ok: true,
        cambio: { tipo, productoId: String(producto._id), precio },
        resumen: `Cambio el precio de ${producto.name} de ${plata(producto.salePrice)} a ${plata(precio)}${libra}.` +
          (costo && precio < costo ? ` Ojo: queda por debajo de lo que cuesta, ${plata(costo)}.` : ""),
      };
    }

    case "mostrar_producto":
    case "ocultar_producto": {
      const { producto, error } = await buscarProducto(args.producto);
      if (error) return { ok: false, mensaje: error };
      const activo = tipo === "mostrar_producto";
      if ((producto.isActive !== false) === activo) {
        return { ok: false, mensaje: `${producto.name} ya está ${activo ? "a la vista en la tienda" : "oculto"}.` };
      }
      return {
        ok: true,
        cambio: { tipo, productoId: String(producto._id), activo },
        resumen: activo
          ? `Vuelvo a poner ${producto.name} a la vista en la tienda.`
          : `Oculto ${producto.name} de la tienda. No se borra: vuelve cuando me lo pidas.`,
      };
    }

    case "activar_promocion":
    case "desactivar_promocion": {
      const { promo, error } = await buscarPromo(args.promocion);
      if (error) return { ok: false, mensaje: error };
      const activa = tipo === "activar_promocion";
      const nombre = promo.title || promo.etiqueta;
      if (activa && promo.endsAt && new Date(promo.endsAt) <= new Date()) {
        return { ok: false, mensaje: `${nombre} ya venció. Para volver a usarla, cámbiale la fecha en Promociones.` };
      }
      if ((promo.isActive !== false) === activa) {
        return { ok: false, mensaje: `${nombre} ya está ${activa ? "encendida" : "apagada"}.` };
      }
      return {
        ok: true,
        cambio: { tipo, promoId: String(promo._id), activa },
        resumen: activa ? `Enciendo la promoción ${nombre} en la tienda.` : `Apago la promoción ${nombre}: deja de salir en la tienda.`,
      };
    }

    case "precio_promocion": {
      const { promo, error } = await promoParaAjustar(args.promocion);
      if (error) return { ok: false, mensaje: error };
      const nombre = nombreDePromo(promo);
      if (!["descuento", "precio_fijo", "nxm"].includes(promo.type)) {
        return { ok: false, mensaje: `${nombre} es un anuncio: no tiene precio que cambiar.` };
      }
      const elegidos = itemsElegidos(promo, args.producto);
      if (elegidos.error) return { ok: false, mensaje: elegidos.error };
      const { items } = elegidos;
      if (!items.length) return { ok: false, mensaje: `${nombre} no tiene productos. Agrégaselos en Promociones.` };
      const productoIds = args.producto ? items.map((i) => String(i.productId._id)) : null;
      const para = args.producto ? ` para ${items[0].productId.name}` : "";

      if (promo.type === "descuento") {
        const descuento = Math.round(Number(args.descuento));
        if (!(descuento >= 1 && descuento <= 95)) {
          return { ok: false, mensaje: `${nombre} es un descuento: dime de cuánto por ciento lo dejo.` };
        }
        const antes = describirOferta(promo, items[0]).replace(" de descuento", "");
        return {
          ok: true,
          cambio: { tipo, promoId: String(promo._id), productoIds, descuento },
          resumen: `Cambio el descuento de ${nombre}${para} de ${antes} a ${descuento}%.` + comoQueda(promo, items, { descuento }),
        };
      }
      if (promo.type === "precio_fijo") {
        const precio = Math.round(Number(args.precio) * 100) / 100;
        if (!(precio > 0) || precio > 100000) {
          return { ok: false, mensaje: `${nombre} es de precio fijo: dime a cuánto la dejo.` };
        }
        return {
          ok: true,
          cambio: { tipo, promoId: String(promo._id), productoIds, precio },
          resumen: `Cambio el precio de ${nombre}${para} de ${plata(items[0].fixedPrice)} a ${plata(precio)}.` + comoQueda(promo, items, { precio }),
        };
      }
      // NxM: lleva N, paga M. Se cambia para toda la promo (es un solo sello).
      const lleva = Math.round(Number(args.lleva));
      const paga = Math.round(Number(args.paga));
      if (!(lleva >= 2 && lleva <= 10 && paga >= 1 && paga < lleva)) {
        return { ok: false, mensaje: `${nombre} es un ${describirOferta(promo)}: dime cuántos lleva y cuántos paga, por ejemplo 3x2.` };
      }
      if (lleva === Number(promo.buyQty) && paga === Number(promo.payQty)) {
        return { ok: false, mensaje: `${nombre} ya es un ${lleva}x${paga}.` };
      }
      return {
        ok: true,
        cambio: { tipo, promoId: String(promo._id), productoIds: null, lleva, paga },
        resumen: `Cambio ${nombre} de ${describirOferta(promo)} a ${lleva}x${paga}.` + comoQueda(promo, items, { lleva, paga }),
      };
    }

    case "temporada": {
      const ajustes = await storeSettingsModel.findOne({ clave: CLAVE_UNICA }, "temporada").lean();
      const lista = temporadasDisponibles(ajustes?.temporada);
      const pedida = aPlano(args.temporada);
      if (["automatica", "automatico"].includes(pedida)) {
        return { ok: true, cambio: { tipo, modo: "automatico", tema: "" }, resumen: "Dejo la temporada en automática: la tienda se pinta sola según la fecha." };
      }
      if (["ninguna", "ninguno"].includes(pedida)) {
        return { ok: true, cambio: { tipo, modo: "ninguno", tema: "" }, resumen: "Quito la temporada: la tienda queda con sus colores de siempre." };
      }
      const tema = lista.find((t) => aPlano(t.clave) === pedida || aPlano(t.nombre) === pedida);
      if (!tema) {
        return { ok: false, mensaje: `Esa temporada no la tengo. Puedo poner ${lista.map((t) => t.nombre).join(", ")}, la automática o ninguna.` };
      }
      return { ok: true, cambio: { tipo, modo: "manual", tema: tema.clave }, resumen: `Pongo la temporada de ${tema.nombre} en la tienda, sin importar la fecha.` };
    }

    default:
      return { ok: false, mensaje: "Eso todavía no lo puedo cambiar yo. Te abro la pantalla donde se hace." };
  }
};

// La propuesta firmada: lo que se va a aplicar, quién lo pidió y hasta cuándo vale. El navegador
// (o la app) solo la guarda y la devuelve si la persona dice que sí; no puede cambiarle nada sin
// romper la firma.
const PROPOSITO = "tiqui-panel-cambio";

export const firmarPropuesta = (cambio, usuario) =>
  jsonwebtoken.sign({ proposito: PROPOSITO, usuario: String(usuario.id), cambio }, config.JWT.secret, { expiresIn: "5m" });

export const leerPropuesta = (token, usuario) => {
  try {
    const datos = jsonwebtoken.verify(String(token || ""), config.JWT.secret);
    if (datos.proposito !== PROPOSITO || datos.usuario !== String(usuario.id)) return null;
    return datos.cambio;
  } catch {
    return null;
  }
};

// Aplica un cambio ya confirmado. Se vuelve a validar desde cero con proponerCambio (el pedido
// pudo moverse, la promo pudo apagarse) y se aplica con la misma lógica que las pantallas.
// Devuelve { ok, mensaje }.
export const aplicarCambio = async (cambio, { esAdmin, nombre }) => {
  const permitidos = esAdmin ? CAMBIOS_ADMIN : CAMBIOS_EMPLEADO;
  if (!cambio || !permitidos.includes(cambio.tipo)) {
    return { ok: false, mensaje: "Eso solo lo puede cambiar el administrador." };
  }

  let mensaje = "";
  switch (cambio.tipo) {
    case "estado_pedido": {
      const pedido = await orderModel.findById(cambio.pedidoId).select("+deliveryCode").populate("clientId", "fullName");
      if (!pedido) return { ok: false, mensaje: "Ese pedido ya no existe." };
      // Revalidar con lo de ahora: en estos segundos otro pudo moverlo.
      const revision = await proponerCambio(
        {
          cambio: "estado_pedido", pedido: codigoDePedido(pedido._id), estado_nuevo: cambio.estado,
          codigo_entrega: cambio.codigo, motivo: cambio.motivo,
        },
        { esAdmin }
      );
      if (!revision.ok) return { ok: false, mensaje: revision.mensaje };
      const r = await cambiarEstadoDePedido({
        id: cambio.pedidoId,
        status: cambio.estado,
        // Queda escrito quién lo movió, y que fue por Tiqui.
        quien: `${nombre || "Personal"} (con Tiqui)`,
        codigoEntrega: cambio.codigo,
        motivoCancelacion: cambio.motivo,
      });
      if (!r.ok) return { ok: false, mensaje: r.message };
      mensaje = `Listo, el pedido #${codigoDePedido(pedido._id)} quedó ${NOMBRE_ESTADO[cambio.estado]}.`;
      break;
    }

    case "existencias": {
      const producto = await productModel.findById(cambio.productoId);
      if (!producto) return { ok: false, mensaje: "Ese producto ya no existe." };
      const ahora = Number(producto.stock) || 0;
      const libra = producto.unidadVenta === "libra";
      const bruto = cambio.modo === "fijar" ? cambio.cantidad
        : cambio.modo === "sumar" ? ahora + cambio.cantidad : ahora - cambio.cantidad;
      const stock = Math.max(0, libra ? Math.round(bruto * 100) / 100 : Math.round(bruto));
      // Igual que al editarlo en Inventario: el máximo nunca queda por debajo de lo que hay.
      const maxQuantity = Math.max(stock, Number(producto.maxQuantity) || 0);
      await productModel.updateOne({ _id: producto._id }, { $set: { stock, maxQuantity } });
      mensaje = `Listo, ${producto.name} quedó en ${stock} ${libra ? "libras" : "unidades"}.`;
      break;
    }

    case "precio": {
      const producto = await productModel.findById(cambio.productoId);
      if (!producto) return { ok: false, mensaje: "Ese producto ya no existe." };
      await productModel.updateOne({ _id: producto._id }, { $set: { salePrice: cambio.precio } });
      mensaje = `Listo, ${producto.name} ahora cuesta ${plata(cambio.precio)}.`;
      break;
    }

    case "mostrar_producto":
    case "ocultar_producto": {
      const producto = await productModel.findById(cambio.productoId);
      if (!producto) return { ok: false, mensaje: "Ese producto ya no existe." };
      await productModel.updateOne({ _id: producto._id }, { $set: { isActive: cambio.activo } });
      mensaje = cambio.activo ? `Listo, ${producto.name} ya sale en la tienda.` : `Listo, ${producto.name} ya no sale en la tienda.`;
      break;
    }

    case "activar_promocion":
    case "desactivar_promocion": {
      const promo = await promotionModel.findById(cambio.promoId);
      if (!promo) return { ok: false, mensaje: "Esa promoción ya no existe." };
      if (cambio.activa && promo.endsAt && new Date(promo.endsAt) <= new Date()) {
        return { ok: false, mensaje: "Esa promoción ya venció. Cámbiale la fecha en Promociones." };
      }
      await promotionModel.updateOne({ _id: promo._id }, { $set: { isActive: cambio.activa } });
      // La promo que se enciende por primera vez se anuncia, igual que al encenderla desde la pantalla
      // de Promociones (promotionController): el propio aviso revisa que no se haya mandado antes.
      if (cambio.activa && !promo.avisoEnviadoEn) avisarPromoNuevaEnSegundoPlano(String(promo._id));
      mensaje = `Listo, la promoción ${promo.title || promo.etiqueta} quedó ${cambio.activa ? "encendida" : "apagada"}.`;
      break;
    }

    case "precio_promocion": {
      const promo = await promotionModel.findById(cambio.promoId);
      if (!promo) return { ok: false, mensaje: "Esa promoción ya no existe." };
      const nombre = nombreDePromo(promo);
      const toca = (item) => !cambio.productoIds || cambio.productoIds.includes(String(item.productId));
      const textos = ["title", "promoDescription"];
      // El título y la descripción los escribió el dueño y a veces traen el número ("2x1 en Coca", "-40%
      // en lácteos"). Si quedaran con el viejo, la tarjeta diría una cosa y cobraría otra: se cambia el
      // número ahí también, solo cuando el cambio es para toda la promo.
      const reemplazar = (de, a) => {
        if (cambio.productoIds) return;
        for (const campo of textos) {
          if (typeof promo[campo] === "string" && promo[campo].includes(de)) promo[campo] = promo[campo].split(de).join(a);
        }
      };

      if (cambio.descuento != null) {
        if (promo.type !== "descuento") return { ok: false, mensaje: `${nombre} ya no es un descuento. Revísala en Promociones.` };
        const anteriores = new Set(promo.items.filter(toca).map((i) => Number(i.discount) || 0));
        promo.items.forEach((i) => { if (toca(i)) i.discount = cambio.descuento; });
        if (anteriores.size === 1) reemplazar(`${[...anteriores][0]}%`, `${cambio.descuento}%`);
        mensaje = `Listo, ${nombre} quedó con ${cambio.descuento}% de descuento.`;
      } else if (cambio.precio != null) {
        if (promo.type !== "precio_fijo") return { ok: false, mensaje: `${nombre} ya no es de precio fijo. Revísala en Promociones.` };
        const anteriores = new Set(promo.items.filter(toca).map((i) => Number(i.fixedPrice) || 0));
        promo.items.forEach((i) => { if (toca(i)) i.fixedPrice = cambio.precio; });
        if (anteriores.size === 1) reemplazar(plata([...anteriores][0]), plata(cambio.precio));
        mensaje = `Listo, ${nombre} quedó a ${plata(cambio.precio)}.`;
      } else {
        if (promo.type !== "nxm") return { ok: false, mensaje: `${nombre} ya no es un NxM. Revísala en Promociones.` };
        const antes = `${Number(promo.buyQty) || 2}x${Number(promo.payQty) || 1}`;
        promo.buyQty = cambio.lleva;
        promo.payQty = cambio.paga;
        reemplazar(antes, `${cambio.lleva}x${cambio.paga}`);
        reemplazar(antes.replace("x", "X"), `${cambio.lleva}X${cambio.paga}`);
        mensaje = `Listo, ${nombre} ahora es un ${cambio.lleva}x${cambio.paga}.`;
      }
      promo.markModified("items");
      await promo.save();
      break;
    }

    case "temporada": {
      // Por ruta ("temporada.modo"), como en storeSettingsController: un $set del
      // subdocumento entero borraría los saludos y las temporadas propias.
      await storeSettingsModel.updateOne(
        { clave: CLAVE_UNICA },
        { $set: { "temporada.modo": cambio.modo, "temporada.tema": cambio.tema } }
      );
      mensaje = cambio.modo === "automatico" ? "Listo, la temporada quedó en automática."
        : cambio.modo === "ninguno" ? "Listo, la tienda quedó con sus colores de siempre."
        : "Listo, ya cambié la temporada de la tienda.";
      break;
    }

    default:
      return { ok: false, mensaje: "Eso todavía no lo puedo cambiar yo." };
  }

  olvidarPanorama();
  return { ok: true, mensaje };
};

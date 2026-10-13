/*
 * ============================================================
 * LOS AVISOS QUE FALTABAN — avisosCliente.js
 * ============================================================
 * Enciende los dos interruptores que la pantalla de Notificaciones ofrecía y
 * que no hacían nada: "Productos nuevos" y "Mi pedido va en camino". Se
 * guardaban en la cuenta y nadie los leía jamás, así que el cliente los
 * activaba y no le llegaba un solo correo.
 *
 * El de promociones vive aparte (avisoPromo.js) porque tiene su propia regla
 * de "una vez por promo" y su plantilla con precios de oferta.
 *
 * POR QUÉ EL CORREO SE ARMA POR PERSONA Y NO UNA VEZ PARA TODOS
 * Porque el enlace de "dejar de recibirlos" lleva un token firmado con el id
 * de quien lo recibe. Un enlace común para toda la lista daría de baja siempre
 * a la misma persona — o, peor, a quien tocara reenviar el correo. Ver
 * utils/tokenBaja.js.
 *
 * TODOS DISPARAN EN SEGUNDO PLANO: escribirle a la lista tarda, y quien acaba
 * de guardar un producto —o de marcar un pedido como "en camino"— no tiene por
 * qué mirar una rueda girando. Si el correo falla, la acción YA se guardó;
 * devolver un error sería mentir.
 * ============================================================
 */

import clientModel from "../models/client.js";
import storeSettingsModel, { CLAVE_UNICA } from "../models/storeSettings.js";
import { sendEmail } from "./sendMailMailjet.js";
import { plantillaProductosNuevos, plantillaPedidoEnCamino, plantillaPedidoCancelado } from "./plantillasAviso.js";
import { dispositivosDe, enviarPushEnSegundoPlano } from "./pushExpo.js";
import { AVISO_DEL_ESTADO, quiereEnLaApp } from "./preferenciasAvisos.js";
import { enlaceDeBaja, enlaceDeBajaUnClic } from "./tokenBaja.js";

/*
 * La identidad de la tienda para el encabezado del correo: su nombre en dos
 * renglones y su logo si el dueño cargó uno en Personalización.
 */
export const identidadDeLaTienda = async () => {
  const a = await storeSettingsModel.findOne({ clave: CLAVE_UNICA }).lean();
  const l1 = a?.nombreLinea1 || "Tienda";
  const l2 = a?.nombreLinea2 || "";
  return {
    nombre: `${l1} ${l2}`.trim(),
    nombreLinea1: l1,
    nombreLinea2: l2,
    logoUrl: a?.logoUrl || "",
  };
};

/*
 * Los clientes que pidieron ESTE aviso. Devuelve id y correo: el id hace falta
 * para firmarle su enlace de baja.
 *
 * El $ne: false y no un true a secas: los clientes de antes de que existieran
 * las preferencias no tienen el campo, y con `: true` habrían quedado fuera
 * todos ellos. Ver avisoPromo.js, que usa la misma regla.
 */
const destinatariosDe = async (preferencia) => {
  const clientes = await clientModel
    .find({
      [`notificationPrefs.${preferencia}`]: { $ne: false },
      isActive: { $ne: false },
      isVerified: true,
      email: { $exists: true, $nin: [null, ""] },
    })
    .select("email")
    .lean();

  // Sin repetidos: el mismo correo dos veces es la queja número uno de
  // cualquier lista. Ver las cuentas duplicadas que hay en la base.
  const vistos = new Set();
  return clientes.filter((c) => {
    const correo = (c.email || "").trim().toLowerCase();
    if (!correo || vistos.has(correo)) return false;
    vistos.add(correo);
    return true;
  });
};

/*
 * De uno en uno, no todos de golpe: un Promise.all sobre trescientos correos
 * le dispara trescientas peticiones simultáneas a Mailjet, que responde 429 y
 * tira a la basura media lista. Y un correo por destinatario, nunca todos en
 * el mismo "Para": la lista de clientes de la tienda no se le reparte a los
 * clientes.
 *
 * `armar` recibe al cliente y devuelve { asunto, html, texto }: así cada quien
 * recibe su propio enlace de baja.
 */
/*
 * `headersDe`, si se pasa, arma el List-Unsubscribe de cada correo — igual
 * que hace avisoPromo.js. Es opcional porque no todos los avisos tienen un
 * enlace de baja propio todavía (el de "pedido en camino" no lo pide).
 */
const enviarEnFila = async (clientes, armar, etiqueta, headersDe) => {
  let enviados = 0;
  let fallidos = 0;

  for (const cliente of clientes) {
    try {
      const { asunto, html, texto } = armar(cliente);
      const headers = headersDe ? headersDe(cliente) : undefined;
      await sendEmail(cliente.email, asunto, html, texto, undefined, headers);
      enviados++;
    } catch (error) {
      // Un correo rebotado no puede frenar a los otros doscientos.
      fallidos++;
      console.log(`${etiqueta}: no se pudo enviar a ${cliente.email}: ${error.message}`);
    }
  }

  console.log(`${etiqueta}: ${enviados} enviados, ${fallidos} fallidos`);
  return { enviados, fallidos };
};

/* ══════════ 1. Productos nuevos ══════════ */

/*
 * EN LOTE, Y POR ESO ESPERA.
 *
 * Quien carga el inventario un lunes sube treinta productos de corrido. Con un
 * correo por producto, cada cliente recibiría treinta correos seguidos de la
 * misma tienda — que es la receta exacta para acabar en spam el mismo día.
 *
 * Así que los productos se van juntando y el aviso sale cuando pasan unos
 * minutos sin que se cargue nada más. La lista vive en memoria a propósito: si
 * el servidor se reinicia justo ahí, lo peor que pasa es que un aviso no sale.
 * Guardarlo en la base para no perderlo sería montar una cola de trabajos para
 * avisar de unas papas nuevas.
 */
const ESPERA_LOTE_MS = 5 * 60 * 1000;
let loteProductos = [];
let relojLote = null;

const soltarLoteDeProductos = async () => {
  const productos = loteProductos;
  loteProductos = [];
  relojLote = null;

  if (!productos.length) return { enviados: 0, fallidos: 0 };

  const tienda = await identidadDeLaTienda();

  /*
   * El mismo aviso, empujado a los teléfonos. Va ANTES del corte de abajo a
   * propósito: quien tiene la app instalada y ningún correo verificado sigue
   * siendo alguien a quien avisarle. Cada canal con su interruptor: el del
   * teléfono es `avisosApp.nuevosProductos` (ver dispositivosDe).
   */
  const nombres = productos.map((p) => p.nombre).filter(Boolean);
  enviarPushEnSegundoPlano(await dispositivosDe("nuevosProductos"), {
    titulo: nombres.length > 1 ? `${nombres.length} productos nuevos` : "Llegó algo nuevo",
    // Tres nombres y "y N más": en la barra de notificaciones no entra más.
    cuerpo: nombres.slice(0, 3).join(", ") + (nombres.length > 3 ? ` y ${nombres.length - 3} más` : ""),
    datos: { tipo: "productosNuevos" },
  });

  const clientes = await destinatariosDe("nuevosProductos");
  if (!clientes.length) {
    console.log("aviso de productos nuevos: nadie lo tiene encendido por correo");
    return { enviados: 0, fallidos: 0 };
  }

  return enviarEnFila(
    clientes,
    (cliente) => plantillaProductosNuevos({
      productos,
      tienda,
      enlaceBaja: enlaceDeBaja(cliente._id, "nuevosProductos"),
    }),
    "aviso de productos nuevos",
    (cliente) => ({
      "List-Unsubscribe": `<${enlaceDeBajaUnClic(cliente._id, "nuevosProductos")}>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    })
  );
};

/*
 * Lo llama el controlador al guardar un producto. No manda nada todavía: lo
 * apunta en el lote y reinicia el reloj.
 */
export const anotarProductoNuevo = (producto) => {
  if (!producto?.nombre) return;
  loteProductos.push(producto);

  // Cada producto nuevo estira la espera: se avisa cuando la persona TERMINÓ
  // de cargar, no a los cinco minutos del primero.
  if (relojLote) clearTimeout(relojLote);
  relojLote = setTimeout(() => {
    soltarLoteDeProductos().catch((error) => {
      console.log("aviso de productos nuevos: falló el envío completo: " + error);
    });
  }, ESPERA_LOTE_MS);

  /*
   * Sin esto, un servidor que no tiene nada más que hacer se queda despierto
   * cinco minutos esperando este reloj. Con unref() el proceso puede cerrarse
   * igual; el aviso se pierde, que es exactamente lo que ya asumimos arriba.
   */
  relojLote.unref?.();
};

/* ══════════ 2. Los avisos del pedido ══════════ */

/*
 * Lo que le dice el teléfono a la dueña del pedido en cada paso. Son avisos
 * DE SERVICIO, no de publicidad: nacen encendidos, y cada paso se puede
 * apagar aparte en Mi cuenta › Notificaciones (`avisosApp`: preparando;
 * en camino o listo; entregado; cancelado). Antes solo existía "va en
 * camino" y nacía apagado: casi nadie se enteraba de nada.
 *
 * Cada paso, una vez: el controlador solo llama en el SALTO de un estado a
 * otro. Los textos se repiten en movil/src/utils/simulacionPedido.js (el
 * simulador de la app): si se cambian aquí, se cambian allá.
 *
 * Retiro en la tienda: "entregado" no se avisa, porque se entrega en el
 * mostrador, con la persona enfrente.
 */
export const TEXTOS_PEDIDO = {
  preparando: {
    titulo: "Estamos preparando tu pedido",
    cuerpo: "Ya estamos juntando tus productos.",
  },
  en_camino: {
    titulo: "Tu pedido va en camino",
    cuerpo: "Ya salió de la tienda. Puedes verlo en el mapa y saber cuándo salir a la puerta.",
  },
  listo: {
    titulo: "Tu pedido está listo",
    cuerpo: "Ya puedes pasar a recogerlo a la tienda.",
  },
  entregado: {
    titulo: "Tu pedido llegó",
    cuerpo: "¡Que lo disfrutes! Si quieres, califica la entrega desde la app.",
  },
  cancelado: {
    titulo: "Tu pedido fue cancelado",
    cuerpo: "Si tienes dudas, escríbenos y lo revisamos.",
  },
};

/*
 * La notificación de cancelado: el motivo y lo devuelto, en lo que cabe en
 * la barra del teléfono. Sin motivo (pedidos cancelados antes de que se
 * pidiera) queda el texto de siempre.
 */
const cuerpoDeCancelado = (pedido) => {
  const motivo = String(pedido?.cancelReason || "").trim();
  const saldo = Number(pedido?.reembolso?.saldo) || 0;
  const puntos = Number(pedido?.reembolso?.puntos) || 0;
  const devuelto = [
    saldo > 0 ? `$${saldo.toFixed(2)} a tu saldo` : "",
    puntos > 0 ? `${puntos} puntos` : "",
  ].filter(Boolean).join(" y ");
  const partes = [
    motivo ? `Motivo: ${motivo.length > 110 ? `${motivo.slice(0, 107)}…` : motivo}` : TEXTOS_PEDIDO.cancelado.cuerpo,
    devuelto ? `Te devolvimos ${devuelto}.` : "",
  ].filter(Boolean);
  return partes.join(" ");
};

const clienteDelPedido = async (pedido) => {
  const idCliente = pedido?.clientId?._id || pedido?.clientId;
  if (!idCliente) return null;
  const cliente = await clientModel
    .findById(idCliente)
    .select("email fullName notificationPrefs avisosApp isActive +pushTokens")
    .lean();
  return cliente && cliente.isActive !== false ? cliente : null;
};

/*
 * El push del paso al que acaba de llegar el pedido. Va por el canal
 * "pedidos" (prioridad alta: sale como globo arriba de la pantalla).
 *
 * `datos.pedidoId` es lo que lee la app para llevar a ESE pedido al tocar la
 * notificación. `tipo` sigue siendo "pedidoEnCamino" para "en camino": las
 * versiones de la app que ya están instaladas solo conocen ese.
 */
export const avisarPasoDelPedido = async (pedido, estado) => {
  const texto = TEXTOS_PEDIDO[estado];
  if (!texto) return { enviados: 0, motivo: "ese estado no se avisa" };
  if (estado === "entregado" && pedido?.deliveryType !== "delivery") {
    return { enviados: 0, motivo: "el retiro se entrega en el mostrador" };
  }
  const cliente = await clienteDelPedido(pedido);
  if (!cliente) return { enviados: 0, motivo: "sin cliente activo" };
  if (!quiereEnLaApp(cliente, AVISO_DEL_ESTADO[estado])) {
    return { enviados: 0, motivo: "apagó ese aviso en la app" };
  }

  const tokens = cliente.pushTokens || [];
  enviarPushEnSegundoPlano(tokens, {
    ...texto,
    // Al cancelar, el cuerpo es el porqué: es lo primero que se pregunta.
    ...(estado === "cancelado" ? { cuerpo: cuerpoDeCancelado(pedido) } : {}),
    canal: "pedidos",
    datos: {
      tipo: estado === "en_camino" ? "pedidoEnCamino" : "pedido",
      estado,
      pedidoId: String(pedido._id || ""),
    },
  });
  return { enviados: tokens.length };
};

/*
 * El CORREO de "va en camino". Este sí sigue la preferencia `pedidoCerca`
 * (Mi cuenta › Avisos), que nace apagada: un correo por cada pedido es más de
 * lo que mucha gente quiere, y en la app ya le avisó el teléfono.
 */
export const avisarPedidoEnCamino = async (pedido) => {
  const cliente = await clienteDelPedido(pedido);
  if (!cliente) return { enviados: 0, motivo: "sin cliente activo" };

  // El true explícito: el interruptor nace apagado, así que "no tengo el
  // campo" significa "no lo he encendido nunca".
  if (cliente.notificationPrefs?.pedidoCerca !== true) {
    return { enviados: 0, motivo: "no pidió el correo de pedido en camino" };
  }
  if (!cliente.email) return { enviados: 0, motivo: "el cliente no tiene correo" };

  const tienda = await identidadDeLaTienda();

  return enviarEnFila(
    [cliente],
    () => plantillaPedidoEnCamino({ pedido, nombreCliente: cliente.fullName || "", tienda }),
    "aviso de pedido en camino"
  );
};

/*
 * El CORREO de cancelado. Sale siempre, sin interruptor: quien compró en la
 * web y no tiene la app no tiene otra forma de enterarse de que su pedido no
 * va a llegar, ni de por qué.
 */
export const avisarPedidoCancelado = async (pedido) => {
  const cliente = await clienteDelPedido(pedido);
  if (!cliente) return { enviados: 0, motivo: "sin cliente activo" };
  if (!cliente.email) return { enviados: 0, motivo: "el cliente no tiene correo" };

  const tienda = await identidadDeLaTienda();
  return enviarEnFila(
    [cliente],
    () => plantillaPedidoCancelado({ pedido, nombreCliente: cliente.fullName || "", tienda }),
    "aviso de pedido cancelado"
  );
};

/*
 * La versión que llama el controlador: dispara y se olvida. El push del paso
 * y, si va en camino o se canceló, el correo.
 *
 * El .catch no es opcional. Sin él, un tropiezo aquí adentro es una promesa
 * rechazada sin dueño, y Node se lleva el proceso entero por delante — o sea,
 * la tienda se cae porque un aviso no salió.
 */
export const avisarCambioDePedidoEnSegundoPlano = (pedido, estado) => {
  avisarPasoDelPedido(pedido, estado).catch((error) => {
    console.log(`aviso del pedido (${estado}): falló el envío: ${error}`);
  });
  if (estado === "en_camino") {
    avisarPedidoEnCamino(pedido).catch((error) => {
      console.log("correo de pedido en camino: falló el envío: " + error);
    });
  }
  if (estado === "cancelado") {
    avisarPedidoCancelado(pedido).catch((error) => {
      console.log("correo de pedido cancelado: falló el envío: " + error);
    });
  }
};

// Nombre viejo, por si algo más lo llama todavía.
export const avisarPedidoEnCaminoEnSegundoPlano = (pedido) =>
  avisarCambioDePedidoEnSegundoPlano(pedido, "en_camino");

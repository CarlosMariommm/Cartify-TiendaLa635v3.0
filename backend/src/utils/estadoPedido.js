import orderModel from "../models/order.js";
import { avisarCambioDePedidoEnSegundoPlano } from "./avisosCliente.js";
import { codigoCoincide } from "./codigoEntrega.js";
import { devolverLoDelPedido } from "./devolverPedido.js";

// CAMBIAR EL ESTADO DE UN PEDIDO — estadoPedido.js
// Lo que pasa cuando un pedido avanza (preparando, en camino, listo, entregado, cancelado), en UN
// solo lugar.

export const ESTADOS_PEDIDO = ["pagado", "preparando", "en_camino", "listo", "entregado", "cancelado"];

// `soloDesde`: el cambio solo vale si el pedido está en ESE estado.
export const cambiarEstadoDePedido = async ({
  id, status, quien = "", codigoEntrega, omitirCodigo, motivoOmision, motivoCancelacion,
  soloDesde, porCliente = false,
}) => {
  if (!ESTADOS_PEDIDO.includes(status)) {
    return { ok: false, codigo: 400, message: "Estado inválido" };
  }

  // +deliveryCode: hace falta para compararlo abajo. No sale de aquí: la
  // respuesta se arma con el documento ya actualizado, que no lo trae.
  const actual = await orderModel.findById(id).select("+deliveryCode");
  if (!actual) return { ok: false, codigo: 404, message: "Pedido no encontrado" };
  if (soloDesde && actual.status !== soloDesde) {
    return { ok: false, codigo: 409, message: "El pedido ya cambió de estado." };
  }

  // ── CANCELAR ES UNA SALIDA, NO UN ESTADO MÁS ──
  // Al cancelar se devuelve lo que el pedido había movido (stock, saldo y puntos; ver
  // devolverPedido.js).
  if (actual.status === "cancelado" && status !== "cancelado") {
    return { ok: false, codigo: 400, message: "Un pedido cancelado ya no se reabre: ya se le devolvió al cliente lo que pagó." };
  }
  if (status === "cancelado" && actual.status === "cancelado") {
    return { ok: false, codigo: 400, message: "Este pedido ya está cancelado." };
  }
  if (status === "cancelado" && actual.status === "entregado") {
    return { ok: false, codigo: 400, message: "Un pedido entregado ya no se cancela." };
  }

  const cambios = { status };

  // El motivo es obligatorio y es PARA EL CLIENTE: lo lee en su pedido, en la notificación y en el
  // correo. Un "su pedido fue cancelado" sin porqué deja a la persona pensando que hizo algo mal.
  if (status === "cancelado") {
    const motivo = String(motivoCancelacion || "").trim().replace(/\s+/g, " ");
    if (motivo.length < 4) {
      return { ok: false, codigo: 400, message: "Escriba por qué se cancela: el cliente lo va a leer." };
    }
    cambios.cancelReason = motivo.slice(0, 300);
    cambios.cancelledAt = new Date();
    cambios.cancelledBy = quien;
    if (porCliente) cambios.cancelledByClient = true;
  }

  // ── NO SE ENTREGA SIN COMPROBAR A QUIÉN ──
  // Este es el único punto del sistema donde el código de entrega sirve para algo. Todo lo demás
  // —emitirlo, guardarlo, enseñárselo al cliente— existe para que esta comparación se pueda hacer.
  if (status === "entregado" && actual.status !== "entregado") {
    if (!actual.deliveryCode) {
      // Pedido anterior a esta función. No lleva código y no se le puede exigir uno: dejarlo trabado
      // sería castigar al cliente por una mejora nuestra. Se entrega como se entregaba antes.
    } else if (omitirCodigo) {
      // La salida de emergencia. Existe porque sin ella el personal terminaría marcando los pedidos como
      // entregados ANTES de salir de la tienda, y ahí el código no valdría nada. Pero cuesta escribir
      // por qué, y ese por qué queda guardado en el pedido.
      const motivo = String(motivoOmision || "").trim();
      if (motivo.length < 4) {
        return { ok: false, codigo: 400, message: "Escriba por qué se entrega sin código." };
      }
      cambios.deliveryCodeOmitido = true;
      cambios.deliveryCodeMotivo = motivo.slice(0, 200);
    } else if (!codigoCoincide(actual.deliveryCode, codigoEntrega)) {
      return {
        ok: false,
        codigo: 400,
        message: "El código no coincide. Pídale al cliente los 4 dígitos que ve en su pedido.",
      };
    } else {
      cambios.deliveryCodeVerifiedAt = new Date();
    }
  }

  // Se sella la hora y el nombre de quien movió el pedido. Solo la primera vez: si alguien vuelve a
  // marcar "preparando" después de un error, la hora original no se pierde.
  if (status === "preparando" && !actual.preparedAt) {
    cambios.preparedAt = new Date();
    cambios.preparedBy = quien;
  }
  if (status === "en_camino" && !actual.enCaminoAt) {
    cambios.enCaminoAt = new Date();
    cambios.enCaminoBy = quien;
  }
  if (status === "listo" && !actual.listoAt) {
    cambios.listoAt = new Date();
    cambios.listoBy = quien;
  }
  if (status === "entregado" && !actual.deliveredAt) {
    cambios.deliveredAt = new Date();
    cambios.deliveredBy = quien;
  }

  // Se acabó el viaje, se acaba el rastro. Cuando el pedido llega o se cancela, la posición del
  // repartidor deja de tener sentido para todos: se borra el punto, no solo se apaga.
  if (status === "entregado" || status === "cancelado") {
    cambios.courier = { active: false };
  }

  // El cambio solo entra si el pedido sigue en el estado que se leyó arriba. Importa sobre todo al
  // cancelar: dos personas tocando "Cancelar" a la vez (o el botón y Tiqui) devolverían el stock y
  // el saldo dos veces. Con la condición, la segunda no encuentra el pedido y no devuelve nada.
  let order = await orderModel.findOneAndUpdate({ _id: id, status: actual.status }, cambios, { new: true });
  if (!order) {
    return { ok: false, codigo: 409, message: "El pedido cambió mientras tanto. Recargue la lista y vuelva a intentarlo." };
  }

  if (status === "cancelado") {
    // Con await: lo devuelto se anota en el pedido y se le cuenta al cliente en el aviso ("le
    // devolvimos $5.00 a su saldo"). Si algo falla, el pedido igual queda cancelado; el error queda en
    // el registro.
    try {
      const reembolso = await devolverLoDelPedido(order);
      order = await orderModel.findByIdAndUpdate(id, { reembolso }, { new: true });
    } catch (e) {
      console.log(`devolver lo del pedido ${id}: ${e.message}`);
    }
  }

  // El aviso del paso, a quien lo pidió (ver utils/avisosCliente.js). Solo en el SALTO de estado:
  // quien vuelve a tocar el botón —o corrige el estado tras un error— no le manda el mismo aviso
  // otra vez a quien ya lo recibió.
  if (status !== actual.status && !porCliente) {
    avisarCambioDePedidoEnSegundoPlano(order, status);
  }

  return { ok: true, order, anterior: actual.status };
};

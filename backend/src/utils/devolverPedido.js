import clientModel from "../models/client.js";
import productModel from "../models/product.js";
import loyaltyLedgerModel from "../models/loyaltyLedger.js";
import { getLoyaltyConfig } from "./loyaltyPoints.js";

// DESHACER UN PEDIDO CANCELADO — devolverPedido.js
// Al cancelar devuelve lo que el pedido movió: el stock, el saldo cobrado y los puntos canjeados,
// y quita los puntos que había ganado.

const idDe = (valor) => valor?._id || valor;

// El stock vuelve con $set y no con $inc, por lo mismo que en createOrder:
// hay productos con el stock guardado como texto y $inc revienta con esos.
const devolverStock = async (items) => {
  for (const it of items || []) {
    const id = idDe(it.productId);
    const cantidad = Number(it.amount) || 0;
    if (!id || cantidad <= 0) continue; // las impresiones no llevan producto
    try {
      const producto = await productModel.findById(id).select("stock");
      // Un producto que ya se borró del catálogo no tiene a dónde volver.
      if (!producto) continue;
      await productModel.findByIdAndUpdate(id, { $set: { stock: (Number(producto.stock) || 0) + cantidad } });
    } catch (e) {
      console.log(`devolver stock de ${id}: ${e.message}`);
    }
  }
};

// Los puntos que ESTE pedido le dio se retiran, pero solo los que no ha gastado. Si ya usó algunos
// en otra compra, esa compra ya pasó y no se le puede cobrar de vuelta: se retira lo que queda del
// lote y ya.
const retirarPuntosGanados = async (pedido, clientId) => {
  if (!(pedido.pointsEarned > 0)) return;
  const lote = await loyaltyLedgerModel.findOne({ clientId, orderId: pedido._id });
  if (!lote) return;
  const usados = Number(lote.used) || 0;
  const sinUsar = Math.max(0, (Number(lote.points) || 0) - usados);
  if (!sinUsar) return;
  // El lote queda del tamaño de lo que ya se usó: disponible = 0.
  lote.points = usados;
  await lote.save();
  await clientModel.findByIdAndUpdate(clientId, { $inc: { loyaltyPoints: -sinUsar } });
};

// Los puntos que CANJEÓ en este pedido vuelven como un lote nuevo, con su vencimiento contado
// desde hoy. No se puede saber de qué lotes salieron (consumirPuntos los reparte entre varios), y
// devolverlos con la fecha vieja podría dárselos ya vencidos.
const devolverPuntosCanjeados = async (pedido, clientId) => {
  const puntos = Number(pedido.pointsRedeemed) || 0;
  if (puntos <= 0) return 0;
  const config = await getLoyaltyConfig();
  const ahora = new Date();
  const vence = new Date(ahora);
  vence.setMonth(vence.getMonth() + (config.expiryMonths || 3));
  await loyaltyLedgerModel.create({ clientId, points: puntos, earnedAt: ahora, expiresAt: vence });
  await clientModel.findByIdAndUpdate(clientId, { $inc: { loyaltyPoints: puntos } });
  return puntos;
};

export const devolverLoDelPedido = async (pedido) => {
  const clientId = idDe(pedido.clientId);
  const devuelto = { saldo: 0, puntos: 0 };

  await devolverStock(pedido.items);
  if (!clientId) return devuelto;

  // El saldo vuelve completo: lo que se descontó al comprar fue el total.
  if (pedido.paymentMethod === "saldo" && Number(pedido.total) > 0) {
    try {
      const total = Number(Number(pedido.total).toFixed(2));
      await clientModel.findByIdAndUpdate(clientId, { $inc: { balance: total } });
      devuelto.saldo = total;
    } catch (e) {
      console.log(`devolver saldo del pedido ${pedido._id}: ${e.message}`);
    }
  }

  try {
    await retirarPuntosGanados(pedido, clientId);
  } catch (e) {
    console.log(`retirar puntos del pedido ${pedido._id}: ${e.message}`);
  }
  try {
    devuelto.puntos = await devolverPuntosCanjeados(pedido, clientId);
  } catch (e) {
    console.log(`devolver puntos del pedido ${pedido._id}: ${e.message}`);
  }

  return devuelto;
};

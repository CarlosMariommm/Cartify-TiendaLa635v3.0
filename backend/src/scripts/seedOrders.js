// Seed de PEDIDOS de prueba (Opción B). Crea unos pedidos de cliente para poder ver funcionando
// "Mis Pedidos", la pantalla del empleado y los puntos de fidelidad — mientras el checkout real de
// la tienda llega en la fase del Asistente de Voz.
import dotenv from "dotenv";
dotenv.config();
import mongoose from "mongoose";

import orderModel from "../models/order.js";
import clientModel from "../models/client.js";
import productModel from "../models/product.js";
import loyaltyConfigModel from "../models/loyaltyConfig.js";
import loyaltyLedgerModel from "../models/loyaltyLedger.js";

const run = async () => {
  await mongoose.connect(process.env.DB_URI, { family: 4 });
  console.log("Conectado a la base para el seed...");

  // 1- Aseguramos que exista la config de puntos (con sus defaults).
  let config = await loyaltyConfigModel.findOne();
  if (!config) {
    config = await loyaltyConfigModel.create({});
    console.log("Config de loyalty creada (1 punto/$1, vence a 3 meses).");
  }

  // 2- Buscamos un cliente y algunos productos reales de la base.
  const client = await clientModel.findOne({ isActive: true });
  const products = await productModel.find({ isActive: true }).limit(4);

  if (!client) {
    console.log("⚠️  No hay clientes en la base. Registra un cliente primero.");
    return mongoose.disconnect();
  }
  if (products.length === 0) {
    console.log("⚠️  No hay productos en la base. Crea productos primero.");
    return mongoose.disconnect();
  }

  // 3- Armamos 3 pedidos con distintos estados, para probar la pantalla del empleado.
  const estados = ["pagado", "preparando", "entregado"];
  let totalPuntos = 0;

  for (let i = 0; i < estados.length; i++) {
    const seleccion = products.slice(0, (i % 2) + 1); // 1 o 2 productos por pedido
    const items = seleccion.map((p) => ({
      productId: p._id,
      name: p.name,
      price: p.salePrice || 1,
      amount: (i % 3) + 1,
    }));
    const total = items.reduce((acc, it) => acc + it.price * it.amount, 0);
    const pointsEarned = config.isActive ? Math.floor(total * config.pointsPerDollar) : 0;

    const pedido = await orderModel.create({
      clientId: client._id,
      items,
      total,
      status: estados[i],
      paymentMethod: "efectivo",
      channel: "web",
      pointsEarned,
    });

    // Escribimos el lote de puntos con su vencimiento, igual que en producción.
    if (pointsEarned > 0) {
      const earnedAt = new Date();
      const expiresAt = new Date(earnedAt);
      expiresAt.setMonth(expiresAt.getMonth() + (config.expiryMonths || 3));
      await loyaltyLedgerModel.create({
        clientId: client._id,
        points: pointsEarned,
        earnedAt,
        expiresAt,
        orderId: pedido._id,
      });
    }
    totalPuntos += pointsEarned;
  }

  // 4- Sumamos los puntos de todos los pedidos al cliente.
  await clientModel.findByIdAndUpdate(client._id, { $inc: { loyaltyPoints: totalPuntos } });

  console.log(`✅ 3 pedidos creados para "${client.fullName || client.email}".`);
  console.log(`   Puntos otorgados en total: ${totalPuntos}`);

  await mongoose.disconnect();
  console.log("Listo. Desconectado.");
};

run().catch((err) => {
  console.log("Error en el seed:", err);
  mongoose.disconnect();
});

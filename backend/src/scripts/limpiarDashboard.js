// LIMPIAR LOS DATOS DEL DASHBOARD — limpiarDashboard.js
// Dos formas de dejar el dashboard legible: --raros Solo los pedidos imposibles: totales de más de
// $5,000 o trabajos de impresión con más de 200 copias o 500 páginas.
import dotenv from "dotenv";
dotenv.config();
import fs from "fs";
import mongoose from "mongoose";

import orderModel from "../models/order.js";
import clientModel from "../models/client.js";
import loyaltyLedgerModel from "../models/loyaltyLedger.js";
import { devolverLoDelPedido } from "../utils/devolverPedido.js";

// Los mismos topes que valida el servidor desde ahora (ver createPrintOrder).
const TOTAL_IMPOSIBLE = 5000;
const MAX_COPIAS = 200;
const MAX_PAGINAS = 500;
const EN_CURSO = ["pagado", "preparando", "en_camino", "listo"];

const FILTRO_RAROS = {
  $or: [
    { total: { $gt: TOTAL_IMPOSIBLE } },
    { "printJob.copies": { $gt: MAX_COPIAS } },
    { "printJob.pages": { $gt: MAX_PAGINAS } },
  ],
};

const plata = (n) => (Number(n) > 1e9 ? `$${Number(n).toExponential(2)}` : `$${Number(n || 0).toFixed(2)}`);
const fecha = (d) => (d ? new Date(d).toISOString().slice(0, 16).replace("T", " ") : "?");

const argumentos = process.argv.slice(2);
const modo = argumentos.includes("--todo") ? "todo" : argumentos.includes("--raros") ? "raros" : null;
const borrar = argumentos.includes("--borrar");

const correr = async () => {
  await mongoose.connect(process.env.DB_URI, { family: 4 });

  const raros = await orderModel.find(FILTRO_RAROS).lean();
  const totalPedidos = await orderModel.countDocuments();
  const totalLotes = await loyaltyLedgerModel.countDocuments();

  console.log(`\nPedidos en la base: ${totalPedidos} · lotes de puntos: ${totalLotes}`);
  console.log(`\nPedidos imposibles (--raros): ${raros.length}`);
  raros.forEach((o) => {
    const copias = o.printJob?.copies > MAX_COPIAS ? ` · ${Number(o.printJob.copies).toExponential(0)} copias` : "";
    console.log(`  #${String(o._id).slice(-6).toUpperCase()}  ${fecha(o.createdAt)}  ${o.channel || "web"} · ${o.status}  total ${plata(o.total)}${copias}`);
  });
  console.log(`\nCon --todo se borrarían los ${totalPedidos} pedidos y los ${totalLotes} lotes de puntos, y los puntos de todos los clientes quedarían en 0.`);

  if (!modo || !borrar) {
    console.log("\nNo se borró nada. Para borrar, agregue el modo y --borrar:");
    console.log("  node src/scripts/limpiarDashboard.js --raros --borrar");
    console.log("  node src/scripts/limpiarDashboard.js --todo --borrar\n");
    return;
  }

  const objetivo = modo === "todo" ? await orderModel.find({}).lean() : raros;
  if (!objetivo.length) {
    console.log("\nNo hay pedidos que borrar.\n");
    return;
  }
  const ids = objetivo.map((o) => o._id);
  const idsClientes = [...new Set(objetivo.map((o) => String(o.clientId)).filter(Boolean))];
  const filtroLotes = modo === "todo" ? {} : { orderId: { $in: ids } };
  const lotes = await loyaltyLedgerModel.find(filtroLotes).lean();
  const clientes = await clientModel
    .find(modo === "todo" ? {} : { _id: { $in: idsClientes } })
    .select("loyaltyPoints balance")
    .lean();

  // 1. Respaldo, antes de tocar nada.
  const carpeta = new URL("../../respaldos/", import.meta.url);
  fs.mkdirSync(carpeta, { recursive: true });
  const nombre = `limpieza-${modo}-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
  const archivo = new URL(nombre, carpeta);
  fs.writeFileSync(archivo, JSON.stringify({ modo, fecha: new Date(), pedidos: objetivo, lotes, clientes }, null, 2));
  console.log(`\nRespaldo guardado en backend/respaldos/${nombre}`);

  // 2. Los que seguían en curso se deshacen como al cancelar.
  let deshechos = 0;
  for (const pedido of objetivo) {
    if (!EN_CURSO.includes(pedido.status)) continue;
    // Un total imposible no se "devuelve" al saldo: nadie pudo pagarlo de verdad, y devolverlo le
    // pondría $10^256 a un cliente.
    const seguro = Number(pedido.total) > TOTAL_IMPOSIBLE ? { ...pedido, paymentMethod: "efectivo" } : pedido;
    await devolverLoDelPedido(seguro);
    deshechos += 1;
  }

  // 3. Se borran los lotes y los pedidos.
  const lotesBorrados = await loyaltyLedgerModel.deleteMany(filtroLotes);
  const pedidosBorrados = await orderModel.deleteMany({ _id: { $in: ids } });

  // 4. Los puntos de cada cliente, con lo que quedó.
  if (modo === "todo") {
    await clientModel.updateMany({}, { $set: { loyaltyPoints: 0 } });
  } else {
    for (const id of idsClientes) {
      const suyos = await loyaltyLedgerModel.find({ clientId: id }).select("points used").lean();
      const disponibles = Math.max(0, Math.floor(suyos.reduce((a, l) => a + (Number(l.points) || 0) - (Number(l.used) || 0), 0)));
      await clientModel.updateOne({ _id: id }, { $set: { loyaltyPoints: disponibles } });
    }
  }

  console.log(`Pedidos borrados: ${pedidosBorrados.deletedCount} (${deshechos} seguían en curso: su stock volvió).`);
  console.log(`Lotes de puntos borrados: ${lotesBorrados.deletedCount}.`);
  console.log(modo === "todo" ? "Puntos de todos los clientes: 0.\n" : `Puntos recalculados de ${idsClientes.length} cliente(s).\n`);
};

correr()
  .catch((error) => {
    console.log("Error: " + error.message);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());

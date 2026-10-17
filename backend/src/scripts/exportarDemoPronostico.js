// EXPORTAR LA DEMOSTRACIÓN DEL PRONÓSTICO — exportarDemoPronostico.js
// Resume la base local de demostración en src/datos/pronosticoDemo.json (ventas por día,
// existencias, proveedores y compras; sin clientes) para el modo Demostración.

import { writeFileSync } from "node:fs";
import mongoose from "mongoose";
import { armarSolicitud, diaLocal, fuenteDeBase } from "../utils/pronostico.js";

const c = await mongoose.createConnection("mongodb://127.0.0.1:27017/cartify_demo").asPromise();
if (c.name !== "cartify_demo") throw new Error("No es la base de demostración");

// "Hoy", para la demostración, es el día de su último pedido: lo de antes es su historia.
const [ultimo] = await c.db.collection("Orders").find({}, { projection: { createdAt: 1 } }).sort({ createdAt: -1 }).limit(1).toArray();
if (!ultimo) throw new Error("La base de demostración no tiene pedidos: correr antes datos-demo.mjs");
const ahora = new Date(`${diaLocal(ultimo.createdAt)}T12:00:00-06:00`);

const solicitud = await armarSolicitud(ahora, fuenteDeBase(c.db));
// Por dónde se le pide a cada proveedor de la demostración (para el botón "Pedir").
const proveedores = await c.db.collection("Suppliers").find({}, { projection: { pedidos: 1, phoneNumber: 1 } }).toArray();
const canal = new Map(proveedores.map((p) => [String(p._id), p]));
solicitud.proveedores = solicitud.proveedores.map((p) => {
  const doc = canal.get(p.id);
  return { ...p, pedido: doc?.pedidos?.canal ? { ...doc.pedidos, telefono: doc.phoneNumber || "" } : null };
});
await c.close();

const destino = new URL("../datos/pronosticoDemo.json", import.meta.url);
writeFileSync(destino, JSON.stringify(solicitud));
console.log(`Demostración exportada: ${solicitud.desde} a ${solicitud.hasta}, ${solicitud.tienda.length} días, ${solicitud.ventas.length} ventas por producto, ${solicitud.productos.length} productos.`);

// Seed de CRÉDITOS DE PROVEEDOR de prueba: un proveedor de ejemplo con compras al crédito y
// distintos vencimientos. Se corre con: node src/scripts/seedCreditosProveedor.js
import dotenv from "dotenv";
dotenv.config();
import mongoose from "mongoose";

import supplierModel from "../models/supplier.js";
import supplierMovementModel from "../models/supplierMovement.js";

const NOMBRE_PRUEBA = "Distribuidora Ejemplo (prueba)";

// Devuelve una fecha a N días de hoy (a las 9:00), para vencimientos claros.
const enDias = (n) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  d.setHours(9, 0, 0, 0);
  return d;
};

const run = async () => {
  await mongoose.connect(process.env.DB_URI, { family: 4 });
  console.log("Conectado a la base para el seed de créditos...");

  // 1- Proveedor de prueba: se busca por nombre; si no está, se crea.
  let proveedor = await supplierModel.findOne({ name: NOMBRE_PRUEBA });
  if (!proveedor) {
    proveedor = await supplierModel.create({
      name: NOMBRE_PRUEBA,
      phoneNumber: "0000-0000",
      email: "ejemplo@proveedor.test",
      creditDays: "30",
      creditLimit: 2000,
      isActive: true,
    });
    console.log(`Proveedor de prueba creado: ${proveedor.name}`);
  } else {
    // Se limpian sus movimientos para no acumular al re-correr el seed.
    await supplierMovementModel.deleteMany({ supplierId: proveedor._id });
    console.log(`Proveedor de prueba ya existía; se limpiaron sus movimientos.`);
  }

  // 2- Compras al crédito con vencimientos variados.
  const compras = [
    { amount: 340.0, date: enDias(-2), dueDate: enDias(3), reference: "F-1001", note: "Abarrotes surtidos" },
    { amount: 120.5, date: enDias(-1), dueDate: enDias(7), reference: "F-1002", note: "Bebidas" },
    { amount: 85.75, date: enDias(-3), dueDate: enDias(21), reference: "F-1003", note: "Limpieza" },
    { amount: 200.0, date: enDias(-40), dueDate: enDias(-5), reference: "F-0999", note: "Factura vencida" },
  ];

  const movimientos = compras.map((c) => ({ supplierId: proveedor._id, type: "compra", ...c }));

  // Un abono parcial a la primera factura, para ver "abonado" y saldo parcial.
  movimientos.push({
    supplierId: proveedor._id,
    type: "pago",
    amount: 100.0,
    date: enDias(-1),
    reference: "R-1001",
    note: "Abono a F-1001",
  });

  await supplierMovementModel.insertMany(movimientos);
  console.log(`Listos: ${compras.length} compras al crédito + 1 abono, en "${proveedor.name}".`);
  console.log("Ábralo en el panel → Proveedores → su estado de cuenta para probar el calendario.");

  await mongoose.disconnect();
  console.log("Seed terminado.");
};

run().catch((e) => {
  console.error("Error en el seed de créditos:", e);
  process.exit(1);
});

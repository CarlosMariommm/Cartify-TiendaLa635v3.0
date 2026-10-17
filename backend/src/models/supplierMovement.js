import mongoose, { Schema, model } from "mongoose";

// MOVIMIENTO DE CUENTA CON UN PROVEEDOR
// La deuda con un proveedor NO se guarda como un número. Se guarda cada movimiento (una compra al
// crédito suma, un pago resta) y el saldo se calcula sumándolos.
const supplierMovementSchema = new Schema(
  {
    supplierId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "supplierModel",
      required: true,
      index: true,
    },

    // 'compra' suma deuda, 'pago' la resta.
    type: {
      type: String,
      enum: ["compra", "pago"],
      required: true,
    },

    amount: { type: Number, required: true, min: 0.01 },

    // Cuándo ocurrió (puede no ser hoy: se registra una factura de la semana pasada).
    date: { type: Date, default: Date.now },

    // Solo para compras: hasta cuándo hay plazo para pagarla.
    dueDate: { type: Date },

    // Número de factura o recibo, para poder cotejar con el papel.
    reference: { type: String, trim: true },

    note: { type: String, trim: true },

    // Si el movimiento nació de una compra registrada en el sistema.
    shoppingId: { type: mongoose.Schema.Types.ObjectId, ref: "shoppingsModel" },
  },
  { timestamps: true }
);

export default model("supplierMovementModel", supplierMovementSchema, "SupplierMovements");

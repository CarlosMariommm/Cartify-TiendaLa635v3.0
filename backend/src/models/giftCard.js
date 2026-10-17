import mongoose, { Schema, model } from "mongoose";

// GIFT CARD — tarjeta de saldo digital
// La tienda crea tarjetas con un monto y un código. El cliente canjea el código y ese monto se le
// suma a su saldo, que después usa para pagar.
const giftCardSchema = new Schema(
  {
    // Código que se le entrega al cliente. Se guarda siempre en mayúsculas
    // para que "abc-123" y "ABC-123" sean la misma tarjeta.
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    amount: { type: Number, required: true, min: 0.01 },

    // Quién la canjeó y cuándo. Vacíos = todavía está sin usar.
    isRedeemed: { type: Boolean, default: false },
    redeemedBy: { type: mongoose.Schema.Types.ObjectId, ref: "clientModel" },
    redeemedAt: { type: Date },

    // Opcional: después de esta fecha ya no se puede canjear.
    expiresAt: { type: Date },

    // Permite anular una tarjeta que se imprimió mal o se perdió.
    isActive: { type: Boolean, default: true },

    note: { type: String }, // "Rifa de aniversario", "Cliente frecuente"...
  },
  { timestamps: true }
);

export default model("giftCardModel", giftCardSchema, "GiftCards");

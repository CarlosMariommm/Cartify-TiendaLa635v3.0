import mongoose, { Schema, model } from "mongoose";

// VALORACIONES — review.js
// Lo que opinan los clientes de un producto. Eso no es una maqueta inofensiva: son opiniones
// falsas puestas frente a alguien que está decidiendo si compra.
const reviewSchema = new Schema(
  {
    productId: { type: mongoose.Schema.Types.ObjectId, ref: "productModel", required: true },
    clientId: { type: mongoose.Schema.Types.ObjectId, ref: "clientModel", required: true },
    rating: { type: Number, min: 1, max: 5, required: true },
    comment: { type: String, maxlength: 500, default: "" },
  },
  { timestamps: true }
);

// Una por cliente y producto: sin esto, alguien podría inflar su propio 5★.
reviewSchema.index({ productId: 1, clientId: 1 }, { unique: true });

export default model("reviewModel", reviewSchema, "Reviews");

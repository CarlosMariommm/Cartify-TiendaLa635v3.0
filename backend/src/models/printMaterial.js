import { Schema, model } from 'mongoose';

// MATERIAL DE IMPRESIÓN — printMaterial.js
// El papel y la tinta con los que se imprime.
const printMaterialSchema = new Schema(
  {
    name: { type: String, required: true },
    tipo: { type: String, enum: ['papel', 'tinta'], default: 'papel' },
    // Solo se lee cuando tipo === 'tinta'. En el papel se ignora.
    esColor: { type: Boolean, default: false },
    existencia: { type: Number, default: 0 },
    minimo: { type: Number, default: 0 },
    // Cómo se cuenta: "hojas", "pliegos", "cartuchos". Es solo para mostrar.
    unidad: { type: String, default: 'hojas' },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default model('printMaterialModel', printMaterialSchema, 'PrintMaterials');

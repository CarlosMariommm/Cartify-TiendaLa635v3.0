// Seed de FORMATOS BASE de impresión. Un puñado de tamaños de uso general (Carta, Oficio, media
// carta, DUI, pasaporte) para que el módulo de Impresiones no arranque vacío y el dueño tenga algo
// de dónde partir.
import dotenv from "dotenv";
dotenv.config();
import mongoose from "mongoose";

import printServiceModel from "../models/printService.js";

const FORMATOS_BASE = [
  {
    name: "Carta",
    widthCm: 21.6,
    heightCm: 27.9,
    pricePerCopy: 0.05,
  },
  {
    name: "A4",
    widthCm: 21,
    heightCm: 29.7,
    pricePerCopy: 0.05,
  },
  {
    name: "Oficio",
    widthCm: 21.6,
    heightCm: 33,
    pricePerCopy: 0.07,
  },
  {
    name: "Media carta",
    widthCm: 21.6,
    heightCm: 13.95,
    pricePerCopy: 0.05,
  },
  {
    name: "Foto DUI",
    widthCm: 8.5,
    heightCm: 5.4,
    pricePerCopy: 0.15,
  },
  {
    name: "Foto pasaporte",
    widthCm: 4,
    heightCm: 4,
    pricePerCopy: 0.5,
  },
];

const run = async () => {
  await mongoose.connect(process.env.DB_URI, { family: 4 });
  console.log("Conectado a la base para el seed de formatos base...");

  let creados = 0;
  let yaExistian = 0;

  for (const formato of FORMATOS_BASE) {
    const existente = await printServiceModel.findOne({ name: formato.name });
    if (existente) {
      yaExistian++;
      if (!existente.esBase) {
        await printServiceModel.findByIdAndUpdate(existente._id, { esBase: true });
        console.log(`- "${formato.name}" ya existía; se marcó como base (su precio y medida no se tocaron).`);
      } else {
        console.log(`- "${formato.name}" ya existía y ya era base, no se toca.`);
      }
      continue;
    }
    await printServiceModel.create({
      ...formato,
      allowsColor: true,
      colorSurcharge: 0,
      isActive: true,
      materialId: null,
      esBase: true,
    });
    creados++;
    console.log(`- "${formato.name}" creado (${formato.widthCm}×${formato.heightCm} cm, $${formato.pricePerCopy}/copia).`);
  }

  console.log(`Listo: ${creados} formatos nuevos, ${yaExistian} ya existían.`);
  console.log("Revise los precios en el panel (Impresiones) antes de darlos por buenos.");

  await mongoose.disconnect();
  console.log("Seed terminado.");
};

run().catch((e) => {
  console.error("Error en el seed de formatos base:", e);
  process.exit(1);
});

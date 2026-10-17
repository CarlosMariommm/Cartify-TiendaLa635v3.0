// Crea (o actualiza) un administrador para poder entrar al panel. Cómo correrlo: cd backend node
// src/scripts/crearAdmin.js La contraseña se guarda HASHEADA con bcrypt, igual que en el registro
// normal. Es un seed de desarrollo: para producción, use una contraseña fuerte.
import dotenv from "dotenv";
dotenv.config();
import mongoose from "mongoose";
import bcryptjs from "bcryptjs";

import adminModel from "../models/admin.js";

const EMAIL = "tiendala635@gmail.com";
const PASSWORD = "Admin3";
const USERNAME = "Administrador";

const run = async () => {
  await mongoose.connect(process.env.DB_URI, { family: 4 });
  console.log("Conectado a la base...");

  const hash = await bcryptjs.hash(PASSWORD, 10);

  const existente = await adminModel.findOne({ email: EMAIL });
  if (existente) {
    existente.password = hash;
    existente.userName = existente.userName || USERNAME;
    existente.isActive = true;
    existente.loginAttemps = 0;
    existente.timeOut = null;
    await existente.save();
    console.log(`Admin ya existía (${EMAIL}); se actualizó su contraseña y quedó activo.`);
  } else {
    await adminModel.create({
      email: EMAIL,
      userName: USERNAME,
      password: hash,
      isActive: true,
    });
    console.log(`Admin creado: ${EMAIL}`);
  }

  await mongoose.disconnect();
  console.log("Listo. Entre al panel en /admin con ese correo y su contraseña (llegará un código 2FA al correo).");
};

run().catch((e) => {
  console.error("Error creando el admin:", e);
  process.exit(1);
});

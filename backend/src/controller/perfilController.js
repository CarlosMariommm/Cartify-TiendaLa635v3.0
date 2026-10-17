import adminModel from "../models/admin.js";
import employeeModel from "../models/employee.js";
import { v2 as cloudinary } from "cloudinary";
import { esTokenExpo } from "../utils/pushExpo.js";
import { anotarTelefono } from "../utils/avisosPersonal.js";

// MI PERFIL — perfilController.js
// La foto de perfil de quien está conectado en el panel, sea administrador o empleado. -
// updateAdmin no maneja imágenes. - Y sobre todo: aquí NO se recibe el id por la URL.
const perfilController = {};

// A qué colección pertenece quien pregunta, según su sesión.
const modeloDe = (tipo) =>
  tipo === "Admin" ? adminModel : tipo === "Employee" ? employeeModel : null;

// Subir o reemplazar la foto de perfil del usuario en sesión.
perfilController.actualizarFoto = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No llegó ninguna imagen" });
    }

    const Modelo = modeloDe(req.usuario?.tipo);
    if (!Modelo) {
      return res.status(403).json({ message: "Esta cuenta no tiene foto de perfil" });
    }

    const encontrado = await Modelo.findById(req.usuario.id);
    if (!encontrado) {
      return res.status(404).json({ message: "No se encontró la cuenta" });
    }

    // Si ya tenía una foto, se borra de Cloudinary para no dejar basura.
    if (encontrado.public_id) {
      try { await cloudinary.uploader.destroy(encontrado.public_id); } catch (e) { /* ignore */ }
    }

    encontrado.image = req.file.path;
    encontrado.public_id = req.file.filename;
    await encontrado.save();

    return res.status(200).json({
      message: "Foto de perfil actualizada",
      image: encontrado.image,
    });
  } catch (error) {
    console.log("error actualizarFoto: " + error);
    return res.status(500).json({ message: "Error interno del servidor" });
  }
};

// Quitar la foto y volver a las iniciales.
perfilController.quitarFoto = async (req, res) => {
  try {
    const Modelo = modeloDe(req.usuario?.tipo);
    if (!Modelo) {
      return res.status(403).json({ message: "Esta cuenta no tiene foto de perfil" });
    }

    const encontrado = await Modelo.findById(req.usuario.id);
    if (!encontrado) {
      return res.status(404).json({ message: "No se encontró la cuenta" });
    }

    if (encontrado.public_id) {
      try { await cloudinary.uploader.destroy(encontrado.public_id); } catch (e) { /* ignore */ }
    }

    encontrado.image = undefined;
    encontrado.public_id = undefined;
    await encontrado.save();

    return res.status(200).json({ message: "Foto de perfil quitada", image: null });
  } catch (error) {
    console.log("error quitarFoto: " + error);
    return res.status(500).json({ message: "Error interno del servidor" });
  }
};

// El teléfono donde le suenan los pedidos nuevos. Lo manda la app al entrar al modo personal; la
// baja va al cerrar sesión (ver logoutAdmin.js y utils/avisosPersonal.js).
perfilController.apuntarTelefono = async (req, res) => {
  try {
    const token = req.body?.token;
    if (!esTokenExpo(token)) {
      return res.status(400).json({ message: "Token de avisos inválido" });
    }

    const Modelo = modeloDe(req.usuario?.tipo);
    if (!Modelo) {
      return res.status(403).json({ message: "Esta cuenta no recibe avisos de pedidos" });
    }

    await anotarTelefono(Modelo, req.usuario.id, token.trim());
    return res.status(200).json({ message: "Este teléfono va a recibir los pedidos nuevos" });
  } catch (error) {
    console.log("error apuntarTelefono: " + error);
    return res.status(500).json({ message: "Error interno del servidor" });
  }
};

export default perfilController;

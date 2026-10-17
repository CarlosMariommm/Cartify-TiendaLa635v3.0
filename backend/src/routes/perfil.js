import express from "express";
import perfilController from "../controller/perfilController.js";
import upload from "../utils/cloudinaryConfig.js";
import { soloPersonal } from "../middlewares/validarSesion.js";

const router = express.Router();

// Mi perfil: solo para el personal (administradores y empleados). Quién es se saca de la sesión,
// no de la URL, así nadie le cambia la foto a otra cuenta.
router.use(soloPersonal);

router.route("/foto")
  .put(upload.single("image"), perfilController.actualizarFoto)
  .delete(perfilController.quitarFoto);

// La app apunta aquí el teléfono donde suenan los pedidos nuevos.
router.route("/avisos")
  .put(perfilController.apuntarTelefono);

export default router;

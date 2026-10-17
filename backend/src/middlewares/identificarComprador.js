import jsonwebtoken from "jsonwebtoken";
import { config } from "../../config.js";
import kioskSessionModel from "../models/kioskSession.js";
import { PERSONAL } from "./validarSesion.js";

// DE QUIÉN ES EL PEDIDO — identificarComprador.js
// Decide a nombre de quién sale un pedido: la sesión del cliente, el código del kiosco o el
// personal en caja. Nunca el clientId que mande el navegador.

const leerToken = (token) => {
  if (!token) return null;
  try {
    return jsonwebtoken.verify(token, config.JWT.secret);
  } catch {
    // Vencido o manipulado: se comporta como si no hubiera token.
    return null;
  }
};

export const identificarComprador = async (req, res, next) => {
  try {
    // 1- El cliente por su cookie. Manda ella, no el cuerpo.
    const cliente = leerToken(req.cookies?.authCookieCliente);
    if (cliente?.userType === "Client") {
      req.compradorId = String(cliente.id);
      return next();
    }

    // 2- El kiosco por su código. Tiene que estar 'vinculada': 'esperando' significa que nadie escaneó
    // el QR todavía y 'usada' que ya se cobró con ella.
    const codigo = String(req.body?.codigoKiosco || "").trim().toUpperCase();
    if (codigo) {
      const sesion = await kioskSessionModel.findOne({ codigo });

      if (!sesion || sesion.estado !== "vinculada" || !sesion.clientId) {
        return res.status(401).json({
          message: "La sesión del kiosco no es válida. Vuelve a escanear el código.",
        });
      }

      if (sesion.expiraEn && sesion.expiraEn.getTime() < Date.now()) {
        return res.status(401).json({
          message: "La sesión del kiosco venció. Vuelve a escanear el código.",
        });
      }

      req.compradorId = String(sesion.clientId);
      return next();
    }

    // 3- El personal en caja: puede cobrar a nombre de un cliente.
    const personal = leerToken(req.cookies?.authCookie);
    if (personal && PERSONAL.includes(personal.userType)) {
      req.compradorId = req.body?.clientId;
      // Lo cobra la tienda misma: a su personal no se le avisa (avisosPersonal.js).
      req.cobraPersonal = true;
      return next();
    }

    return res.status(401).json({ message: "Inicia sesión para hacer tu pedido" });
  } catch (error) {
    console.log("error identificarComprador: " + error);
    return res.status(500).json({ message: "Error interno del servidor" });
  }
};

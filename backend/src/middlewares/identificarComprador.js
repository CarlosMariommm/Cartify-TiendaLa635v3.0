import jsonwebtoken from "jsonwebtoken";
import { config } from "../../config.js";
import kioskSessionModel from "../models/kioskSession.js";
import { PERSONAL } from "./validarSesion.js";

/*
 * ============================================================
 * DE QUIÉN ES EL PEDIDO — identificarComprador.js
 * ============================================================
 * Hasta ahora, a nombre de quién salía un pedido lo decidía el NAVEGADOR: el
 * `clientId` venía en el cuerpo de la petición y el servidor le creía. Con eso,
 * cualquiera podía cargarle una compra —y sus puntos, y su stock— a la cuenta
 * de otra persona.
 *
 * Este portero es distinto al de validarSesion porque aquí hay TRES formas
 * legítimas de comprar, y solo una es "tengo sesión":
 *
 *   1. El cliente desde su navegador. Manda su cookie; el clientId sale de
 *      ahí y lo que diga el cuerpo se ignora.
 *
 *   2. EL KIOSCO, que no tiene sesión NI DEBE TENERLA. Ese es el corazón de
 *      su diseño: el cliente escanea el QR con SU teléfono y la contraseña
 *      nunca pasa por la pantalla pública. Su prueba de identidad no es una
 *      cookie, es el CÓDIGO de seis caracteres que el servidor mismo emitió,
 *      que dura diez minutos y que ya tiene guardado a quién pertenece.
 *      Exigirle sesión al kiosco sería romperlo.
 *
 *   3. El personal cobrando en caja, que sí puede decir a nombre de quién va
 *      —es justamente su trabajo—.
 *
 * El resultado queda en `req.compradorId` y es lo ÚNICO que el controlador
 * debe usar. Si llega hasta el final sin ninguna de las tres, no hay pedido.
 * ============================================================
 */

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

    /*
     * 2- El kiosco por su código.
     *
     * Tiene que estar 'vinculada': 'esperando' significa que nadie escaneó el
     * QR todavía y 'usada' que ya se cobró con ella. Y se revisa la fecha a
     * mano además del índice TTL de Mongo, porque ese índice barre cada tanto
     * —no al segundo— y en ese hueco un código muerto seguiría sirviendo.
     */
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

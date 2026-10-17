import { esTokenExpo } from "../../utils/pushExpo.js";
import { olvidarTelefono } from "../../utils/avisosPersonal.js";

const logoutController = {};

logoutController.logout = async (req, res) => {
  //Limpiar la cookie que tiene la información
  //de quien inició sesión
  res.clearCookie("authCookie");

  // La app manda el token de avisos de su teléfono: al salir, ahí dejan de sonar los pedidos nuevos.
  // No pide sesión a propósito (si ya venció, la baja igual tiene que pasar). Ver
  // utils/avisosPersonal.js.
  const pushToken = req.body?.pushToken;
  if (esTokenExpo(pushToken)) {
    try {
      await olvidarTelefono(pushToken.trim());
    } catch (error) {
      console.log("error al olvidar el teléfono del personal: " + error);
    }
  }

  return res.status(200).json({ message: "Sesión cerrada" });
};

export default logoutController;

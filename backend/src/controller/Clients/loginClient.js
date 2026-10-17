import clientModel from "../../models/client.js";
import { opcionesCookie } from "../../utils/cookieSesion.js";
import adminModel from "../../models/admin.js";
import employeeModel from "../../models/employee.js";
import bcryptjs from "bcryptjs";
import jsonwebtoken from "jsonwebtoken";
import { config } from "../../../config.js";

const loginClientController = {};

// El personal ya NO entra por aquí: se le indica su puerta. Esta puerta abría sesión de personal
// con solo correo y contraseña, para que el repartidor llegara al Reparto de la tienda web.
const buscarPersonal = async (email) => {
  const admin = await adminModel.findOne({ email });
  if (admin) return { doc: admin, tipo: "admin" };

  const empleado = await employeeModel.findOne({ email });
  if (empleado) return { doc: empleado, tipo: "employee" };

  return null;
};

const esContrasenaDelPersonal = (personal, password) =>
  bcryptjs.compare(password, personal.doc.password || "");

const aSuPuerta = (res) =>
  res.status(403).json({
    esPersonal: true,
    message: "Esa cuenta es del personal. Entra por «¿Trabajas en la tienda?», al final de esta pantalla.",
  });

loginClientController.login = async (req, res) => {
  const { email, password } = req.body;

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  // Validar email
  if (!email || !emailRegex.test(email)) {
    return res.status(400).json({ message: "El correo no es válido" });
  }
  if (!password) {
   return res.status(400).json({
      message:"Escribe tu contraseña"
   });
 }

  try {
    // Buscar cliente
    const clientFound = await clientModel.findOne({ email });

    if (!clientFound) {
      // Puede ser alguien del personal que tocó la puerta de la tienda.
      const personal = await buscarPersonal(email);
      if (personal && (await esContrasenaDelPersonal(personal, password))) return aSuPuerta(res);

      return res.status(401).json({ message: "El correo o contraseña son incorrectos" });
    }

    // Verificar si está activo
    if (!clientFound.isActive) {
      return res.status(403).json({ message: "La cuenta está desactivada" });
    }

    // Verificar si está verificado
    if (!clientFound.isVerified) {
      return res.status(403).json({ message: "La cuenta todavía no está verificada" });
    }

    // Verificar bloqueo temporal
    if (clientFound.timeOut && clientFound.timeOut > Date.now()) {
      return res.status(403).json({
        message: "Cuenta bloqueada un rato. Intenta de nuevo en unos minutos."
      });
    }

    // Comparar contraseña
    const isMatch = await bcryptjs.compare(
      password,
      clientFound.password
    );

    if (!isMatch) {
      // Un mismo correo puede tener cuenta de cliente Y de personal, cada una con su contraseña. Si
      // escribió la del personal, se le dice por dónde entrar en vez de "contraseña incorrecta".
      const personal = await buscarPersonal(email);
      if (personal && (await esContrasenaDelPersonal(personal, password))) return aSuPuerta(res);

      clientFound.loginAttemps = (clientFound.loginAttemps || 0) + 1;

      // Bloquear después de 5 intentos
      if (clientFound.loginAttemps >= 5) {
        clientFound.timeOut = Date.now() + 5 * 60 * 1000; // 5 minutos
        clientFound.loginAttemps = 0;

        await clientFound.save();

        return res.status(403).json({
          message: "Cuenta bloqueada por varios intentos fallidos. Espera 5 minutos."
        });
      }

      await clientFound.save();

      return res.status(401).json({
        message: "La contraseña es incorrecta"
      });
    }

    // Reiniciar intentos
    clientFound.loginAttemps = 0;
    clientFound.timeOut = null;

    await clientFound.save();

    // Generar JWT
    const token = jsonwebtoken.sign(
      {
        id: clientFound._id,
        userType: "Client",
      },
      config.JWT.secret,
      {
        expiresIn: "30d",
      }
    );

    // Cookie del ÁREA DE CLIENTE, aparte de la del personal. Con una sola cookie para las dos, entrar
    // como cliente pisaba la sesión de administrador y al revés. Y aquí eso es lo normal, no la
    // excepción: el dueño es cliente de su propia tienda, con el mismo correo en las dos tablas.
    res.cookie("authCookieCliente", token, opcionesCookie(30 * 24 * 60 * 60 * 1000)); // 30 días

    return res.status(200).json({
      message: "Sesión iniciada",
      token,
      userType: "client",
      client: {
        id: clientFound._id,
        fullName: clientFound.fullName,
        email: clientFound.email,
        userName: clientFound.userName,
        image: clientFound.image,
        // Para el candado de los +18: con un DUI ya guardado no se le vuelve a
        // preguntar. La fecha viaja para habilitar el campo DUI en Mi Cuenta.
        dui: clientFound.dui,
        fechaNacimiento: clientFound.fechaNacimiento,
      },
    });

  } catch (error) {
    console.log("error login cliente: ", error);
    return res.status(500).json({
      message: "Error interno del servidor",
    });
  }
};

export default loginClientController;
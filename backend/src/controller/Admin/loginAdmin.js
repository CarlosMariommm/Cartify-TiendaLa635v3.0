import adminModel from "../../models/admin.js";
import { opcionesCookie } from "../../utils/cookieSesion.js";
import employeeModel from "../../models/employee.js";
import bcryptjs from "bcryptjs";
import jsonwebtoken from "jsonwebtoken";
import crypto from "crypto";
import { config } from "../../../config.js";
import HTML2FAEmail from "../../utils/sendMail2FA.js";
import { sendEmail } from "../../utils/sendMailMailjet.js";
import { crearPase, canjearPase } from "../../utils/pasesPanel.js";

const loginAdminController = {};

const TREINTA_DIAS_MS = 30 * 24 * 60 * 60 * 1000;

// Abre la sesión del personal: firma el token, deja la cookie y arma lo que espera el login del
// panel. La usan el código del correo y el pase de la app.
const abrirSesion = (res, cuenta, rol, vidaMs = TREINTA_DIAS_MS) => {
  const token = jsonwebtoken.sign(
    { id: cuenta._id, userType: rol },
    config.JWT.secret,
    { expiresIn: Math.floor(vidaMs / 1000) }
  );
  res.cookie("authCookie", token, opcionesCookie(vidaMs));
  return {
    message: "Sesión iniciada",
    token,
    // Minúscula: es lo que espera AuthContext.login(token, tipo, datos) del
    // frontend para saber en qué cajón guardar la sesión y qué ve cada quien.
    tipo: rol === "Employee" ? "employee" : "admin",
    admin: {
      id: cuenta._id,
      email: cuenta.email,
      userName: cuenta.userName,
      image: cuenta.image,
    },
  };
};

// La huella del código de acceso: HMAC con la clave del servidor. Sin la
// clave no se puede ir de la huella al código.
const huellaDelCodigo = (codigo) =>
  crypto.createHmac("sha256", config.JWT.secret).update(String(codigo)).digest("hex");

// Comparación de tiempo constante: no deja adivinar la huella por lo que tarda.
const mismaHuella = (a, b) => {
  const x = Buffer.from(String(a));
  const y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
};

// LOGIN DEL PERSONAL (Admin Y Empleado) CON DOBLE FACTOR (2FA)
// Una sola puerta para las dos cuentas de personal. El correo dice de cuál se trata: se busca
// primero en admins y, si no está ahí, en empleados.

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Busca la cuenta en UN modelo y aplica las mismas reglas (activa, bloqueo, contraseña) que antes
// solo vivían para el admin. Devuelve { error, message } si algo no pasa, o { cuenta } si todo
// está bien — nunca las dos cosas.
const buscarYValidar = async (modelo, email, password) => {
  const cuenta = await modelo.findOne({ email });
  if (!cuenta) return { error: 404 };

  if (!cuenta.isActive) {
    return { error: 403, message: "La cuenta está desactivada" };
  }
  if (cuenta.timeOut && cuenta.timeOut > Date.now()) {
    return { error: 403, message: "Cuenta bloqueada un rato. Intente de nuevo en unos minutos." };
  }

  const isMatch = await bcryptjs.compare(password, cuenta.password);
  if (!isMatch) {
    cuenta.loginAttemps = (cuenta.loginAttemps || 0) + 1;
    if (cuenta.loginAttemps >= 5) {
      cuenta.timeOut = Date.now() + 5 * 60 * 1000; // 5 minutos
      cuenta.loginAttemps = 0;
      await cuenta.save();
      return { error: 403, message: "Cuenta bloqueada por varios intentos fallidos. Espere 5 minutos." };
    }
    await cuenta.save();
    return { error: 401, message: "La contraseña es incorrecta" };
  }

  cuenta.loginAttemps = 0;
  cuenta.timeOut = null;
  await cuenta.save();
  return { cuenta };
};

// ── PASO 1: correo + contraseña → manda el código ──
loginAdminController.login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !emailRegex.test(email)) {
    return res.status(400).json({ message: "El correo no es válido" });
  }
  if (!password) {
    return res.status(400).json({ message: "Escriba su contraseña" });
  }

  try {
    // Primero admin; si el correo no es de ningún admin, se prueba empleado.
    // El rol lo decide en cuál de los dos se encontró, no lo que mande nadie.
    let resultado = await buscarYValidar(adminModel, email, password);
    let rol = "Admin";

    if (resultado.error === 404) {
      resultado = await buscarYValidar(employeeModel, email, password);
      rol = "Employee";
    }

    if (resultado.error === 404) {
      return res.status(404).json({ message: "No se encontró la cuenta" });
    }
    if (resultado.error) {
      return res.status(resultado.error).json({ message: resultado.message });
    }

    const cuenta = resultado.cuenta;

    const code = ("" + crypto.randomInt(100000, 1000000));

    // En el token va la HUELLA del código, nunca el código. Un JWT está firmado pero NO cifrado:
    // cualquiera que lo tenga lee lo que trae con un base64.
    const twofaToken = jsonwebtoken.sign(
      { id: cuenta._id, huella: huellaDelCodigo(code), rol, purpose: "personal-2fa" },
      config.JWT.secret,
      { expiresIn: "10m" }
    );

    res.cookie("twofaCookie", twofaToken, opcionesCookie(10 * 60 * 1000));

    try {
      await sendEmail(
        cuenta.email,
        "Código de acceso al panel — Tienda la 635",
        HTML2FAEmail(code),
        `Alguien está iniciando sesión en el panel de Tienda la 635. Su código de acceso es: ${code}. Vale por 10 minutos. Si no fue usted, cambie su contraseña.`
      );
    } catch (mailError) {
      console.log("No se pudo enviar el código 2FA:", mailError.message);
      return res.status(500).json({
        message: "No pudimos enviar el código a su correo. Intente de nuevo.",
      });
    }

    const [nombre, dominio] = cuenta.email.split("@");
    const enmascarado = `${nombre.slice(0, 2)}${"*".repeat(Math.max(1, nombre.length - 2))}@${dominio}`;

    return res.status(200).json({
      needs2FA: true,
      message: "Le enviamos un código a su correo",
      email: enmascarado,
      // La app del teléfono no guarda cookies como el navegador: se le da el token para que lo devuelva
      // en el paso 2. Ya no trae el código (solo su huella), así que tenerlo no sirve de nada sin el
      // correo.
      ...(req.body.app ? { twofaToken } : {}),
    });
  } catch (error) {
    console.log("Error login personal:", error);
    return res.status(500).json({ message: "Error interno del servidor" });
  }
};

// ── PASO 2: verifica el código y ABRE la sesión, con el rol correcto ──
loginAdminController.verify2FA = async (req, res) => {
  const { code } = req.body;
  // De la cookie en el navegador; en la app, del cuerpo (ver el paso 1).
  const twofaToken = req.cookies?.twofaCookie || req.body.twofaToken;

  if (!twofaToken) {
    return res.status(400).json({ message: "El código venció. Vuelva a iniciar sesión." });
  }
  if (!code || !String(code).trim()) {
    return res.status(400).json({ message: "Escriba el código que le llegó" });
  }

  let datos;
  try {
    datos = jsonwebtoken.verify(twofaToken, config.JWT.secret);
  } catch {
    return res.status(400).json({ message: "El código venció. Vuelva a iniciar sesión." });
  }

  if (datos.purpose !== "personal-2fa") {
    return res.status(400).json({ message: "Código no válido" });
  }
  if (!datos.huella || !mismaHuella(huellaDelCodigo(String(code).trim()), datos.huella)) {
    return res.status(401).json({ message: "El código no es correcto" });
  }

  try {
    const rol = datos.rol === "Employee" ? "Employee" : "Admin";
    const Modelo = rol === "Employee" ? employeeModel : adminModel;

    const cuenta = await Modelo.findById(datos.id);
    if (!cuenta || !cuenta.isActive) {
      return res.status(403).json({ message: "La cuenta ya no está disponible" });
    }

    const sesion = abrirSesion(res, cuenta, rol);
    res.clearCookie("twofaCookie");
    return res.status(200).json(sesion);
  } catch (error) {
    console.log("Error verificando 2FA personal:", error);
    return res.status(500).json({ message: "Error interno del servidor" });
  }
};

// ── EL PANEL DENTRO DE LA APP ── (ver utils/pasesPanel.js) La sesión que abre el pase dura medio
// día y no un mes: la app pide un pase nuevo cada vez que abre el panel, así que no hace falta que
// la de la web dure más que una jornada de trabajo.
const DOCE_HORAS_MS = 12 * 60 * 60 * 1000;

// La app pide el pase con su sesión (soloAdmin ya la revisó).
loginAdminController.paseApp = (req, res) =>
  res.status(200).json({ pase: crearPase(req.usuario.id) });

// El panel web lo canjea y queda con la sesión abierta.
loginAdminController.canjearPaseApp = async (req, res) => {
  const id = canjearPase(req.body?.pase);
  if (!id) {
    return res.status(400).json({ message: "El acceso venció. Vuelva a abrir el panel desde la app." });
  }
  try {
    const cuenta = await adminModel.findById(id);
    if (!cuenta || !cuenta.isActive) {
      return res.status(403).json({ message: "La cuenta ya no está disponible" });
    }
    return res.status(200).json(abrirSesion(res, cuenta, "Admin", DOCE_HORAS_MS));
  } catch (error) {
    console.log("Error canjeando el pase del panel:", error);
    return res.status(500).json({ message: "Error interno del servidor" });
  }
};

export default loginAdminController;

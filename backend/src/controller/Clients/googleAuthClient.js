import { OAuth2Client } from "google-auth-library";
import { opcionesCookie } from "../../utils/cookieSesion.js";
import jsonwebtoken from "jsonwebtoken";
import clientModel from "../../models/client.js";
import { config } from "../../../config.js";
import { VERSION_TERMINOS, esVerdadero } from "../../utils/terminos.js";

// INICIO DE SESIÓN CON GOOGLE — googleAuthClient.js
// El botón de Google del frontend obtiene un "ID token" firmado por Google y lo manda aquí.

const googleAuthClientController = {};

// Un solo cliente de verificación, reutilizado entre peticiones.
const googleClient = new OAuth2Client(config.google.clientId);

googleAuthClientController.login = async (req, res) => {
  // Además del token de Google viene el consentimiento, pero SOLO cuando esto se usa para
  // registrarse (el botón de la pantalla de Registro). Entrar con una cuenta que ya existe no vuelve
  // a pedir nada.
  const { credential, aceptaTerminos, promociones, phoneNumber, fechaNacimiento, dui } = req.body;

  if (!credential) {
    return res.status(400).json({ message: "Falta el token de Google" });
  }

  if (!config.google.clientId) {
    // Sin CLIENT_ID configurado no se puede verificar nada: mejor avisar claro
    // que dejar pasar un token sin comprobar.
    console.log("GOOGLE_CLIENT_ID no está configurado en el backend");
    return res.status(500).json({ message: "El inicio con Google no está configurado" });
  }

  try {
    // 1- Verificar el token con Google. Si la firma no cuadra o el token es de
    //    otra app, verifyIdToken lanza y caemos al catch como 401.
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: config.google.clientId,
    });

    const payload = ticket.getPayload();
    const email = payload?.email;
    const emailVerificado = payload?.email_verified;

    if (!email || !emailVerificado) {
      return res.status(401).json({ message: "No se pudo verificar el correo de Google" });
    }

    // 2- Buscar el cliente por su correo. El correo es la llave: quien ya tenía
    //    cuenta con ese correo entra a la MISMA, no a una nueva.
    let cliente = await clientModel.findOne({ email });

    if (cliente) {
      // La cuenta existe pero está desactivada: no se deja entrar ni por Google.
      if (!cliente.isActive) {
        return res.status(403).json({ message: "La cuenta está desactivada" });
      }

      // Enlazar una cuenta existente (creada con correo/contraseña) a Google la primera vez que entra
      // por aquí. Se marca verificada —Google ya confirmó el correo— y se guarda el googleId. La
      // contraseña que tuviera no se toca.
      const cambios = {};
      if (!cliente.googleId) cambios.googleId = payload.sub;
      if (!cliente.isVerified) cambios.isVerified = true;
      if (!cliente.image && payload.picture) cambios.image = payload.picture;
      if (Object.keys(cambios).length) {
        cliente = await clientModel.findByIdAndUpdate(cliente._id, cambios, { new: true });
      }
    } else {
      // 3- CUENTA NUEVA, y aquí no se puede tomar el atajo. Entrar con Google prueba QUIÉN es la
      // persona, no que haya aceptado nada. Así que el registro por Google exige lo mismo que el normal.
      if (!esVerdadero(aceptaTerminos)) {
        return res.status(403).json({
          message: "Para crear tu cuenta hay que aceptar los términos y el aviso de privacidad",
          // Lo lee el frontend para llevar a la pantalla de registro en vez de
          // quedarse con un error suelto que no dice qué hacer.
          requiereConsentimiento: true,
          // Se devuelve lo que Google ya confirmó, para no volver a pedirlo.
          sugerido: {
            fullName: payload.name || "",
            email,
            image: payload.picture || "",
          },
        });
      }

      // Sin contraseña: quien entra por Google no la usa. Queda verificada y
      // activa de una vez, porque Google ya confirmó el correo.
      cliente = await clientModel.create({
        fullName: payload.name || "",
        email,
        userName: (email.split("@")[0] || "").toLowerCase(),
        image: payload.picture || "",
        // Lo que Google NO da y la tienda sí necesita. El teléfono es de la tienda: sin él no hay a quién
        // llamar cuando el repartidor no encuentra la casa. La fecha de nacimiento destapa los productos
        // +18.
        ...(phoneNumber ? { phoneNumber: String(phoneNumber).trim() } : {}),
        ...(fechaNacimiento ? { fechaNacimiento: new Date(fechaNacimiento) } : {}),
        ...(String(dui || '').trim() ? { dui: String(dui).trim() } : {}),
        googleId: payload.sub,
        authProvider: "google",
        isVerified: true,
        isActive: true,
        // La versión que se guarda es la del SERVIDOR, igual que en el registro
        // normal: el navegador no decide qué texto se aceptó.
        consentimiento: {
          terminosVersion: VERSION_TERMINOS,
          aceptadoEn: new Date(),
          promociones: esVerdadero(promociones),
        },
        notificationPrefs: {
          promociones: esVerdadero(promociones),
          nuevosProductos: true,
          pedidoCerca: false,
        },
      });
    }

    // 4- Emitir el JWT y la cookie del ÁREA DE CLIENTE, igual que loginClient.
    const token = jsonwebtoken.sign(
      { id: cliente._id, userType: "Client" },
      config.JWT.secret,
      { expiresIn: "30d" }
    );

    res.cookie("authCookieCliente", token, opcionesCookie(30 * 24 * 60 * 60 * 1000)); // 30 días

    return res.status(200).json({
      message: "Sesión iniciada",
      token,
      userType: "client",
      client: {
        id: cliente._id,
        fullName: cliente.fullName,
        email: cliente.email,
        userName: cliente.userName,
        image: cliente.image,
        dui: cliente.dui,
        fechaNacimiento: cliente.fechaNacimiento,
      },
    });

  } catch (error) {
    console.log("error login con Google: ", error?.message || error);
    return res.status(401).json({ message: "No se pudo iniciar sesión con Google" });
  }
};

export default googleAuthClientController;

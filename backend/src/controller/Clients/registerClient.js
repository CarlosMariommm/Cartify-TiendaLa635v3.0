import crypto from "crypto";
import { opcionesCookie } from "../../utils/cookieSesion.js";
import jsonwebtoken from "jsonwebtoken";
import bcryptjs from "bcryptjs";
import clientModel from "../../models/client.js";
import { config } from "../../../config.js";
import { VERSION_TERMINOS, esVerdadero } from "../../utils/terminos.js";
import { sendEmail } from "../../utils/sendMailMailjet.js";

const registerClientController = {};

registerClientController.register = async (req, res) => {
  // 1. Extraer los datos de texto del body (la dirección ya no se pide aquí: las direcciones se
  // administran desde "Mi cuenta").
  const {
    fullName,
    dui,
    phoneNumber,
    email,
    userName,
    password,
    // Fecha de nacimiento (opcional): "YYYY-MM-DD". Para la edad de los +18.
    fechaNacimiento,
    // El consentimiento. Llegan como texto: esto entra por multipart.
    aceptaTerminos,
    promociones
  } = req.body;

  try {
    // Sin aceptación no hay cuenta, y esto se revisa AQUÍ aunque el formulario ya lo revise. La
    // casilla del navegador es una cortesía para la persona, no una garantía para la tienda:
    // cualquiera puede mandar el registro sin pasar por el formulario.
    if (!esVerdadero(aceptaTerminos)) {
      return res.status(400).json({
        message: "Hay que aceptar los términos y el aviso de privacidad"
      });
    }

    const existsClient = await clientModel.findOne({ email });
    if (existsClient) {
      return res.status(400).json({ message: "Ya existe una cuenta con ese correo" });
    }

    const existsUserName = await clientModel.findOne({ userName });
    if (existsUserName) {
      return res.status(400).json({ message: "Ya existe una cuenta con ese nombre de usuario" });
    }

    // El DUI es OPCIONAL: si no viene, se guarda como undefined y no como "".
    const duiLimpio = dui?.trim() ? dui.trim() : undefined;

    if (duiLimpio) {
      const existsDui = await clientModel.findOne({ dui: duiLimpio });
      if (existsDui) {
        return res.status(400).json({ message: "Ya existe una cuenta con ese DUI" });
      }
    }

    // 2. Extraer la imagen directamente de req.file (Igual que en tu CRUD de empleados)
    // Usamos el operador ternario (?) por si el cliente decide registrarse sin foto
    const image = req.file ? req.file.path : "";
    const public_id = req.file ? req.file.filename : "";

    const passwordHashed = await bcryptjs.hash(password, 10);
    const randomNumber = crypto.randomBytes(3).toString("hex");

    // 3. Guardar TODO en el token (incluyendo la imagen y el public_id que vienen de req.file)
    const token = jsonwebtoken.sign(
      {
        randomNumber,
        fullName,
        dui: duiLimpio,
        phoneNumber,
        // Solo se lleva si vino algo: vacío queda undefined, no cadena.
        fechaNacimiento: fechaNacimiento?.trim() ? fechaNacimiento.trim() : undefined,
        image,      // <-- Guardamos la URL de la imagen
        public_id,  // <-- Guardamos el ID de la imagen
        email,
        userName,
        password: passwordHashed,
        // El consentimiento viaja dentro del token junto con lo demás, porque hasta que no se verifica el
        // código no existe ningún documento donde guardarlo.
        terminosVersion: VERSION_TERMINOS,
        aceptadoEn: new Date().toISOString(),
        promociones: esVerdadero(promociones)
      },
      config.JWT.secret,
      { expiresIn: "15m" }
    );

    res.cookie("registrationCookie", token, opcionesCookie(15 * 60 * 1000));

    // 4. Enviar el correo con el código Alternativa en texto plano: un correo que es SOLO html es una
    // de las señales que más pesan para que los filtros de spam lo dejen fuera de la bandeja
    // principal. Mismo contenido, sin el diseño.
    const textoPlano = `Gracias por registrarte en Tienda la 635. Tu código de verificación es: ${randomNumber}. Expira en 15 minutos. Si no solicitaste esto, ignora este correo.`;
    const htmlVerificacion = `
        <!DOCTYPE html>
        <html lang="es">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
          <title>Verificación de cuenta</title>
        </head>
        <body style="margin:0;padding:0;background-color:#f5f5f5;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:40px 0;">
            <tr>
              <td align="center">
                <table width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
                  <!-- HEADER -->
                  <tr>
                    <td style="background:#003049;padding:32px 40px;text-align:center;">
                      <p style="margin:0;font-size:12px;color:#DDECF3;letter-spacing:2px;text-transform:uppercase;">Tienda</p>
                      <h1 style="margin:4px 0 0;font-size:30px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;">la 635</h1>
                    </td>
                  </tr>
                  <!-- BODY -->
                  <tr>
                    <td style="padding:40px 40px 32px;">
                      <h2 style="margin:0 0 12px;font-size:20px;font-weight:700;color:#1a1a1a;">Verifica tu cuenta</h2>
                      <p style="margin:0 0 28px;font-size:15px;color:#555;line-height:1.6;">
                        Gracias por registrarte. Usa el siguiente código de 6 caracteres para confirmar tu correo electrónico. <strong>Expira en 15 minutos.</strong>
                      </p>
                      <!-- CÓDIGO -->
                      <div style="background:#F1F6F9;border:2px dashed #066494;border-radius:10px;padding:24px;text-align:center;margin-bottom:28px;">
                        <p style="margin:0 0 8px;font-size:12px;color:#888;letter-spacing:1px;text-transform:uppercase;">Tu código de verificación</p>
                        <span style="font-size:36px;font-weight:800;color:#003049;letter-spacing:10px;">${randomNumber}</span>
                      </div>
                      <p style="margin:0;font-size:13px;color:#999;line-height:1.6;">
                        Si no solicitaste esta verificación, puedes ignorar este correo con seguridad. Nadie ha accedido a tu cuenta.
                      </p>
                    </td>
                  </tr>
                  <!-- FOOTER -->
                  <tr>
                    <td style="background:#f9f9f9;padding:20px 40px;border-top:1px solid #eeeeee;text-align:center;">
                      <p style="margin:0;font-size:12px;color:#bbb;">© ${new Date().getFullYear()} Tienda la 635. Todos los derechos reservados.</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `;

    try {
      await sendEmail(email, "Verificación de cuenta — Tienda la 635", htmlVerificacion, textoPlano);
    } catch (mailError) {
      console.log("error enviando correo de verificación: " + mailError.message);
      return res.status(500).json({ message: "No se pudo enviar el correo" });
    }

    return res.status(200).json({ message: "Te enviamos el código a tu correo" });
  } catch (error) {
    console.log("error register cliente: " + error);
    return res.status(500).json({ message: "Error interno del servidor" });
  }
};

registerClientController.verifyCode = async (req, res) => {
  try {
    const { verificationCodeRequest } = req.body;
    const token = req.cookies.registrationCookie;

    if (!token) {
      return res.status(400).json({ message: "El registro venció. Vuelve a empezar." });
    }

    const decoded = jsonwebtoken.verify(token, config.JWT.secret);
    
    // 5. Extraemos todo del token, incluyendo la imagen y el public_id
    const {
      randomNumber: storedCode,
      fullName,
      dui,
      phoneNumber,
      fechaNacimiento,
      image,
      public_id,
      email,
      userName,
      password,
      terminosVersion,
      aceptadoEn,
      promociones
    } = decoded;

    if (verificationCodeRequest !== storedCode) {
      return res.status(400).json({ message: "El código no es válido" });
    }

    // 6. Guardamos en la base de datos usando el mismo estilo que tu employeeController
    const newClient = new clientModel({
      fullName,
      // Sin DUI el campo no se crea (ver el comentario en register): así una
      // eventual restricción de unicidad no choca entre clientes sin DUI.
      ...(dui ? { dui } : {}),
      // La fecha de nacimiento solo se guarda si el cliente la dio.
      ...(fechaNacimiento ? { fechaNacimiento } : {}),
      phoneNumber,
      // La lista de direcciones arranca vacía: la llena el cliente desde
      // "Mi cuenta > Direcciones", que es de donde salen las entregas.
      clientAddress: [],
      image,
      public_id,
      email,
      userName,
      password,
      // Lo que aceptó, tal cual venía en el token. Si el token es de ANTES de que existiera el
      // consentimiento —alguien que empezó el registro justo cuando se actualizó el servidor— el bloque
      // no se escribe.
      ...(terminosVersion
        ? {
            consentimiento: {
              terminosVersion,
              aceptadoEn: aceptadoEn || new Date(),
              promociones: !!promociones,
            },
          }
        : {}),
      // La elección de publicidad se copia a las preferencias de notificación, que es de donde las lee
      // la pantalla de "Mi cuenta > Notificaciones".
      notificationPrefs: {
        promociones: !!promociones,
        nuevosProductos: true,
        pedidoCerca: false,
      },
      isVerified: true,
      isActive: true
    });

    await newClient.save();
    res.clearCookie("registrationCookie");

    return res.status(200).json({message: "Cuenta creada"});

  } catch (error) {
    // El token vencido o manipulado cae aquí; el detalle va al log.
    console.log("error verifyCode: "+error);
    return res.status(500).json({message: "Error interno del servidor"});
  }
};
registerClientController.getAll = async (req, res) => {
  try {
    // La lista de clientes que usa el panel (customerService.js), sin la contraseña de nadie.
    const clients = await clientModel.find().select("-password");
    return res.status(200).json(clients);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "No se pudo cargar la lista de clientes" });
  }
};

export default registerClientController;
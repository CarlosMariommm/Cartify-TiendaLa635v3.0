import { isValidObjectId } from "mongoose";
import clientModel from "../../models/client.js";
import { eliminarCliente } from "../../utils/eliminarCliente.js";
import { leerTokenBaja } from "../../utils/tokenBaja.js";
import { esTokenExpo } from "../../utils/pushExpo.js";
import { AVISOS_CORREO, cambiosDePreferencias } from "../../utils/preferenciasAvisos.js";
import { v2 as cloudinary } from "cloudinary";
import bcryptjs from "bcryptjs";


const clientController = {};

// GET ALL CLIENTS
clientController.getClients = async (req, res) => {
  try {
    /*
     * El `-password` no es un adorno: sin él, esta ruta devolvía el HASH de la
     * contraseña de todos los clientes de la tienda, y devolvía la lista
     * entera a quien preguntara, porque hoy ninguna ruta de la API valida a
     * nadie. Un hash no es una contraseña, pero es material para atacarla sin
     * apuro y contra nuestro propio servidor nunca más.
     *
     * getClientById ya lo hacía bien (más abajo); esta se había quedado atrás.
     */
    const clients = await clientModel.find().select("-password");

    return res.status(200).json(clients);

  } catch (error) {
    // El nombre de la función se queda en el log, no en la respuesta:
    // a quien está comprando no le sirve de nada saber que se llama getClients.
    console.log("error getClients: " + error);

    return res.status(500).json({
      message: "Error interno del servidor",
    });
  }
};

// GET ONE CLIENT (por id) — para el área "Mi Cuenta" del cliente.
// Excluimos la contraseña con .select('-password') para no exponer el hash.
clientController.getClientById = async (req, res) => {
  try {
    const client = await clientModel.findById(req.params.id).select("-password");

    if (!client) {
      return res.status(404).json({ message: "No se encontró el cliente" });
    }

    return res.status(200).json(client);

  } catch (error) {
    console.log("error getClientById: " + error);

    return res.status(500).json({
      message: "Error interno del servidor",
    });
  }
};

// UPDATE CLIENT
clientController.updateClient = async (req, res) => {
  try {
    let {
      fullName,
      dui,
      phoneNumber,
      email,
      userName,
      password,
    } = req.body;

    email = email?.trim();
    userName = userName?.trim();

    /*
     * Obligatorios: nombre, teléfono, correo y usuario.
     *
     * El DUI quedó fuera a propósito: es opcional desde el registro y exigirlo
     * aquí impediría corregirle el teléfono a un cliente que nunca lo dio.
     * La dirección también salió: las de entrega se editan por su propio
     * endpoint (updateAddresses), no por este.
     */
    if (!fullName || !phoneNumber || !email || !userName) {
      return res.status(400).json({
        message: "Faltan campos obligatorios",
      });
    }

    const clientFound = await clientModel.findById(req.params.id);

    if (!clientFound) {
      return res.status(404).json({
        message: "No se encontró el cliente",
      });
    }

    const updatedData = {
      fullName,
      phoneNumber,
      email,
      userName,
    };

    /*
     * El DUI es opcional. Si viene con algo se guarda; si viene vacío se
     * BORRA el campo con $unset en vez de dejar una cadena "". Son veinte
     * clientes con el mismo "" lo que rompería un índice único el día que
     * alguien lo agregue; sin el campo, ese índice los ignora a todos.
     */
    if (dui !== undefined) {
      if (dui?.trim()) updatedData.dui = dui.trim();
      else updatedData.$unset = { ...(updatedData.$unset || {}), dui: 1 };
    }

    // Solo actualizar la contraseña si viene una nueva
    if (password && password.trim() !== "") {
      updatedData.password = await bcryptjs.hash(password, 10);
    }

    // Si viene una nueva imagen
    if (req.file) {

      // Eliminar la imagen anterior
      if (clientFound.public_id) {
        await cloudinary.uploader.destroy(clientFound.public_id);
      }

      updatedData.image = req.file.path;
      updatedData.public_id = req.file.filename;
    }

    const updatedClient = await clientModel.findByIdAndUpdate(
      req.params.id,
      updatedData,
      { new: true }
    );

    return res.status(200).json({
      message: "Cliente actualizado",
      client: updatedClient,
    });

  } catch (error) {
    console.log("error updateClient:", error);

    return res.status(500).json({
      message: "Error interno del servidor",
    });
  }
};

// DELETE CLIENT
/*
 * Borra la cuenta y sus datos personales, y deja sus pedidos en la
 * contabilidad sin nada que lo identifique. Todo lo que eso implica vive en
 * utils/eliminarCliente.js. Con un pedido en curso, no se puede (409).
 */
clientController.deleteClient = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(404).json({ message: "No se encontró el cliente" });
    }

    const r = await eliminarCliente(req.params.id);
    if (!r.ok) return res.status(r.codigo).json({ message: r.message });

    return res.status(200).json({
      message: "Cliente eliminado",
      resumen: r.resumen,
    });

  } catch (error) {
    console.log("error deleteClient: " + error);

    return res.status(500).json({
      message: "Error interno del servidor",
    });
  }
};

// UPDATE PROFILE (self) — el cliente edita SUS datos básicos desde "Mi Cuenta".
// Acepta tanto JSON (los campos de texto) como multipart con una imagen: el
// campo "image" es opcional, y cuando llega se sube igual que en updateClient
// (admin) — se borra la anterior de Cloudinary antes de guardar la nueva.
clientController.updateClientProfile = async (req, res) => {
  try {
    const { fullName, userName, email, phoneNumber, fechaNacimiento, dui } = req.body;

    const updates = {};
    if (fullName !== undefined) updates.fullName = fullName;
    if (userName !== undefined) updates.userName = userName;
    if (email !== undefined) updates.email = email?.trim();
    if (phoneNumber !== undefined) updates.phoneNumber = phoneNumber;

    // Fecha de nacimiento: vacío la borra, con valor la guarda (para la edad +18).
    if (fechaNacimiento !== undefined) {
      if (fechaNacimiento) updates.fechaNacimiento = fechaNacimiento;
      else updates.$unset = { ...(updates.$unset || {}), fechaNacimiento: 1 };
    }

    /*
     * DUI opcional, mismo criterio que en el registro: vacío BORRA el campo con
     * $unset en vez de dejar "", para no chocar contra un eventual índice único.
     */
    if (dui !== undefined) {
      if (dui?.trim()) updates.dui = dui.trim();
      else updates.$unset = { ...(updates.$unset || {}), dui: 1 };
    }

    if (req.file) {
      const clientFound = await clientModel.findById(req.params.id);
      if (!clientFound) {
        return res.status(404).json({ message: "No se encontró el cliente" });
      }
      if (clientFound.public_id) {
        await cloudinary.uploader.destroy(clientFound.public_id);
      }
      updates.image = req.file.path;
      updates.public_id = req.file.filename;
    }

    const updated = await clientModel
      .findByIdAndUpdate(req.params.id, updates, { new: true })
      .select("-password");

    if (!updated) {
      return res.status(404).json({ message: "No se encontró el cliente" });
    }

    return res.status(200).json({ message: "Perfil actualizado", client: updated });

  } catch (error) {
    console.log("error updateClientProfile: " + error);
    return res.status(500).json({
      message: "Error interno del servidor",
    });
  }
};

// El cliente reemplaza su lista de direcciones de entrega (área "Mi Cuenta").
// clientAddress es un arreglo de strings; aquí lo sobrescribimos completo.
/*
 * Los favoritos del cliente, con el producto ya poblado: la pantalla de
 * "Mis favoritos" necesita nombre, precio e imagen, no una lista de ids.
 */
clientController.getFavorites = async (req, res) => {
  try {
    const cliente = await clientModel
      .findById(req.params.id)
      .populate({
        path: "favorites",
        populate: [
          { path: "brandId", select: "name" },
          { path: "typeId", select: "type" },
          { path: "moduleId", select: "name" },
        ],
      })
      .select("favorites");

    if (!cliente) return res.status(404).json({ message: "No se encontró el cliente" });

    /*
     * Se filtran los nulos: si borraron un producto que alguien tenía en
     * favoritos, la referencia queda colgando y populate devuelve null. Sin
     * esto, la pantalla reventaba al leer el nombre de un producto que ya no
     * existe.
     */
    const favoritos = (cliente.favorites || []).filter(Boolean);
    return res.status(200).json(favoritos);
  } catch (error) {
    console.log("error getFavorites: " + error);
    return res.status(500).json({ message: "Error interno del servidor" });
  }
};

/*
 * Marca o desmarca un producto. Un solo endpoint para los dos casos: el
 * cliente aprieta el mismo corazón para poner y quitar, y así no hay forma de
 * que el frontend y la base se desincronicen sobre cuál era el estado.
 */
clientController.toggleFavorite = async (req, res) => {
  try {
    const { productId } = req.body;
    if (!productId) {
      return res.status(400).json({ message: "Falta el producto" });
    }

    const cliente = await clientModel.findById(req.params.id).select("favorites");
    if (!cliente) return res.status(404).json({ message: "No se encontró el cliente" });

    const actuales = (cliente.favorites || []).map(String);
    const yaEsta = actuales.includes(String(productId));

    const nuevos = yaEsta
      ? actuales.filter((id) => id !== String(productId))
      : [...actuales, productId];

    await clientModel.findByIdAndUpdate(req.params.id, { favorites: nuevos });

    return res.status(200).json({
      message: yaEsta ? "Quitado de favoritos" : "Agregado a favoritos",
      esFavorito: !yaEsta,
      favorites: nuevos,
    });
  } catch (error) {
    console.log("error toggleFavorite: " + error);
    return res.status(500).json({ message: "Error interno del servidor" });
  }
};

clientController.updateAddresses = async (req, res) => {
  try {
    const { addresses } = req.body;

    if (!Array.isArray(addresses)) {
      return res.status(400).json({ message: "addresses debe ser un arreglo" });
    }

    const updated = await clientModel
      .findByIdAndUpdate(req.params.id, { clientAddress: addresses }, { new: true })
      .select("-password");

    if (!updated) {
      return res.status(404).json({ message: "No se encontró el cliente" });
    }

    return res.status(200).json({ message: "Direcciones actualizadas", client: updated });

  } catch (error) {
    console.log("error updateAddresses: " + error);
    return res.status(500).json({
      message: "Error interno del servidor",
    });
  }
};

// El cliente reemplaza su lista de métodos de pago (datos no sensibles).
clientController.updatePaymentMethods = async (req, res) => {
  try {
    const { paymentMethods } = req.body;

    if (!Array.isArray(paymentMethods)) {
      return res.status(400).json({ message: "paymentMethods debe ser un arreglo" });
    }

    /*
     * Blindaje: guardamos SOLO campos no sensibles, aunque el front mande de
     * más. Si alguien manda el número completo o el CVV, no hay campo donde
     * caigan: de `last4` se quedan solo los últimos 4 dígitos.
     */
    const MARCAS = ["visa", "mastercard", "amex", "discover", "otra"];
    const limpios = paymentMethods.map((m) => {
      const esEfectivo = m.type === "efectivo";
      const base = {
        type: esEfectivo ? "efectivo" : "tarjeta",
        alias: String(m.alias || "").trim().slice(0, 40),
        last4: String(m.last4 || "").replace(/\D/g, "").slice(-4),
      };
      if (esEfectivo) return base;

      const mes = Number(m.expMonth);
      const anio = Number(m.expYear);
      return {
        ...base,
        brand: MARCAS.includes(m.brand) ? m.brand : "otra",
        cardType: ["credito", "debito"].includes(m.cardType) ? m.cardType : "",
        holder: String(m.holder || "").trim().toUpperCase().slice(0, 40),
        // Las tarjetas viejas (de antes de estos campos) no traen vencimiento
        // y se guardan sin él, no se rechazan.
        expMonth: Number.isInteger(mes) && mes >= 1 && mes <= 12 ? mes : undefined,
        expYear: Number.isInteger(anio) && anio >= 2000 && anio <= 2100 ? anio : undefined,
      };
    });

    const updated = await clientModel
      .findByIdAndUpdate(req.params.id, { paymentMethods: limpios }, { new: true })
      .select("-password");

    if (!updated) {
      return res.status(404).json({ message: "No se encontró el cliente" });
    }

    return res.status(200).json({ message: "Métodos de pago actualizados", client: updated });

  } catch (error) {
    console.log("error updatePaymentMethods: " + error);
    return res.status(500).json({
      message: "Error interno del servidor",
    });
  }
};

/*
 * El cliente actualiza sus preferencias de notificación (interruptores): por
 * correo (`correo`) y en la app (`app`), cada uno por su lado. Ver
 * utils/preferenciasAvisos.js.
 */
clientController.updateNotifications = async (req, res) => {
  try {
    // Notación de punto: solo se toca la preferencia que cambió.
    const prefs = cambiosDePreferencias(req.body);
    if (!Object.keys(prefs).length) {
      return res.status(400).json({ message: "No llegó ninguna preferencia para guardar" });
    }

    const updated = await clientModel
      .findByIdAndUpdate(req.params.id, { $set: prefs }, { new: true })
      .select("-password");

    if (!updated) {
      return res.status(404).json({ message: "No se encontró el cliente" });
    }

    return res.status(200).json({ message: "Preferencias actualizadas", client: updated });

  } catch (error) {
    console.log("error updateNotifications: " + error);
    return res.status(500).json({
      message: "Error interno del servidor",
    });
  }
};

/*
 * EL TELÉFONO DICE DÓNDE ENCONTRARLO.
 *
 * Lo llama la app al conceder el permiso de avisos, con el token que le dio
 * Expo. Es el complemento de las preferencias de arriba: aquellas dicen QUÉ
 * avisos quiere, esto A DÓNDE mandarlos.
 *
 * Se agrega con $addToSet y no con push: abrir la app diez veces no tiene por
 * qué dejar diez veces el mismo token. Y se manda `activo: false` al cerrar
 * sesión — el aparato sigue siendo el mismo, pero ya no es de esta cuenta, y
 * seguir avisándole ahí sería contarle a quien se quedó con el teléfono que
 * el pedido de otro va en camino.
 */
clientController.updatePushToken = async (req, res) => {
  try {
    const { token, activo = true } = req.body;

    // Un token con otra cara no es de Expo: no se guarda. Ver esTokenExpo.
    if (!esTokenExpo(token)) {
      return res.status(400).json({ message: "Token de avisos inválido" });
    }

    const cambio = activo
      ? { $addToSet: { pushTokens: token.trim() } }
      : { $pull: { pushTokens: token.trim() } };

    const updated = await clientModel.findByIdAndUpdate(req.params.id, cambio, { new: true });

    if (!updated) {
      return res.status(404).json({ message: "No se encontró el cliente" });
    }

    return res.status(200).json({
      message: activo ? "Este teléfono va a recibir los avisos" : "Este teléfono ya no recibe avisos",
    });

  } catch (error) {
    console.log("error updatePushToken: " + error);
    return res.status(500).json({
      message: "Error interno del servidor",
    });
  }
};

/*
 * DARSE DE BAJA DE UN AVISO, SIN INICIAR SESIÓN.
 *
 * El enlace del pie de los correos cae aquí. NO lleva middleware de sesión a
 * propósito: pedirle a alguien que se loguee para dejar de recibir correos que
 * no pidió es la forma elegante de no dejarlo salir. Quien no se acuerda de su
 * contraseña se da de baja marcando el correo como spam, y eso le cuesta a la
 * tienda mucho más caro que perder un suscriptor.
 *
 * Lo que hace de puerta es el token firmado: solo el servidor puede fabricarlo
 * y nadie puede fabricar el de otra persona. Ver utils/tokenBaja.js.
 */
clientController.bajaNotificacion = async (req, res) => {
  try {
    /*
     * El token viene del CUERPO cuando lo manda la pantalla /baja (alguien
     * leyendo el correo, tocando el enlace) — o de la URL cuando lo manda el
     * propio cliente de correo (Gmail, Outlook) con el botón "Cancelar
     * suscripción" que pone junto al remitente. Ese botón NO carga ninguna
     * pantalla: manda un POST directo a la URL del encabezado List-Unsubscribe
     * con un cuerpo fijo que no controlamos, así que el token tiene que venir
     * ya puesto en la URL. Ver la ruta /notificaciones/baja/:token y
     * utils/tokenBaja.js.
     */
    const datos = leerTokenBaja(req.params?.token || req.body?.token);
    if (!datos) {
      return res.status(400).json({
        message: "Este enlace ya no sirve. Puedes apagar los avisos desde Mi Cuenta > Notificaciones.",
      });
    }

    /*
     * Solo se apaga lo que traía ese correo, y solo POR CORREO. Quien se cansó
     * de las promociones no está pidiendo que dejen de avisarle cuando su
     * pedido va en camino, ni que su teléfono deje de avisarle de las ofertas
     * (eso se apaga aparte, en `avisosApp`) — apagárselo todo de una sería
     * decidir por él.
     */
    const clave = AVISOS_CORREO.includes(datos.clave) ? datos.clave : "promociones";

    const actualizado = await clientModel
      .findByIdAndUpdate(datos.id, { $set: { [`notificationPrefs.${clave}`]: false } }, { new: true })
      .select("email notificationPrefs");

    if (!actualizado) {
      return res.status(404).json({ message: "Esa cuenta ya no existe" });
    }

    return res.status(200).json({ message: "Listo, ya no te llegarán esos correos", clave });
  } catch (error) {
    console.log("error bajaNotificacion: " + error);
    return res.status(500).json({ message: "Error interno del servidor" });
  }
};

export default clientController;
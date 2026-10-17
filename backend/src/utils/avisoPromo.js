// AVISAR DE UNA PROMOCIÓN NUEVA — avisoPromo.js
// Cuando la tienda publica una promoción, les escribe a los clientes que pidieron enterarse. El
// controlador dispara esto y responde de una.

import promotionModel from "../models/promotion.js";
import clientModel from "../models/client.js";
import { identidadDeLaTienda } from "./avisosCliente.js";
import { enlaceDeBaja, enlaceDeBajaUnClic } from "./tokenBaja.js";
import { sendEmail } from "./sendMailMailjet.js";
import { plantillaCorreoPromo } from "./plantillaCorreoPromo.js";
import { enviarPushEnSegundoPlano, esTokenExpo } from "./pushExpo.js";
import { quiereEnLaApp } from "./preferenciasAvisos.js";

// De los items de la promo a lo que la plantilla sabe pintar. El precio de oferta se calcula AQUÍ
// y no se lee de ningún lado, por lo mismo que el carrito no confía en el precio que manda el
// navegador: el número que va en el correo tiene que ser el que se va a cobrar.
const armarItems = (promo) =>
  (promo.items || [])
    // Un producto borrado del inventario deja su item huérfano: populate
    // devuelve null y en el correo saldría una fila en blanco con precio $0.00.
    .filter((item) => item.productId)
    .map((item) => {
      const producto = item.productId;
      const precio = Number(producto.salePrice) || 0;

      let precioOferta = null;
      if (promo.type === "descuento" && Number(item.discount) > 0) {
        precioOferta = Number((precio * (1 - Number(item.discount) / 100)).toFixed(2));
      } else if (promo.type === "precio_fijo" && item.fixedPrice != null && item.fixedPrice !== "") {
        precioOferta = Number(item.fixedPrice);
      }
      // 'nxm' y 'anuncio' no tocan el precio unitario: el ahorro del nxm lo
      // hace el carrito al cobrar, y el anuncio no rebaja nada.

      return {
        // Para cruzarlo con los favoritos de cada cliente (aviso del teléfono).
        id: String(producto._id || ""),
        nombre: producto.name || "Producto",
        imagen: Array.isArray(producto.image) ? producto.image[0] : producto.image,
        precio,
        precioOferta,
        descuento: Number(item.discount) || 0,
      };
    });

// ── Lo que dice la notificación del teléfono ──
// Un texto corto, aparte del correo: el título lleva el gancho de la promo y el cuerpo lo justo
// para que den ganas de abrirla.
const MAX_TITULO = 40;
const MAX_CUERPO = 45;

// La misma promo siempre elige la misma variante (así se puede probar y no cambia si se reenvía).
const elegir = (opciones, semilla) => {
  const n = [...String(semilla)].reduce((a, c) => a + c.charCodeAt(0), 0);
  return opciones[n % opciones.length];
};

// Por si algún día una plantilla se pasa: se corta en una palabra, nunca a media.
const caber = (texto, max) => {
  if (texto.length <= max) return texto;
  const corto = texto.slice(0, max - 1);
  return `${corto.slice(0, corto.lastIndexOf(" ")).replace(/[,.:;¿¡]+$/, "")}…`;
};

const DIA = 24 * 60 * 60 * 1000;

export const textoDelPush = (promo, items) => {
  const semilla = String(promo._id || promo.title || "");
  const descuentos = items.map((i) => i.descuento).filter((d) => d > 0);
  const maximo = descuentos.length ? Math.max(...descuentos) : 0;
  const parejo = descuentos.length === items.length && new Set(descuentos).size === 1;

  let titulo;
  if (promo.type === "nxm") {
    const nxm = `${Number(promo.buyQty) || 2}x${Number(promo.payQty) || 1}`;
    titulo = elegir([`Tenemos un ${nxm} para ti`, `Llegó un ${nxm} a la tienda`], semilla);
  } else if (promo.type === "descuento" && maximo > 0) {
    titulo = parejo
      ? elegir([`${maximo}% menos, solo en la tienda`, `Tenemos ${maximo}% menos para ti`], semilla)
      : `Hasta ${maximo}% menos en la tienda`;
  } else if (promo.type === "precio_fijo") {
    titulo = elegir(["Tenemos un precio especial", "Bajamos un precio para ti"], semilla);
  } else {
    titulo = elegir(["Llegó algo nuevo a la tienda", "Tenemos una novedad para ti"], semilla);
  }

  let cuerpo;
  const vence = promo.endsAt ? new Date(promo.endsAt) : null;
  const faltan = vence ? vence.getTime() - Date.now() : Infinity;
  if (faltan < DIA) {
    cuerpo = "Solo por hoy. Toca para verlo.";
  } else if (faltan < 7 * DIA) {
    const dia = vence.toLocaleDateString("es-SV", { weekday: "long", timeZone: "America/El_Salvador" });
    cuerpo = `Solo hasta el ${dia}. Toca para verlo.`;
  } else if (promo.type === "anuncio") {
    cuerpo = "Toca para ver qué es.";
  } else if (items.length > 1) {
    cuerpo = `Son ${items.length} productos. ¿Adivina cuáles?`;
  } else {
    cuerpo = "¿En qué producto? Toca y descúbrelo.";
  }

  return { titulo: caber(titulo, MAX_TITULO), cuerpo: caber(cuerpo, MAX_CUERPO) };
};

// El aviso de quien tiene en favoritos algo de la promo: ese sí dice qué es, porque es justo lo
// que estaba esperando.
export const textoDeFavoritos = (nombres) => {
  if (nombres.length === 1) {
    const conLlamado = `${nombres[0]}. Toca para verlo.`;
    return {
      titulo: "Uno de tus favoritos está en oferta",
      cuerpo: conLlamado.length <= MAX_CUERPO ? conLlamado : caber(nombres[0], MAX_CUERPO),
    };
  }
  return {
    titulo: caber(`${nombres.length} de tus favoritos están en oferta`, MAX_TITULO),
    cuerpo: caber(nombres.join(", "), MAX_CUERPO),
  };
};

// Quién recibe cuál, en el teléfono. Quien tiene un favorito en la promo (y ese aviso encendido)
// recibe el suyo; los demás, el general si tienen las promociones encendidas en la app. Nadie
// recibe los dos. Los del mismo favorito van juntos: es el mismo texto, sale en un solo envío.
export const repartirPushDeLaPromo = (clientes, items) => {
  const generales = new Set();
  const porFavoritos = new Map();

  for (const cliente of clientes) {
    const tokens = (cliente.pushTokens || []).filter(esTokenExpo);
    if (!tokens.length) continue;

    const favoritos = new Set((cliente.favorites || []).map(String));
    const suyos = quiereEnLaApp(cliente, "favoritosEnOferta")
      ? items.filter((i) => favoritos.has(i.id)).map((i) => i.nombre)
      : [];

    if (suyos.length) {
      const clave = suyos.join("\n");
      if (!porFavoritos.has(clave)) porFavoritos.set(clave, { nombres: suyos, tokens: [] });
      porFavoritos.get(clave).tokens.push(...tokens);
    } else if (quiereEnLaApp(cliente, "promociones")) {
      tokens.forEach((t) => generales.add(t));
    }
  }

  const favoritos = [...porFavoritos.values()];
  // Un teléfono con dos cuentas no recibe el general además del de su favorito.
  favoritos.forEach((g) => g.tokens.forEach((t) => generales.delete(t)));
  return { generales: [...generales], favoritos };
};

// Los clientes con la app que podrían recibir algo de esta promo.
const clientesConLaApp = () =>
  clientModel
    .find({
      isActive: { $ne: false },
      pushTokens: { $exists: true, $ne: [] },
      $or: [
        { "avisosApp.promociones": { $ne: false } },
        { "avisosApp.favoritosEnOferta": { $ne: false } },
      ],
    })
    .select("+pushTokens avisosApp favorites")
    .lean();

// Los destinatarios. Solo el correo: no hace falta traerse la cuenta entera de cada cliente —con
// sus direcciones y sus métodos de pago— para mandar un volante.
const buscarDestinatarios = async () => {
  const clientes = await clientModel
    .find({
      // $ne: false y no true a secas. Los clientes de antes de que existieran las preferencias no tienen
      // el campo, y con `: true` habrían quedado fuera todos ellos — que son justamente los de siempre.
      "notificationPrefs.promociones": { $ne: false },
      isActive: { $ne: false },
      isVerified: true,
      email: { $exists: true, $nin: [null, ""] },
    })
    .select("email")
    .lean();

  // Sin repetidos, y devolviendo el ID además del correo: el enlace de "dejar de recibirlos" lleva
  // un token firmado con el id de quien lo recibe, así que el correo se arma por persona. Ver
  // utils/tokenBaja.js.
  const vistos = new Set();
  return clientes.filter((c) => {
    const correo = (c.email || "").trim().toLowerCase();
    if (!correo || vistos.has(correo)) return false;
    vistos.add(correo);
    return true;
  });
};

// Manda el aviso de UNA promoción. @param {string} promoId @returns {Promise<{enviados:number,
// fallidos:number, motivo?:string}>} Se devuelve el resumen —en vez de no devolver nada— para
// poder probarlo con un script sin tener que leer la consola.
export const avisarPromoNueva = async (promoId) => {
  const promo = await promotionModel.findById(promoId).populate("items.productId");

  if (!promo) return { enviados: 0, fallidos: 0, motivo: "la promoción ya no existe" };

  // UNA sola vez por promoción. Si mañana alguien la edita —para corregir una palabra del título—
  // nadie tiene que recibir el mismo volante otra vez.
  if (promo.avisoEnviadoEn) {
    return { enviados: 0, fallidos: 0, motivo: "ya se había avisado de esta promoción" };
  }

  // Una promo apagada, sin banner o ya vencida no se anuncia. La de "sin banner" es a propósito: ese
  // es el descuento silencioso, el que la tienda aplica sin publicarlo (ver el modelo). Anunciarlo
  // por correo sería exactamente lo contrario de lo que pidió.
  if (!promo.isActive) return { enviados: 0, fallidos: 0, motivo: "la promoción está apagada" };
  if (!promo.showBanner) return { enviados: 0, fallidos: 0, motivo: "es un descuento silencioso" };
  if (promo.endsAt && new Date(promo.endsAt) < new Date()) {
    return { enviados: 0, fallidos: 0, motivo: "la promoción ya venció" };
  }

  const items = armarItems(promo);
  if (!items.length) return { enviados: 0, fallidos: 0, motivo: "la promoción quedó sin productos" };

  // El volante, también al teléfono. Sale una sola vez por promo igual que el correo — lo garantiza
  // el `avisoEnviadoEn` de más arriba, que ya cortó si esta promo se anunció.
  const { generales, favoritos } = repartirPushDeLaPromo(await clientesConLaApp(), items);
  const datos = { tipo: "promo", promoId: String(promo._id || "") };
  // Corto y con misterio, para la vista previa del teléfono (ver textoDelPush).
  enviarPushEnSegundoPlano(generales, { ...textoDelPush(promo, items), datos });
  favoritos.forEach((grupo) => {
    enviarPushEnSegundoPlano(grupo.tokens, { ...textoDeFavoritos(grupo.nombres), datos });
  });

  const correos = await buscarDestinatarios();
  if (!correos.length) {
    // Sin nadie a quien escribirle, pero el push ya salió: la promo queda marcada igual. Sin esto,
    // editarle una coma mañana la haría sonar de nuevo en todos los teléfonos — que es justo lo que el
    // `avisoEnviadoEn` existe para evitar.
    await promotionModel.findByIdAndUpdate(promoId, { $set: { avisoEnviadoEn: new Date() } });
    return { enviados: 0, fallidos: 0, motivo: "nadie tiene las promociones encendidas por correo" };
  }

  // El nombre, y el logo si el dueño cargó uno: el correo tiene que decir de
  // qué tienda es antes de decir qué ofrece.
  const tienda = await identidadDeLaTienda();

  // De uno en uno, no todos de golpe. Un Promise.all sobre trescientos correos le dispara
  // trescientas peticiones simultáneas a Mailjet, que responde 429 y tira a la basura la mitad de la
  // lista.
  let enviados = 0;
  let fallidos = 0;

  for (const cliente of correos) {
    const para = cliente.email;
    try {
      const { asunto, html, texto } = plantillaCorreoPromo({
        promo,
        items,
        tienda,
        enlaceBaja: enlaceDeBaja(cliente._id, "promociones"),
      });
      // List-Unsubscribe: el botón que Gmail/Outlook/Yahoo ponen junto al remitente, sin abrir ninguna
      // página.
      const headers = {
        "List-Unsubscribe": `<${enlaceDeBajaUnClic(cliente._id, "promociones")}>`,
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      };
      await sendEmail(para, asunto, html, texto, undefined, headers);
      enviados++;
    } catch (error) {
      // Un correo rebotado no puede frenar a los otros doscientos.
      fallidos++;
      console.log(`aviso de promo: no se pudo enviar a ${para}: ${error.message}`);
    }
  }

  // Se marca aunque hayan fallado algunos: la alternativa es reintentar la lista completa la próxima
  // vez y volver a escribirle a los que sí recibieron.
  await promotionModel.findByIdAndUpdate(promoId, { $set: { avisoEnviadoEn: new Date() } });

  console.log(`aviso de promo "${promo.title || promo.promoDescription}": ${enviados} enviados, ${fallidos} fallidos`);
  return { enviados, fallidos };
};

// La versión que llama el controlador: dispara y se olvida. El `.catch` no es opcional. Sin él,
// cualquier tropiezo aquí adentro es una promesa rechazada sin dueño, y Node se lleva el proceso
// entero por delante — o sea, la tienda se cae porque un correo no salió.
export const avisarPromoNuevaEnSegundoPlano = (promoId) => {
  avisarPromoNueva(promoId).catch((error) => {
    console.log("aviso de promo: falló el envío completo: " + error);
  });
};

export default avisarPromoNueva;

/*
 * ============================================================
 * LOS AVISOS QUE SUENAN EN EL TELÉFONO — pushExpo.js
 * ============================================================
 * El hermano de sendMailMailjet.js: el mismo aviso que ya sale por correo,
 * empujado a la app. No decide NADA sobre a quién avisar ni cuándo — eso
 * sigue viviendo en avisosCliente.js y avisoPromo.js, que son los que leen
 * las preferencias del cliente. Aquí solo está el cómo se manda.
 *
 * ── Por qué no hay SDK ──
 *
 * `expo-server-sdk` es un POST con una lista de mensajes y un reintento. Node
 * 22 trae `fetch` de fábrica, así que la dependencia entera se ahorra por
 * cuarenta líneas — y de paso el backend no queda atado a las versiones de
 * Expo, que cambian con cada SDK.
 *
 * ── De a cien, no de a mil ──
 *
 * Expo acepta hasta 100 mensajes por petición y devuelve un "ticket" por
 * cada uno. Mandar la lista entera de golpe no es más rápido: es un 400.
 *
 * ── Los tokens se limpian solos ──
 *
 * Cuando alguien desinstala la app, su token sigue existiendo pero Expo
 * contesta `DeviceNotRegistered`. Ese token se borra de la cuenta en el acto.
 * Sin esto, la lista de destinos solo crece: al año, la mitad de los avisos
 * se estarían mandando a teléfonos que ya no existen.
 *
 * ── Nada de esto puede tumbar la tienda ──
 *
 * Mismo criterio que los correos: el push sale DESPUÉS de que la acción ya se
 * guardó, en segundo plano y con su propio catch. Si Expo está caído, el
 * pedido igual quedó marcado como "en camino".
 * ============================================================
 */

import clientModel from "../models/client.js";
import adminModel from "../models/admin.js";
import employeeModel from "../models/employee.js";

const URL_EXPO = "https://exp.host/--/api/v2/push/send";

// El tope que acepta Expo por petición.
const TAMANO_LOTE = 100;

/*
 * El formato que emite `getExpoPushTokenAsync()`. Se valida ANTES de guardar
 * y antes de mandar: un token con otra cara no es un token de Expo, y no vale
 * la pena gastarle una petición ni un renglón en la base.
 *
 * `ExponentPushToken[...]` es el de siempre; `ExpoPushToken[...]` también sale
 * en algunas versiones y es igual de válido.
 */
export const esTokenExpo = (token) =>
  typeof token === "string" && /^Expo(nent)?PushToken\[[^\]]+\]$/.test(token.trim());

/*
 * Los teléfonos de quien tiene encendido ESTE aviso.
 *
 * Las mismas dos reglas que `destinatariosDe` en avisosCliente.js, y por las
 * mismas razones: `$ne: false` para los avisos que nacen encendidos (quien se
 * registró antes de que existieran las preferencias no tiene el campo), y
 * `true` exacto para `pedidoCerca`, que nace apagado y donde "no tengo el
 * campo" significa "no lo pedí".
 */
export const dispositivosDe = async (preferencia, exigirTrue = false) => {
  const clientes = await clientModel
    .find({
      [`notificationPrefs.${preferencia}`]: exigirTrue ? true : { $ne: false },
      isActive: { $ne: false },
      pushTokens: { $exists: true, $ne: [] },
    })
    .select("+pushTokens")
    .lean();

  // Sin repetidos: la misma cuenta abierta dos veces en el mismo aparato no
  // tiene por qué sonar dos veces.
  return [...new Set(clientes.flatMap((c) => c.pushTokens || []).filter(esTokenExpo))];
};

/*
 * Saca de las cuentas los tokens que Expo ya dio por muertos. Va sin await
 * del lado de quien envía: limpiar es mantenimiento, no parte del aviso.
 * De las tres: el personal también apunta su teléfono (avisosPersonal.js).
 */
const olvidarTokens = async (tokens) => {
  if (!tokens.length) return;
  try {
    await Promise.all([clientModel, adminModel, employeeModel].map((Modelo) =>
      Modelo.updateMany(
        { pushTokens: { $in: tokens } },
        { $pull: { pushTokens: { $in: tokens } } }
      )
    ));
    console.log(`push: ${tokens.length} token(s) muerto(s) dados de baja`);
  } catch (error) {
    console.log("push: no se pudieron limpiar los tokens muertos: " + error.message);
  }
};

/*
 * Manda el MISMO aviso a una lista de teléfonos.
 *
 * `datos` viaja como carga útil y no se ve: es lo que lee la app para saber a
 * qué pantalla llevar cuando alguien toca la notificación (ver
 * movil/src/utils/notificaciones.js). Un aviso que al tocarlo abre la portada
 * y te deja buscando el pedido a mano está a medio hacer.
 */
/*
 * `canal`: por dónde suena en Android. "pedidos" es el de prioridad alta (sale
 * como globo arriba de la pantalla: es lo que la persona está esperando);
 * "avisos", el de siempre, para promociones y productos nuevos, que no tienen
 * por qué interrumpir. Los dos los crea la app al arrancar. "tienda", también
 * de prioridad alta, es el de los pedidos nuevos que le llegan al personal, y
 * la app solo lo crea en el modo personal.
 */
const CANALES_URGENTES = ["pedidos", "tienda"];

export const enviarPush = async (tokens, { titulo, cuerpo, datos = {}, canal = "avisos" }) => {
  const destinos = [...new Set((tokens || []).filter(esTokenExpo))];
  if (!destinos.length) return { enviados: 0, fallidos: 0 };

  let enviados = 0;
  let fallidos = 0;
  const muertos = [];

  for (let i = 0; i < destinos.length; i += TAMANO_LOTE) {
    const lote = destinos.slice(i, i + TAMANO_LOTE);

    const mensajes = lote.map((to) => ({
      to,
      sound: "default",
      title: titulo,
      body: cuerpo,
      data: datos,
      // El canal tiene que existir en el teléfono o Android manda el aviso a
      // uno por defecto sin sonido. Lo crea la app al arrancar.
      channelId: canal,
      // Los de pedidos van con prioridad alta: que lleguen al momento aunque
      // el teléfono esté ahorrando batería.
      priority: CANALES_URGENTES.includes(canal) ? "high" : "default",
    }));

    try {
      const r = await fetch(URL_EXPO, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          accept: "application/json",
          "accept-encoding": "gzip, deflate",
        },
        body: JSON.stringify(mensajes),
      });

      const respuesta = await r.json();
      const tickets = Array.isArray(respuesta?.data) ? respuesta.data : [];

      /*
       * Un ticket "ok" no quiere decir que el aviso ya sonó: quiere decir que
       * Expo lo tomó. El resultado final se consulta después con el id del
       * ticket, y eso no se hace aquí a propósito — para un aviso de tienda,
       * saber que salió alcanza; montar el sondeo de recibos sería pedirle a
       * este archivo que fuera un sistema de colas.
       */
      tickets.forEach((ticket, indice) => {
        if (ticket?.status === "ok") {
          enviados++;
          return;
        }
        fallidos++;
        if (ticket?.details?.error === "DeviceNotRegistered") muertos.push(lote[indice]);
        else console.log(`push: ticket con error (${ticket?.details?.error || ticket?.message})`);
      });

      // Sin tickets (un 4xx entero, por ejemplo) el lote completo falló.
      if (!tickets.length) {
        fallidos += lote.length;
        console.log(`push: Expo no devolvió tickets (${r.status}) ${respuesta?.errors?.[0]?.message || ""}`);
      }
    } catch (error) {
      // Un lote caído no puede frenar a los siguientes.
      fallidos += lote.length;
      console.log("push: falló un lote: " + error.message);
    }
  }

  olvidarTokens(muertos);

  console.log(`push: ${enviados} entregados a Expo, ${fallidos} fallidos`);
  return { enviados, fallidos };
};

/*
 * La versión de disparar y olvidar, igual que `avisarPedidoEnCaminoEnSegundoPlano`.
 * El catch no es opcional: una promesa rechazada sin dueño se lleva el proceso
 * de Node por delante, o sea que la tienda se caería porque un aviso no salió.
 */
export const enviarPushEnSegundoPlano = (tokens, contenido) => {
  enviarPush(tokens, contenido).catch((error) => {
    console.log("push: falló el envío: " + error.message);
  });
};

export default enviarPush;

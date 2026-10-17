// LOS AVISOS QUE SUENAN EN EL TELÉFONO — pushExpo.js
// El hermano de sendMailMailjet.js: el mismo aviso que ya sale por correo, empujado a la app.

import clientModel from "../models/client.js";
import adminModel from "../models/admin.js";
import employeeModel from "../models/employee.js";

const URL_EXPO = "https://exp.host/--/api/v2/push/send";

// El tope que acepta Expo por petición.
const TAMANO_LOTE = 100;

// El formato que emite `getExpoPushTokenAsync()`. Se valida ANTES de guardar y antes de mandar: un
// token con otra cara no es un token de Expo, y no vale la pena gastarle una petición ni un
// renglón en la base.
export const esTokenExpo = (token) =>
  typeof token === "string" && /^Expo(nent)?PushToken\[[^\]]+\]$/.test(token.trim());

// Los teléfonos de quien tiene encendido ESTE aviso EN LA APP. Mira `avisosApp`, no
// `notificationPrefs` (que son los correos): apagar el correo de las promociones no apaga su
// notificación, ni al revés. Ver utils/preferenciasAvisos.js.
export const dispositivosDe = async (preferencia) => {
  const clientes = await clientModel
    .find({
      [`avisosApp.${preferencia}`]: { $ne: false },
      isActive: { $ne: false },
      pushTokens: { $exists: true, $ne: [] },
    })
    .select("+pushTokens")
    .lean();

  // Sin repetidos: la misma cuenta abierta dos veces en el mismo aparato no
  // tiene por qué sonar dos veces.
  return [...new Set(clientes.flatMap((c) => c.pushTokens || []).filter(esTokenExpo))];
};

// Saca de las cuentas los tokens que Expo ya dio por muertos. Va sin await del lado de quien
// envía: limpiar es mantenimiento, no parte del aviso. De las tres: el personal también apunta su
// teléfono (avisosPersonal.js).
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

// Manda el mismo aviso a una lista de teléfonos. `datos` lo lee la app para saber a qué pantalla
// llevar; `canal` decide cómo suena en Android ("pedidos" con prioridad alta, "avisos" normal).
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

      // Un ticket "ok" no quiere decir que el aviso ya sonó: quiere decir que Expo lo tomó.
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

// La versión de disparar y olvidar, igual que `avisarPedidoEnCaminoEnSegundoPlano`. El catch no es
// opcional: una promesa rechazada sin dueño se lleva el proceso de Node por delante, o sea que la
// tienda se caería porque un aviso no salió.
export const enviarPushEnSegundoPlano = (tokens, contenido) => {
  enviarPush(tokens, contenido).catch((error) => {
    console.log("push: falló el envío: " + error.message);
  });
};

export default enviarPush;

/*
 * ============================================================
 * LOS AVISOS DEL PERSONAL — avisosPersonal.js
 * ============================================================
 * Cada pedido que entra suena en el teléfono de quien trabaja en la tienda
 * (administrador o empleado), mientras tenga la sesión abierta en la app.
 * Antes había que tener el panel abierto y estar mirándolo para enterarse.
 *
 * ── Un teléfono, una persona ──
 *
 * El teléfono se apunta al entrar al modo personal de la app (PUT
 * /perfil/avisos) y se borra al cerrar sesión (POST /logoutAdmin con el
 * token del aviso). Al apuntarlo se le quita a cualquier otra cuenta del
 * personal que lo tuviera: si el empleado le pasa el teléfono al dueño, los
 * avisos son del que entró último, no de los dos.
 *
 * La baja va en el cierre de sesión, que no pide sesión válida, a propósito:
 * si la sesión ya venció, la app igual tiene que poder decir "aquí ya no".
 * Lo peor que puede hacer alguien con un token ajeno es quitarle los avisos a
 * ese teléfono, y para eso tendría que conocerlo: no viaja a ningún lado más.
 *
 * ── Quién NO recibe ──
 *
 * El pedido que el personal cobra en caja a nombre de un cliente: lo hizo
 * alguien de la tienda, con el cliente enfrente (ver identificarComprador).
 * ============================================================
 */

import adminModel from "../models/admin.js";
import employeeModel from "../models/employee.js";
import clientModel from "../models/client.js";
import { enviarPushEnSegundoPlano, esTokenExpo } from "./pushExpo.js";

const MODELOS = [adminModel, employeeModel];

// En la barra del teléfono no entra más: un nombre larguísimo se corta.
const LARGO_NOMBRE = 32;

const nombreCorto = (nombre) => {
  const limpio = String(nombre || "").trim().replace(/\s+/g, " ");
  return limpio.length > LARGO_NOMBRE ? `${limpio.slice(0, LARGO_NOMBRE - 1)}…` : limpio;
};

/*
 * Lo que dice el aviso. El total va en el título porque es lo primero que se
 * pregunta; el cuerpo dice de quién es y qué hay que hacer con él (llevarlo o
 * dejarlo listo en el mostrador).
 */
export const textoPedidoNuevo = (pedido, nombreCliente = "") => {
  const precio = `$${(Number(pedido?.total) || 0).toFixed(2)}`;
  const quien = nombreCorto(nombreCliente);

  if (pedido?.channel === "impresion") {
    return {
      titulo: `Impresión nueva · ${precio}`,
      cuerpo: [quien, pedido?.items?.[0]?.name].filter(Boolean).join(" · "),
    };
  }

  const renglones = Array.isArray(pedido?.items) ? pedido.items.length : 0;
  const entrega = pedido?.deliveryType === "delivery"
    ? "A domicilio"
    : pedido?.channel === "kiosco" ? "Desde el kiosco" : "Para recoger en la tienda";

  return {
    titulo: `Pedido nuevo · ${precio}`,
    cuerpo: [quien, entrega, renglones === 1 ? "1 producto" : `${renglones} productos`]
      .filter(Boolean)
      .join(" · "),
  };
};

// Los teléfonos de todo el personal activo que tiene la sesión abierta en la app.
export const dispositivosDelPersonal = async () => {
  const cuentas = await Promise.all(
    MODELOS.map((Modelo) =>
      Modelo.find({ isActive: { $ne: false }, pushTokens: { $exists: true, $ne: [] } })
        .select("+pushTokens")
        .lean()
    )
  );
  return [...new Set(cuentas.flat().flatMap((c) => c.pushTokens || []).filter(esTokenExpo))];
};

// Este teléfono avisa a ESTA cuenta, y a ninguna otra del personal.
export const anotarTelefono = async (Modelo, id, token) => {
  await Promise.all(
    MODELOS.map((M) =>
      M.updateMany(
        M === Modelo ? { pushTokens: token, _id: { $ne: id } } : { pushTokens: token },
        { $pull: { pushTokens: token } }
      )
    )
  );
  await Modelo.updateOne({ _id: id }, { $addToSet: { pushTokens: token } });
};

// Al cerrar sesión: este teléfono ya no es de nadie del personal.
export const olvidarTelefono = async (token) => {
  await Promise.all(
    MODELOS.map((M) => M.updateMany({ pushTokens: token }, { $pull: { pushTokens: token } }))
  );
};

/*
 * Por el canal "tienda" (lo crea la app solo en el modo personal): prioridad
 * alta, sale como globo arriba de la pantalla aunque se esté en otra app.
 *
 * `datos` es lo que lee la app al tocarlo: a domicilio lleva al Reparto; para
 * recoger, a Pedidos del panel (ver pages/personal/ModoPersonal.js).
 */
export const avisarPedidoNuevo = async (pedido) => {
  const tokens = await dispositivosDelPersonal();
  if (!tokens.length) return { enviados: 0 };

  const idCliente = pedido?.clientId?._id || pedido?.clientId;
  const cliente = idCliente
    ? await clientModel.findById(idCliente).select("fullName").lean()
    : null;

  enviarPushEnSegundoPlano(tokens, {
    ...textoPedidoNuevo(pedido, cliente?.fullName),
    canal: "tienda",
    datos: {
      tipo: "pedidoNuevo",
      pedidoId: String(pedido?._id || ""),
      entrega: pedido?.deliveryType || "retiro",
      canal: pedido?.channel || "web",
    },
  });
  return { enviados: tokens.length };
};

/*
 * La que llama el controlador: dispara y se olvida. El pedido ya se guardó;
 * que el aviso no salga no puede convertirlo en un error.
 */
export const avisarPedidoNuevoEnSegundoPlano = (pedido) => {
  avisarPedidoNuevo(pedido).catch((error) => {
    console.log("aviso de pedido nuevo al personal: falló el envío: " + error);
  });
};

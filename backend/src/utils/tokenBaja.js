import jsonwebtoken from "jsonwebtoken";
import { config } from "../../config.js";

// EL ENLACE PARA DARSE DE BAJA — tokenBaja.js
// "Dejar de recibirlos" tiene que funcionar de UN clic, sin pedir la contraseña.

const PROPOSITO = "baja-notificaciones";

export const firmarTokenBaja = (clienteId, clave) =>
  jsonwebtoken.sign(
    { id: String(clienteId), clave, proposito: PROPOSITO },
    config.JWT.secret,
    { expiresIn: "365d" }
  );

// @returns {{ id: string, clave: string } | null} — null si el token es falso, venció o es de otra
// cosa (un token de sesión, por ejemplo). El `proposito` es lo que impide que una cookie de sesión
// robada sirva para esto.
export const leerTokenBaja = (token) => {
  try {
    const datos = jsonwebtoken.verify(token, config.JWT.secret);
    if (datos?.proposito !== PROPOSITO) return null;
    return { id: datos.id, clave: datos.clave };
  } catch {
    return null;
  }
};

// La dirección completa que va en el pie del correo. La pantalla del frontend lee el token de la
// URL y le pide al servidor que lo aplique.
export const enlaceDeBaja = (clienteId, clave) =>
  `${config.tienda.url}/baja?t=${encodeURIComponent(firmarTokenBaja(clienteId, clave))}`;

// La MISMA baja, pero para el botón del propio correo (List-Unsubscribe, un clic — ver
// routes/client.js). Va directo a la API y no a la pantalla del frontend: el cliente de correo no
// renderiza nada, solo manda un POST y espera un 200.
export const enlaceDeBajaUnClic = (clienteId, clave) =>
  `${config.tienda.url}/api/client/notificaciones/baja/${encodeURIComponent(firmarTokenBaja(clienteId, clave))}`;

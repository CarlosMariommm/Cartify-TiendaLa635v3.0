import jsonwebtoken from "jsonwebtoken";
import { config } from "../../config.js";

// VALIDAR SESIÓN — validarSesion.js
// El portero que la API no tenía.

// Los tipos que firma el login. Ver loginClient.js y loginAdmin.js.
export const PERSONAL = ["Admin", "Employee"];
export const CLIENTE = ["Client"];
// Solo el dueño. Un empleado con sesión válida de personal NO entra aquí.
export const ADMIN = ["Admin"];

/*
 * `permitidos` vacío = basta con tener sesión, de la clase que sea.
 */
export const validarSesion =
  (permitidos = []) =>
  (req, res, next) => {
    const dePersonal = req.cookies?.authCookie;
    const deCliente = req.cookies?.authCookieCliente;

    // Cuál cookie se mira, y en qué orden. Si la ruta es de personal se mira la del personal primero;
    // si es del cliente, la suya. Cuando no se pide nada en concreto valen las dos.
    const pidePersonal = permitidos.some((t) => PERSONAL.includes(t));
    const candidatas = permitidos.length === 0
      ? [deCliente, dePersonal]
      : pidePersonal
        ? [dePersonal]
        : [deCliente];

    // La app móvil no tiene cookies —fetch en React Native no las administra solo, como sí hace un
    // navegador— así que manda el mismo token por el header Authorization: Bearer <token>.
    const deCabecera = req.headers.authorization?.startsWith("Bearer ")
      ? req.headers.authorization.slice(7)
      : null;

    const token = candidatas.find(Boolean) || deCabecera;

    if (!token) {
      return res.status(401).json({ message: "Inicia sesión para continuar" });
    }

    try {
      const datos = jsonwebtoken.verify(token, config.JWT.secret);

      if (permitidos.length && !permitidos.includes(datos.userType)) {
        return res.status(403).json({ message: "No tiene permiso para esta acción" });
      }

      // Queda a mano para el controlador: así una ruta puede comprobar que el id de la URL sea el de
      // quien pregunta, y no el de otro cliente.
      req.usuario = { id: datos.id, tipo: datos.userType };
      return next();
    } catch {
      // Token vencido o manipulado. Se responde 401 y no 403 a propósito: el interceptor del frontend ya
      // traduce el 401 a "Sesión expirada o inválida", que es exactamente lo que pasó.
      return res.status(401).json({ message: "Tu sesión venció. Vuelve a iniciar sesión." });
    }
  };

// Atajos, para que las rutas se lean de un vistazo.
export const soloPersonal = validarSesion(PERSONAL);
export const soloCliente = validarSesion(CLIENTE);
export const conSesion = validarSesion();
// `soloAdmin` — lo que un empleado NO debe poder tocar: inventario, precios, proveedores,
// promociones, empleados, clientes, ajustes de la tienda.
export const soloAdmin = validarSesion(ADMIN);

// "Tiene que ser SUYO." Tener sesión no alcanza cuando el id va en la URL: sin esta comprobación,
// cualquier cliente con cuenta lee o edita lo de otro con solo cambiar el número de la dirección —
// sus direcciones, sus métodos de pago, su saldo.
export const duenoOPersonal = (nombreParam = "id") => [
  conSesion,
  (req, res, next) => {
    if (req.usuario.tipo !== "Client") return next();

    if (req.usuario.id !== req.params[nombreParam]) {
      return res.status(403).json({ message: "No tiene permiso para esta acción" });
    }
    return next();
  },
];

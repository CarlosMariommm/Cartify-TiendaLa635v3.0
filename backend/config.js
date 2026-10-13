import dotenv from "dotenv";

//Ejecutamos la libreria dotenv
dotenv.config();

/*
 * La tienda publicada. Es el respaldo de TIENDA_URL cuando el backend corre en
 * Render sin esa variable: antes el respaldo era siempre localhost, así que el
 * botón "Ver la promoción" de los correos llevaba a http://localhost:5173 —
 * una dirección que en el teléfono del cliente no abre nada.
 *
 * Render define RENDER=true en todos sus servicios; en la computadora de
 * desarrollo no existe, y ahí sí conviene el puerto de Vite.
 */
const TIENDA_PUBLICADA = "https://cartify-tienda-la635.vercel.app";
const urlDeLaTienda =
  process.env.TIENDA_URL || (process.env.RENDER ? TIENDA_PUBLICADA : "http://localhost:5173");

export const config = {
  db: {
    URI: process.env.DB_URI,
  },
  JWT: {
    secret: process.env.JWT_secret_key,
  },
  email:{
    user_email: process.env.USER_EMAIL,
    user_password: process.env.USER_PASSWORD
  },
    cloudinary: {
    cloudinary_name: process.env.CLOUDINARY_CLOUD_NAME,
    cloudinary_api_key: process.env.CLOUDINARY_API_KEY,
    cloudinary_api_secret: process.env.CLOUDINARY_API_SECRET
  },
  wompi:{
    grant_type: process.env.GRANT_TYPE,
    audience: process.env.AUDIENCE,
    client_id: process.env.CLIENT_ID,
    client_secret: process.env.CLIENT_SECRET
  },
  // Inicio de sesión con Google (clientes). El CLIENT_ID es el mismo que usa el
  // botón del frontend; el backend lo usa como "audience" para verificar que el
  // token de Google se emitió para ESTA app y no para otra.
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID
  },
  /*
   * Mailjet: manda los correos por su API HTTPS en vez de SMTP (puertos
   * 465/587), que Render bloquea en el plan gratis para frenar spam masivo.
   * Con SMTP el correo funciona en local y se cae mudo en producción; con la
   * API el mismo código sirve en los dos lados. Ver src/utils/sendMailMailjet.js.
   */
  mailjet: {
    apiKey: process.env.apikeymail,
    secretKey: process.env.apisecretmail,
    fromEmail: process.env.MAILJET_FROM_EMAIL,
    fromName: process.env.MAILJET_FROM_NAME
  },
  /*
   * La tienda vista desde afuera. Hace falta para los correos: un aviso de
   * promoción sin un enlace en el que se pueda dar clic es un volante que no
   * lleva a ninguna parte, y el servidor no tiene forma de adivinar en qué
   * dirección la abrió el cliente.
   *
   * TIENDA_URL va SIN barra al final (ej. https://la635.com); si alguien la
   * escribe con barra, la quitamos aquí y no en cada plantilla. En local no
   * hace falta configurarla: el valor por defecto es el puerto de Vite.
   */
  tienda: {
    url: urlDeLaTienda.replace(/\/+$/, ""),
    nombre: process.env.TIENDA_NOMBRE || "Tienda la 635"
  },
  /*
   * La ruta por las calles que ve el cliente mientras le llevan su pedido
   * (OpenRouteService, plan gratis). Sin llave no se dibuja la línea y el
   * mapa queda con sus dos puntos, como antes. Ver src/utils/rutaReparto.js.
   */
  rutas: {
    llave: process.env.OPENROUTESERVICE_API_KEY || ""
  },
  // El servicio de analítica en Python (analitica/): dónde está y la clave
  // que comparten. Sin URL, el pronóstico dice que no está conectado.
  analitica: {
    url: (process.env.ANALITICA_URL || "").replace(/\/+$/, ""),
    clave: process.env.ANALITICA_CLAVE || ""
  }
};

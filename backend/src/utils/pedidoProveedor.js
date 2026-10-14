/*
 * ============================================================
 * POR DÓNDE SE LE PIDE A CADA PROVEEDOR — pedidoProveedor.js
 * ============================================================
 * Cada proveedor guarda cómo se le hacen los pedidos, para que desde la
 * compra sugerida del pronóstico el pedido salga con un toque:
 *
 *   whatsapp  se abre WhatsApp con el mensaje ya escrito (a su número; si no
 *             tiene, se elige el contacto);
 *   app       se abre su app o sitio (BEES, por ejemplo) con la lista ya
 *             copiada para pegarla en el carrito;
 *   llamada   se marca su teléfono.
 *
 * BEES (la app de compras de AB InBev) no tiene una API pública: no se puede
 * mandar el pedido solo, por eso se abre con la lista lista para pegar.
 *
 * Aquí solo se limpia lo que llega del formulario: nada de enlaces raros
 * (javascript:, data:) ni números con letras.
 * ============================================================
 */

export const CANALES_DE_PEDIDO = ["whatsapp", "app", "llamada"];

const LARGO_APP = 30;
const LARGO_ENLACE = 300;

// Solo direcciones web de verdad: http o https, con un sitio.
const enlaceSeguro = (texto) => {
  const valor = String(texto || "").trim().slice(0, LARGO_ENLACE);
  if (!valor) return "";
  try {
    const url = new URL(valor);
    return ["http:", "https:"].includes(url.protocol) && url.hostname.includes(".") ? url.href : null;
  } catch {
    return null;
  }
};

/*
 * Lo que manda el formulario → lo que se guarda, o un error que se le puede
 * decir a la persona. `undefined` si no vino nada (no se toca lo guardado).
 */
export const limpiarPedidos = (entrada) => {
  if (entrada === undefined) return { pedidos: undefined };
  if (!entrada || typeof entrada !== "object") return { pedidos: { canal: "", whatsapp: "", app: "", enlace: "" } };

  const canal = CANALES_DE_PEDIDO.includes(entrada.canal) ? entrada.canal : "";
  let whatsapp = String(entrada.whatsapp || "").replace(/\D/g, "").slice(0, 15);
  const app = String(entrada.app || "").trim().slice(0, LARGO_APP);
  let enlace = enlaceSeguro(entrada.enlace);

  /*
   * Lo del canal elegido tiene que estar bien; lo que quedó escrito de otro
   * canal (eligió "app", escribió algo y se pasó a WhatsApp) no frena el
   * guardado: si no sirve, se descarta.
   */
  if (enlace === null) {
    if (canal === "app") return { error: "El enlace de la app tiene que ser una dirección web (https://…)" };
    enlace = "";
  }
  if (canal === "app" && !enlace) return { error: "Falta el enlace de la app o sitio donde se le pide" };
  if (whatsapp && whatsapp.length < 8) {
    if (canal === "whatsapp") return { error: "El número de WhatsApp está incompleto" };
    whatsapp = "";
  }

  return { pedidos: { canal, whatsapp, app, enlace } };
};

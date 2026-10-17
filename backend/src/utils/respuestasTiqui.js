// LO QUE TIQUI CONTESTA SOLA — respuestasTiqui.js
// Cuando la IA propia (intencionesTiqui.js) reconoce algo sencillo con confianza, Tiqui contesta
// aquí mismo, al instante y sin Gemini.

// Desde cuánta confianza contesta sola. Medido con las frases de prueba
// (analitica/intenciones): con 70% contesta el 91% de lo sencillo y no hace
// ninguna acción que no se pidió. Cuando Gemini falla, alcanza con 50%.
export const UMBRAL_DIRECTO = 0.7;
export const UMBRAL_RESPALDO = 0.5;

const SECCION_DE = {
  pedidos: "pedidos", puntos: "puntos", favoritos: "favoritos", recibos: "recibos",
  direcciones: "direcciones", metodos_pago: "pagos", cuenta: "cuenta",
};
const NOMBRE_DE = {
  pedidos: "tus pedidos", puntos: "tus puntos", favoritos: "tus favoritos", recibos: "tus recibos",
  direcciones: "tus direcciones", pagos: "tus métodos de pago", cuenta: "tu cuenta",
};
const AL_ABRIR = {
  pedidos: "Te abro tus pedidos: ahí ves en qué va cada uno.",
  puntos: "Te abro tus puntos.",
  favoritos: "Te abro tus favoritos.",
  recibos: "Te abro tus recibos.",
  direcciones: "Te abro tus direcciones.",
  pagos: "Te abro tus métodos de pago.",
  cuenta: "Te abro tu cuenta.",
};
const SIN_EL_DATO = "Eso no lo tengo a la mano. Escríbenos por WhatsApp desde el botón verde de la tienda y te dicen.";

const plata = (n) => `$${Number(n).toFixed(2)}`;
const unaDe = (lista, azar) => lista[Math.floor(azar() * lista.length) % lista.length];

// "oferta $1.19 (5% menos)" → "Coca-Cola a $1.19"; "lleva 2 y paga 1" → "Churritos, lleva 2 y paga 1".
export const ofertaDicha = ({ nombre, oferta }) => {
  const precio = String(oferta || "").match(/^oferta (\$[\d.,]+)/);
  if (precio) return `${nombre} a ${precio[1]}`;
  return oferta ? `${nombre}, ${oferta}` : nombre;
};

const decirOfertas = (ofertas) => {
  if (!ofertas.length) {
    return { respuesta: "Hoy no tengo promociones, pero si quieres te recomiendo algo.", animo: "apenada" };
  }
  const primeras = ofertas.slice(0, 2).map(ofertaDicha);
  const resto = ofertas.length > 2 ? " Hay más en las promociones de la tienda." : "";
  return {
    respuesta: `Hoy tengo en oferta ${primeras.join(" y ")}.${resto} ¿Te agrego alguna?`,
    animo: "asombrada",
  };
};

// `intencion`: la que reconoció la IA propia.
export const respuestaDirecta = (intencion, { tienda = {}, ofertas = [], nombre = "", azar = Math.random } = {}) => {
  const conSesion = Boolean(nombre);
  switch (intencion) {
    case "saludo":
      return {
        acciones: [],
        respuesta: unaDe(["¡Hola! Soy Tiqui. ¿Qué te traigo hoy?", "¡Hola! Aquí estoy, lista para ayudarte. ¿Qué buscas hoy?"], azar),
        animo: "alegre",
      };
    case "despedida":
      return {
        acciones: [],
        respuesta: unaDe(["¡Con gusto! Aquí estoy cuando me necesites.", "¡Gracias a ti! Que te vaya bonito."], azar),
        animo: "alegre",
      };
    case "ayuda":
      return {
        acciones: [],
        respuesta: "Puedo agregar productos a tu carrito, contarte las ofertas, decirte tu total, llevarte a pagar o abrir tus pedidos y tus puntos. Solo dímelo.",
        animo: "normal",
      };
    // La web y la app dicen lo que lleva y cuánto suma, con la cuenta exacta.
    case "total":
    case "carrito":
      return { acciones: [{ tipo: "total" }], respuesta: "Déjame ver tu cuenta.", animo: "normal" };
    case "pagar":
      return { acciones: [{ tipo: "comprar" }], respuesta: "¡Vamos a pagar!", animo: "emocionada" };
    case "ofertas":
      return { acciones: [], ...decirOfertas(ofertas) };
    case "horario":
      return tienda.horario
        ? { acciones: [], respuesta: `Atendemos ${tienda.horario}.`, animo: "normal" }
        : { acciones: [], respuesta: SIN_EL_DATO, animo: "apenada" };
    case "ubicacion":
      return tienda.direccion
        ? { acciones: [], respuesta: `Estamos en ${tienda.direccion}.`, animo: "normal" }
        : { acciones: [], respuesta: SIN_EL_DATO, animo: "apenada" };
    case "contacto": {
      const partes = [
        tienda.whatsapp && `Nuestro WhatsApp es ${tienda.whatsapp}.`,
        tienda.telefono && tienda.telefono !== tienda.whatsapp && `El teléfono es ${tienda.telefono}.`,
      ].filter(Boolean);
      return partes.length
        ? { acciones: [], respuesta: partes.join(" "), animo: "normal" }
        : { acciones: [], respuesta: "Puedes escribirnos por WhatsApp desde el botón verde de la tienda.", animo: "normal" };
    }
    case "envio":
      return tienda.envioBase != null
        ? {
          acciones: [],
          respuesta: `Sí, llevamos a domicilio: ${plata(tienda.envioBase)} de base más ${plata(tienda.envioPorKm ?? 0)} por kilómetro. También puedes recoger en la tienda.`,
          animo: "normal",
        }
        : { acciones: [], respuesta: "Puedes pedir a domicilio o recoger en la tienda. El costo del envío te sale al pagar.", animo: "normal" };
    case "nombre":
      return conSesion
        ? { acciones: [], respuesta: `Te llamas ${nombre}.`, animo: "alegre" }
        : { acciones: [], respuesta: "Todavía no sé tu nombre. Si entras con tu cuenta, lo sabré.", animo: "normal" };
    default: {
      const seccion = SECCION_DE[intencion];
      if (!seccion) return null;
      return {
        // Sin sesión también va la acción: la web lleva al login y vuelve ahí.
        acciones: [{ tipo: "seccion", seccion }],
        respuesta: conSesion ? AL_ABRIR[seccion] : `Para ver ${NOMBRE_DE[seccion]}, primero entra con tu cuenta.`,
        animo: "normal",
      };
    }
  }
};

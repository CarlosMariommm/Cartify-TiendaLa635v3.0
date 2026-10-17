// LOS DISFRACES DE TIQUI — disfracesTiqui.js
// Revisa y guarda el disfraz de Tiqui de cada temporada (cabeza, cara, cuello, colores y rubor)
// que el dueño arma en Personalización.

export const PIEZAS_POR_RANURA = {
  cabeza: [
    "gorro-navidad", "sombrero-bruja", "gorro-fiesta", "gorro-estrella",
    "corona", "birrete", "sombrero-copa", "gorra", "mono", "flor",
  ],
  cara: ["lentes", "lentes-sol", "antifaz", "lentes-estrella"],
  cuello: ["corbatin", "bufanda", "corbata", "collar-flores", "medalla"],
};

// Las 4 temporadas de fábrica más las 12 propias que se pueden crear.
export const MAXIMO_DE_DISFRACES = 16;

const ES_HEX = /^#[0-9a-fA-F]{6}$/;
// Las claves de las temporadas: "navidad", "propia-regreso-a-clases". Sin
// puntos ni "$", que en Mongo no pueden ir en el nombre de un campo.
const CLAVE_VALIDA = /^[a-z0-9-]{1,60}$/;

const NO_VALIDOS = "Los disfraces de Tiqui no son válidos";
const esObjeto = (v) => !!v && typeof v === "object" && !Array.isArray(v);

// Revisa y limpia los disfraces que manda el panel. Devuelve { disfraces } o { error } con un
// mensaje para el dueño. Un disfraz sin ninguna pieza es válido: quiere decir que en esa temporada
// Tiqui va sin disfraz.
export const limpiarDisfraces = (entrada) => {
  if (!esObjeto(entrada)) return { error: NO_VALIDOS };
  const claves = Object.keys(entrada);
  if (claves.length > MAXIMO_DE_DISFRACES) {
    return { error: `Se pueden guardar hasta ${MAXIMO_DE_DISFRACES} disfraces de Tiqui` };
  }

  const disfraces = {};
  for (const clave of claves) {
    const disfraz = entrada[clave];
    if (!CLAVE_VALIDA.test(clave) || !esObjeto(disfraz)) return { error: NO_VALIDOS };

    const limpio = { rubor: disfraz.rubor === true };
    for (const [ranura, tipos] of Object.entries(PIEZAS_POR_RANURA)) {
      const pieza = disfraz[ranura];
      if (pieza === null || pieza === undefined) {
        limpio[ranura] = null;
        continue;
      }
      if (!esObjeto(pieza) || !tipos.includes(pieza.tipo)) {
        return { error: "Una de las piezas del disfraz no existe" };
      }
      if (!ES_HEX.test(pieza.principal || "") || !ES_HEX.test(pieza.acento || "")) {
        return { error: "Los colores del disfraz tienen que ser como #C1121F" };
      }
      limpio[ranura] = {
        tipo: pieza.tipo,
        principal: pieza.principal.toUpperCase(),
        acento: pieza.acento.toUpperCase(),
      };
    }
    disfraces[clave] = limpio;
  }
  return { disfraces };
};

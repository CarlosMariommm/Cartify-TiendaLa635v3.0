/*
 * ============================================================
 * EL ANILLO DE PROMOCIONES — anillo.js
 * ============================================================
 * Las cuentas del carrusel de promociones, separadas de la pantalla para
 * poder probarlas. Son las MISMAS que la web (usePromoCarousel.js y el
 * ANILLO de PromoBanners.jsx): la del centro de frente y las de los lados
 * giradas hacia adentro, como los discos de una rocola.
 *
 * La web empuja las de los lados hacia atrás con translateZ. React Native no
 * tiene translateZ, así que esa distancia se convierte en lo que el ojo ve de
 * ella: la tarjeta se achica y se acerca al centro en la misma proporción que
 * la achicaría la perspectiva.
 * ============================================================
 */

// Cada cuánto avanza sola, y cuántas entran al carrusel (igual que la web).
export const INTERVALO_ANILLO = 5000;
export const MAXIMO_ANUNCIOS = 9;

export const ANILLO = {
  SEPARACION: 0.46,   // fracción del ancho de la tarjeta que se corre cada paso
  GIRO: 42,           // grados de giro de las de los lados
  ENCOGE: 0.08,
  APAGA: 0.35,
  PROFUNDIDAD: 180,   // px que se alejan del ojo en la web
  PERSPECTIVA: 1250,
};

/*
 * Las más nuevas primero y solo nueve: si la tienda arma una promo hoy, quiere
 * que se vea, no que quede detrás de una de hace tres meses. Las que no entran
 * igual aplican su descuento: lo que se limita es el anuncio, no la promo.
 */
export const ordenarAnuncios = (visibles, maximo = MAXIMO_ANUNCIOS) =>
  [...(Array.isArray(visibles) ? visibles : [])]
    .sort((a, b) => new Date(b?.createdAt || 0) - new Date(a?.createdAt || 0))
    .slice(0, maximo);

// El índice real de un paso que puede ser negativo o pasarse del total.
export const indiceEnAnillo = (paso, total) =>
  total > 0 ? ((Math.round(paso) % total) + total) % total : 0;

/*
 * Distancia de una tarjeta al centro, por el camino más corto, en (-total/2,
 * total/2]. Con 5 promos y la 0 al frente, la 4 está a -1 (no a +4): el anillo
 * gira para el lado que menos se mueve. Acepta posiciones con decimales (a
 * medio deslizar) y pasos que ya dieron varias vueltas.
 */
export const distanciaEnAnillo = (i, posicion, total) => {
  if (total <= 0) return 0;
  const mitad = total / 2;
  const resto = (((mitad - (i - posicion)) % total) + total) % total;
  return mitad - resto;
};

// Lo que la web hace con translateZ: cuánto se achica a esa profundidad.
const lejania = (ad) => ANILLO.PERSPECTIVA / (ANILLO.PERSPECTIVA + ad * ANILLO.PROFUNDIDAD);

/*
 * Cómo se ve una tarjeta a distancia d del centro. `x` va en fracción del
 * ancho de la tarjeta. Más allá de un paso (|d| > 1) ya no se ve: así una
 * que da la vuelta por detrás del anillo no cruza la pantalla a la vista.
 */
export const poseEnAnillo = (d, { sinGiro = false } = {}) => {
  const ad = Math.abs(d);
  const f = lejania(ad);
  return {
    x: d * ANILLO.SEPARACION * f,
    giro: sinGiro ? 0 : Math.sign(d) * Math.min(ad, 1) * ANILLO.GIRO,
    escala: Math.max(0.6, 1 - ad * ANILLO.ENCOGE) * f,
    opacidad: ad > 1 ? Math.max(0, 1 - ANILLO.APAGA - (ad - 1) * 2 * (1 - ANILLO.APAGA)) : 1 - ad * ANILLO.APAGA,
  };
};

// Los puntos por los que pasa la animación: del todo oculta a la izquierda,
// de lado, al centro, de lado y del todo oculta a la derecha.
export const PUNTOS_ANILLO = [-1.5, -1, 0, 1, 1.5];

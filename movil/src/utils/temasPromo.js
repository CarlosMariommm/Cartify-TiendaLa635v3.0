/*
 * ============================================================
 * TEMAS DE BANNER — temasPromo.js
 * ============================================================
 * Las mismas paletas que `frontend/src/utils/temasPromo.js`, incluidos sus
 * degradados. Allá son una cadena de CSS (`linear-gradient(135deg, A, B)`);
 * aquí van como el par de colores que espera expo-linear-gradient, que es el
 * mismo dato sin la sintaxis.
 *
 * El `135deg` del CSS equivale a ir de la esquina superior izquierda a la
 * inferior derecha, o sea `start={{x:0,y:0}}` y `end={{x:1,y:1}}`. Eso se
 * decide en TarjetaPromo; aquí solo viven los colores.
 *
 * ── Ojo con el campo `muestra` de la web ──
 *
 * No se trajo, y no por olvido. Es el color con el que el tema se representa
 * en el selector del panel, y en varios temas ES EL ACENTO, no el fondo: "Año
 * Nuevo" tiene muestra #E8C547 (dorado) con texto blanco, y "Black Friday"
 * muestra #FFD400 (amarillo) también con texto blanco. Usarlo de fondo —que
 * es el atajo evidente— deja el título ilegible en dos de los trece temas.
 * ============================================================
 */

export const TEMAS = [
  { id: 'cafe',          nombre: 'Café',            colores: ['#8A5222', '#B46C30'], texto: '#FFFFFF', acento: '#F3E7D8' },
  { id: 'fresco',        nombre: 'Fresco',          colores: ['#1F6F4A', '#35A06B'], texto: '#FFFFFF', acento: '#DFF3E7' },
  { id: 'atardecer',     nombre: 'Atardecer',       colores: ['#C2410C', '#F08400'], texto: '#FFFFFF', acento: '#FFE9CC' },
  { id: 'noche',         nombre: 'Noche',           colores: ['#1C1614', '#3D322B'], texto: '#FFFFFF', acento: '#D8A860' },
  { id: 'cielo',         nombre: 'Cielo',           colores: ['#1E4E8C', '#3B82C4'], texto: '#FFFFFF', acento: '#DCEBFA' },
  // La única clara: por eso lleva texto oscuro, si no no se lee nada.
  { id: 'crema',         nombre: 'Crema',           colores: ['#FBF6F0', '#EDE0CE'], texto: '#3D2B1A', acento: '#B46C30' },

  /*
   * ── Fechas especiales ──
   * Las temporadas son cuando más se vende y cuando menos tiempo hay para
   * ponerse a elegir colores.
   */
  { id: 'navidad',       nombre: 'Navidad',         colores: ['#A4161A', '#D62828'], texto: '#FFFFFF', acento: '#F6E7C1', festivo: true },
  { id: 'anonuevo',      nombre: 'Año Nuevo',       colores: ['#14142B', '#35355C'], texto: '#FFFFFF', acento: '#E8C547', festivo: true },
  { id: 'sanvalentin',   nombre: 'San Valentín',    colores: ['#C9184A', '#FF758F'], texto: '#FFFFFF', acento: '#FFE0E6', festivo: true },
  { id: 'diamadre',      nombre: 'Día de la Madre', colores: ['#7B4B94', '#C78BD9'], texto: '#FFFFFF', acento: '#F3E3FA', festivo: true },
  // El azul cobalto de la bandera: en septiembre la tienda entera se pinta así.
  { id: 'independencia', nombre: 'Independencia',   colores: ['#0F47AF', '#3B82C4'], texto: '#FFFFFF', acento: '#E8F1FF', festivo: true },
  { id: 'halloween',     nombre: 'Halloween',       colores: ['#2B1A3D', '#EE7B0A'], texto: '#FFFFFF', acento: '#FFD9A0', festivo: true },
  { id: 'blackfriday',   nombre: 'Black Friday',    colores: ['#0B0B0B', '#2A2A2A'], texto: '#FFFFFF', acento: '#FFD400', festivo: true },
];

const POR_DEFECTO = TEMAS[0];

/*
 * Los colores que hay que pintar. Si la promo eligió "personalizado" usa los
 * suyos; si no, los del tema. Siempre devuelve algo pintable, aunque la promo
 * venga incompleta de la base.
 *
 * `flecha` sale aparte del acento aunque casi siempre valga lo mismo: sobre
 * ciertos fondos el círculo de la flecha se perdía y era el único color que no
 * se podía tocar.
 */
export const coloresDePromo = (promo) => {
  if (!promo) return { ...POR_DEFECTO, flecha: POR_DEFECTO.acento };

  if (promo.tema === 'personalizado' && promo.colorFondo) {
    /*
     * Dos colores de fondo = degradado propio, como los temas de fábrica. Con
     * uno solo se repite el mismo a los dos lados: `colors` de
     * expo-linear-gradient exige al menos dos, y un degradado de un color a sí
     * mismo es exactamente un color plano.
     */
    return {
      id: 'personalizado',
      nombre: 'Personalizado',
      colores: [promo.colorFondo, promo.colorFondo2 || promo.colorFondo],
      texto: promo.colorTexto || '#FFFFFF',
      acento: promo.colorAcento || '#FFFFFF',
      flecha: promo.colorFlecha || promo.colorAcento || '#FFFFFF',
    };
  }

  const tema = TEMAS.find((t) => t.id === promo.tema) || POR_DEFECTO;

  return { ...tema, flecha: promo.colorFlecha || tema.acento };
};

/*
 * ── El color del fondo en un punto del degradado ──
 * Para difuminar una foto contra el fondo de la promo. La web lo hace con
 * `maskImage` (la foto se vuelve transparente); React Native no tiene
 * máscaras, así que se pinta ENCIMA de la foto un degradado del color del
 * fondo. Como el fondo también es un degradado, hay que saber qué color hay
 * justo ahí: con el último color a secas quedaba un corte visible.
 *
 * `t` va de 0 (primer color) a 1 (último). Devuelve el color opaco y el mismo
 * color transparente: difuminar hacia 'transparent' (negro sin opacidad)
 * agrisa el medio en algunos teléfonos.
 */
const aRgb = (hex) => {
  const h = String(hex || '').replace('#', '');
  const completo = h.length === 3 ? h.split('').map((c) => c + c).join('') : h.slice(0, 6);
  if (!/^[0-9a-f]{6}$/i.test(completo)) return null;
  const n = parseInt(completo, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

export const difuminadoDelFondo = (colores, t) => {
  const lista = Array.isArray(colores) && colores.length ? colores : ['#000000'];
  const a = aRgb(lista[0]);
  const b = aRgb(lista[lista.length - 1]);
  if (!a || !b) return [lista[lista.length - 1], 'transparent'];
  const [r, g, az] = a.map((v, i) => Math.round(v + (b[i] - v) * Math.max(0, Math.min(1, t))));
  return [`rgba(${r},${g},${az},1)`, `rgba(${r},${g},${az},0)`];
};

/*
 * En qué punto del degradado diagonal (de la esquina de arriba a la izquierda
 * a la de abajo a la derecha) cae (x, y), con x e y de 0 a 1 y una caja
 * `proporcion` veces más ancha que alta.
 */
export const puntoEnDiagonal = (x, y, proporcion = 1) => {
  const p2 = proporcion * proporcion;
  return (x * p2 + y) / (p2 + 1);
};

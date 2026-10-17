// TEMAS DE BANNER — temasPromo.js
// Paletas listas para las promociones. Pedirle un código hexadecimal es pedirle que adivine, y el
// resultado suele ser texto ilegible sobre un fondo chillón.

export const TEMAS = [
  {
    id: 'cafe',
    nombre: 'Café',
    fondo: 'linear-gradient(135deg, #8A5222 0%, #B46C30 100%)',
    texto: '#FFFFFF',
    acento: '#F3E7D8',
    muestra: '#B46C30',
  },
  {
    id: 'fresco',
    nombre: 'Fresco',
    fondo: 'linear-gradient(135deg, #1F6F4A 0%, #35A06B 100%)',
    texto: '#FFFFFF',
    acento: '#DFF3E7',
    muestra: '#2E8B5A',
  },
  {
    id: 'atardecer',
    nombre: 'Atardecer',
    fondo: 'linear-gradient(135deg, #C2410C 0%, #F08400 100%)',
    texto: '#FFFFFF',
    acento: '#FFE9CC',
    muestra: '#E86A0C',
  },
  {
    id: 'noche',
    nombre: 'Noche',
    fondo: 'linear-gradient(135deg, #1C1614 0%, #3D322B 100%)',
    texto: '#FFFFFF',
    acento: '#D8A860',
    muestra: '#2A211C',
  },
  {
    id: 'cielo',
    nombre: 'Cielo',
    fondo: 'linear-gradient(135deg, #1E4E8C 0%, #3B82C4 100%)',
    texto: '#FFFFFF',
    acento: '#DCEBFA',
    muestra: '#2C68A8',
  },
  {
    id: 'crema',
    nombre: 'Crema',
    // La única clara: por eso lleva texto oscuro, si no no se lee nada.
    fondo: 'linear-gradient(135deg, #FBF6F0 0%, #EDE0CE 100%)',
    texto: '#3D2B1A',
    acento: '#B46C30',
    muestra: '#EDE0CE',
  },

  // ── Fechas especiales ── Las temporadas son cuando más se vende y cuando menos tiempo hay para
  // ponerse a elegir colores. Con estas, armar la promo de Navidad es un click en vez de pelearse
  // con un selector de color un 20 de diciembre.
  {
    id: 'navidad',
    nombre: 'Navidad',
    festivo: true,
    fondo: 'linear-gradient(135deg, #A4161A 0%, #D62828 100%)',
    texto: '#FFFFFF',
    acento: '#F6E7C1',
    muestra: '#C1121F',
  },
  {
    id: 'anonuevo',
    nombre: 'Año Nuevo',
    festivo: true,
    fondo: 'linear-gradient(135deg, #14142B 0%, #35355C 100%)',
    texto: '#FFFFFF',
    acento: '#E8C547',
    muestra: '#E8C547',
  },
  {
    id: 'sanvalentin',
    nombre: 'San Valentín',
    festivo: true,
    fondo: 'linear-gradient(135deg, #C9184A 0%, #FF758F 100%)',
    texto: '#FFFFFF',
    acento: '#FFE0E6',
    muestra: '#E5486A',
  },
  {
    id: 'diamadre',
    nombre: 'Día de la Madre',
    festivo: true,
    fondo: 'linear-gradient(135deg, #7B4B94 0%, #C78BD9 100%)',
    texto: '#FFFFFF',
    acento: '#F3E3FA',
    muestra: '#A06BB8',
  },
  {
    id: 'independencia',
    nombre: 'Independencia',
    festivo: true,
    // El azul cobalto de la bandera: en septiembre la tienda entera se pinta así.
    fondo: 'linear-gradient(135deg, #0F47AF 0%, #3B82C4 100%)',
    texto: '#FFFFFF',
    acento: '#E8F1FF',
    muestra: '#0F47AF',
  },
  {
    id: 'halloween',
    nombre: 'Halloween',
    festivo: true,
    fondo: 'linear-gradient(135deg, #2B1A3D 0%, #EE7B0A 100%)',
    texto: '#FFFFFF',
    acento: '#FFD9A0',
    muestra: '#EE7B0A',
  },
  {
    id: 'blackfriday',
    nombre: 'Black Friday',
    festivo: true,
    fondo: 'linear-gradient(135deg, #0B0B0B 0%, #2A2A2A 100%)',
    texto: '#FFFFFF',
    acento: '#FFD400',
    muestra: '#FFD400',
  },
];

// Los de siempre y los de temporada, separados para el selector.
export const TEMAS_BASE = TEMAS.filter((t) => !t.festivo);
export const TEMAS_FESTIVOS = TEMAS.filter((t) => t.festivo);

const POR_DEFECTO = TEMAS[0];

// Devuelve los colores que hay que pintar. Si la promo eligió "personalizado" usa los suyos; si
// no, los del tema. Siempre devuelve algo pintable, aunque la promo venga incompleta de la base.
export const coloresDePromo = (promo) => {
  if (!promo) return { ...POR_DEFECTO, flecha: POR_DEFECTO.acento };

  if (promo.tema === 'personalizado' && promo.colorFondo) {
    // Dos colores de fondo = degradado propio, como los temas de fábrica. Con uno solo el
    // personalizado se veía más pobre que los presets y nadie lo usaba.
    const fondo = promo.colorFondo2
      ? `linear-gradient(135deg, ${promo.colorFondo} 0%, ${promo.colorFondo2} 100%)`
      : promo.colorFondo;

    return {
      id: 'personalizado',
      nombre: 'Personalizado',
      fondo,
      texto: promo.colorTexto || '#FFFFFF',
      acento: promo.colorAcento || '#FFFFFF',
      flecha: promo.colorFlecha || promo.colorAcento || '#FFFFFF',
      muestra: promo.colorFondo,
    };
  }

  const tema = TEMAS.find((t) => t.id === promo.tema) || POR_DEFECTO;

  // colorFlecha sirve de escape también sobre un tema de fábrica: se puede
  // cambiar solo la flecha sin tener que rearmar toda la paleta a mano.
  return { ...tema, flecha: promo.colorFlecha || tema.acento };
};

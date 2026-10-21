// TEMPORADAS — temporadas.js
// Pinta la tienda del color de la fecha. Copia de `frontend/src/utils/temporadas.js`, con una
// traducción obligada. ── De variables CSS a nombres de paleta ──

export const TEMAS_DE_TEMPORADA = [
  {
    clave: 'navidad',
    nombre: 'Navidad',
    descripcion: 'Del 1 al 31 de diciembre',
    desde: { mes: 12, dia: 1 },
    hasta: { mes: 12, dia: 31 },
    colores: {
      marcaOscuro: '#0F5132',
      marca: '#166534',
      marcaClaro: '#4CA46B',
      marcaSuave: '#DCEEE1',
      marcaTenue: '#F2FAF4',
      acento: '#C1121F',
    },
    decoracion: {
      saludo: 'Felices fiestas — pide con tiempo, que diciembre se llena',
      figura: 'copo',
      // Cuántas figuras caen a la vez. Pocas a propósito: veinte copos ya no son "está nevando", son un
      // protector de pantalla encima de la tienda.
      cantidad: 14,
      // Cae recto y despacio, como la nieve de verdad.
      caida: 'lenta',
    },
  },
  {
    clave: 'halloween',
    nombre: 'Halloween',
    descripcion: 'Del 24 al 31 de octubre',
    // Es la semana, no el mes entero: un octubre completo de naranja deja de
    // leerse como temporada y pasa a ser el color de la tienda.
    desde: { mes: 10, dia: 24 },
    hasta: { mes: 10, dia: 31 },
    colores: {
      marcaOscuro: '#9A3412',
      // Igual que en la web: el #EA580C daba 3,5:1 con la letra blanca de
      // los botones. Este da 5,2:1 y se sigue viendo naranja.
      marca: '#C2410C',
      marcaClaro: '#FB923C',
      marcaSuave: '#FFEAD5',
      marcaTenue: '#FFF7ED',
      acento: '#6D28D9',
    },
    decoracion: {
      saludo: 'Noche de brujas — dulces y disfraces en la tienda',
      figura: 'murcielago',
      cantidad: 10,
      // Se mece de lado mientras baja: un murciélago que cae recto parece una
      // piedra.
      caida: 'meciendo',
    },
  },
  {
    clave: 'independencia',
    nombre: 'Independencia',
    descripcion: 'Del 1 al 15 de septiembre',
    // Azul cobalto de la bandera. Las dos semanas de antes, que es cuando se
    // ponen los adornos de verdad en la calle.
    desde: { mes: 9, dia: 1 },
    hasta: { mes: 9, dia: 15 },
    colores: {
      marcaOscuro: '#003893',
      marca: '#0F47AF',
      marcaClaro: '#5B8DE0',
      marcaSuave: '#DEE9FB',
      marcaTenue: '#F4F8FE',
      acento: '#0F47AF',
    },
    decoracion: {
      saludo: 'Fiestas patrias — ¡viva El Salvador!',
      figura: 'confeti',
      cantidad: 16,
      caida: 'meciendo',
    },
  },
  {
    clave: 'san-valentin',
    nombre: 'San Valentín',
    descripcion: 'Del 7 al 14 de febrero',
    // El vino de primario para que el texto blanco encima se lea; el rosa
    // claro solo sirve de fondo.
    desde: { mes: 2, dia: 7 },
    hasta: { mes: 2, dia: 14 },
    colores: {
      marcaOscuro: '#831843',
      marca: '#BE185D',
      marcaClaro: '#EC7FB0',
      marcaSuave: '#FCE7F1',
      marcaTenue: '#FEF5F9',
      acento: '#BE185D',
    },
    decoracion: {
      saludo: 'Día del cariño — llévale algo a quien quieres',
      figura: 'corazon',
      cantidad: 12,
      caida: 'meciendo',
    },
  },
];

// TEMPORADAS PROPIAS — las que crea el dueño desde el panel web ("Regreso a clases", "Día de la
// madre"...). Del panel llegan solo dos colores; los tonos claros y oscuros se derivan aquí
// mezclando el principal con blanco o negro, igual que en frontend/src/utils/temporadas.js.
const hexARgb = (hex) => {
  const limpio = String(hex || '').replace('#', '');
  const n = parseInt(limpio.length === 6 ? limpio : '003049', 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

const rgbAHex = (rgb) =>
  `#${rgb.map((c) => Math.round(Math.min(255, Math.max(0, c))).toString(16).padStart(2, '0')).join('').toUpperCase()}`;

const mezclar = (hex, con, cuanto) => {
  const a = hexARgb(hex);
  const b = hexARgb(con);
  return rgbAHex(a.map((c, i) => c + (b[i] - c) * cuanto));
};

const luminanciaDe = (hex) => {
  const [r, g, b] = hexARgb(hex).map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

const rgbAHsl = ([r, g, b]) => {
  const [R, G, B] = [r / 255, g / 255, b / 255];
  const max = Math.max(R, G, B);
  const min = Math.min(R, G, B);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h = max === R ? (G - B) / d + (G < B ? 6 : 0) : max === G ? (B - R) / d + 2 : (R - G) / d + 4;
  return [h / 6, s, l];
};

const hslAHex = ([h, s, l]) => {
  if (s === 0) return rgbAHex([l * 255, l * 255, l * 255]);
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const canal = (t) => {
    let x = t;
    if (x < 0) x += 1;
    if (x > 1) x -= 1;
    if (x < 1 / 6) return p + (q - p) * 6 * x;
    if (x < 1 / 2) return q;
    if (x < 2 / 3) return p + (q - p) * (2 / 3 - x) * 6;
    return p;
  };
  return rgbAHex([canal(h + 1 / 3) * 255, canal(h) * 255, canal(h - 1 / 3) * 255]);
};

// El mismo tono, con la luz justa para `objetivo` (luminancia WCAG). Se mueve la luminosidad en
// HSL y no se mezcla con blanco: mezclar lava el color y el azul de la casa quedaba gris.
const conLuminancia = (hex, objetivo) => {
  const [h, s0] = rgbAHsl(hexARgb(hex));
  const s = Math.min(s0, 0.85);
  let bajo = 0;
  let alto = 1;
  for (let i = 0; i < 24; i++) {
    const medio = (bajo + alto) / 2;
    if (luminanciaDe(hslAHex([h, s, medio])) < objetivo) bajo = medio;
    else alto = medio;
  }
  return hslAHex([h, s, (bajo + alto) / 2]);
};

// El fondo del modo oscuro. El mismo de `fondo` en COLORES_OSCURO (theme/colores.js).
export const FONDO_OSCURO = '#121417';

// LA MARCA EN MODO OSCURO. Copia de `paletaOscura()` de la web, con los nombres de la paleta de
// aquí. El azul de la casa (#003049) es casi negro: sobre el fondo oscuro los botones
// desaparecían.
export const paletaOscura = (colores) => {
  const principal = conLuminancia(colores.marca, 0.155);
  const acento =
    luminanciaDe(colores.acento) < 0.24 ? conLuminancia(colores.acento, 0.3) : rgbAHex(hexARgb(colores.acento));
  return {
    marcaOscuro: conLuminancia(principal, 0.18),
    marca: principal,
    marcaClaro: conLuminancia(principal, 0.42),
    marcaTexto: conLuminancia(principal, 0.42),
    marcaSuave: mezclar(principal, FONDO_OSCURO, 0.74),
    marcaTenue: mezclar(principal, FONDO_OSCURO, 0.86),
    acento,
  };
};

const temaDesdePropio = (propio) => ({
  clave: propio.clave,
  nombre: propio.nombre,
  propio: true,
  desde: propio.desde,
  hasta: propio.hasta,
  colores: {
    marcaOscuro: mezclar(propio.colorPrincipal, '#000000', 0.22),
    marca: rgbAHex(hexARgb(propio.colorPrincipal)),
    marcaClaro: mezclar(propio.colorPrincipal, '#FFFFFF', 0.35),
    marcaSuave: mezclar(propio.colorPrincipal, '#FFFFFF', 0.86),
    marcaTenue: mezclar(propio.colorPrincipal, '#FFFFFF', 0.95),
    acento: rgbAHex(hexARgb(propio.colorAcento)),
  },
  decoracion: {
    saludo: (propio.saludo || '').trim(),
    figura: propio.figura || 'confeti',
    cantidad: propio.figura === 'ninguna' ? 0 : 12,
    caida: propio.figura === 'copo' ? 'lenta' : 'meciendo',
  },
});

// Las de fábrica que el dueño no borró desde el panel (`temporada.ocultas`).
export const temasDeFabrica = (temporada) => {
  const ocultas = Array.isArray(temporada?.ocultas) ? temporada.ocultas : [];
  return TEMAS_DE_TEMPORADA.filter((t) => !ocultas.includes(t.clave));
};

// Las propias primero: si comparten fechas con una de fábrica, gana la propia.
export const todosLosTemas = (temporada) => [
  ...(Array.isArray(temporada?.personalizados) ? temporada.personalizados : []).map(temaDesdePropio),
  ...temasDeFabrica(temporada),
];

export const temaPorClave = (clave, lista = TEMAS_DE_TEMPORADA) =>
  lista.find((t) => t.clave === clave) || null;

// ¿Cae esta fecha dentro del rango del tema? Se compara por mes y día, sin año, porque los rangos
// se repiten todos los años. El `mes - 1` de JavaScript se corrige aquí y en ningún otro lado.
const caeEnRango = (fecha, tema) => {
  const mes = fecha.getMonth() + 1;
  const dia = fecha.getDate();
  const comoNumero = mes * 100 + dia;
  const inicio = tema.desde.mes * 100 + tema.desde.dia;
  const fin = tema.hasta.mes * 100 + tema.hasta.dia;
  if (inicio <= fin) return comoNumero >= inicio && comoNumero <= fin;
  return comoNumero >= inicio || comoNumero <= fin;
};

export const temaDeLaFecha = (fecha = new Date(), lista = TEMAS_DE_TEMPORADA) =>
  lista.find((tema) => caeEnRango(fecha, tema)) || null;

// Qué tema toca AHORA, según lo que diga la configuración de la tienda. 'automatico' → lo decide
// el calendario. 'manual' → manda el que eligieron, pase lo que pase en el calendario.
export const temaActivo = (temporada, fecha = new Date()) => {
  const modo = temporada?.modo || 'automatico';
  if (modo === 'ninguno') return null;
  const lista = todosLosTemas(temporada);
  if (modo === 'manual') return temaPorClave(temporada?.tema, lista);
  return temaDeLaFecha(fecha, lista);
};

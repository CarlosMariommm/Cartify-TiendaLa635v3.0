// TEMAS DE TEMPORADA — temporadas.js
// La tienda se pinta de Navidad en diciembre y de Halloween a finales de octubre, sola, sin que
// nadie se acuerde de entrar a cambiarlo.

// Los rangos van [desde, hasta] como {mes, dia}, con el mes en base 1 (enero es 1, no 0) porque
// así es como lo lee una persona. La conversión al mes de JavaScript se hace en un solo lugar,
// abajo. `colores` son las variables que se repintan.
export const TEMAS_DE_TEMPORADA = [
  {
    clave: 'navidad',
    nombre: 'Navidad',
    descripcion: 'Del 1 al 31 de diciembre',
    // Verde pino y rojo. El rojo va de acento y no de primario: en botón
    // grande cansa la vista y se confunde con el rojo de "quedan pocas".
    desde: { mes: 12, dia: 1 },
    hasta: { mes: 12, dia: 31 },
    colores: {
      '--marca-700': '#0F5132',
      '--marca-600': '#166534',
      '--marca-400': '#4CA46B',
      '--marca-100': '#DCEEE1',
      '--marca-50': '#F2FAF4',
      '--acento': '#C1121F',
    },
    muestras: ['#166534', '#C1121F', '#DCEEE1'],
    decoracion: {
      saludo: 'Felices fiestas — pide con tiempo, que diciembre se llena',
      figura: 'copo',
      // Cuántas figuras caen a la vez. Pocas a propósito: veinte copos ya no
      // son "está nevando", son un protector de pantalla encima de la tienda.
      cantidad: 14,
      // Cae recto y despacio, como la nieve de verdad.
      caida: 'lenta',
    },
  },
  {
    clave: 'halloween',
    nombre: 'Halloween',
    descripcion: 'Del 24 al 31 de octubre',
    // Naranja calabaza con morado. Es la semana, no el mes entero: un octubre
    // completo de naranja deja de leerse como temporada y pasa a ser el color
    // de la tienda.
    desde: { mes: 10, dia: 24 },
    hasta: { mes: 10, dia: 31 },
    colores: {
      '--marca-700': '#9A3412',
      // Naranja calabaza más hondo: el #EA580C daba 3,5:1 con la letra blanca
      // de los botones. Este da 5,2:1 y se sigue viendo naranja.
      '--marca-600': '#C2410C',
      '--marca-400': '#FB923C',
      '--marca-100': '#FFEAD5',
      '--marca-50': '#FFF7ED',
      '--acento': '#6D28D9',
    },
    muestras: ['#C2410C', '#6D28D9', '#FFEAD5'],
    decoracion: {
      saludo: 'Noche de brujas — dulces y disfraces en la tienda',
      figura: 'murcielago',
      cantidad: 10,
      // Se mece de lado mientras baja: un murciélago que cae recto parece
      // una piedra.
      caida: 'meciendo',
    },
  },
  {
    clave: 'independencia',
    nombre: 'Independencia',
    descripcion: 'Del 1 al 15 de septiembre',
    // Azul cobalto de la bandera salvadoreña. Las dos semanas de antes, que es
    // cuando se ponen los adornos de verdad en la calle.
    desde: { mes: 9, dia: 1 },
    hasta: { mes: 9, dia: 15 },
    colores: {
      '--marca-700': '#003893',
      '--marca-600': '#0F47AF',
      '--marca-400': '#5B8DE0',
      '--marca-100': '#DEE9FB',
      '--marca-50': '#F4F8FE',
      '--acento': '#0F47AF',
    },
    muestras: ['#0F47AF', '#003893', '#DEE9FB'],
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
    // Rosa y vino. El vino de primario para que el texto blanco encima se lea;
    // el rosa claro solo sirve de fondo.
    desde: { mes: 2, dia: 7 },
    hasta: { mes: 2, dia: 14 },
    colores: {
      '--marca-700': '#831843',
      '--marca-600': '#BE185D',
      '--marca-400': '#EC7FB0',
      '--marca-100': '#FCE7F1',
      '--marca-50': '#FEF5F9',
      '--acento': '#BE185D',
    },
    muestras: ['#BE185D', '#EC7FB0', '#FCE7F1'],
    decoracion: {
      saludo: 'Día del cariño — llévale algo a quien quieres',
      figura: 'corazon',
      cantidad: 12,
      caida: 'meciendo',
    },
  },
];

// TEMPORADAS PROPIAS — las que crea el dueño desde el panel
// "Regreso a clases", "Día de la madre", el aniversario de la tienda... Las de fábrica no pueden
// adivinar todas las fechas que le importan a un negocio.

// Las figuras que puede elegir una temporada propia. La misma lista valida el
// backend (models/storeSettings.js).
export const FIGURAS_DE_TEMPORADA = [
  { clave: 'confeti', nombre: 'Confeti' },
  { clave: 'estrella', nombre: 'Estrellas' },
  { clave: 'corazon', nombre: 'Corazones' },
  { clave: 'copo', nombre: 'Copos' },
  { clave: 'hoja', nombre: 'Hojas' },
  { clave: 'murcielago', nombre: 'Murciélagos' },
  { clave: 'ninguna', nombre: 'Sin figuras' },
];

export const NOMBRES_DE_MES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

const hexARgb = (hex) => {
  const limpio = String(hex || '').replace('#', '');
  const n = parseInt(limpio.length === 6 ? limpio : '003049', 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

const rgbAHex = (rgb) =>
  `#${rgb.map((c) => Math.round(Math.min(255, Math.max(0, c))).toString(16).padStart(2, '0')).join('').toUpperCase()}`;

// Mezcla `hex` con `con` en la proporción `cuanto` (0 = nada, 1 = todo `con`).
const mezclar = (hex, con, cuanto) => {
  const a = hexARgb(hex);
  const b = hexARgb(con);
  return rgbAHex(a.map((c, i) => c + (b[i] - c) * cuanto));
};

// Qué tanto se lee el texto blanco encima de un color (contraste WCAG). Los botones de la tienda
// son blancos sobre --marca-600: por debajo de 4.5 el panel avisa que ese color no sirve para
// botones.
export const contrasteConBlanco = (hex) => {
  const lineal = hexARgb(hex).map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  const luminancia = 0.2126 * lineal[0] + 0.7152 * lineal[1] + 0.0722 * lineal[2];
  return 1.05 / (luminancia + 0.05);
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

// El fondo del modo oscuro. El mismo que declara index.css en --papel.
export const FONDO_OSCURO = '#121417';

// LA MARCA EN MODO OSCURO.
// El azul de la casa (#003049) es casi negro: sobre el fondo oscuro los botones desaparecían.
export const paletaOscura = (colores) => {
  const principal = conLuminancia(colores['--marca-600'], 0.155);
  const acento = luminanciaDe(colores['--acento']) < 0.24 ? conLuminancia(colores['--acento'], 0.3) : rgbAHex(hexARgb(colores['--acento']));
  return {
    '--marca-700': conLuminancia(principal, 0.18),
    '--marca-600': principal,
    '--marca-400': conLuminancia(principal, 0.42),
    '--marca-100': mezclar(principal, FONDO_OSCURO, 0.74),
    '--marca-50': mezclar(principal, FONDO_OSCURO, 0.86),
    '--acento': acento,
  };
};

export const paletaDesdeColores = (principal, acento) => ({
  '--marca-700': mezclar(principal, '#000000', 0.22),
  '--marca-600': rgbAHex(hexARgb(principal)),
  '--marca-400': mezclar(principal, '#FFFFFF', 0.35),
  '--marca-100': mezclar(principal, '#FFFFFF', 0.86),
  '--marca-50': mezclar(principal, '#FFFFFF', 0.95),
  '--acento': rgbAHex(hexARgb(acento)),
});

// "Del 15 de enero al 10 de febrero".
export const describirRango = (desde, hasta) =>
  `Del ${desde.dia} de ${NOMBRES_DE_MES[desde.mes - 1]} al ${hasta.dia} de ${NOMBRES_DE_MES[hasta.mes - 1]}`;

// Una temporada propia, con la misma forma que las de fábrica: así el resto de la app (la pintura,
// la cinta, las figuras) no tiene que saber de dónde salió.
export const temaDesdePropio = (propio) => {
  const colores = paletaDesdeColores(propio.colorPrincipal, propio.colorAcento);
  return {
    clave: propio.clave,
    nombre: propio.nombre,
    descripcion: describirRango(propio.desde, propio.hasta),
    propio: true,
    desde: propio.desde,
    hasta: propio.hasta,
    colores,
    muestras: [colores['--marca-600'], colores['--acento'], colores['--marca-100']],
    decoracion: {
      saludo: (propio.saludo || '').trim(),
      figura: propio.figura || 'confeti',
      cantidad: propio.figura === 'ninguna' ? 0 : 12,
      caida: propio.figura === 'copo' ? 'lenta' : 'meciendo',
    },
  };
};

// Las de fábrica que el dueño no borró desde el panel (`temporada.ocultas`).
export const temasDeFabrica = (temporada) => {
  const ocultas = Array.isArray(temporada?.ocultas) ? temporada.ocultas : [];
  return TEMAS_DE_TEMPORADA.filter((t) => !ocultas.includes(t.clave));
};

// Todas las temporadas que puede usar la tienda: las propias primero. Si una propia cae en las
// mismas fechas que una de fábrica, gana la propia — la creó el dueño a propósito, así que es la
// que quiere ver.
export const todosLosTemas = (temporada) => [
  ...(Array.isArray(temporada?.personalizados) ? temporada.personalizados : []).map(temaDesdePropio),
  ...temasDeFabrica(temporada),
];

export const temaPorClave = (clave, lista = TEMAS_DE_TEMPORADA) =>
  lista.find((t) => t.clave === clave) || null;

// ¿Cae esta fecha dentro del rango del tema? Se compara por mes y día, sin año, porque los rangos
// se repiten todos los años. El `mes - 1` de aquí es la única traducción al mes de JavaScript en
// todo el archivo.
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

// Qué tema toca AHORA, según lo que diga la configuración. 'automatico' → lo decide el calendario.
// 'manual' → manda el que eligieron, pase lo que pase en el calendario.
export const temaActivo = (temporada, fecha = new Date()) => {
  const modo = temporada?.modo || 'automatico';
  if (modo === 'ninguno') return null;
  const lista = todosLosTemas(temporada);
  if (modo === 'manual') return temaPorClave(temporada?.tema, lista);
  return temaDeLaFecha(fecha, lista);
};

// Pintar (o despintar) el tema sobre el documento. Se escriben las variables en el <html> con
// setProperty, que pisa lo que declara index.css sin tener que duplicar una hoja de estilos por
// temporada.
const VARIABLES = ['--marca-700', '--marca-600', '--marca-400', '--marca-100', '--marca-50', '--acento'];

export const aplicarTema = (tema, { oscuro = false } = {}) => {
  const raiz = document.documentElement;

  if (!tema) {
    VARIABLES.forEach((v) => raiz.style.removeProperty(v));
    raiz.removeAttribute('data-temporada');
    return;
  }

  Object.entries(oscuro ? paletaOscura(tema.colores) : tema.colores).forEach(([variable, valor]) => {
    raiz.style.setProperty(variable, valor);
  });
  // Por si alguna pantalla quiere reaccionar a la temporada con CSS puro.
  raiz.setAttribute('data-temporada', tema.clave);
};

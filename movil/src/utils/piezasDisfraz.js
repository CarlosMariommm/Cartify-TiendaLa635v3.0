// LAS PIEZAS DEL DISFRAZ DE TIQUI — piezasDisfraz.js
// Todo lo que Tiqui se puede poner: gorros y sombreros en la cabeza, lentes en la cara, y
// corbatín, bufanda o collar en el cuello.

export const RANURAS_DISFRAZ = [
  { clave: 'cabeza', nombre: 'Cabeza' },
  { clave: 'cara', nombre: 'Cara' },
  { clave: 'cuello', nombre: 'Cuello' },
];

const OJO_IZQUIERDO = [174, 252];
const OJO_DERECHO = [226, 252];

const redondear = (n) => Math.round(n * 10) / 10;

// Una estrella de cinco puntas, como trazo, centrada en (cx, cy).
const estrella = (cx, cy, fuera, dentro) => {
  const puntos = [];
  for (let i = 0; i < 10; i++) {
    const radio = i % 2 ? dentro : fuera;
    const angulo = -Math.PI / 2 + (i * Math.PI) / 5;
    puntos.push(`${redondear(cx + radio * Math.cos(angulo))},${redondear(cy + radio * Math.sin(angulo))}`);
  }
  return `M${puntos.join(' L')} Z`;
};

// Un óvalo como trazo. Junto a otra forma y con `evenodd`, la agujerea: así
// los lentes y el antifaz dejan ver los ojos.
const ovalo = (cx, cy, rx, ry = rx) =>
  `M${cx + rx},${cy} A${rx},${ry} 0 1 0 ${cx - rx},${cy} A${rx},${ry} 0 1 0 ${cx + rx},${cy} Z`;

// La estrella que remata el gorro de las temporadas con estrellas.
const ESTRELLA_GORRO =
  'M170,29 L174.1,40.3 L186.2,40.8 L176.7,48.2 L180,59.8 L170,53 L160,59.8 L163.3,48.2 L153.8,40.8 L165.9,40.3 Z';

// Los pétalos de la flor: cinco círculos alrededor del centro.
const petalos = (cx, cy) =>
  [0, 1, 2, 3, 4].map((i) => {
    const angulo = -Math.PI / 2 + (i * 2 * Math.PI) / 5;
    return { el: 'circle', cx: redondear(cx + 15 * Math.cos(angulo)), cy: redondear(cy + 15 * Math.sin(angulo)), r: 14, relleno: 'principal' };
  });

// El collar de flores: siete flores sobre una curva de hombro a hombro,
// alternando los dos colores.
const collar = () =>
  [0, 1, 2, 3, 4, 5, 6].flatMap((i) => {
    const t = i / 6;
    const x = redondear((1 - t) ** 2 * 128 + 2 * (1 - t) * t * 200 + t ** 2 * 272);
    const y = redondear((1 - t) ** 2 * 316 + 2 * (1 - t) * t * 384 + t ** 2 * 316);
    return [
      { el: 'circle', cx: x, cy: y, r: 13, relleno: i % 2 ? 'acento' : 'principal' },
      { el: 'circle', cx: x, cy: y, r: 4, relleno: '#FFFFFF', opacidad: 0.85, sinContorno: true },
    ];
  });

// Las patitas de los lentes, hasta el borde de la etiqueta.
const patitas = (y, relleno, desde = 153) => [
  { el: 'rect', x: 117, y, width: desde - 117, height: 6, rx: 3, relleno },
  { el: 'rect', x: 400 - desde, y, width: desde - 117, height: 6, rx: 3, relleno },
];

// Cada pieza: ranura dónde va: cabeza, cara o cuello nombre cómo se le dice en el panel colores
// los de cuando se elige (el principal y el de acento) nombresColores qué pinta cada color, para
// el panel giro si la pieza entera va ladeada formas lo que se dibuja, en orden.
export const PIEZAS_DISFRAZ = {
  /* ── Cabeza ── */

  // Gorro de Santa con la punta caída por el costado. UNA sola forma, sin
  // muesca: dos piezas encimadas dejaban una raya cruzando el gorro.
  'gorro-navidad': {
    ranura: 'cabeza',
    nombre: 'Gorro navideño',
    colores: ['#C1121F', '#FFFFFF'],
    nombresColores: ['Gorro', 'Ribete y pompón'],
    formas: [
      { el: 'path', d: 'M132,188 C134,146 162,110 206,98 C242,88 280,102 294,138 C300,158 300,194 296,222 L280,224 C279,208 274,196 270,188 Z', relleno: 'principal' },
      { el: 'path', d: 'M252,112 C272,128 280,160 282,190', relleno: 'none', trazo: '#000000', opacidadTrazo: 0.22, anchoTrazo: 5, redondo: true },
      { el: 'rect', x: 114, y: 172, width: 172, height: 28, rx: 14, relleno: 'acento' },
      { el: 'circle', cx: 288, cy: 228, r: 15, relleno: 'acento' },
    ],
  },

  // Inclinado a la izquierda para que el cordón salga por la derecha.
  'sombrero-bruja': {
    ranura: 'cabeza',
    nombre: 'Sombrero de bruja',
    colores: ['#4C1D95', '#EA580C'],
    nombresColores: ['Sombrero', 'Cinta'],
    formas: [
      { el: 'path', d: 'M124,190 L166,86 C170,74 162,62 146,58 L130,56 C148,50 170,52 184,66 C192,74 196,86 198,96 L280,190 Z', relleno: 'principal' },
      { el: 'path', d: 'M128,180 L136.1,160 L253.8,160 L271.3,180 Z', relleno: 'acento' },
      { el: 'path', d: 'M183,158 L207,158 L207,182 L183,182 Z M190,165 L200,165 L200,175 L190,175 Z', relleno: '#FFC23D', evenodd: true },
      { el: 'ellipse', cx: 200, cy: 190, rx: 114, ry: 17, relleno: 'principal', separar: true },
    ],
  },

  'gorro-fiesta': {
    ranura: 'cabeza',
    nombre: 'Gorro de fiesta',
    colores: ['#7C3AED', '#FFC23D'],
    nombresColores: ['Gorro', 'Franja y pompón'],
    formas: [
      { el: 'path', d: 'M122,196 L170,44 L278,196 Z', relleno: 'principal' },
      { el: 'path', d: 'M140.9,136 L146,120 L224,120 L235.4,136 Z', relleno: 'acento' },
      { el: 'rect', x: 116, y: 182, width: 168, height: 20, rx: 10, relleno: 'acento' },
      { el: 'circle', cx: 170, cy: 42, r: 14, relleno: 'acento' },
    ],
  },

  'gorro-estrella': {
    ranura: 'cabeza',
    nombre: 'Gorro con estrella',
    colores: ['#0F47AF', '#FFC23D'],
    nombresColores: ['Gorro', 'Franja y estrella'],
    formas: [
      { el: 'path', d: 'M122,196 L170,52 L278,196 Z', relleno: 'principal' },
      { el: 'path', d: 'M140.9,136 L146,120 L224,120 L235.4,136 Z', relleno: 'acento' },
      { el: 'rect', x: 116, y: 182, width: 168, height: 20, rx: 10, relleno: 'acento' },
      { el: 'path', d: ESTRELLA_GORRO, relleno: 'acento' },
    ],
  },

  // Corona con tres puntas y sus piedras. La banda va un tono más oscura.
  corona: {
    ranura: 'cabeza',
    nombre: 'Corona',
    colores: ['#FFC23D', '#E11D48'],
    nombresColores: ['Corona', 'Piedras'],
    formas: [
      { el: 'path', d: 'M118,198 L124,132 L162,164 L200,106 L238,164 L276,132 L282,198 Z', relleno: 'principal' },
      { el: 'rect', x: 118, y: 176, width: 164, height: 22, rx: 6, relleno: 'principal' },
      { el: 'rect', x: 118, y: 176, width: 164, height: 22, rx: 6, relleno: '#000000', opacidad: 0.12, sinContorno: true },
      { el: 'circle', cx: 124, cy: 130, r: 8, relleno: 'principal' },
      { el: 'circle', cx: 200, cy: 104, r: 8, relleno: 'principal' },
      { el: 'circle', cx: 276, cy: 130, r: 8, relleno: 'principal' },
      { el: 'circle', cx: 162, cy: 187, r: 6, relleno: 'acento' },
      { el: 'circle', cx: 200, cy: 187, r: 7, relleno: 'acento' },
      { el: 'circle', cx: 238, cy: 187, r: 6, relleno: 'acento' },
    ],
  },

  // Birrete de graduación, con la borla colgando por el lado del cordón.
  birrete: {
    ranura: 'cabeza',
    nombre: 'Birrete',
    colores: ['#1F2937', '#FFC23D'],
    nombresColores: ['Birrete', 'Borla'],
    formas: [
      { el: 'path', d: 'M122,204 C122,170 154,148 200,148 C246,148 278,170 278,204 Z', relleno: 'principal' },
      { el: 'path', d: 'M200,92 L304,124 L200,156 L96,124 Z', relleno: 'principal', separar: true },
      { el: 'path', d: 'M200,124 L290,129 L290,176', relleno: 'none', trazo: 'acento', anchoTrazo: 6, redondo: true },
      { el: 'rect', x: 283, y: 172, width: 14, height: 30, rx: 5, relleno: 'acento' },
      { el: 'circle', cx: 200, cy: 124, r: 7, relleno: 'acento' },
    ],
  },

  // Sombrero de copa: el cordón sale por arriba, como una antena.
  'sombrero-copa': {
    ranura: 'cabeza',
    nombre: 'Sombrero de copa',
    colores: ['#1F2937', '#C1121F'],
    nombresColores: ['Sombrero', 'Cinta'],
    formas: [
      { el: 'path', d: 'M140,196 L146,92 Q146,84 154,84 L246,84 Q254,84 254,92 L260,196 Z', relleno: 'principal' },
      { el: 'path', d: 'M141,178 L142.3,156 L257.7,156 L259,178 Z', relleno: 'acento' },
      { el: 'ellipse', cx: 200, cy: 196, rx: 106, ry: 15, relleno: 'principal', separar: true },
    ],
  },

  // Gorra con la visera saliendo de lado, del lado contrario al cordón. De frente la visera se leía
  // como la franja de un gorro de lana. Oscura de fábrica: queda fuera de la etiqueta, y blanca se
  // perdía en el fondo.
  gorra: {
    ranura: 'cabeza',
    nombre: 'Gorra',
    colores: ['#C1121F', '#1F2937'],
    nombresColores: ['Gorra', 'Visera y botón'],
    formas: [
      // La visera arranca debajo de la copa y no baja de su borde: si asomaba
      // por abajo, quedaba una raya sobre la cara.
      { el: 'path', d: 'M150,178 C128,180 106,188 92,198 C87,202 90,207 96,207 C108,206 118,203 125,197 Z', relleno: 'acento' },
      { el: 'path', d: 'M124,200 C124,142 158,112 200,112 C242,112 276,142 276,200 Z', relleno: 'principal' },
      // Las costuras empiezan y terminan DENTRO de la copa: en la orilla, su
      // punta redonda asomaba por encima del borde.
      { el: 'path', d: 'M200,126 L200,192 M163,136 C154,154 150,174 150,192 M237,136 C246,154 250,174 250,192', relleno: 'none', trazo: '#000000', opacidadTrazo: 0.18, anchoTrazo: 4, redondo: true },
      { el: 'circle', cx: 200, cy: 113, r: 7, relleno: 'acento' },
    ],
  },

  // Del lado contrario al cordón, para no enredarse.
  mono: {
    ranura: 'cabeza',
    nombre: 'Moño',
    colores: ['#E11D74', '#9D174D'],
    nombresColores: ['Moño', 'Nudo'],
    giro: 'rotate(-38 160 150)',
    formas: [
      { el: 'path', d: 'M160,150 C144,128 118,134 122,152 C124,168 146,166 160,150 Z', relleno: 'principal' },
      { el: 'path', d: 'M160,150 C176,128 202,134 198,152 C196,168 174,166 160,150 Z', relleno: 'principal' },
      { el: 'circle', cx: 160, cy: 150, r: 9, relleno: 'acento' },
    ],
  },

  // Una flor con su hoja, también del lado contrario al cordón.
  flor: {
    ranura: 'cabeza',
    nombre: 'Flor',
    colores: ['#F472B6', '#FFC23D'],
    nombresColores: ['Pétalos', 'Centro'],
    formas: [
      { el: 'path', d: 'M166,166 Q190,166 200,186 Q174,190 166,166 Z', relleno: '#4CC27A' },
      ...petalos(156, 150),
      { el: 'circle', cx: 156, cy: 150, r: 9, relleno: 'acento' },
    ],
  },

  /* ── Cara ── */

  lentes: {
    ranura: 'cara',
    nombre: 'Lentes',
    colores: ['#1F2937'],
    nombresColores: ['Armazón'],
    formas: [
      { el: 'path', d: ovalo(...OJO_IZQUIERDO, 22) + ' ' + ovalo(...OJO_IZQUIERDO, 16), relleno: 'principal', evenodd: true },
      { el: 'path', d: ovalo(...OJO_DERECHO, 22) + ' ' + ovalo(...OJO_DERECHO, 16), relleno: 'principal', evenodd: true },
      { el: 'rect', x: 195, y: 246, width: 10, height: 6, rx: 3, relleno: 'principal' },
      ...patitas(247, 'principal'),
    ],
  },

  // Tapan los ojos, como unos de verdad; las cejas y la boca siguen diciendo
  // cómo está.
  'lentes-sol': {
    ranura: 'cara',
    nombre: 'Lentes de sol',
    colores: ['#1F2937', '#FFC23D'],
    nombresColores: ['Vidrios', 'Armazón'],
    formas: [
      { el: 'path', d: 'M148,238 Q148,232 154,232 L192,232 Q198,232 197,238 L195,256 Q192,274 172,274 Q152,274 150,256 Z', relleno: 'principal' },
      { el: 'path', d: 'M252,238 Q252,232 246,232 L208,232 Q202,232 203,238 L205,256 Q208,274 228,274 Q248,274 250,256 Z', relleno: 'principal' },
      { el: 'rect', x: 196, y: 234, width: 8, height: 6, rx: 3, relleno: 'acento' },
      ...patitas(235, 'acento', 150),
      { el: 'path', d: 'M158,242 L168,242 M210,242 L220,242', relleno: 'none', trazo: '#FFFFFF', opacidadTrazo: 0.5, anchoTrazo: 4, redondo: true },
    ],
  },

  antifaz: {
    ranura: 'cara',
    nombre: 'Antifaz',
    colores: ['#7C3AED', '#FFC23D'],
    nombresColores: ['Antifaz', 'Cintas'],
    formas: [
      ...patitas(243, 'acento', 146),
      {
        el: 'path',
        d: 'M142,246 C142,228 160,224 178,228 C188,230 194,234 200,234 C206,234 212,230 222,228 C240,224 258,228 258,246 '
          + 'C258,266 242,278 224,276 C212,274 206,268 200,268 C194,268 188,274 176,276 C158,278 142,266 142,246 Z '
          + ovalo(...OJO_IZQUIERDO, 12, 15) + ' ' + ovalo(...OJO_DERECHO, 12, 15),
        relleno: 'principal',
        evenodd: true,
      },
      { el: 'circle', cx: 152, cy: 236, r: 4, relleno: 'acento', sinContorno: true },
      { el: 'circle', cx: 248, cy: 236, r: 4, relleno: 'acento', sinContorno: true },
    ],
  },

  'lentes-estrella': {
    ranura: 'cara',
    nombre: 'Lentes de estrella',
    colores: ['#FFC23D', '#EC4899'],
    nombresColores: ['Estrellas', 'Patitas'],
    formas: [
      ...patitas(247, 'acento', 147),
      { el: 'path', d: estrella(...OJO_IZQUIERDO, 33, 22) + ' ' + ovalo(...OJO_IZQUIERDO, 15), relleno: 'principal', evenodd: true },
      { el: 'path', d: estrella(...OJO_DERECHO, 33, 22) + ' ' + ovalo(...OJO_DERECHO, 15), relleno: 'principal', evenodd: true },
    ],
  },

  /* ── Cuello ── */

  // Debajo de la sonrisa. En Independencia: azul, blanco, azul.
  corbatin: {
    ranura: 'cuello',
    nombre: 'Corbatín',
    colores: ['#0F47AF', '#FFFFFF'],
    nombresColores: ['Corbatín', 'Nudo'],
    formas: [
      { el: 'path', d: 'M200,338 L162,318 Q154,338 162,358 Z', relleno: 'principal' },
      { el: 'path', d: 'M200,338 L238,318 Q246,338 238,358 Z', relleno: 'principal' },
      { el: 'rect', x: 189, y: 327, width: 22, height: 22, rx: 6, relleno: 'acento' },
    ],
  },

  // Con su nudo y la punta colgando, con rayas.
  bufanda: {
    ranura: 'cuello',
    nombre: 'Bufanda',
    colores: ['#C1121F', '#FFFFFF'],
    nombresColores: ['Bufanda', 'Rayas'],
    formas: [
      { el: 'path', d: 'M226,338 L256,334 L266,414 L236,418 Z', relleno: 'principal' },
      { el: 'path', d: 'M231,366 L261,362 L263,376 L233,380 Z M234,392 L264,388 L265,398 L235,402 Z', relleno: 'acento', sinContorno: true },
      { el: 'path', d: 'M112,316 Q200,346 288,316 L288,346 Q200,376 112,346 Z', relleno: 'principal', separar: true },
      { el: 'path', d: 'M146,328 L146,358 M254,328 L254,358', relleno: 'none', trazo: 'acento', anchoTrazo: 10 },
      { el: 'path', d: 'M214,334 Q232,328 244,340 Q246,358 228,362 Q212,358 214,334 Z', relleno: 'principal', separar: true },
    ],
  },

  // Corta a propósito: no pasa del borde de abajo de la etiqueta.
  corbata: {
    ranura: 'cuello',
    nombre: 'Corbata',
    colores: ['#C1121F', '#FFFFFF'],
    nombresColores: ['Corbata', 'Rayas'],
    formas: [
      { el: 'path', d: 'M192,334 L208,334 L217,362 L200,378 L183,362 Z', relleno: 'principal' },
      { el: 'path', d: 'M190,346 L210,341 L211.5,346 L189,351.5 Z M187.5,360 L213,354 L214.5,359 L188,365.5 Z', relleno: 'acento', sinContorno: true },
      { el: 'path', d: 'M188,314 L212,314 L208,334 L192,334 Z', relleno: 'principal', separar: true },
    ],
  },

  'collar-flores': {
    ranura: 'cuello',
    nombre: 'Collar de flores',
    colores: ['#F472B6', '#FFC23D'],
    nombresColores: ['Unas flores', 'Las otras'],
    formas: collar(),
  },

  medalla: {
    ranura: 'cuello',
    nombre: 'Medalla',
    colores: ['#0F47AF', '#FFC23D'],
    nombresColores: ['Cinta', 'Medalla'],
    formas: [
      { el: 'path', d: 'M168,314 L184,314 L205,350 L193,354 Z', relleno: 'principal' },
      { el: 'path', d: 'M232,314 L216,314 L195,350 L207,354 Z', relleno: 'principal' },
      { el: 'circle', cx: 200, cy: 360, r: 16, relleno: 'acento' },
      { el: 'path', d: estrella(200, 360, 9, 4), relleno: '#FFFFFF', opacidad: 0.8, sinContorno: true },
    ],
  },
};

// Las piezas de cada lugar, en el orden en que las muestra el panel.
export const piezasDeRanura = (ranura) =>
  Object.entries(PIEZAS_DISFRAZ)
    .filter(([, pieza]) => pieza.ranura === ranura)
    .map(([tipo, pieza]) => ({ tipo, ...pieza }));

// Los cachetes colorados: no son una pieza, se prenden o se apagan.
export const RUBOR = {
  color: '#F0707F',
  opacidad: 0.55,
  formas: [
    { el: 'ellipse', cx: 150, cy: 284, rx: 13, ry: 8 },
    { el: 'ellipse', cx: 250, cy: 284, rx: 13, ry: 8 },
  ],
};

// ESCENAS DE TIQUI — las ilustraciones de los tutoriales
// Las seis de su tutorial (ConoceATiqui) y las de la bienvenida de la app (Onboarding: la tienda,
// el mapa y los puntos; la de pedir hablando se comparte).

import Svg, { Circle, Defs, Ellipse, G, Line, Path, RadialGradient, Rect, Stop, Text as SvgText } from 'react-native-svg';

// La paleta del video de Tiqui (piezas.mjs).
export const NAVY = '#003049';
export const AZUL = '#009AEB';
// Para TEXTO sobre el fondo claro: el azul de marca queda en 2,8:1 y el texto pide más.
export const AZUL_TEXTO = '#0088D1';
export const FONDO = '#F1F6F9';
export const GRIS = '#6B6560';
export const LINEA = '#C9D4DB';
const AMARILLO = '#FFC23D';
const RUBOR = '#F0707F';
const HOJA = '#4CC27A';
const BLANCO = '#FFFFFF';

const CUERPO =
  'M183,127 Q200,110 217,127 L261.6,171.6 Q280,190 280,216 C284,258 284,302 280,344 ' +
  'Q280,380 244,380 C215,383 185,383 156,380 Q120,380 120,344 C116,302 116,258 120,216 ' +
  'Q120,190 138.4,171.6 Z';
const AGUJERO = ' M212,160 A12,12 0 1 0 188,160 A12,12 0 1 0 212,160 Z';
const CORDONES = {
  antena: 'M200,160 C200,126 216,118 223,96 C230,74 212,64 219,44',
  viento: 'M200,160 C194,126 170,110 146,104 C120,98 108,84 96,78',
};

const trazo = { fill: 'none', strokeLinecap: 'round', strokeLinejoin: 'round' };

/* ── Tiqui ─────────────────────────────────────────────── */

const arco = (x, y) => `M${x - 12},${y + 5} Q${x},${y - 13} ${x + 12},${y + 5}`;

const Ojos = ({ tipo = 'normal', mira = [0, 0], parpadeo }) => {
  const [mx, my] = mira;
  if (tipo === 'felices') return <Path d={`${arco(174, 252)} ${arco(226, 252)}`} stroke={BLANCO} strokeWidth={7} {...trazo} />;
  if (tipo === 'guino') {
    return (
      <>
        <Ellipse cx={174} cy={252} rx={10} ry={parpadeo ? 2 : 14} fill={BLANCO} />
        <Path d={arco(226, 252)} stroke={BLANCO} strokeWidth={7} {...trazo} />
      </>
    );
  }
  if (tipo === 'grandes') {
    return (
      <>
        <Ellipse cx={177 + mx} cy={251 + my} rx={12} ry={parpadeo ? 2 : 17} fill={BLANCO} />
        <Ellipse cx={229 + mx} cy={251 + my} rx={12} ry={parpadeo ? 2 : 17} fill={BLANCO} />
      </>
    );
  }
  // 'lupa': el ojo de la derecha se ve enorme detrás del vidrio.
  const k = tipo === 'lupa' ? 1.75 : 1;
  return (
    <>
      <Ellipse cx={174 + mx} cy={252 + my} rx={10} ry={parpadeo ? 2 : 14} fill={BLANCO} />
      <Ellipse cx={226 + mx} cy={252 + my} rx={10 * k} ry={(parpadeo ? 2 : 14) * k} fill={BLANCO} />
    </>
  );
};

const CEJAS = {
  arriba: 'M160,226 Q172,214 186,221 M214,221 Q228,214 240,226',
  una: 'M162,229 L186,229 M214,223 Q226,211 238,221',
};

const Boca = ({ tipo = 'sonrisa' }) => {
  if (tipo === 'abierta') return <Path d="M182,280 Q200,316 218,280 Z" fill={BLANCO} stroke={BLANCO} strokeWidth={4} strokeLinejoin="round" />;
  if (tipo === 'o') return <Ellipse cx={200} cy={292} rx={8} ry={10} fill={BLANCO} />;
  const d = { lado: 'M188,292 Q204,297 214,286' }[tipo] || 'M184,284 Q200,300 216,284';
  return <Path d={d} stroke={BLANCO} strokeWidth={7.5} {...trazo} />;
};

// La etiqueta con su cara. `transform` la mueve entera (la patineta la inclina).
const Tiqui = ({ ojos, mira, cejas, boca, rubor, cordon = 'antena', parpadeo, transform, children }) => (
  <G transform={transform}>
    <Path d={CORDONES[cordon]} stroke={AZUL} strokeWidth={7} {...trazo} />
    <Path d={CUERPO + AGUJERO} fillRule="evenodd" fill={NAVY} />
    {cejas && <Path d={CEJAS[cejas]} stroke={BLANCO} strokeWidth={6.5} {...trazo} />}
    <Ojos tipo={ojos} mira={mira} parpadeo={parpadeo} />
    {rubor && (
      <G opacity={0.75}>
        <Ellipse cx={150} cy={282} rx={12} ry={7} fill={RUBOR} />
        <Ellipse cx={250} cy={282} rx={12} ry={7} fill={RUBOR} />
      </G>
    )}
    <Boca tipo={boca} />
    {children}
  </G>
);

/* ── Las piezas de siempre ─────────────────────────────── */

const Fantasma = ({ x, y, giro, escala }) => (
  <Path
    d={CUERPO + AGUJERO}
    fill="none"
    stroke={NAVY}
    strokeOpacity={0.08}
    strokeWidth={7 / escala}
    transform={`translate(${x} ${y}) rotate(${giro}) scale(${escala})`}
  />
);

// El fondo de todas: cuatro etiquetas fantasma en las esquinas y el brillo.
const Fondo = ({ id }) => (
  <>
    <Defs>
      <RadialGradient id={id} cx="50%" cy="50%" rx="50%" ry="50%">
        <Stop offset="0" stopColor={AZUL} stopOpacity={0.18} />
        <Stop offset="1" stopColor={AZUL} stopOpacity={0} />
      </RadialGradient>
    </Defs>
    <Fantasma x={-6} y={10} giro={-16} escala={0.3} />
    <Fantasma x={292} y={-6} giro={14} escala={0.28} />
    <Fantasma x={300} y={330} giro={-10} escala={0.3} />
    <Fantasma x={-12} y={322} giro={18} escala={0.26} />
    <Circle cx={200} cy={250} r={175} fill={`url(#${id})`} />
  </>
);

const estrella = (cx, cy, r) => {
  const k = r / 42;
  return `M${cx},${cy - 42 * k} l${12 * k},${30 * k} ${30 * k},${12 * k} ${-30 * k},${12 * k} ${-12 * k},${30 * k} ${-12 * k},${-30 * k} ${-30 * k},${-12 * k} ${30 * k},${-12 * k} z`;
};

const Corazon = ({ x, y, escala = 1 }) => (
  <Path d="M0,-6 c-9,-13 -29,-4 -20,11 l20,18 20,-18 c9,-15 -11,-24 -20,-11 z" fill={RUBOR} transform={`translate(${x} ${y}) scale(${escala})`} />
);

const Manzana = ({ x, y, k = 1 }) => (
  <G transform={`translate(${x} ${y}) scale(${k})`}>
    <Circle r={40} fill={RUBOR} />
    <Path d="M0,-38 q8,-18 26,-18" stroke={HOJA} strokeWidth={8} {...trazo} />
  </G>
);

const Galletas = ({ x, y, k = 1, giro = 0 }) => (
  <G transform={`translate(${x} ${y}) rotate(${giro}) scale(${k})`}>
    <Rect x={-38} y={-60} width={76} height={120} rx={14} fill={AMARILLO} />
    <Path d="M-24,-30 H24 M-24,-10 H12" stroke={BLANCO} strokeOpacity={0.7} strokeWidth={7} strokeLinecap="round" />
  </G>
);

const Jugo = ({ x, y, k = 1, giro = 0 }) => (
  <G transform={`translate(${x} ${y}) rotate(${giro}) scale(${k})`}>
    <Path d="M-30,-40 L-18,-62 H18 L30,-40 V60 Q30,66 24,66 H-24 Q-30,66 -30,60 Z" fill={AZUL} />
    <Rect x={-18} y={-10} width={36} height={34} rx={6} fill={BLANCO} fillOpacity={0.8} />
  </G>
);

const Lienzo = ({ alto, children }) => (
  <Svg width={alto * (400 / 470)} height={alto} viewBox="0 0 400 470">
    {children}
  </Svg>
);

/* ── Las seis escenas ──────────────────────────────────── */

// 1. Hola: guiña un ojo, con los cachetes colorados y corazones.
const Hola = ({ alto, parpadeo }) => (
  <Lienzo alto={alto}>
    <Fondo id="brillo-hola" />
    <Path d={estrella(94, 112, 18)} fill={AMARILLO} />
    <Path d={estrella(330, 262, 11)} fill={AZUL} />
    <Corazon x={322} y={150} escala={1.4} />
    <Corazon x={80} y={232} escala={1} />
    <Tiqui ojos="guino" boca="sonrisa" rubor parpadeo={parpadeo} />
  </Lienzo>
);

// 2. Voz: escucha con los ojos grandes; su cordón recibe las ondas y el globo
//    muestra lo que le pidieron.
const Voz = ({ alto, parpadeo }) => (
  <Lienzo alto={alto}>
    <Fondo id="brillo-voz" />
    <G stroke={AZUL} strokeWidth={6} {...trazo}>
      <Path d="M244,40 Q256,52 244,64" />
      <Path d="M258,28 Q278,52 258,76" opacity={0.65} />
      <Path d="M272,16 Q300,52 272,88" opacity={0.35} />
    </G>
    {/* El globo de lo que dijo la persona: "dos manzanas y una leche" (el cartón es la leche). */}
    <Path d="M18,78 Q18,62 34,62 L150,62 Q166,62 166,78 L166,136 Q166,152 150,152 L118,152 L128,176 L96,152 L34,152 Q18,152 18,136 Z" fill={BLANCO} stroke={LINEA} strokeWidth={3} />
    <Manzana x={54} y={110} k={0.34} />
    <SvgText x={80} y={120} fontSize={24} fontWeight="800" fill={NAVY}>×2</SvgText>
    <Jugo x={136} y={108} k={0.34} />
    <Tiqui ojos="grandes" mira={[0, 3]} cejas="arriba" boca="o" parpadeo={parpadeo} />
  </Lienzo>
);

// 3. Ofertas: feliz, entre estrellas, productos y el sello de descuento.
const Ofertas = ({ alto, parpadeo }) => (
  <Lienzo alto={alto}>
    <Fondo id="brillo-ofertas" />
    <Path d={estrella(84, 126, 34)} fill={AMARILLO} />
    <Path d={estrella(334, 88, 14)} fill={AMARILLO} />
    <Jugo x={70} y={322} k={0.6} giro={-10} />
    <Galletas x={332} y={300} k={0.6} giro={12} />
    <Circle cx={318} cy={176} r={28} fill={AZUL} />
    <SvgText x={318} y={187} fontSize={30} fontWeight="900" fill={BLANCO} textAnchor="middle">%</SvgText>
    <Tiqui ojos="felices" boca="abierta" rubor parpadeo={parpadeo} />
  </Lienzo>
);

// 4. Sin sorpresas: busca con la lupa y, si no está, pregunta.
const Honesto = ({ alto, parpadeo }) => (
  <Lienzo alto={alto}>
    <Fondo id="brillo-honesto" />
    <G>
      <Path d="M300,86 C300,70 326,70 326,86 C326,96 313,96 313,108" stroke={AZUL} strokeWidth={8} {...trazo} />
      <Circle cx={313} cy={123} r={5.5} fill={AZUL} />
    </G>
    <Tiqui ojos="lupa" mira={[4, -2]} cejas="una" boca="lado" parpadeo={parpadeo}>
      <Circle cx={228} cy={250} r={36} fill={AZUL} fillOpacity={0.16} stroke={AZUL} strokeWidth={9} />
      <Path d="M254,276 L288,312" stroke={AZUL} strokeWidth={12} {...trazo} />
      <Path d="M206,238 A24,24 0 0 1 220,226" stroke={BLANCO} strokeWidth={5} opacity={0.75} {...trazo} />
    </Tiqui>
  </Lienzo>
);

// 5. Hasta tu puerta: va en patineta, inclinada, con el cordón al viento.
const Pedido = ({ alto, parpadeo }) => (
  <Lienzo alto={alto}>
    <Fondo id="brillo-pedido" />
    <Path d="M36,250 L96,250 M16,300 L88,300 M40,350 L96,350" stroke={GRIS} strokeWidth={6} opacity={0.45} {...trazo} />
    <Tiqui ojos="normal" mira={[8, -1]} boca="sonrisa" cordon="viento" parpadeo={parpadeo} transform="rotate(8 200 382)" />
    <Path d="M312,396 L334,262 M318,262 L350,262" stroke={NAVY} strokeWidth={9} {...trazo} />
    <Rect x={110} y={386} width={212} height={14} rx={7} fill={NAVY} />
    {[140, 300].map((x) => (
      <G key={x}>
        <Circle cx={x} cy={424} r={20} fill={FONDO} stroke={NAVY} strokeWidth={8} />
        <Line x1={x - 10} y1={424} x2={x + 10} y2={424} stroke={AZUL} strokeWidth={5} strokeLinecap="round" />
      </G>
    ))}
  </Lienzo>
);

// 6. ¿Empezamos?: salta de alegría entre confeti, junto al ícono de su pestaña.
const CONFETI = [
  [74, 120, -25, AZUL], [330, 110, 30, AMARILLO], [52, 250, 60, RUBOR],
  [352, 236, -40, AZUL], [104, 58, 15, AMARILLO], [296, 48, -20, RUBOR],
];
const Empezar = ({ alto, parpadeo }) => (
  <Lienzo alto={alto}>
    <Fondo id="brillo-empezar" />
    {CONFETI.map(([x, y, giro, color]) => (
      <Rect key={`${x}-${y}`} x={x - 4} y={y - 9} width={8} height={18} rx={4} fill={color} transform={`rotate(${giro} ${x} ${y})`} />
    ))}
    <Tiqui ojos="felices" boca="abierta" rubor parpadeo={parpadeo} />
    {/* El micrófono es el ícono de la pestaña donde vive (Asistente). */}
    <Circle cx={322} cy={352} r={32} fill={NAVY} />
    <Rect x={312} y={332} width={20} height={30} rx={10} fill={BLANCO} />
    <Path d="M304,352 Q322,376 340,352 M322,366 L322,374" stroke={BLANCO} strokeWidth={4} {...trazo} />
  </Lienzo>
);

/* ── Las de la bienvenida de la app (Onboarding) ───────── */

// La tienda "a un toque": la bolsa con lo que se compró y el celular donde se toca.
const Tienda = ({ alto, parpadeo }) => (
  <Lienzo alto={alto}>
    <Fondo id="brillo-tienda" />
    <Path d={estrella(96, 120, 16)} fill={AMARILLO} />
    <Path d={estrella(336, 150, 10)} fill={AZUL} />
    {/* Lo que asoma de la bolsa va antes: la bolsa lo tapa de la cintura para abajo. */}
    <Jugo x={50} y={262} k={0.42} giro={-8} />
    <Manzana x={88} y={286} k={0.34} />
    <Path d="M22,300 L110,300 L102,392 Q101,400 93,400 L39,400 Q31,400 30,392 Z" fill={AMARILLO} />
    <Path d="M46,300 Q46,272 66,272 Q86,272 86,300" stroke={NAVY} strokeWidth={6} {...trazo} />
    <Path d="M38,330 H94" stroke={BLANCO} strokeOpacity={0.7} strokeWidth={6} strokeLinecap="round" />
    {/* El celular, con la tienda en la pantalla y el toque sobre el botón. */}
    <Rect x={298} y={236} width={72} height={130} rx={14} fill={NAVY} />
    <Rect x={306} y={252} width={56} height={98} rx={6} fill={BLANCO} />
    {[[312, 260, RUBOR], [336, 260, AMARILLO], [312, 284, HOJA], [336, 284, AZUL]].map(([x, y, color]) => (
      <Rect key={`${x}-${y}`} x={x} y={y} width={20} height={20} rx={5} fill={color} />
    ))}
    <Rect x={312} y={316} width={44} height={16} rx={8} fill={AZUL} />
    <Circle cx={346} cy={324} r={16} fill="none" stroke={AZUL} strokeWidth={4} opacity={0.6} />
    <Circle cx={346} cy={324} r={27} fill="none" stroke={AZUL} strokeWidth={3} opacity={0.3} />
    <Tiqui ojos="guino" boca="sonrisa" rubor parpadeo={parpadeo} />
  </Lienzo>
);

// El mapa: la ruta punteada de la tienda a la casa, el repartidor en camino y
// el pin de destino, que Tiqui mira.
const Mapa = ({ alto, parpadeo }) => (
  <Lienzo alto={alto}>
    <Fondo id="brillo-mapa" />
    <Path
      d="M104,394 Q200,446 318,420 Q372,406 356,306 Q346,226 322,160"
      stroke={NAVY}
      strokeWidth={6}
      strokeDasharray="2 15"
      opacity={0.45}
      {...trazo}
    />
    {/* La casa, donde empieza la ruta. */}
    <Path d="M22,334 L66,292 L110,334 Z" fill={NAVY} />
    <Rect x={34} y={330} width={64} height={62} rx={6} fill={BLANCO} stroke={NAVY} strokeWidth={5} />
    <Rect x={56} y={352} width={20} height={40} rx={4} fill={AZUL} />
    {/* El repartidor: el puntito que se ve avanzar en el mapa. */}
    <Circle cx={238} cy={429} r={15} fill={AZUL} stroke={BLANCO} strokeWidth={5} />
    {/* El pin de destino. */}
    <Path d="M322,150 C300,122 290,108 290,94 A32,32 0 1 1 354,94 C354,108 344,122 322,150 Z" fill={AZUL} />
    <Circle cx={322} cy={94} r={12} fill={BLANCO} />
    <Tiqui ojos="normal" mira={[8, -5]} boca="sonrisa" parpadeo={parpadeo} />
  </Lienzo>
);

// Los puntos y los favoritos: la moneda de puntos, "+10" y los corazones.
const Puntos = ({ alto, parpadeo }) => (
  <Lienzo alto={alto}>
    <Fondo id="brillo-puntos" />
    <Circle cx={88} cy={150} r={40} fill={AMARILLO} />
    <Circle cx={88} cy={150} r={30} fill="none" stroke={BLANCO} strokeWidth={4} opacity={0.6} />
    <Path d={estrella(88, 150, 17)} fill={BLANCO} />
    <SvgText x={88} y={226} fontSize={28} fontWeight="900" fill={AZUL_TEXTO} textAnchor="middle">+10</SvgText>
    <Corazon x={332} y={168} escala={1.6} />
    <Corazon x={352} y={262} escala={0.9} />
    <Path d={estrella(320, 338, 12)} fill={AMARILLO} />
    <Path d={estrella(68, 318, 10)} fill={AZUL} />
    <Path d={estrella(342, 76, 9)} fill={AMARILLO} />
    <Tiqui ojos="felices" boca="abierta" rubor parpadeo={parpadeo} />
  </Lienzo>
);

export const ESCENAS_TIQUI = {
  hola: Hola,
  voz: Voz,
  ofertas: Ofertas,
  honesto: Honesto,
  pedido: Pedido,
  empezar: Empezar,
  tienda: Tienda,
  mapa: Mapa,
  puntos: Puntos,
};

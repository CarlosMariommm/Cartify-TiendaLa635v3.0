// MASCOTA — Tiqui en los momentos de la tienda
// Las mismas poses que en la web (cargando, buscando, vacío, error, fiesta, los estados del
// pedido…), con el disfraz de la temporada.

import { useEffect, useRef } from 'react';
import { Animated, Easing, Text } from 'react-native';
import Svg, { Circle, Ellipse, G, Path, Rect } from 'react-native-svg';
import { useColores } from '../../context/ModoContext';
import { useIdioma } from '../../context/IdiomaContext';
import {
  AMARILLO, CORDON, Cuerpo, Disfraz, HOJA, RUBOR, TRAZO,
  useColoresTiqui, useDisfrazTiqui, useMovimientoReducido, useParpadeo,
} from './piezas';

// Cada pose: la cara, el cordón, cómo se mueve y qué la acompaña. `vista` es el encuadre
// (viewBox): cada una deja el aire justo para lo que tiene alrededor.
const POSES = {
  cargando: { vista: [0, 0, 400, 400], cordon: 'colgado', mov: 'pendulo' },
  buscando: { vista: [80, 26, 240, 370], ojos: 'lupa', mira: [4, -2], cejas: 'una', boca: 'lado', mov: 'balanceo', delante: 'lupa' },
  vacio: { vista: [56, 26, 344, 412], correr: -46, mira: [7, 4], cejas: 'preocupado', boca: 'plana', mov: 'respira', aparte: 'carrito' },
  'sin-conexion': { vista: [96, 26, 304, 364], mira: [6, -3], cejas: 'preocupado', boca: 'o', cordon: 'enchufe', aparte: 'toma' },
  error: { vista: [40, 0, 320, 460], caida: true, ojos: 'x', boca: 'o', cordon: 'cortado', aparte: 'caida' },
  perdida: { vista: [104, 30, 192, 360], mira: [-8, 0], cejas: 'una', boca: 'o', mov: 'balanceo' },
  fiesta: { vista: [40, 0, 320, 395], ojos: 'feliz', boca: 'abierta', mov: 'salta', aparte: 'confeti' },
  saludo: { vista: [104, 30, 192, 360], ojos: 'guino', mov: 'saluda' },
  posando: { vista: [84, 30, 232, 400] },
  recibido: { vista: [100, 26, 290, 380], mira: [7, 1], mov: 'respira', aparte: 'recibo' },
  preparando: { vista: [100, 26, 270, 400], mira: [6, 7], boca: 'lado', mov: 'respira', aparte: 'bolsa' },
  'en-camino': { vista: [20, 20, 350, 434], inclinada: true, mira: [8, -1], cordon: 'viento', todo: 'traqueteo', detras: 'velocidad', aparte: 'patineta' },
  entregado: { vista: [100, 20, 270, 410], ojos: 'feliz', boca: 'abierta', mov: 'respira', aparte: 'entrega' },
  cancelado: { vista: [104, 30, 200, 360], mira: [0, 5], cejas: 'preocupado', boca: 'triste', cordon: 'caido' },
  // Las secciones de Mi Cuenta que todavía no tienen nada: ella se corre y mira lo que falta.
  'sin-favoritos': { vista: [56, 26, 344, 370], correr: -46, mira: [7, -5], mov: 'respira', aparte: 'corazon-vacio' },
  'sin-recibos': { vista: [56, 26, 344, 370], correr: -46, mira: [7, 1], cejas: 'una', boca: 'lado', mov: 'respira', aparte: 'recibo-vacio' },
  'sin-direcciones': { vista: [56, 26, 344, 370], correr: -46, mira: [7, -1], mov: 'respira', aparte: 'pin' },
  'sin-tarjetas': { vista: [56, 26, 344, 370], correr: -46, mira: [7, 1], mov: 'respira', aparte: 'tarjeta' },
};

// En los botones va solo la etiqueta colgando, sin aire alrededor.
const VISTA_MINI = [110, 0, 180, 392];

// Los movimientos (index.css de la web, sección MASCOTA). `eje` es el punto del dibujo sobre el
// que gira o se estira.
const MOVIMIENTOS = {
  pendulo: { eje: [200, 0], ms: 1700, alterna: true, a: { rotate: ['12deg', '-12deg'] } },
  'pendulo-corto': { eje: [200, 0], ms: 1200, alterna: true, a: { rotate: ['7deg', '-7deg'] } },
  balanceo: { eje: [200, 382], ms: 2600, alterna: true, a: { rotate: ['-4deg', '4deg'] } },
  respira: { eje: [200, 382], ms: 2800, alterna: true, a: { scaleX: [1, 1.02], scaleY: [1, 0.985] } },
  salta: {
    eje: [200, 382], ms: 900,
    a: {
      translateY: { entrada: [0, 0.18, 0.5, 0.82, 1], salida: [0, 0, -34, 0, 0] },
      scaleX: { entrada: [0, 0.18, 0.5, 0.82, 1], salida: [1.05, 1, 0.98, 1, 1.05] },
      scaleY: { entrada: [0, 0.18, 0.5, 0.82, 1], salida: [0.94, 1, 1.03, 1, 0.94] },
    },
  },
  saluda: {
    eje: [200, 110], ms: 2400,
    a: { rotate: { entrada: [0, 0.1, 0.22, 0.34, 0.45, 0.55, 1], salida: ['0deg', '12deg', '-9deg', '8deg', '-3deg', '0deg', '0deg'] } },
  },
  traqueteo: { eje: [200, 382], ms: 280, alterna: true, a: { translateY: [0, -4] } },
};

// Un valor que va y viene (o da la vuelta) mientras la pose lo pida.
const useBucle = (mov, quieta) => {
  const valor = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    valor.setValue(0);
    if (!mov || quieta) return undefined;
    const m = MOVIMIENTOS[mov];
    const ida = Animated.timing(valor, { toValue: 1, duration: m.ms, easing: Easing.inOut(Easing.sin), useNativeDriver: true });
    const bucle = m.alterna
      ? Animated.loop(Animated.sequence([ida, Animated.timing(valor, { toValue: 0, duration: m.ms, easing: Easing.inOut(Easing.sin), useNativeDriver: true })]))
      : Animated.loop(Animated.timing(valor, { toValue: 1, duration: m.ms, easing: Easing.linear, useNativeDriver: true }));
    bucle.start();
    return () => bucle.stop();
  }, [mov, quieta, valor]);
  return valor;
};

// De la definición del movimiento a las transformaciones de Animated.
const transformar = (valor, mov) => {
  const m = MOVIMIENTOS[mov];
  if (!m) return [];
  return Object.entries(m.a).map(([prop, rango]) => {
    const conf = Array.isArray(rango)
      ? { inputRange: [0, 1], outputRange: rango }
      : { inputRange: rango.entrada, outputRange: rango.salida };
    return { [prop]: valor.interpolate(conf) };
  });
};

const Ojos = ({ tipo = 'normal', mira = [0, 0], rasgo, parpadeo }) => {
  const I = [174, 252];
  const D = [226, 252];
  const lleno = ([x, y], k = 1) => (
    <Ellipse cx={x + mira[0]} cy={y + mira[1]} rx={10 * k} ry={(parpadeo ? 2 : 14) * k} fill={rasgo} />
  );
  const feliz = ([x, y]) => <Path d={`M${x - 12},${y + 5} Q${x},${y - 13} ${x + 12},${y + 5}`} stroke={rasgo} strokeWidth={7} {...TRAZO} />;
  const equis = ([x, y]) => (
    <Path d={`M${x - 10},${y - 10} L${x + 10},${y + 10} M${x + 10},${y - 10} L${x - 10},${y + 10}`} stroke={rasgo} strokeWidth={7} {...TRAZO} />
  );
  if (tipo === 'feliz') return <>{feliz(I)}{feliz(D)}</>;
  if (tipo === 'x') return <>{equis(I)}{equis(D)}</>;
  if (tipo === 'guino') return <>{lleno(I)}{feliz(D)}</>;
  return <>{lleno(I)}{lleno(D, tipo === 'lupa' ? 1.75 : 1)}</>;
};

const CEJAS = {
  preocupado: 'M162,231 L186,222 M214,222 L238,231',
  una: 'M162,229 L186,229 M214,223 Q226,211 238,221',
};

const Boca = ({ tipo = 'sonrisa', rasgo }) => {
  if (tipo === 'abierta') return <Path d="M182,280 Q200,316 218,280 Z" fill={rasgo} stroke={rasgo} strokeWidth={4} strokeLinejoin="round" />;
  if (tipo === 'o') return <Ellipse cx={200} cy={291} rx={8} ry={10} fill={rasgo} />;
  const d = {
    sonrisa: 'M184,284 Q200,300 216,284',
    plana: 'M188,292 L212,292',
    lado: 'M188,292 Q204,297 214,286',
    triste: 'M186,296 Q200,284 214,296',
  }[tipo];
  return <Path d={d} stroke={rasgo} strokeWidth={7.5} {...TRAZO} />;
};

const Cordon = ({ tipo, color }) => {
  const t = { stroke: color, strokeWidth: 7, ...TRAZO };
  if (tipo === 'colgado') return <Path d="M200,0 L200,160" {...t} />;
  if (tipo === 'cortado') return <Path d="M200,160 L200,112 M200,112 l-8,-12 M200,112 l0,-14 M200,112 l8,-12" {...t} />;
  if (tipo === 'viento') return <Path d="M200,160 C194,126 170,110 146,104 C120,98 108,84 96,78" {...t} />;
  if (tipo === 'caido') return <Path d="M200,160 C216,150 244,152 260,172 C274,190 280,212 282,234" {...t} />;
  if (tipo === 'enchufe') {
    return (
      <>
        <Path d="M200,160 C200,96 286,92 300,160 C306,190 296,246 316,250" {...t} />
        <Rect x={316} y={236} width={26} height={28} rx={6} fill={color} />
        <Path d="M342,244 L355,244 M342,256 L355,256" stroke={color} strokeWidth={5} {...TRAZO} />
      </>
    );
  }
  return <Path d={CORDON} {...t} />;
};

const Lupa = ({ c }) => (
  <>
    <Circle cx={228} cy={250} r={36} fill={c.cordon} fillOpacity={0.16} stroke={c.cordon} strokeWidth={9} />
    <Path d="M254,276 L288,312" stroke={c.cordon} strokeWidth={12} {...TRAZO} />
    <Path d="M206,238 A24,24 0 0 1 220,226" stroke="#FFFFFF" strokeWidth={5} opacity={0.75} {...TRAZO} />
  </>
);

// Lo que se queda quieto alrededor (va por delante de Tiqui).
const Aparte = ({ tipo, c }) => {
  switch (tipo) {
    case 'carrito':
      return (
        <>
          <Path d="M258,318 L280,318 L296,396 L370,396 L386,340 L286,340" stroke={c.cuerpo} strokeWidth={9} {...TRAZO} />
          <Circle cx={306} cy={420} r={10} fill={c.cuerpo} />
          <Circle cx={362} cy={420} r={10} fill={c.cuerpo} />
        </>
      );
    case 'toma':
      return (
        <>
          <Rect x={368} y={214} width={24} height={72} rx={8} fill={c.cuerpo} />
          <Circle cx={380} cy={244} r={3.5} fill={c.fondo} />
          <Circle cx={380} cy={256} r={3.5} fill={c.fondo} />
          <Path d="M358,236 l3,-10 M360,264 l4,9" stroke={AMARILLO} strokeWidth={4} {...TRAZO} />
        </>
      );
    case 'caida':
      return (
        <>
          <Path d="M200,0 L200,66 M200,66 l-8,12 M200,66 l0,14 M200,66 l8,12" stroke={c.cordon} strokeWidth={7} {...TRAZO} />
          <Path d="M64,446 L350,446" stroke={c.linea} strokeWidth={5} {...TRAZO} />
          <Path d="M84,376 l-16,-8 M80,398 l-20,0" stroke={c.suave} strokeWidth={5} opacity={0.6} {...TRAZO} />
        </>
      );
    case 'confeti':
      return (
        <>
          {[
            [74, 120, -25, c.cordon], [330, 110, 30, AMARILLO], [52, 250, 60, RUBOR],
            [352, 236, -40, c.cordon], [104, 58, 15, AMARILLO], [296, 48, -20, RUBOR],
          ].map(([x, y, giro, color]) => (
            <Rect key={`${x}-${y}`} x={x - 4} y={y - 9} width={8} height={18} rx={4} fill={color} transform={`rotate(${giro} ${x} ${y})`} />
          ))}
        </>
      );
    case 'recibo':
      return (
        <>
          <G transform="rotate(10 312 280)">
            <Rect x={276} y={228} width={72} height={100} rx={8} fill={c.fondo} stroke={c.cuerpo} strokeWidth={6} />
            <Path d="M290,256 L334,256 M290,276 L334,276 M290,296 L318,296" stroke={c.cuerpo} strokeWidth={6} opacity={0.45} {...TRAZO} />
          </G>
          <Circle cx={346} cy={232} r={19} fill={c.cordon} />
          <Path d="M337,232 L344,239 L356,226" stroke="#FFFFFF" strokeWidth={5} {...TRAZO} />
        </>
      );
    case 'bolsa':
      return (
        <>
          <Circle cx={300} cy={236} r={13} fill={RUBOR} />
          <Path d="M300,223 q4,-8 10,-8" stroke={HOJA} strokeWidth={4} {...TRAZO} />
          <Rect x={318} y={220} width={18} height={30} rx={5} fill={AMARILLO} />
          <Path d="M280,318 C280,296 320,296 320,318" stroke={c.cordon} strokeWidth={6} {...TRAZO} />
          <Path d="M256,318 L344,318 L352,404 Q352,414 342,414 L258,414 Q248,414 248,404 Z" fill={c.cordon} />
          <Path d="M256,318 L344,318 L345,332 L255,332 Z" fill="#000000" opacity={0.12} />
        </>
      );
    case 'patineta':
      return (
        <>
          <Path d="M312,396 L334,262 M318,262 L350,262" stroke={c.cuerpo} strokeWidth={9} {...TRAZO} />
          <Rect x={110} y={386} width={212} height={14} rx={7} fill={c.cuerpo} />
          {[140, 300].map((x) => (
            <G key={x}>
              <Circle cx={x} cy={424} r={20} fill={c.fondo} stroke={c.cuerpo} strokeWidth={8} />
              <Path d={`M${x - 10},424 L${x + 10},424`} stroke={c.cordon} strokeWidth={5} {...TRAZO} />
            </G>
          ))}
        </>
      );
    case 'entrega':
      return (
        <>
          <Path d="M282,332 C282,312 314,312 314,332" stroke={c.cordon} strokeWidth={6} {...TRAZO} />
          <Path d="M258,332 L338,332 L345,410 Q345,418 337,418 L259,418 Q251,418 251,410 Z" fill={c.cordon} />
          <Circle cx={340} cy={336} r={17} fill={c.cuerpo} />
          <Path d="M332,336 L338,342 L349,330" stroke={c.rasgo} strokeWidth={4.5} {...TRAZO} />
          <Path d="M322,196 c-8,-12 -26,-4 -18,10 l18,16 l18,-16 c8,-14 -10,-22 -18,-10 z" fill={RUBOR} />
        </>
      );
    case 'corazon-vacio':
      return (
        <Path
          transform="translate(322 256) scale(1.2) translate(-322 -256)"
          d="M322,300 C276,268 266,236 286,216 C302,202 322,212 322,230 C322,212 342,202 358,216 C378,236 368,268 322,300 Z"
          fill={RUBOR} fillOpacity={0.12} stroke={RUBOR} strokeWidth={9} strokeLinejoin="round"
        />
      );
    case 'recibo-vacio':
      return (
        <G transform="translate(312 278) rotate(8) scale(1.3) translate(-312 -278)">
          <Path
            d="M276,226 L348,226 L348,330 L336,320 L324,330 L312,320 L300,330 L288,320 L276,330 Z"
            fill={c.fondo} stroke={c.cuerpo} strokeWidth={6} strokeLinejoin="round"
          />
          <Path d="M290,254 L334,254 M290,276 L334,276 M290,298 L318,298" stroke={c.cuerpo} strokeWidth={5} strokeDasharray="1 11" opacity={0.45} {...TRAZO} />
        </G>
      );
    case 'pin':
      return (
        <>
          <Ellipse cx={322} cy={374} rx={30} ry={7} fill={c.linea} />
          <G transform="translate(322 340) scale(1.3) translate(-322 -332)">
            <Path d="M322,332 C300,302 286,284 286,264 A36,36 0 0 1 358,264 C358,284 344,302 322,332 Z" fill={c.cordon} />
            <Circle cx={322} cy={264} r={13} fill={c.fondo} />
          </G>
        </>
      );
    case 'tarjeta':
      return (
        <G transform="translate(322 270) rotate(-10) scale(1.3) translate(-322 -270)">
          <Rect x={272} y={238} width={100} height={64} rx={10} fill={c.cordon} />
          <Rect x={272} y={252} width={100} height={12} fill="#000000" opacity={0.18} />
          <Rect x={284} y={274} width={18} height={13} rx={3} fill={AMARILLO} />
        </G>
      );
    default:
      return null;
  }
};

// `disfraz`: lo que lleva puesto. Sin pasarlo, el de la temporada; `null` la deja sin nada. `mini`
// es la versión de los botones (sin disfraz: a la altura de una línea de texto, el gorro sería una
// mancha junto a "Entrar").
const Mascota = ({ pose = 'cargando', alto = 120, mini = false, sobre, disfraz, style }) => {
  const p = POSES[pose] || POSES.cargando;
  const [vx, vy, vw, vh] = mini ? VISTA_MINI : p.vista;
  const vista = `${vx} ${vy} ${vw} ${vh}`;
  const ancho = (alto * vw) / vh;

  const c = useColoresTiqui(sobre);
  const deTemporada = useDisfrazTiqui();
  const puesto = mini ? null : disfraz === undefined ? deTemporada : disfraz;
  const reducido = useMovimientoReducido();
  const parpadeo = useParpadeo(!reducido && !['feliz', 'x', 'guino'].includes(p.ojos));

  const mov = mini && p.mov === 'pendulo' ? 'pendulo-corto' : p.mov;
  const valor = useBucle(mov, reducido);
  const todo = useBucle(p.todo, reducido);

  // El eje del movimiento, del dibujo a la pantalla (con lo corrida que esté).
  // Va en píxeles ENTEROS: con decimales, la capa animada no se dibujaba.
  const eje = MOVIMIENTOS[mov]?.eje || [200, 382];
  const ox = ((eje[0] + (p.correr || 0) - vx) / vw) * ancho;
  const oy = ((eje[1] - vy) / vh) * alto;

  // Cómo va puesta en el cuadro: corrida, caída (error) o inclinada (en camino).
  const colocar = p.caida
    // Apoyada en el piso, sin atravesarlo (igual que en la web, Mascota.jsx).
    ? 'translate(210 340) rotate(-66) scale(0.88) translate(-200 -246)'
    : p.inclinada
      ? 'rotate(8 200 382)'
      : `translate(${p.correr || 0} 0)`;

  const capa = { position: 'absolute', left: 0, top: 0 };

  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[{ width: ancho, height: alto }, { transform: transformar(todo, p.todo) }, style]}
    >
      {p.detras === 'velocidad' && (
        <Svg width={ancho} height={alto} viewBox={vista} style={capa}>
          <Path d="M40,250 L100,250 M20,300 L92,300 M44,350 L100,350" stroke={c.suave} strokeWidth={6} opacity={0.45} {...TRAZO} />
        </Svg>
      )}

      <Animated.View style={[capa, { width: ancho, height: alto, transformOrigin: [Math.round(ox), Math.round(oy), 0], transform: transformar(valor, mov) }]}>
        <Svg width={ancho} height={alto} viewBox={vista}>
          <G transform={colocar}>
            <Cuerpo color={c.cuerpo} />
            {CEJAS[p.cejas] && <Path d={CEJAS[p.cejas]} stroke={c.rasgo} strokeWidth={6.5} {...TRAZO} />}
            <Ojos tipo={p.ojos} mira={p.mira} rasgo={c.rasgo} parpadeo={parpadeo} />
            <Boca tipo={p.boca} rasgo={c.rasgo} />
            <Cordon tipo={mini ? 'colgado' : p.cordon} color={c.cordon} />
            <Disfraz disfraz={puesto} contorno={c.rasgo} />
            {p.delante === 'lupa' && <Lupa c={c} />}
          </G>
        </Svg>
      </Animated.View>

      {p.aparte && (
        <Svg width={ancho} height={alto} viewBox={vista} style={capa}>
          <Aparte tipo={p.aparte} c={c} />
        </Svg>
      )}
    </Animated.View>
  );
};

// Para las esperas cortas dentro de un botón ("Entrando…", "Procesando…"): la etiqueta colgando,
// del alto de una línea de texto.
export const EsperaMascota = ({ alto = 22, sobre }) => <Mascota pose="cargando" mini alto={alto} sobre={sobre} />;

// Para cuando una pantalla entera está cargando: Tiqui balanceándose y el texto de lo que se está
// trayendo. Aparece con un poquito de retraso: si los datos llegan rápido, no alcanza a verse y no
// queda un parpadeo.
export const CargandoMascota = ({ texto, alto = 92, style }) => {
  const { t } = useIdioma();
  const COLORES = useColores();
  const aparece = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(aparece, { toValue: 1, duration: 220, delay: 280, useNativeDriver: true }).start();
  }, [aparece]);
  return (
    <Animated.View
      style={[{ alignItems: 'center', justifyContent: 'center', paddingVertical: 48, opacity: aparece }, style]}
      accessibilityRole="progressbar"
      accessibilityLabel={texto || t('Cargando')}
    >
      <Mascota pose="cargando" alto={alto} />
      {texto ? <Text style={{ marginTop: 14, fontSize: 14, color: COLORES.textoSuave, textAlign: 'center' }}>{texto}</Text> : null}
    </Animated.View>
  );
};

export default Mascota;

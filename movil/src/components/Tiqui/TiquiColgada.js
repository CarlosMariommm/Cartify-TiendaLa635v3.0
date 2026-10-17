// TIQUI COLGADA — la que cuelga de arriba en la app
// La etiqueta colgando de su cordón, agarrada con un broche al borde de arriba, como en el inicio
// de sesión de la web (MascotaColgada.jsx). Se mece despacio.

import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, View } from 'react-native';
import Svg, { Ellipse, G, Path, Rect } from 'react-native-svg';
import { Cuerpo, Disfraz, RUBOR, TRAZO, useColoresTiqui, useDisfrazTiqui, useMovimientoReducido, useParpadeo } from './piezas';

const I = [174, 252];
const D = [226, 252];
const MIRADA = { piensa: [7, -8], escucha: [0, 3], jalada: [0, -4] };

const cerrado = ([x, y]) => `M${x - 12},${y - 2} Q${x},${y + 9} ${x + 12},${y - 2}`;
const feliz = ([x, y]) => `M${x - 12},${y + 5} Q${x},${y - 13} ${x + 12},${y + 5}`;

// Las cejas de cada ánimo (las mismas formas que Mascota.js).
const CEJAS_ANIMO = {
  apenada: 'M162,231 L186,222 M214,222 L238,231',
  dudosa: 'M162,229 L186,229 M214,223 Q226,211 238,221',
  asombrada: 'M160,219 Q174,206 188,219 M212,219 Q226,206 240,219',
};

// Ojos a medio abrir: los de recién despertada.
const entrecerrado = ([x, y]) => `M${x - 12},${y} Q${x},${y + 7} ${x + 12},${y} M${x - 11},${y - 3} L${x + 11},${y - 3}`;

const Cara = ({ cara, rasgo, parpadeo, bocaAbierta, animo }) => {
  const [mx, my] = MIRADA[cara] || [0, 0];
  const abierto = ([x, y], k = 1) => (
    <Ellipse cx={x + mx} cy={y + my} rx={10 * k} ry={(parpadeo ? 2 : 14) * k} fill={rasgo} />
  );
  const linea = (d, w = 7) => <Path d={d} stroke={rasgo} strokeWidth={w} {...TRAZO} />;
  const cachetes = (op = 0.5) => (
    <G opacity={op}>
      <Ellipse cx={150} cy={284} rx={12} ry={7} fill={RUBOR} />
      <Ellipse cx={250} cy={284} rx={12} ry={7} fill={RUBOR} />
    </G>
  );

  switch (cara) {
    case 'dormida':
      return (
        <>
          {linea(`${cerrado(I)} ${cerrado(D)}`)}
          {cachetes(0.35)}
          {/* La boquita entreabierta de quien duerme. */}
          <Ellipse cx={200} cy={292} rx={6} ry={4} fill={rasgo} />
        </>
      );
    case 'escucha':
      return (
        <>
          {linea('M162,221 Q174,210 186,221 M214,221 Q226,210 238,221', 6.5)}
          {abierto(I, 1.15)}
          {abierto(D, 1.15)}
          <Ellipse cx={200} cy={291} rx={8} ry={10} fill={rasgo} />
        </>
      );
    case 'piensa':
      return (
        <>
          {linea('M162,229 L186,229 M214,223 Q226,211 238,221', 6.5)}
          {abierto(I)}
          {abierto(D)}
          {linea('M188,292 Q204,297 214,286', 7.5)}
        </>
      );
    case 'habla': {
      const contenta = ['alegre', 'emocionada', 'rie'].includes(animo);
      const ojos = contenta
        ? linea(`${feliz(I)} ${feliz(D)}`)
        : animo === 'despertando'
          ? linea(`${entrecerrado(I)} ${entrecerrado(D)}`, 6)
          : <>{abierto(I, animo === 'asombrada' ? 1.25 : 1)}{abierto(D, animo === 'asombrada' ? 1.25 : 1)}</>;
      return (
        <>
          {CEJAS_ANIMO[animo] && linea(CEJAS_ANIMO[animo], 6.5)}
          {ojos}
          {contenta && cachetes()}
          {bocaAbierta
            ? <Ellipse cx={200} cy={290} rx={11} ry={12} fill={rasgo} />
            : linea('M186,288 Q200,298 214,288', 7.5)}
        </>
      );
    }
    case 'tapada':
      return (
        <>
          {linea(`${cerrado(I)} ${cerrado(D)}`)}
          {cachetes(0.55)}
          {linea('M186,286 Q200,296 214,286', 7)}
        </>
      );
    case 'feliz':
    case 'soltada':
      return (
        <>
          {linea(`${feliz(I)} ${feliz(D)}`)}
          <Path d="M182,280 Q200,316 218,280 Z" fill={rasgo} stroke={rasgo} strokeWidth={4} strokeLinejoin="round" />
          {cachetes()}
        </>
      );
    case 'jalada':
      return (
        <>
          {linea('M160,219 Q174,206 188,219 M212,219 Q226,206 240,219', 6.5)}
          {abierto(I, 1.25)}
          {abierto(D, 1.25)}
          <Ellipse cx={200} cy={296} rx={11} ry={14} fill={rasgo} />
        </>
      );
    default:
      return (
        <>
          {abierto(I)}
          {abierto(D)}
          {linea('M184,284 Q200,300 216,284', 7.5)}
        </>
      );
  }
};

// Las ondas de lo que escucha, llegando a la punta del cordón.
const Ondas = ({ color }) => (
  <G stroke={color} strokeWidth={5} {...TRAZO}>
    <Path d="M244,40 Q256,52 244,64" />
    <Path d="M256,28 Q276,52 256,76" opacity={0.7} />
    <Path d="M268,16 Q296,52 268,88" opacity={0.4} />
  </G>
);

// Las zetas de dormida: salen de la cabeza, suben y se desvanecen.
const Zetas = ({ color, tam }) => {
  const valor = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const bucle = Animated.loop(Animated.timing(valor, { toValue: 1, duration: 2600, easing: Easing.out(Easing.quad), useNativeDriver: true }));
    bucle.start();
    return () => bucle.stop();
  }, [valor]);
  const zeta = (retraso, x, k) => {
    const t = valor.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });
    const fase = Animated.modulo(Animated.add(t, retraso), 1);
    return (
      <Animated.Text
        key={retraso}
        style={{
          position: 'absolute',
          left: x,
          top: 0,
          fontSize: tam * k,
          fontWeight: '800',
          color,
          opacity: fase.interpolate({ inputRange: [0, 0.2, 0.8, 1], outputRange: [0, 1, 0.8, 0] }),
          transform: [
            { translateY: fase.interpolate({ inputRange: [0, 1], outputRange: [tam * 1.6, -tam * 0.6] }) },
            { translateX: fase.interpolate({ inputRange: [0, 1], outputRange: [0, tam * 0.5] }) },
          ],
        }}
      >
        z
      </Animated.Text>
    );
  };
  return (
    <View pointerEvents="none" style={{ width: tam * 2.4, height: tam * 2.6 }}>
      {zeta(0, 0, 0.8)}
      {zeta(0.5, tam * 0.9, 1.1)}
    </View>
  );
};

// `largo`: cuánto cordón hay entre el broche y la etiqueta (en unidades del dibujo). `alto`: el
// alto total en pantalla, cordón incluido. `broche` y `meciendo`: apagados cuando otro dibuja el
// broche y el cordón tenso que la sostiene (JalarParaRecargar).
const TiquiColgada = ({ cara = 'normal', animo, alto = 240, largo = 150, conDisfraz = true, broche = true, meciendo = true, style }) => {
  const c = useColoresTiqui();
  const disfraz = useDisfrazTiqui();
  const reducido = useMovimientoReducido();
  const dormida = cara === 'dormida';
  const parpadeo = useParpadeo(!reducido && ['normal', 'escucha', 'piensa', 'habla'].includes(cara));

  // La boca de cuando habla, abriéndose y cerrándose.
  const [bocaAbierta, setBocaAbierta] = useState(true);
  useEffect(() => {
    if (cara !== 'habla' || reducido) return undefined;
    const reloj = setInterval(() => setBocaAbierta((a) => !a), 170);
    return () => clearInterval(reloj);
  }, [cara, reducido]);

  // El vaivén: dormida apenas se mece; despierta, un poco más.
  const vaiven = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    vaiven.setValue(0);
    if (reducido || !meciendo) return undefined;
    const ms = dormida ? 3800 : 2600;
    const bucle = Animated.loop(
      Animated.sequence([
        Animated.timing(vaiven, { toValue: 1, duration: ms, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(vaiven, { toValue: 0, duration: ms, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    bucle.start();
    return () => bucle.stop();
  }, [dormida, reducido, meciendo, vaiven]);
  const giro = dormida ? 2 : 3.5;

  // Al despertar, un saltito: se sacude el sueño.
  const salto = useRef(new Animated.Value(0)).current;
  const antes = useRef(cara);
  useEffect(() => {
    if (antes.current === 'dormida' && cara !== 'dormida' && !reducido) {
      salto.setValue(0);
      Animated.sequence([
        Animated.timing(salto, { toValue: -14, duration: 140, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.spring(salto, { toValue: 0, friction: 4, tension: 120, useNativeDriver: true }),
      ]).start();
    }
    antes.current = cara;
  }, [cara, reducido, salto]);

  // El encuadre: del broche (arriba) a los pies, con aire a la derecha para las ondas.
  const vx = 80;
  const vy = -6;
  const vw = 240;
  const vh = 398 + largo + 6;
  const ancho = (alto * vw) / vh;
  // Tamaño de las zetas según lo grande que se vea.
  const tamZeta = Math.max(12, alto * 0.075);

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[{ width: ancho, height: alto }, style]}
    >
      <Animated.View
        style={{
          width: ancho,
          height: alto,
          // Se mece desde el broche. Con la palabra y no en píxeles: un valor
          // con decimales ("37.52px") dejaba la capa entera sin dibujarse.
          transformOrigin: 'top',
          transform: [
            { rotate: vaiven.interpolate({ inputRange: [0, 1], outputRange: [`${giro}deg`, `${-giro}deg`] }) },
            { translateY: salto },
          ],
        }}
      >
        <Svg width={ancho} height={alto} viewBox={`${vx} ${vy} ${vw} ${vh}`}>
          <Path d={`M200,0 L200,${160 + largo}`} stroke={c.cordon} strokeWidth={7} {...TRAZO} />
          <G transform={`translate(0 ${largo})`}>
            {/* Dormida respira: un poquito más ancha y bajita. */}
            <G transform={dormida ? 'translate(200 382) scale(1.02 0.985) translate(-200 -382)' : undefined}>
              <Cuerpo color={c.cuerpo} />
              <Cara cara={cara} rasgo={c.rasgo} parpadeo={parpadeo} bocaAbierta={bocaAbierta} animo={animo} />
              {conDisfraz && <Disfraz disfraz={disfraz} contorno={c.rasgo} />}
              {cara === 'escucha' && <Ondas color={c.cordon} />}
            </G>
          </G>
        </Svg>
      </Animated.View>

      {/* El broche que la sujeta al borde. No se mece. */}
      {broche && <Svg width={ancho} height={alto} viewBox={`${vx} ${vy} ${vw} ${vh}`} style={{ position: 'absolute', left: 0, top: 0 }} pointerEvents="none">
        <Rect x={188} y={-6} width={24} height={12} rx={4} fill={c.cuerpo} />
      </Svg>}

      {dormida && !reducido && (
        <View pointerEvents="none" style={{ position: 'absolute', left: ancho * 0.68, top: alto * (largo / vh) + alto * 0.1 }}>
          <Zetas color={c.cordon} tam={tamZeta} />
        </View>
      )}
    </View>
  );
};

export default TiquiColgada;

// JALAR PARA RECARGAR — con Tiqui colgando
// Jalar la lista hacia abajo desde arriba la recarga.

import { useCallback, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Platform, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import TiquiColgada from '../Tiqui/TiquiColgada';
import { useColoresTiqui } from '../Tiqui/piezas';
import { useIdioma } from '../../context/IdiomaContext';
import { useDisposicion } from '../../hooks/useDisposicion';

// Cuánto hay que jalar (ya con la resistencia) para que recargue. Es lo
// mismo en el teléfono y en la tablet: el dedo recorre lo mismo.
const PUNTO = 96;
// Hasta dónde cuenta el jalón como mucho.
const TOPE = 160;
// Cuánto cordón lleva dibujado (en unidades del dibujo de TiquiColgada): poco,
// para que al llegar al punto ya se vea entera, sombrero incluido.
const LARGO_CORDON = 40;

// Las medidas de Tiqui, según el aparato. En la tablet la del teléfono se veía diminuta (quedaba a
// la altura de las pastillas de categoría): ahí es un 45 % más grande (ver
// hooks/useDisposicion.js).
const medidasPara = (escala) => {
  const alto = Math.round(112 * escala);
  const velocidad = (alto + 32 * escala) / PUNTO;
  return {
    alto,
    velocidad,
    cordonMax: TOPE * velocidad,
    grosor: (7 * alto) / (398 + LARGO_CORDON + 6),
  };
};

const JalarParaRecargar = ({ alRecargar, children }) => {
  const { t } = useIdioma();
  const c = useColoresTiqui();
  const { escala } = useDisposicion();
  const { alto: ALTO_TIQUI, velocidad: VELOCIDAD_TIQUI, cordonMax: CORDON_MAX, grosor: GROSOR } = useMemo(
    () => medidasPara(escala),
    [escala]
  );
  // Dónde va Tiqui (la lista se queda quieta).
  const tiquiY = useRef(new Animated.Value(-ALTO_TIQUI)).current;
  // El cordón tenso, del broche a donde empieza Tiqui: crece con ella al bajar y se recoge al subir.
  // Mientras Tiqui todavía está arriba del borde no hay cordón que mostrar. (+3: tapa la juntura con
  // su propio cordón.)
  const estirado = useMemo(
    () => Animated.add(tiquiY, 3).interpolate({
      inputRange: [0, CORDON_MAX],
      // Nunca 0 del todo: una escala en cero da problemas en Android.
      outputRange: [0.001, 1],
      extrapolate: 'clamp',
    }),
    [tiquiY, CORDON_MAX]
  );
  const [cara, setCara] = useState('jalada');
  const [visible, setVisible] = useState(false);
  // Mientras el dedo jala a Tiqui, la lista no se desplaza.
  const [jalando, setJalando] = useState(false);

  // Dónde va la lista y si el gesto empezó arriba del todo.
  const desplazado = useRef(0);
  const empezoArriba = useRef(false);
  const recargando = useRef(false);
  const ultimo = useRef(0);

  const alDesplazar = useCallback((e) => {
    desplazado.current = e.nativeEvent.contentOffset.y;
  }, []);

  const recargar = useCallback(async () => {
    recargando.current = true;
    try {
      await alRecargar?.();
    } finally {
      recargando.current = false;
    }
  }, [alRecargar]);

  // Tiqui sube hasta perderse arriba, recogiendo el cordón.
  const soltar = useCallback((alcanzo) => {
    setJalando(false);
    setCara(alcanzo ? 'soltada' : 'normal');
    Animated.timing(tiquiY, {
      toValue: -ALTO_TIQUI - 30,
      // La soltaron contenta: se queda un instante para que se le vea la cara.
      duration: alcanzo ? 560 : 300,
      delay: alcanzo ? 260 : 0,
      easing: Easing.in(Easing.back(1.4)),
      useNativeDriver: true,
    }).start(() => {
      setVisible(false);
      setCara('jalada');
    });
    if (alcanzo) recargar();
  }, [tiquiY, recargar, ALTO_TIQUI]);

  const gestoNativo = useMemo(() => Gesture.Native(), []);
  const gesto = useMemo(
    () => Gesture.Pan()
      .runOnJS(true)
      // Solo hacia abajo; de lado (los carruseles) no es jalar.
      .activeOffsetY(10)
      .failOffsetY(-10)
      .failOffsetX([-14, 14])
      .simultaneousWithExternalGesture(gestoNativo)
      .onStart(() => {
        empezoArriba.current = desplazado.current <= 1 && !recargando.current;
        ultimo.current = 0;
        if (empezoArriba.current) {
          setCara('jalada');
          setVisible(true);
          setJalando(true);
        }
      })
      .onUpdate((e) => {
        if (!empezoArriba.current) return;
        // Con resistencia: cuanto más se jala, menos baja.
        const d = Math.max(0, e.translationY);
        const baja = Math.min(TOPE, d * 0.6);
        ultimo.current = baja;
        tiquiY.setValue(baja * VELOCIDAD_TIQUI - ALTO_TIQUI);
      })
      .onEnd(() => {
        if (!empezoArriba.current) return;
        empezoArriba.current = false;
        soltar(ultimo.current >= PUNTO);
      })
      .onFinalize(() => {
        // Si el gesto se canceló a medias, que nada quede colgando.
        if (empezoArriba.current) {
          empezoArriba.current = false;
          soltar(false);
        }
      }),
    [gestoNativo, tiquiY, soltar, VELOCIDAD_TIQUI, ALTO_TIQUI]
  );

  return (
    <GestureDetector gesture={gesto}>
      <View
        style={{ flex: 1, overflow: 'hidden' }}
        // Quien usa lector de pantalla no puede jalar: tiene la acción a mano.
        accessibilityActions={[{ name: 'recargar', label: t('Recargar la tienda') }]}
        onAccessibilityAction={(e) => e.nativeEvent.actionName === 'recargar' && recargar()}
      >
        {visible && (
          <View
            pointerEvents="none"
            style={{ position: 'absolute', top: 0, left: 0, right: 0, height: CORDON_MAX + ALTO_TIQUI, alignItems: 'center', zIndex: 2, elevation: 2 }}
          >
            {/* El cordón que se estira desde el broche. Se escala desde arriba: con la palabra, no en píxeles. */}
            <Animated.View
              style={{
                position: 'absolute', top: 0, left: '50%', marginLeft: -GROSOR / 2,
                width: GROSOR, height: CORDON_MAX, borderRadius: GROSOR / 2, backgroundColor: c.cordon,
                transformOrigin: 'top', transform: [{ scaleY: estirado }],
              }}
            />
            {/* Tiqui, sin broche ni vaivén propios: la sostiene el cordón tenso. */}
            <Animated.View style={{ transform: [{ translateY: tiquiY }] }}>
              <TiquiColgada cara={cara} alto={ALTO_TIQUI} largo={LARGO_CORDON} broche={false} meciendo={false} />
            </Animated.View>
            {/* El broche, fijo en el borde de arriba. */}
            <View style={{ position: 'absolute', top: 0, left: '50%', marginLeft: -6, width: 12, height: 6, borderBottomLeftRadius: 3, borderBottomRightRadius: 3, backgroundColor: c.cuerpo }} />
          </View>
        )}
        <View style={{ flex: 1 }}>
          <GestureDetector gesture={gestoNativo}>
            {children({
              alDesplazar,
              // Sin el rebote de iOS ni el brillo de Android: el que baja es Tiqui.
              propsLista: {
                bounces: false,
                overScrollMode: Platform.OS === 'android' ? 'never' : undefined,
                scrollEventThrottle: 16,
                scrollEnabled: !jalando,
              },
            })}
          </GestureDetector>
        </View>
      </View>
    </GestureDetector>
  );
};

export default JalarParaRecargar;

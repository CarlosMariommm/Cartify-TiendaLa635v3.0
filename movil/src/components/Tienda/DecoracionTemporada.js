// DECORACIÓN DE TEMPORADA — las figuras que caen
// Copos en diciembre, murciélagos la semana de Halloween, confeti en septiembre, corazones en
// febrero. Caen despacio de fondo, detrás de todo.

import { useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Dimensions, Easing, StyleSheet, View } from 'react-native';
import { useTema } from '../../context/TemaContext';
import { Leaf } from 'lucide-react-native';
import { Confeti, Copo, Corazon, Estrella, Murcielago } from '../UI/Iconos';

// La hoja no tiene dibujo a mano: se usa la de lucide, la misma que la web.
const Hoja = ({ size = 16, color = '#FFFFFF' }) => <Leaf size={size} color={color} strokeWidth={1.8} />;

// 'ninguna' no está a propósito: una temporada propia sin figuras se nota solo en los colores y la
// cinta, y sin figura esta capa no se pinta.
const FIGURAS = {
  copo: Copo,
  murcielago: Murcielago,
  confeti: Confeti,
  corazon: Corazon,
  estrella: Estrella,
  hoja: Hoja,
};

// Cuánto tarda una figura en cruzar la pantalla. "lenta" es la nieve —cae recta y sin prisa—;
// "meciendo" va algo más rápido y se bambolea, porque una hoja de confeti que baja como plomada se
// ve mal.
const DURACION = { lenta: [11000, 17000], meciendo: [8000, 13000] };

const alAzar = (min, max) => min + Math.random() * (max - min);

// Una figura. Cada una tiene su propio Animated.Value y su propio bucle, con duración y retraso
// distintos: con un solo valor compartido caerían las catorce en fila india, perfectamente
// alineadas, que es lo contrario de lo que hace la nieve.
const FiguraQueCae = ({ Figura, color, alto, config }) => {
  const progreso = useRef(new Animated.Value(0)).current;

  const { izquierda, tamano, duracion, retraso, vaivén } = config;

  useEffect(() => {
    const animacion = Animated.loop(
      Animated.timing(progreso, {
        toValue: 1,
        duration: duracion,
        delay: retraso,
        // Lineal a propósito: la nieve no acelera ni frena, y cualquier curva
        // de suavizado hace que las figuras se amontonen arriba o abajo.
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    animacion.start();
    return () => animacion.stop();
  }, [progreso, duracion, retraso]);

  // Nace un poco arriba del borde y termina un poco abajo: así nunca se la ve
  // aparecer ni desaparecer de golpe a media pantalla.
  const desplazamiento = progreso.interpolate({
    inputRange: [0, 1],
    outputRange: [-40, alto + 40],
  });

  const balanceo = progreso.interpolate({
    inputRange: [0, 0.25, 0.5, 0.75, 1],
    outputRange: [0, vaivén, 0, -vaivén, 0],
  });

  const giro = progreso.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Animated.View
      style={[
        estilos.figura,
        {
          left: izquierda,
          transform: [
            { translateY: desplazamiento },
            { translateX: balanceo },
            // El confeti y los copos giran mientras bajan; los murciélagos y
            // los corazones no, que girando parecen caerse muertos.
            ...(config.gira ? [{ rotate: giro }] : []),
          ],
        },
      ]}
    >
      <Figura size={tamano} color={color} />
    </Animated.View>
  );
};

const DecoracionTemporada = () => {
  const { decoracion, colores } = useTema();
  const [menosMovimiento, setMenosMovimiento] = useState(false);
  const { width, height } = Dimensions.get('window');

  useEffect(() => {
    let vivo = true;

    AccessibilityInfo.isReduceMotionEnabled()
      .then((activo) => vivo && setMenosMovimiento(activo))
      .catch(() => {});

    // También si lo cambian con la app abierta.
    const suscripcion = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      (activo) => vivo && setMenosMovimiento(activo)
    );

    return () => {
      vivo = false;
      suscripcion?.remove();
    };
  }, []);

  // Las posiciones y los tiempos se sortean UNA vez y se recuerdan. Calculados en el render, cada
  // vez que la tienda se repintara —y se repinta con cada toque al carrito— las figuras saltarían de
  // sitio.
  const figuras = useMemo(() => {
    if (!decoracion) return [];
    const [minimo, maximo] = DURACION[decoracion.caida] || DURACION.lenta;
    const gira = decoracion.figura === 'copo' || decoracion.figura === 'confeti';

    return Array.from({ length: decoracion.cantidad }, (_, i) => ({
      clave: i,
      izquierda: alAzar(0, width - 24),
      tamano: alAzar(10, 18),
      duracion: alAzar(minimo, maximo),
      // Repartidos en el tiempo: sin esto todas arrancan juntas y la primera
      // pasada se ve como una cortina bajando.
      retraso: alAzar(0, maximo),
      vaivén: decoracion.caida === 'meciendo' ? alAzar(10, 26) : 0,
      gira,
    }));
  }, [decoracion, width]);

  if (!decoracion || menosMovimiento || figuras.length === 0) return null;

  const Figura = FIGURAS[decoracion.figura];
  if (!Figura) return null;

  return (
    <View style={estilos.capa} pointerEvents="none">
      {figuras.map((config) => (
        <FiguraQueCae
          key={config.clave}
          Figura={Figura}
          // Del color de la temporada, no blancas: sobre el fondo blanco de la
          // tienda unas figuras blancas simplemente no existen.
          color={colores.marcaClaro}
          alto={height}
          config={config}
        />
      ))}
    </View>
  );
};

const estilos = StyleSheet.create({
  capa: {
    ...StyleSheet.absoluteFillObject,
    // Detrás de todo. La tienda se dibuja encima porque va después en el árbol.
    zIndex: 0,
    overflow: 'hidden',
  },
  figura: {
    position: 'absolute',
    top: 0,
    opacity: 0.3,
  },
});

export default DecoracionTemporada;

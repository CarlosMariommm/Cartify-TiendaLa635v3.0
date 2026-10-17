// TUTORIAL DE TIQUI — el molde de los tutoriales de la app
// Diapositivas deslizables con Tiqui en el centro, un titular, la explicación, el botón y los
// puntos del paginado.

import { useCallback, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Dimensions, Easing, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { X } from 'lucide-react-native';
import { ALTURA_ESTADO } from '../../theme/pantalla';
import { useBotonAtras } from '../../hooks/useBotonAtras';
import { Flecha } from '../UI/Iconos';
import { NAVY, AZUL_TEXTO, FONDO, GRIS, LINEA } from './EscenasTiqui';
import { useIdioma } from '../../context/IdiomaContext';

const ANCHO_PUNTO = 7;
const ANCHO_PILDORA = 22;

// Una tajada del recorrido 0→1 se vuelve opacidad y un empuje desde abajo.
const tramo = (valor, inicio, fin, desplazamiento = 26) => ({
  opacity: valor.interpolate({ inputRange: [inicio, fin], outputRange: [0, 1], extrapolate: 'clamp' }),
  transform: [{
    translateY: valor.interpolate({ inputRange: [inicio, fin], outputRange: [desplazamiento, 0], extrapolate: 'clamp' }),
  }],
});

const TutorialTiqui = ({
  diapositivas,
  alTerminar,
  textoFinal,
  cerrar = 'x',
  etiquetaCerrar,
  atrasCierra = true,
  // Algo fijo arriba a la izquierda (la bienvenida pone la marca de la tienda).
  arriba = null,
  // Algo debajo de los puntos (la bienvenida pone ahí el selector de idioma).
  pie = null,
}) => {
  const { t } = useIdioma();
  const insets = useSafeAreaInsets();
  const [ancho, setAncho] = useState(Dimensions.get('window').width);
  const [alto, setAlto] = useState(Dimensions.get('window').height);
  const [activa, setActiva] = useState(0);
  const scrollRef = useRef(null);

  const alMedir = useCallback((e) => {
    setAncho(e.nativeEvent.layout.width);
    setAlto(e.nativeEvent.layout.height);
  }, []);

  const irA = useCallback((i) => {
    const destino = Math.max(0, Math.min(diapositivas.length - 1, i));
    setActiva(destino);
    scrollRef.current?.scrollTo({ x: destino * ancho, animated: true });
  }, [ancho, diapositivas.length]);

  // El atrás de Android retrocede una diapositiva; en la primera, ver `atrasCierra`.
  useBotonAtras(() => (activa > 0 ? irA(activa - 1) : alTerminar()), atrasCierra || activa > 0);

  const esUltima = activa === diapositivas.length - 1;
  const siguiente = () => (esUltima ? alTerminar() : irA(activa + 1));

  // Quien pidió menos movimiento en su teléfono la ve quieta.
  const [reducido, setReducido] = useState(false);
  useEffect(() => {
    let vivo = true;
    AccessibilityInfo.isReduceMotionEnabled?.().then((si) => vivo && setReducido(!!si)).catch(() => {});
    return () => { vivo = false; };
  }, []);

  // Una cascada por diapositiva que se repite cada vez que se llega a ella.
  const entradas = useRef(diapositivas.map(() => new Animated.Value(0))).current;
  useEffect(() => {
    const valor = entradas[activa];
    valor.setValue(reducido ? 1 : 0);
    if (!reducido) {
      Animated.timing(valor, { toValue: 1, duration: 1100, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
    }
  }, [activa, entradas, reducido]);

  // Tiqui flota despacio, como colgada de su cordón, y parpadea cada tanto.
  const flota = useRef(new Animated.Value(0)).current;
  const [parpadeo, setParpadeo] = useState(false);
  useEffect(() => {
    if (reducido) return undefined;
    const bucle = Animated.loop(Animated.sequence([
      Animated.timing(flota, { toValue: 1, duration: 1600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(flota, { toValue: 0, duration: 1600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ]));
    bucle.start();
    let cerrarParpado;
    const reloj = setInterval(() => {
      setParpadeo(true);
      cerrarParpado = setTimeout(() => setParpadeo(false), 140);
    }, 3600);
    return () => {
      bucle.stop();
      clearInterval(reloj);
      clearTimeout(cerrarParpado);
    };
  }, [flota, reducido]);

  const anchosPuntos = useRef(diapositivas.map((_, i) => new Animated.Value(i === 0 ? ANCHO_PILDORA : ANCHO_PUNTO))).current;
  useEffect(() => {
    Animated.parallel(anchosPuntos.map((valor, i) =>
      Animated.timing(valor, { toValue: i === activa ? ANCHO_PILDORA : ANCHO_PUNTO, duration: 220, useNativeDriver: false })
    )).start();
  }, [activa, anchosPuntos]);

  // La ilustración del tamaño que quepa: grande en un teléfono alto, sin
  // empujar el texto fuera en uno chico.
  const altoEscena = Math.max(220, Math.min(430, alto * 0.46));
  const subeTiqui = flota.interpolate({ inputRange: [0, 1], outputRange: [0, -altoEscena * 0.02] });

  return (
    <View style={estilos.pantalla}>
      <StatusBar style="dark" />

      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onLayout={alMedir}
        onMomentumScrollEnd={(e) => setActiva(Math.round(e.nativeEvent.contentOffset.x / ancho))}
        style={estilos.scroll}
      >
        {diapositivas.map((d, i) => {
          const { Escena } = d;
          const animTitulo = tramo(entradas[i], 0, 0.3, 18);
          const animEscena = tramo(entradas[i], 0.1, 0.5, 50);
          const animTexto = tramo(entradas[i], 0.4, 0.8, 30);
          const animBoton = tramo(entradas[i], 0.65, 1, 24);

          return (
            <View key={d.clave} style={{ width: ancho, height: alto }}>
              <View style={[estilos.cuerpo, { paddingTop: ALTURA_ESTADO + 64, paddingBottom: Math.max(insets.bottom, 16) }]}>
                {/* El titular es lo primero que lee el lector de pantalla. En pantalla no va el "1 DE 4": lo
                   cuentan los puntos de abajo, y para el lector se dice aquí. */}
                <Animated.View
                  style={[estilos.bloqueTitulo, animTitulo]}
                  accessible
                  accessibilityRole="header"
                  accessibilityLabel={`${(t(d.tituloPrefijo) + t(d.tituloAcento)).replace(/\s+/g, ' ')}. ${t('{n} de {total}', { n: i + 1, total: diapositivas.length })}`}
                >
                  <Text style={estilos.titulo}>
                    {t(d.tituloPrefijo)}
                    <Text style={estilos.tituloAcento}>{t(d.tituloAcento)}</Text>
                  </Text>
                </Animated.View>

                <View style={estilos.zonaEscena}>
                  <Animated.View
                    accessibilityElementsHidden
                    importantForAccessibility="no-hide-descendants"
                    style={[animEscena, i === activa && { transform: [...animEscena.transform, { translateY: subeTiqui }] }]}
                  >
                    <Escena alto={altoEscena} parpadeo={i === activa && parpadeo} />
                  </Animated.View>
                </View>

                <Animated.View style={animTexto}>
                  <Text style={estilos.texto}>{t(d.texto)}</Text>
                </Animated.View>

                <Animated.View style={[estilos.zonaBoton, animBoton]}>
                  <Pressable
                    onPress={siguiente}
                    accessibilityRole="button"
                    accessibilityLabel={t(esUltima ? textoFinal : 'Siguiente')}
                    style={({ pressed }) => [estilos.boton, pressed && estilos.botonPresionado]}
                  >
                    <Text style={estilos.botonTexto}>{t(esUltima ? textoFinal : 'Siguiente')}</Text>
                    <View style={estilos.botonFlecha}>
                      <Flecha size={16} color="#FFFFFF" />
                    </View>
                  </Pressable>
                </Animated.View>

                <View style={estilos.puntos}>
                  {diapositivas.map((dd, j) => (
                    <Pressable
                      key={dd.clave}
                      onPress={() => irA(j)}
                      hitSlop={10}
                      accessibilityRole="button"
                      accessibilityLabel={t('Ir a la ilustración {n}', { n: j + 1 })}
                      accessibilityState={{ selected: j === activa }}
                    >
                      <Animated.View
                        style={[estilos.punto, { width: anchosPuntos[j], backgroundColor: j === activa ? NAVY : LINEA }]}
                      />
                    </Pressable>
                  ))}
                </View>
                {pie ? <View style={estilos.pie}>{pie}</View> : null}
              </View>
            </View>
          );
        })}
      </ScrollView>

      {arriba ? (
        <View pointerEvents="none" style={[estilos.arriba, { top: ALTURA_ESTADO + 10 }]}>
          {arriba}
        </View>
      ) : null}

      {/* Salir, fijo arriba a la derecha: el tutorial nunca atrapa a nadie. */}
      {cerrar === 'x' ? (
        <Pressable
          onPress={alTerminar}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel={t(etiquetaCerrar || 'Cerrar')}
          style={[estilos.cerrar, { top: ALTURA_ESTADO + 12 }]}
        >
          <X size={22} color={NAVY} strokeWidth={2.2} />
        </Pressable>
      ) : !esUltima ? (
        <Pressable
          onPress={alTerminar}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={t(etiquetaCerrar || 'Cerrar')}
          style={[estilos.saltar, { top: ALTURA_ESTADO + 14 }]}
        >
          <Text style={estilos.saltarTexto}>{t('Saltar')}</Text>
        </Pressable>
      ) : null}
    </View>
  );
};

const estilos = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: FONDO },
  scroll: { flex: 1 },
  cuerpo: { flex: 1, paddingHorizontal: 24 },
  bloqueTitulo: { alignItems: 'center' },
  titulo: {
    fontSize: 29,
    lineHeight: 34,
    fontWeight: '900',
    color: NAVY,
    textAlign: 'center',
    letterSpacing: -0.8,
  },
  tituloAcento: { color: AZUL_TEXTO },
  zonaEscena: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  texto: {
    fontSize: 15.5,
    lineHeight: 23,
    color: GRIS,
    textAlign: 'center',
    paddingHorizontal: 6,
  },
  zonaBoton: { alignItems: 'center', marginTop: 20 },
  // El botón navy del video (escena del final). La flecha va en el azul de
  // texto y no en el de marca: blanca sobre #009AEB no llega a 3:1.
  boton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    height: 56,
    paddingLeft: 28,
    paddingRight: 12,
    borderRadius: 30,
    backgroundColor: NAVY,
  },
  botonPresionado: { opacity: 0.9, transform: [{ scale: 0.98 }] },
  botonTexto: { fontSize: 16, fontWeight: '800', color: '#FFFFFF' },
  botonFlecha: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: AZUL_TEXTO,
  },
  puntos: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, marginTop: 18 },
  punto: { height: 7, borderRadius: 4 },
  pie: { marginTop: 14 },
  arriba: { position: 'absolute', left: 22 },
  cerrar: {
    position: 'absolute',
    right: 14,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saltar: { position: 'absolute', right: 16, paddingHorizontal: 12, paddingVertical: 8 },
  saltarTexto: { fontSize: 14, fontWeight: '700', color: NAVY },
});

export default TutorialTiqui;

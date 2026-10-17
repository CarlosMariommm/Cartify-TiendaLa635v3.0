// CARRUSEL DE PROMOCIONES
// El mismo anillo que la web (PromoBanners.jsx en teléfono): la del centro de frente y las de los
// lados giradas hacia adentro, asomando por detrás, como los discos de una rocola.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Dimensions, Easing, PanResponder, Pressable, StyleSheet, View } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { useTema } from '../../context/TemaContext';
import { useEstilos } from '../../context/ModoContext';
import { etiquetaPromo, textoVencimiento } from '../../utils/promos';
import { ANILLO, INTERVALO_ANILLO, PUNTOS_ANILLO, distanciaEnAnillo, indiceEnAnillo, poseEnAnillo } from '../../utils/anillo';
import TarjetaPromo, { PROPORCION } from './TarjetaPromo';
import { useIdioma } from '../../context/IdiomaContext';
import { useMovimientoReducido } from '../../hooks/useMovimientoReducido';

// El ancho de la tarjeta, con la cuenta de la web: clamp(260px, 58vw, 600px). Más angosta que la
// pantalla a propósito: lo que sobra es por donde asoman las de los lados, que es lo que dice "hay
// más de una".
const anchoDeTarjeta = (pantalla) => Math.round(Math.max(260, Math.min(pantalla * 0.58, 600)));

// La curva de la web (EASE_OUT): arranca rápido y se posa suave.
const CURVA = Easing.bezier(0.23, 1, 0.32, 1);

// Ancho del punto en reposo y de la píldora activa.
const ANCHO_PUNTO = 8;
const ANCHO_PILDORA = 22;

const CarruselPromos = ({ promos, alElegirPromo }) => {
  const { t } = useIdioma();
  const { colores } = useTema();
  const estilos = useEstilos(crearEstilos);
  const reducido = useMovimientoReducido();
  const enFoco = useIsFocused();
  const [anchoPantalla, setAnchoPantalla] = useState(Dimensions.get('window').width);

  const total = promos.length;
  const unaSola = total === 1;
  const ancho = anchoDeTarjeta(anchoPantalla);
  const alto = ancho / PROPORCION;

  // `paso` es a dónde va el anillo (un entero sin tope) y `posicion` es dónde está ahora, animado.
  // `frente` es el entero más cercano a la posición: la tarjeta que va arriba de todas, que cambia
  // en cuanto el dedo cruza la mitad.
  const posicion = useRef(new Animated.Value(0)).current;
  const pasoRef = useRef(0);
  const [frente, setFrente] = useState(0);
  const [tocando, setTocando] = useState(false);
  const activa = indiceEnAnillo(frente, total);

  // Al cambiar las promociones (otro pasillo) se vuelve al principio, para no quedar apuntando a una
  // tarjeta que en el pasillo nuevo ya no está.
  const firma = promos.map((p) => p._id).join('|');
  useEffect(() => {
    posicion.stopAnimation();
    posicion.setValue(0);
    pasoRef.current = 0;
    setFrente(0);
  }, [firma, posicion]);

  const irAPaso = useCallback(
    (destino) => {
      pasoRef.current = destino;
      setFrente(destino);
      Animated.timing(posicion, {
        toValue: destino,
        duration: reducido ? 200 : 550,
        easing: CURVA,
        useNativeDriver: true,
      }).start();
    },
    [posicion, reducido]
  );

  const siguiente = useCallback(() => irAPaso(pasoRef.current + 1), [irAPaso]);
  const anterior = useCallback(() => irAPaso(pasoRef.current - 1), [irAPaso]);

  // Del punto i: por el camino más corto, igual que el resto del anillo.
  const irAIndice = useCallback(
    (i) => irAPaso(pasoRef.current + Math.round(distanciaEnAnillo(i, pasoRef.current, total))),
    [irAPaso, total]
  );

  // El avance solo. Se vuelve a contar desde cero cada vez que el anillo se mueve, así que después
  // de deslizar a mano hay cinco segundos enteros para leer la promo antes de que se vaya.
  useEffect(() => {
    if (reducido || !enFoco || tocando || total < 2) return undefined;
    const reloj = setTimeout(siguiente, INTERVALO_ANILLO);
    return () => clearTimeout(reloj);
  }, [frente, reducido, enFoco, tocando, total, siguiente]);

  // El dedo. Solo se queda con el gesto si va de lado: uno que va hacia abajo es para recorrer la
  // tienda, y quitárselo dejaría la portada trabada. Un toque sin arrastrar llega a la tarjeta
  // (Pressable) como siempre.
  const pxPorPaso = ancho * 0.5;
  const arrastre = useRef({ desde: 0, ultimo: 0 });
  const respuesta = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, g) =>
          total > 1 && Math.abs(g.dx) > 8 && Math.abs(g.dx) > Math.abs(g.dy) * 1.2,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: () => {
          setTocando(true);
          arrastre.current.desde = pasoRef.current;
          // La animación en curso se detiene donde va: desde ahí sigue el dedo.
          posicion.stopAnimation((v) => {
            if (typeof v === 'number') arrastre.current.desde = v;
          });
        },
        onPanResponderMove: (_, g) => {
          const ahora = arrastre.current.desde - g.dx / pxPorPaso;
          posicion.setValue(ahora);
          const cercano = Math.round(ahora);
          if (cercano !== arrastre.current.ultimo) {
            arrastre.current.ultimo = cercano;
            setFrente(cercano);
          }
        },
        onPanResponderRelease: (_, g) => {
          setTocando(false);
          const ahora = arrastre.current.desde - g.dx / pxPorPaso;
          let destino = Math.round(ahora);
          // Un deslizón corto pero decidido también cambia de promo.
          if (destino === Math.round(arrastre.current.desde) && (Math.abs(g.dx) > 30 || Math.abs(g.vx) > 0.3)) {
            destino += g.dx < 0 ? 1 : -1;
          }
          irAPaso(destino);
        },
        onPanResponderTerminate: () => {
          setTocando(false);
          irAPaso(Math.round(arrastre.current.ultimo));
        },
      }),
    [total, pxPorPaso, posicion, irAPaso]
  );

  // Cómo se ve cada tarjeta según su distancia al centro: los mismos cinco puntos para todas
  // (oculta, de lado, centro, de lado, oculta) y la animación interpola entre ellos.
  const poses = useMemo(() => PUNTOS_ANILLO.map((d) => poseEnAnillo(d, { sinGiro: reducido })), [reducido]);
  const distancias = useMemo(
    () =>
      promos.map((_, i) =>
        Animated.subtract(
          total / 2,
          Animated.modulo(Animated.add(posicion, total / 2 - i), total)
        )
      ),
    // Los nodos dependen solo del total y del lugar de cada una.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [total, posicion, firma]
  );

  // El ancho de cada punto, animado (ver la nota de las puntas redondeadas).
  const anchosPuntos = useRef([]).current;
  if (anchosPuntos.length !== total) {
    anchosPuntos.length = 0;
    promos.forEach((_, i) => anchosPuntos.push(new Animated.Value(i === activa ? ANCHO_PILDORA : ANCHO_PUNTO)));
  }
  useEffect(() => {
    // Con Animated y `useNativeDriver: false` a propósito: animar el ancho es lo único que dibuja bien
    // las puntas redondeadas de la píldora (con scaleX el borderRadius se estira y quedan ovaladas).
    Animated.parallel(
      anchosPuntos.map((valor, i) =>
        Animated.timing(valor, {
          toValue: i === activa ? ANCHO_PILDORA : ANCHO_PUNTO,
          duration: 220,
          useNativeDriver: false,
        })
      )
    ).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activa]);

  const alMedir = useCallback((e) => setAnchoPantalla(e.nativeEvent.layout.width), []);

  if (total === 0) return null;

  return (
    <View style={estilos.seccion} onLayout={alMedir}>
      <View style={[estilos.escenario, { height: alto + 10 }]} {...respuesta.panHandlers}>
        {promos.map((promo, i) => {
          // La distancia "de verdad" (la que manda en quién va encima y quién se toca).
          const d = Math.round(distanciaEnAnillo(i, frente, total));
          const ad = Math.abs(d);
          const lejos = ad > 1;
          const esCentro = d === 0;
          const entrada = distancias[i];
          const estiloTarjeta = unaSola
            ? null
            : {
                opacity: entrada.interpolate({ inputRange: PUNTOS_ANILLO, outputRange: poses.map((p) => p.opacidad), extrapolate: 'clamp' }),
                transform: [
                  { perspective: ANILLO.PERSPECTIVA },
                  {
                    translateX: entrada.interpolate({
                      inputRange: PUNTOS_ANILLO,
                      outputRange: poses.map((p) => p.x * ancho),
                      extrapolate: 'clamp',
                    }),
                  },
                  {
                    rotateY: entrada.interpolate({
                      inputRange: PUNTOS_ANILLO,
                      outputRange: poses.map((p) => `${p.giro}deg`),
                      extrapolate: 'clamp',
                    }),
                  },
                  { scale: entrada.interpolate({ inputRange: PUNTOS_ANILLO, outputRange: poses.map((p) => p.escala), extrapolate: 'clamp' }) },
                ],
              };

          return (
            <Animated.View
              key={promo._id}
              pointerEvents={lejos ? 'none' : 'auto'}
              importantForAccessibility={lejos ? 'no-hide-descendants' : 'auto'}
              accessibilityElementsHidden={lejos}
              style={[
                estilos.tarjeta,
                { width: ancho, height: alto, marginLeft: -ancho / 2, zIndex: 10 - ad },
                estiloTarjeta,
              ]}
            >
              <Pressable
                onPress={() => (esCentro ? alElegirPromo(promo) : irAPaso(pasoRef.current + d))}
                accessibilityRole="button"
                accessibilityLabel={
                  esCentro
                    ? promo.title
                      ? t('Ver los productos de {promo}', { promo: promo.title })
                      : t('Ver los productos de esta promoción')
                    : t('Ver esta promoción')
                }
                style={({ pressed }) => pressed && esCentro && estilos.presionada}
              >
                <TarjetaPromo
                  promo={promo}
                  etiqueta={etiquetaPromo(promo, t)}
                  vencimiento={textoVencimiento(promo, t)}
                  ancho={ancho}
                  mostrarFlecha={esCentro}
                />
              </Pressable>
            </Animated.View>
          );
        })}
      </View>

      {/* Los controles, como en la web: flecha, puntos y flecha. Solo con más de una promo; con una sola,
         un punto suelto parece un adorno sin explicación. Los puntos se ven de 8 px pero se tocan de
         bastante más. */}
      {!unaSola && (
        <View style={estilos.controles}>
          <Pressable
            onPress={anterior}
            accessibilityRole="button"
            accessibilityLabel={t('Promoción anterior')}
            style={({ pressed }) => [estilos.flecha, pressed && { opacity: 0.6 }]}
          >
            <ChevronLeft size={20} strokeWidth={2.2} color={colores.marcaTexto} />
          </Pressable>

          <View style={estilos.puntos}>
            {promos.map((promo, i) => (
              <Pressable
                key={promo._id}
                onPress={() => irAIndice(i)}
                hitSlop={{ top: 14, bottom: 14, left: 4, right: 4 }}
                accessibilityRole="button"
                accessibilityLabel={t('Ir a la promoción {n}', { n: i + 1 })}
                accessibilityState={{ selected: i === activa }}
              >
                <Animated.View
                  style={[
                    estilos.punto,
                    { width: anchosPuntos[i] },
                    i === activa && { backgroundColor: colores.marcaOscuro },
                  ]}
                />
              </Pressable>
            ))}
          </View>

          <Pressable
            onPress={siguiente}
            accessibilityRole="button"
            accessibilityLabel={t('Siguiente promoción')}
            style={({ pressed }) => [estilos.flecha, pressed && { opacity: 0.6 }]}
          >
            <ChevronRight size={20} strokeWidth={2.2} color={colores.marcaTexto} />
          </Pressable>
        </View>
      )}
    </View>
  );
};

const crearEstilos = (COLORES) => StyleSheet.create({
  seccion: {
    paddingTop: 18,
    paddingBottom: 4,
  },
  // Lo que se sale por los lados se corta contra la orilla de la pantalla.
  escenario: {
    overflow: 'hidden',
  },
  tarjeta: {
    position: 'absolute',
    top: 0,
    left: '50%',
  },
  presionada: {
    opacity: 0.92,
    transform: [{ scale: 0.99 }],
  },
  controles: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    marginTop: 8,
  },
  // 44 de lado: es lo mínimo para atinarle con el pulgar sin mirar.
  flecha: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: COLORES.borde,
    backgroundColor: COLORES.papelAlto,
    alignItems: 'center',
    justifyContent: 'center',
  },
  puntos: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  // El ancho real (8 u 22) lo pone anchosPuntos, animado.
  punto: {
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORES.borde,
  },
});

export default CarruselPromos;

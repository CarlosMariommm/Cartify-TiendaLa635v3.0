import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { DURACION_VUELO, terminarVuelo, useVuelosAlCarrito } from '../../utils/volarAlCarrito';
import { foto, ANCHO } from '../../utils/fotos';

// VUELO AL CARRITO — el dibujo del vuelo, en la raíz de la app
// Pinta la foto que vuela al carrito por encima de todo; va de último en App.js porque en Android
// la elevación no se compara entre pantallas.

// Misma curva pareja que la capa exterior en la web (cubic-bezier(0.45,0,0.55,1)).
const CURVA_TRASLADO = Easing.bezier(0.45, 0, 0.55, 1);
// Misma curva "back-in" de la foto en la web (cubic-bezier(0.6,-0.4,0.74,0.05)):
// el valor pasa brevemente por debajo de 0 antes de avanzar — eso dibuja el arco.
const CURVA_VUELO = Easing.bezier(0.6, -0.4, 0.74, 0.05);

// Dos relojes y no uno con dos curvas: el animador nativo no acepta `easing` dentro de
// `interpolate` (en desarrollo lo avisaba en rojo con cada "+"), así que la curva va en cada
// `timing` y los dos corren a la vez.
const Vuelo = ({ vuelo }) => {
  const { id, uri, origen, destino } = vuelo;
  const pareja = useRef(new Animated.Value(0)).current;
  const arco = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const reloj = (valor, easing) =>
      Animated.timing(valor, { toValue: 1, duration: DURACION_VUELO, easing, useNativeDriver: true });
    const animacion = Animated.parallel([reloj(pareja, CURVA_TRASLADO), reloj(arco, CURVA_VUELO)]);
    animacion.start(({ finished }) => {
      if (finished) terminarVuelo(id);
    });
    // Si se desmonta a medio vuelo (la pantalla de origen se cerró), igual
    // se saca de la lista, pero sin contar como aterrizaje: nadie vio nada
    // que sacudir.
    return () => {
      animacion.stop();
      terminarVuelo(id, { aterrizo: false });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const dx = destino.x + destino.width / 2 - (origen.x + origen.width / 2);
  const dy = destino.y + destino.height / 2 - (origen.y + origen.height / 2);

  const trasladoX = pareja.interpolate({ inputRange: [0, 1], outputRange: [0, dx] });
  const trasladoY = arco.interpolate({ inputRange: [0, 1], outputRange: [0, dy] });
  const escala = arco.interpolate({ inputRange: [0, 1], outputRange: [1, 0.12] });
  const rotacion = arco.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '25deg'] });
  const opacidad = arco.interpolate({ inputRange: [0, 1], outputRange: [1, 0.55] });

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        estilos.capa,
        {
          left: origen.x,
          top: origen.y,
          width: origen.width,
          height: origen.height,
          transform: [{ translateX: trasladoX }],
        },
      ]}
    >
      <Animated.View
        style={{
          flex: 1,
          opacity: opacidad,
          transform: [{ translateY: trasladoY }, { scale: escala }, { rotate: rotacion }],
        }}
      >
        <Image source={{ uri: foto(uri, ANCHO.tarjeta) }} contentFit="contain" style={estilos.foto} />
      </Animated.View>
    </Animated.View>
  );
};

const VueloAlCarrito = () => {
  const vuelos = useVuelosAlCarrito();
  if (!vuelos.length) return null;
  return vuelos.map((vuelo) => <Vuelo key={vuelo.id} vuelo={vuelo} />);
};

const estilos = StyleSheet.create({
  capa: {
    position: 'absolute',
    zIndex: 9999,
    elevation: 24,
  },
  foto: {
    width: '100%',
    height: '100%',
    // La misma sombra de la web (drop-shadow 0 12px 18px): sin ella, la foto
    // volando se confundía con el fondo de la tienda al cruzarlo.
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 18,
  },
});

export default VueloAlCarrito;

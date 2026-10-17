// AVISOS — el reemplazo de react-hot-toast
// La tienda web avisa con toasts en media docena de momentos: al agregar algo al carrito, al
// sacarlo, cuando ya no hay stock, cuando el carrito guardado se corrigió solo.

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { Bike, Check, Heart, HeartOff, Info, TriangleAlert, Trash2, X } from 'lucide-react-native';
import { useColores, useEstilos } from './ModoContext';
import { useMovimientoReducido } from '../hooks/useMovimientoReducido';

const AvisoContext = createContext(null);

// Cuánto se queda en pantalla. Lo suficiente para leerlo sin que estorbe; un error un poco más
// (hay que leerlo y decidir qué hacer) y un mensaje largo, más todavía: "De su carrito guardado,
// dos productos ya no están…" no se lee en dos segundos y medio.
const duracionDe = (texto, tipo) =>
  Math.min(6000, (tipo === 'error' ? 4000 : 2600) + Math.max(0, texto.length - 50) * 35);

// Colores de estado, no de marca: los mismos de la web, no cambian con la paleta ni con el modo, y
// los tres pasan 3:1 contra la píldora oscura y contra la clara.
const VERDE = '#16A34A';
const ROJO = '#DC2626';
const NARANJA = '#C2410C';

// Con `fondo`, círculo de color e icono blanco; sin él, círculo tenue del
// color del texto.
const ICONOS = {
  exito: { Icono: Check, fondo: VERDE, tam: 15, grosor: 3 },
  error: { Icono: X, fondo: ROJO, tam: 15, grosor: 3 },
  atencion: { Icono: TriangleAlert, fondo: NARANJA, tam: 14, grosor: 2.5 },
  info: { Icono: Info, tam: 15, grosor: 2.5 },
  quitar: { Icono: Trash2, tam: 14, grosor: 2.5 },
  favorito: { Icono: Heart, fondo: ROJO, tam: 13, grosor: 3, relleno: true },
  sinFavorito: { Icono: HeartOff, tam: 14, grosor: 2.5 },
  reparto: { Icono: Bike, tam: 15, grosor: 2.5 },
};

// El rebote de la web: cubic-bezier(0.34, 1.56, 0.64, 1). Se pasa un poco de
// su lugar y vuelve.
const REBOTE = Easing.bezier(0.34, 1.56, 0.64, 1);

export const AvisoProvider = ({ children }) => {
  const [aviso, setAviso] = useState(null); // { texto, tipo }
  const estilos = useEstilos(crearEstilos);
  const COLORES = useColores();
  const reducido = useMovimientoReducido();
  // Dos valores y no uno: la entrada rebota (se pasa de 1) y la salida se
  // hunde hacia el otro lado; con uno solo, el rebote se leería como salida.
  const entrada = useRef(new Animated.Value(0)).current;
  const salida = useRef(new Animated.Value(0)).current;
  const enPantalla = useRef(false);
  const temporizador = useRef(null);

  const mostrar = useCallback((texto, tipo = 'info') => {
    if (!texto) return;
    // Un aviso nuevo pisa al anterior en vez de hacer cola. Quien toca "+" tres veces seguidas quiere
    // ver el último número, no los tres avisos uno tras otro durante ocho segundos.
    if (temporizador.current) clearTimeout(temporizador.current);
    setAviso({ texto, tipo: ICONOS[tipo] ? tipo : 'info' });
    // La píldora no recibe toques ni foco: el lector de pantalla la oye así.
    AccessibilityInfo.announceForAccessibility?.(texto);
  }, []);

  // La animación va aparte del estado: se dispara cuando cambia el aviso, y
  // el temporizador de salida se arma recién cuando terminó de entrar.
  useEffect(() => {
    if (!aviso) return;

    // Si ya hay una píldora a la vista, solo cambia el texto: que rebote de nuevo con cada "+" sería
    // un brinco por toque. Si no la hay (o se estaba yendo), entra desde abajo.
    if (!enPantalla.current) {
      enPantalla.current = true;
      salida.stopAnimation();
      salida.setValue(0);
      entrada.setValue(0);
      Animated.timing(entrada, {
        toValue: 1,
        duration: 420,
        easing: REBOTE,
        useNativeDriver: true,
      }).start();
    }

    temporizador.current = setTimeout(() => {
      enPantalla.current = false;
      Animated.timing(salida, {
        toValue: 1,
        duration: 260,
        easing: Easing.in(Easing.ease),
        useNativeDriver: true,
      }).start(({ finished }) => {
        // Solo se desmonta si la salida llegó al final: si en medio del
        // hundimiento entró otro aviso, este callback no debe borrarlo.
        if (finished) setAviso(null);
      });
    }, duracionDe(aviso.texto, aviso.tipo));

    return () => {
      if (temporizador.current) clearTimeout(temporizador.current);
    };
  }, [aviso, entrada, salida]);

  // Los mismos números que .aviso-entra / .aviso-sale de la web.
  const opacidad = Animated.multiply(
    entrada.interpolate({ inputRange: [0, 1], outputRange: [0, 1], extrapolate: 'clamp' }),
    salida.interpolate({ inputRange: [0, 1], outputRange: [1, 0] })
  );
  // Quien pidió menos movimiento la ve aparecer y desaparecer, sin rebote.
  const movimiento = reducido
    ? []
    : [
        { translateY: Animated.add(entrada.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }), salida.interpolate({ inputRange: [0, 1], outputRange: [0, 10] })) },
        { scale: Animated.multiply(entrada.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] }), salida.interpolate({ inputRange: [0, 1], outputRange: [1, 0.96] })) },
      ];

  const icono = aviso ? ICONOS[aviso.tipo] : null;
  const colorIcono = icono?.fondo ? '#FFFFFF' : COLORES.sobreTinta;

  return (
    <AvisoContext.Provider value={{ avisar: mostrar }}>
      {children}
      {aviso && (
        <View pointerEvents="none" style={estilos.capa}>
          <Animated.View style={[estilos.pildora, { opacity: opacidad, transform: movimiento }]}>
            <View style={[estilos.circulo, icono.fondo && { backgroundColor: icono.fondo }]}>
              {!icono.fondo && <View style={estilos.circuloTenue} />}
              <icono.Icono
                size={icono.tam}
                color={colorIcono}
                strokeWidth={icono.grosor}
                fill={icono.relleno ? colorIcono : 'none'}
              />
            </View>
            <Text style={estilos.texto}>{aviso.texto}</Text>
          </Animated.View>
        </View>
      )}
    </AvisoContext.Provider>
  );
};

export const useAviso = () => {
  const ctx = useContext(AvisoContext);
  if (!ctx) throw new Error('useAviso debe usarse dentro de <AvisoProvider>');
  return ctx;
};

const crearEstilos = (COLORES) => StyleSheet.create({
  // `pointerEvents="none"` en la capa es lo que evita el peor error de este patrón: un aviso
  // invisible que se queda encima de la tienda comiéndose los toques. Aquí nunca recibe ninguno.
  capa: {
    position: 'absolute',
    left: 0,
    right: 0,
    // Arriba de la barra de abajo del carrito, que mide unos 88.
    bottom: 104,
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  // La píldora es color tinta: casi negra en claro, casi blanca en oscuro.
  // El texto va al revés.
  pildora: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingLeft: 10,
    paddingRight: 18,
    // 22 es la mitad de la píldora de una línea: con una línea es cápsula,
    // con dos (un mensaje largo) queda un rectángulo redondeado.
    borderRadius: 22,
    maxWidth: 440,
    backgroundColor: COLORES.tituloFuerte,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  circulo: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  // El círculo tenue: el color del texto, casi transparente. Sirve igual sobre
  // la píldora oscura que sobre la clara del modo oscuro.
  circuloTenue: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: COLORES.sobreTinta,
    opacity: 0.18,
  },
  texto: {
    flexShrink: 1,
    color: COLORES.sobreTinta,
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 19,
  },
});

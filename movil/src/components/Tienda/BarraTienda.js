// BARRA DE LA TIENDA
// El equivalente de `HeaderTienda.jsx`: el nombre de la tienda, el buscador y el carrito con su
// contador. En la web las tres cosas caben en un renglón.

import { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Menu, Search, ShoppingBag } from 'lucide-react-native';
import { useColores, useEstilos } from '../../context/ModoContext';
import { ALTURA_ESTADO } from '../../theme/pantalla';
import { useTema } from '../../context/TemaContext';
import { Equis } from '../UI/Iconos';
import MarcaTienda from '../UI/MarcaTienda';
import { registrarDestinoCarrito, useAterrizajeCarrito } from '../../utils/volarAlCarrito';
import { useIdioma } from '../../context/IdiomaContext';

// Misma curva "back-out" que usa la web para el "globo-pop" del contador
// (cubic-bezier(0.23, 1, 0.32, 1)): entra grande y se asienta, sin rebotar
// de más.
const CURVA_POP = Easing.bezier(0.23, 1, 0.32, 1);

const BarraTienda = ({ busqueda, alBuscar, cantidadItems = 0, alAbrirCarrito, alAbrirPasillos }) => {
  const { t } = useIdioma();
  const { colores } = useTema();
  const COLORES = useColores();
  const estilos = useEstilos(crearEstilos);

  // El ícono del carrito es el destino de `volarAlCarrito.js`: se registra solo al montarse (y se
  // borra al desmontarse) para que quien agregue desde CUALQUIER pantalla sepa hacia dónde volar,
  // sin que esta barra tenga que recibir esa referencia por props.
  const botonCarritoRef = useRef(null);
  useEffect(() => {
    registrarDestinoCarrito(botonCarritoRef);
    return () => registrarDestinoCarrito(null);
  }, []);

  // El sacudón: el ícono tiembla y el contador "pop" cada vez que un vuelo
  // aterriza aquí. Calcado de `sacudir()` en volarAlCarrito.js (web).
  const aterrizajes = useAterrizajeCarrito();
  const primerRenderRef = useRef(true);
  const sacudida = useRef(new Animated.Value(0)).current;
  const pop = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (primerRenderRef.current) { primerRenderRef.current = false; return; }
    sacudida.setValue(0);
    Animated.timing(sacudida, {
      toValue: 4,
      duration: 560,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start();
    pop.setValue(0);
    Animated.timing(pop, {
      toValue: 2,
      duration: 520,
      easing: CURVA_POP,
      useNativeDriver: true,
    }).start();
  }, [aterrizajes, sacudida, pop]);

  const rotacion = sacudida.interpolate({
    inputRange: [0, 1, 2, 3, 4],
    outputRange: ['0deg', '-14deg', '9deg', '-4deg', '0deg'],
  });
  const escalaIcono = sacudida.interpolate({
    inputRange: [0, 1, 2, 3, 4],
    outputRange: [1, 1.06, 1, 1, 1],
  });
  const escalaContador = pop.interpolate({
    inputRange: [0, 1, 2],
    outputRange: [1.7, 0.9, 1],
  });

  return (
  <View style={[estilos.barra, { paddingTop: ALTURA_ESTADO + 10 }]}>
    <View style={estilos.piso}>
      <Pressable
        onPress={alAbrirPasillos}
        accessibilityRole="button"
        accessibilityLabel={t('Pasillos de la tienda')}
        hitSlop={6}
        style={({ pressed }) => [estilos.marca, pressed && { backgroundColor: colores.marcaTenue }]}
      >
        <Menu size={19} color={COLORES.tintaSuave} strokeWidth={2.2} />
        <MarcaTienda tamano={20} />
      </Pressable>

      <View style={estilos.acciones}>
        <Pressable
          ref={botonCarritoRef}
          onPress={alAbrirCarrito}
          accessibilityRole="button"
          accessibilityLabel={
            cantidadItems > 0
              ? t('Abrir el carrito, {n} en el carrito', { n: cantidadItems })
              : t('Abrir el carrito, está vacío')
          }
          hitSlop={8}
          style={({ pressed }) => [
            estilos.botonRedondo,
            pressed && { borderColor: colores.marca, backgroundColor: colores.marcaSuave },
          ]}
        >
          <Animated.View style={{ transform: [{ rotate: rotacion }, { scale: escalaIcono }] }}>
            <ShoppingBag size={21} color={COLORES.texto} strokeWidth={2.2} />
          </Animated.View>
          {/* El contador solo aparece cuando hay algo. Un "0" permanente sobre el icono se lee como un error
             del sistema, no como un carrito vacío. */}
          {cantidadItems > 0 && (
            <Animated.View
              style={[estilos.contador, { backgroundColor: colores.marca, transform: [{ scale: escalaContador }] }]}
            >
              <Text style={estilos.contadorTexto}>
                {/* Más de 99 no cabe en el círculo y tampoco aporta: a esas
                    alturas lo que importa es "muchos". */}
                {cantidadItems > 99 ? '99+' : cantidadItems}
              </Text>
            </Animated.View>
          )}
        </Pressable>
      </View>
    </View>

    <View style={estilos.buscador}>
      {/* Mismo icono y mismas medidas que HeaderTienda.jsx en la web
          (size 17, strokeWidth 2.4): la lupa dibujada a mano quedaba con
          un trazo visiblemente distinto al lado del resto de la barra. */}
      <Search size={17} strokeWidth={2.4} color={COLORES.marcador} />
      <TextInput
        value={busqueda}
        onChangeText={alBuscar}
        placeholder={t('Buscar en la tienda')}
        accessibilityLabel={t('Buscar en la tienda')}
        placeholderTextColor={COLORES.marcador}
        style={estilos.campo}
        // El teclado muestra "buscar" en vez de un salto de línea, y filtrar
        // ya pasa con cada letra, así que aceptar solo cierra el teclado.
        returnKeyType="search"
        keyboardAppearance={COLORES.oscuro ? 'dark' : 'light'}
        autoCorrect={false}
        autoCapitalize="none"
        // En iOS aparece su propia equis; se apaga para no tener dos.
        clearButtonMode="never"
      />
      {/* La equis para borrar. En un teléfono, dejar la búsqueda limpia con el teclado son ocho
         retrocesos; sin ella, mucha gente se queda con el filtro puesto y cree que la tienda solo tiene
         esos cuatro productos. */}
      {!!busqueda && (
        <Pressable
          onPress={() => alBuscar('')}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={t('Borrar la búsqueda')}
        >
          <Equis size={15} color={COLORES.textoSuave} />
        </Pressable>
      )}
    </View>
  </View>
  );
};

const crearEstilos = (COLORES) => StyleSheet.create({
  barra: {
    backgroundColor: COLORES.fondo,
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORES.linea,
    gap: 12,
  },
  piso: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  // El botón que abre los pasillos: hamburguesa + nombre, con su propio
  // relleno para que el tinte de "lo estoy tocando" no quede pegado al
  // texto.
  marca: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingVertical: 4,
    paddingRight: 10,
    paddingLeft: 2,
    borderRadius: 12,
    // Que no se estire hasta pegarse con el carrito en un nombre largo.
    flexShrink: 1,
  },
  acciones: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  botonRedondo: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORES.linea,
  },
  // El color lo pone la temporada en línea (ver arriba): aquí solo va la forma.
  contador: {
    position: 'absolute',
    top: 1,
    right: 1,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    // El aro blanco despega el contador del icono que tiene debajo.
    borderWidth: 1.5,
    borderColor: COLORES.fondo,
  },
  contadorTexto: {
    color: '#FFFFFF',
    fontSize: 9.5,
    fontWeight: '800',
  },
  buscador: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    borderWidth: 1,
    borderColor: COLORES.borde,
    // Píldora completa (mitad del alto), a juego con los campos del login y
    // con las pastillas de categoría de aquí abajo, que ya eran redondas.
    borderRadius: 22,
    paddingHorizontal: 16,
    // 44 de alto: es un campo, y los campos también se tocan.
    height: 44,
  },
  campo: {
    flex: 1,
    fontSize: 14.5,
    color: COLORES.texto,
    // Android le mete relleno propio a los TextInput y descuadra el alto.
    paddingVertical: 0,
  },
});

export default BarraTienda;

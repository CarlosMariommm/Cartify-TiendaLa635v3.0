// BARRA INFERIOR — los apartados de la app
// Cuatro apartados fijos abajo: la tienda, el asistente por voz, los pedidos y la cuenta.

import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Keyboard, Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Mic, Package, Store, User } from 'lucide-react-native';
import { useColores, useEstilos } from '../../context/ModoContext';
import { useTema } from '../../context/TemaContext';
import { useIdioma } from '../../context/IdiomaContext';
import { ANCHO_BARRA_INFERIOR } from '../../theme/pantalla';

// Las medidas de la píldora flotante, juntas porque las usa el StyleSheet de aquí abajo para armar
// el mismo tamaño en más de un lugar — y porque la que se desliza (más abajo) necesita las mismas
// cuentas para saber dónde parar.
const ALTO_ICONO = 52;
const RELLENO_VERTICAL_BARRA = 6;
const RELLENO_HORIZONTAL_BARRA = 6;
const ANCHO_PILDORA = 56;
const ALTO_PILDORA = 50;
const RADIO_PILDORA = 25;
const AIRE_ARRIBA = 10;
export const AIRE_ABAJO_MINIMO = 14;

// Exportada para que una hoja que sube desde abajo (MenuPasillos, y cualquier otra que se sume) le
// reserve este alto exacto a su último renglón.
export const ALTURA_BARRA_FLOTANTE = RELLENO_VERTICAL_BARRA * 2 + ALTO_ICONO + AIRE_ARRIBA;

// Cuánto relleno ponerle ABAJO a una lista o a un ScrollView de un apartado para que su último
// renglón no se quede debajo de la píldora.
export const useAireBarraFlotante = () => {
  const { bottom } = useSafeAreaInsets();
  return Math.max(bottom, AIRE_ABAJO_MINIMO) + ALTURA_BARRA_FLOTANTE;
};

// El orden importa y no es alfabético: la tienda primero porque es a lo que se viene, y la cuenta
// al final porque es a lo que se entra de vez en cuando. En medio, lo que se usa mientras se
// compra.
export const APARTADOS = [
  { clave: 'inicio', icono: Store, nombre: 'Tienda' },
  { clave: 'asistente', icono: Mic, nombre: 'Asistente por voz' },
  { clave: 'pedidos', icono: Package, nombre: 'Mis pedidos' },
  { clave: 'perfil', icono: User, nombre: 'Mi cuenta' },
];

// Con el teclado abierto la barra estorba. En Android el sistema encoge la ventana, así que la
// barra sube y se queda flotando sobre el teclado, comiéndose 56 píxeles de los pocos que le
// quedan a la lista de productos mientras se escribe en el buscador.
const useTecladoAbierto = () => {
  const [abierto, setAbierto] = useState(false);

  useEffect(() => {
    const mostrar = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const ocultar = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const subeAbre = Keyboard.addListener(mostrar, () => setAbierto(true));
    const subeCierra = Keyboard.addListener(ocultar, () => setAbierto(false));

    return () => {
      subeAbre.remove();
      subeCierra.remove();
    };
  }, []);

  return abierto;
};

const BarraInferior = ({ apartado, alCambiar }) => {
  const { t } = useIdioma();
  const { colores } = useTema();
  const COLORES = useColores();
  const estilos = useEstilos(crearEstilos);
  // Lo que mide la franja de gestos de abajo (la rayita del iPhone, la barra de navegación de
  // Android).
  const { bottom } = useSafeAreaInsets();
  const tecladoAbierto = useTecladoAbierto();

  const indiceActivo = Math.max(APARTADOS.findIndex((a) => a.clave === apartado), 0);

  // La píldora que se desliza. Es UNA sola vista, no una por apartado: se mueve de columna en
  // columna en vez de aparecer/desaparecer en cada una, que es lo que la hace leerse como que
  // "viaja" y no como que parpadea.
  const anchoBarraRef = useRef(0);
  const pildoraX = useRef(new Animated.Value(0)).current;
  const yaUbicada = useRef(false);

  const calcularDestino = (indice, anchoBarra) => {
    const anchoColumna = (anchoBarra - RELLENO_HORIZONTAL_BARRA * 2) / APARTADOS.length;
    return RELLENO_HORIZONTAL_BARRA + indice * anchoColumna + (anchoColumna - ANCHO_PILDORA) / 2;
  };

  useEffect(() => {
    if (!yaUbicada.current || anchoBarraRef.current <= 0) return;
    Animated.timing(pildoraX, {
      toValue: calcularDestino(indiceActivo, anchoBarraRef.current),
      duration: 260,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [indiceActivo]);

  if (tecladoAbierto) return null;

  return (
    // La franja de gestos ya no es padding DENTRO de la barra: es aire AFUERA,
    // para que la píldora quede flotando por encima y no pegada al filo.
    <View style={[estilos.envoltorio, { paddingBottom: Math.max(bottom, AIRE_ABAJO_MINIMO) }]}>
      <View
        style={estilos.barra}
        onLayout={(e) => {
          const ancho = e.nativeEvent.layout.width;
          anchoBarraRef.current = ancho;
          // La primera vez no se anima: la píldora aparece ya puesta en el
          // apartado activo, no viaja desde el borde apenas se abre la app.
          pildoraX.setValue(calcularDestino(indiceActivo, ancho));
          yaUbicada.current = true;
        }}
      >
        {/* La píldora en sí: UNA vista detrás de los cuatro iconos, no una por apartado.
           `pointerEvents="none"` para que no le robe el toque a lo que tiene encima — la Pressable de cada
           apartado sigue siendo la columna entera. */}
        <Animated.View
          pointerEvents="none"
          style={[
            estilos.pildoraActiva,
            { backgroundColor: colores.marca, transform: [{ translateX: pildoraX }] },
          ]}
        />

        {APARTADOS.map(({ clave, icono: Icono, nombre }) => {
          const activo = apartado === clave;

          return (
            <Pressable
              key={clave}
              onPress={() => alCambiar(clave)}
              accessibilityRole="tab"
              accessibilityState={{ selected: activo }}
              accessibilityLabel={t(nombre)}
              style={estilos.apartado}
            >
              {({ pressed }) => (
                // Ya no lleva su propio fondo cuando está activo: eso lo
                // pinta la píldora que se desliza por detrás. Aquí solo
                // queda el tinte de "lo estoy tocando" en los inactivos.
                <View
                  style={[estilos.pastillaIcono, !activo && pressed && { backgroundColor: colores.marcaTenue }]}
                >
                  <Icono
                    size={23}
                    color={activo ? '#FFFFFF' : COLORES.textoSuave}
                    strokeWidth={activo ? 2.2 : 1.8}
                  />
                </View>
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
};

const crearEstilos = (COLORES) => StyleSheet.create({
  // Absoluta: flota ENCIMA de la pantalla del apartado en vez de empujarla
  // a su propio renglón. Las pantallas ya no necesitan reservarle espacio.
  envoltorio: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 20,
    paddingTop: AIRE_ARRIBA,
    // El envoltorio cruza la pantalla de orilla a orilla, pero lo único que se ve —y lo único que se
    // toca— es la píldora.
    pointerEvents: 'box-none',
  },
  barra: {
    flexDirection: 'row',
    alignItems: 'center',
    // En la tablet no atraviesa la pantalla entera: cuatro iconos repartidos
    // en 1.200 px quedaban lejísimos uno de otro. En el teléfono no llega al tope.
    width: '100%',
    maxWidth: ANCHO_BARRA_INFERIOR,
    alignSelf: 'center',
    backgroundColor: COLORES.papelAlto,
    borderRadius: 30,
    paddingVertical: RELLENO_VERTICAL_BARRA,
    paddingHorizontal: RELLENO_HORIZONTAL_BARRA,
    // La sombra es lo que la hace leerse como que flota y no como una barra
    // pegada al borde de siempre. En oscuro una sombra negra sobre fondo casi
    // negro no se ve: ahí la separa un filo.
    borderWidth: COLORES.oscuro ? 1 : 0,
    borderColor: COLORES.linea,
    elevation: 10,
    shadowColor: '#000000',
    shadowOpacity: 0.14,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
  },
  apartado: {
    // Cada uno se lleva un cuarto del ancho, toque donde toque el dedo: los
    // huecos entre iconos también cambian de apartado.
    flex: 1,
    height: ALTO_ICONO,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pastillaIcono: {
    width: ANCHO_PILDORA,
    height: ALTO_PILDORA,
    // La mitad del alto: esquinas totalmente redondas (píldora), no la
    // esquina suavizada de antes que se leía como un cuadrado.
    borderRadius: RADIO_PILDORA,
    // Sin esto, Android solo recorta bien la esquina la primera vez que se pinta la vista.
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // La misma forma que `pastillaIcono`.
  pildoraActiva: {
    position: 'absolute',
    top: RELLENO_VERTICAL_BARRA + (ALTO_ICONO - ALTO_PILDORA) / 2,
    left: 0,
    width: ANCHO_PILDORA,
    height: ALTO_PILDORA,
    borderRadius: RADIO_PILDORA,
    overflow: 'hidden',
  },
});

export default BarraInferior;

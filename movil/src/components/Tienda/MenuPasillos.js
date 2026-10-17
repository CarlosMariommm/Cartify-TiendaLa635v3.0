// MENÚ DE PASILLOS — la lista de pasillos de la tienda
// Como el menú de la web (MenuTienda.jsx), pero como hoja que sube desde abajo.

import { useEffect, useRef } from 'react';
import { Animated, Easing, PanResponder, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Store, Check } from 'lucide-react-native';
import { useColores, useEstilos } from '../../context/ModoContext';
import { useTema } from '../../context/TemaContext';
import { useBotonAtras } from '../../hooks/useBotonAtras';
import { iconoDeModulo, flujoDeModulo } from '../../utils/modulos';
import { navegarA } from '../../navigation/navigationRef';
import { AIRE_ABAJO_MINIMO, ALTURA_BARRA_FLOTANTE } from '../UI/BarraInferior';
import { useIdioma } from '../../context/IdiomaContext';
import { hojaCentrada } from '../../theme/pantalla';

const Opcion = ({ Icono, texto, activa, colores, onPress }) => {
  const COLORES = useColores();
  const estilos = useEstilos(crearEstilos);

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="menuitem"
      accessibilityState={{ selected: activa }}
      style={({ pressed }) => [
        estilos.opcion,
        activa && { backgroundColor: colores.marcaSuave },
        pressed && !activa && { backgroundColor: COLORES.linea },
      ]}
    >
      <Icono size={18} strokeWidth={2.1} color={activa ? colores.marca : COLORES.textoSuave} />
      <Text style={[estilos.opcionTexto, activa && { color: colores.marcaTexto }]} numberOfLines={1}>
        {texto}
      </Text>
      {activa && <Check size={16} strokeWidth={2.6} color={colores.marca} />}
    </Pressable>
  );
};

const MenuPasillos = ({ modulos, moduloSeleccionado, alElegir, alCerrar }) => {
  const { t } = useIdioma();
  const { colores } = useTema();
  const estilos = useEstilos(crearEstilos);
  const { bottom } = useSafeAreaInsets();

  // La misma entrada y salida que ModalProducto: fondo que se aclara, hoja
  // que sube desde abajo, y al revés al cerrar.
  const fondoOpacidad = useRef(new Animated.Value(0)).current;
  const panelY = useRef(new Animated.Value(300)).current;
  const cerrandoRef = useRef(false);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fondoOpacidad, { toValue: 1, duration: 220, useNativeDriver: true }),
      Animated.timing(panelY, {
        toValue: 0,
        duration: 280,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [fondoOpacidad, panelY]);

  const cerrarConAnimacion = () => {
    if (cerrandoRef.current) return;
    cerrandoRef.current = true;
    Animated.parallel([
      Animated.timing(fondoOpacidad, { toValue: 0, duration: 200, useNativeDriver: true }),
      Animated.timing(panelY, {
        toValue: 300,
        duration: 220,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start(() => alCerrar());
  };

  useBotonAtras(cerrarConAnimacion);

  // El asa se arrastra igual que en ModalProducto: baja con el dedo, y al soltar decide sola si
  // cierra o vuelve a subir, según si pasó la mitad del panel. Ver el comentario largo en
  // ModalProducto.js sobre por qué hace falta onPanResponderTerminationRequest.
  const panelAlturaRef = useRef(0);
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_evento, gesto) => Math.abs(gesto.dy) > 4,
      onPanResponderTerminationRequest: () => false,
      onPanResponderMove: (_evento, gesto) => {
        if (gesto.dy > 0) panelY.setValue(gesto.dy);
      },
      onPanResponderRelease: (_evento, gesto) => {
        const mitad = (panelAlturaRef.current || 300) / 2;
        if (gesto.dy > mitad) {
          cerrarConAnimacion();
        } else {
          Animated.timing(panelY, {
            toValue: 0,
            duration: 200,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }).start();
        }
      },
      onPanResponderTerminate: () => {
        Animated.timing(panelY, { toValue: 0, duration: 200, useNativeDriver: true }).start();
      },
    })
  ).current;

  // Elegir cierra el menú: es una sola decisión, no una pantalla para
  // quedarse mirando.
  const elegir = (id) => {
    alElegir(id);
    cerrarConAnimacion();
  };

  // Impresiones no filtra nada: abre su propia pantalla. Se cierra el menú
  // primero y LUEGO se navega — al revés se ve la hoja cerrándose encima de
  // la pantalla nueva.
  const abrirImpresiones = () => {
    cerrarConAnimacion();
    navegarA('Impresiones');
  };

  return (
    <View style={estilos.capa}>
      <Animated.View style={[estilos.fondo, { opacity: fondoOpacidad }]}>
        <Pressable accessibilityRole="button" style={estilos.zonaCierre} onPress={cerrarConAnimacion} accessibilityLabel={t('Cerrar')} />

        <Animated.View
          style={[estilos.panel, { transform: [{ translateY: panelY }] }]}
          onLayout={(e) => { panelAlturaRef.current = e.nativeEvent.layout.height; }}
        >
          <View style={estilos.encabezado}>
            <View style={estilos.zonaAsa} {...panResponder.panHandlers}>
              <View style={estilos.asa} />
            </View>
          </View>

          <Text style={estilos.titulo}>{t('Pasillos de la tienda')}</Text>

          <ScrollView
            style={estilos.lista}
            // No alcanza con el margen de seguridad de siempre: la píldora flotante la pinta el Tab Navigator,
            // por ENCIMA de esta hoja, así que si el último renglón cae bajo ella el toque ahí lo captura la
            // píldora, no la opción. Ver el comentario en BarraInferior.js.
            contentContainerStyle={{ paddingBottom: Math.max(bottom, AIRE_ABAJO_MINIMO) + ALTURA_BARRA_FLOTANTE }}
            bounces={false}
            showsVerticalScrollIndicator={false}
          >
            <Opcion
              Icono={Store}
              texto={t('Toda la tienda')}
              activa={!moduloSeleccionado}
              colores={colores}
              onPress={() => elegir(null)}
            />

            {modulos.map((m) => (
              <Opcion
                key={m._id}
                Icono={iconoDeModulo(m)}
                texto={t(m.name)}
                activa={String(moduloSeleccionado) === String(m._id)}
                colores={colores}
                onPress={() => (flujoDeModulo(m) === 'impresiones' ? abrirImpresiones() : elegir(m._id))}
              />
            ))}
          </ScrollView>
        </Animated.View>
      </Animated.View>
    </View>
  );
};

const crearEstilos = (COLORES) => StyleSheet.create({
  capa: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 15,
    elevation: 15,
  },
  fondo: {
    flex: 1,
    backgroundColor: COLORES.velo,
    justifyContent: 'flex-end',
  },
  zonaCierre: {
    flex: 1,
  },
  panel: {
    ...hojaCentrada,
    backgroundColor: COLORES.papelAlto,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    maxHeight: '75%',
  },
  encabezado: {
    paddingTop: 10,
    alignItems: 'center',
  },
  zonaAsa: {
    paddingVertical: 14,
    paddingHorizontal: 60,
  },
  asa: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORES.borde,
  },
  titulo: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORES.textoTenue,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    paddingHorizontal: 22,
    marginBottom: 6,
  },
  lista: {
    paddingHorizontal: 12,
  },
  opcion: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    minHeight: 48,
  },
  opcionTexto: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: COLORES.tituloFuerte,
  },
});

export default MenuPasillos;

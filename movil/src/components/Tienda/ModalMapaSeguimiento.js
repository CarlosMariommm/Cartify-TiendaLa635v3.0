import { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';
import { useColores, useEstilos } from '../../context/ModoContext';
import { useBotonAtras } from '../../hooks/useBotonAtras';
import { crearHtmlSeguimiento } from './mapaSeguimientoHtml';
import { useIdioma } from '../../context/IdiomaContext';

/*
 * ============================================================
 * MAPA DE SEGUIMIENTO EN GRANDE — ModalMapaSeguimiento.js
 * ============================================================
 * Lo que se abre al tocar la miniatura de `MapaSeguimiento.js`: el mismo
 * mapa, pero de pantalla completa y de VERDAD interactivo — zoom, arrastre,
 * doble toque — igual que el mapa de marcar dirección
 * (`ModalMapaDireccion.js`). Antes la miniatura era la única forma de ver
 * al repartidor y ni siquiera dejaba acercar el zoom: una inconsistencia
 * frente al otro mapa de la app, que sí se puede tocar y mover libremente.
 * ============================================================
 */

// `origen` (la tienda) llega solo sin GPS del repartidor: ahí el título no dice "en vivo".
const ModalMapaSeguimiento = ({ punto, destino, ruta, origen, colorMarca, alCerrar }) => {
  const { t } = useIdioma();
  const { top, bottom } = useSafeAreaInsets();
  const COLORES = useColores();
  const estilos = useEstilos(crearEstilos);

  const opacidad = useRef(new Animated.Value(0)).current;
  const cerrandoRef = useRef(false);

  useEffect(() => {
    Animated.timing(opacidad, { toValue: 1, duration: 200, useNativeDriver: true }).start();
  }, [opacidad]);

  const cerrarConAnimacion = () => {
    if (cerrandoRef.current) return;
    cerrandoRef.current = true;
    Animated.timing(opacidad, {
      toValue: 0,
      duration: 160,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(() => alCerrar());
  };

  useBotonAtras(cerrarConAnimacion);

  // Mismo criterio que la miniatura: solo se recrea el HTML cuando el punto
  // se movió de verdad, no en cada segundo que pasa.
  const html = useMemo(
    () => crearHtmlSeguimiento({ punto, destino, ruta, origen, colorMarca, interactivo: true, oscuro: COLORES.oscuro }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [punto?.lat, punto?.lng, destino?.lat, destino?.lng, origen?.lat, origen?.lng, ruta, colorMarca, COLORES.oscuro]
  );

  return (
    <View style={estilos.capa}>
      <Animated.View style={[estilos.pagina, { opacity: opacidad }]}>
        <View style={[estilos.encabezado, { paddingTop: top + 10 }]}>
          <Text style={estilos.titulo}>{origen && !punto ? t('Ruta aproximada') : t('Seguimiento en vivo')}</Text>
          <Pressable
            onPress={cerrarConAnimacion}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={t('Cerrar el mapa')}
            style={estilos.cerrar}
          >
            <X size={20} color={COLORES.tituloFuerte} />
          </Pressable>
        </View>

        <WebView key={html} source={{ html }} style={estilos.webview} javaScriptEnabled originWhitelist={['*']} />

        <View style={{ height: Math.max(bottom, 12) }} />
      </Animated.View>
    </View>
  );
};

const crearEstilos = (COLORES) => StyleSheet.create({
  capa: {
    ...StyleSheet.absoluteFillObject,
    // Más alto que BurbujaPedido.js (zIndex 900 / elevation 12): se abre
    // desde dentro de su tarjeta, así que tiene que ganarle en Android igual
    // que ModalPedido.js (ver el porqué en su comentario).
    zIndex: 960,
    elevation: 22,
  },
  pagina: {
    flex: 1,
    backgroundColor: COLORES.fondo,
  },
  encabezado: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingBottom: 12,
  },
  titulo: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORES.tituloFuerte,
  },
  cerrar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  webview: {
    flex: 1,
  },
});

export default ModalMapaSeguimiento;

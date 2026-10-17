import { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { Maximize2 } from 'lucide-react-native';
import { useModo } from '../../context/ModoContext';
import { crearHtmlSeguimiento } from './mapaSeguimientoHtml';
import { useIdioma } from '../../context/IdiomaContext';

// EL MAPA DEL REPARTIDOR — MapaSeguimiento.js
// Copia de `frontend/src/components/Store/MapaSeguimiento.jsx`: dónde va quien trae el pedido y a
// qué casa va, en vivo.

// Recibe: punto, destino, ruta, origen, alto, colorMarca, alAgrandar.
const MapaSeguimiento = ({ punto, destino, ruta, origen, alto = 132, colorMarca = '#8C5628', alAgrandar }) => {
  const { t } = useIdioma();
  // Calles oscuras de CARTO en modo oscuro, igual que la web.
  const { oscuro } = useModo();

  const sinPuntos = !punto && !destino && !origen;

  const html = useMemo(
    () => (sinPuntos ? '' : crearHtmlSeguimiento({ punto, destino, ruta, origen, colorMarca, interactivo: false, oscuro })),
    // Cambia de HTML solo cuando el punto se movió de verdad (o llegó otra
    // ruta), no en cada segundo que pasa: recrear el WebView entero por cada
    // "tic" del reloj haría parpadear el mapa en vez de solo mover el pin.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sinPuntos, punto?.lat, punto?.lng, destino?.lat, destino?.lng, origen?.lat, origen?.lng, ruta, colorMarca, oscuro]
  );

  // Sin ningún punto no hay mapa que valga la pena: ver el porqué en BurbujaPedido.js, donde tampoco
  // se monta sin esto. Va DESPUÉS del useMemo: un hook detrás de un return se salta en un dibujo y
  // no en el siguiente, y React truena ("Rendered more hooks…").
  if (sinPuntos) return null;

  return (
    <View style={[estilos.marco, { height: alto }]}>
      <WebView
        key={html}
        source={{ html }}
        style={estilos.webview}
        scrollEnabled={false}
        javaScriptEnabled
        originWhitelist={['*']}
      />
      {/* Capa encima del WebView que se queda con el toque (en Android el WebView lo atrapa) y abre el
         mapa en grande; la insignia avisa que se puede agrandar. */}
      <Pressable
        style={estilos.capaToque}
        onPress={alAgrandar}
        accessibilityRole="button"
        accessibilityLabel={t('Ver el mapa en grande')}
      >
        <View style={estilos.insignia}>
          <Maximize2 size={12} color="#FFFFFF" strokeWidth={2.6} />
        </View>
      </Pressable>
    </View>
  );
};

const estilos = StyleSheet.create({
  marco: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  webview: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  capaToque: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    alignItems: 'flex-end',
    padding: 6,
  },
  insignia: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default MapaSeguimiento;

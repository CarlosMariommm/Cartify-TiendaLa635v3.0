import { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { Maximize2 } from 'lucide-react-native';
import { useModo } from '../../context/ModoContext';
import { crearHtmlSeguimiento } from './mapaSeguimientoHtml';
import { useIdioma } from '../../context/IdiomaContext';

/*
 * ============================================================
 * EL MAPA DEL REPARTIDOR — MapaSeguimiento.js
 * ============================================================
 * Copia de `frontend/src/components/Store/MapaSeguimiento.jsx`: dónde va
 * quien trae el pedido y a qué casa va, en vivo. Mismos dos pines, mismo
 * encuadre, mismo mapa de CARTO que la web — sin backend nuevo, sin llave de
 * Google Maps que pedir ni pagar.
 *
 * ── Por qué un WebView con MapLibre, y no react-native-maps ──
 * react-native-maps en Android SIEMPRE pasa por el SDK de Google Maps, tenga
 * o no tesela propia encima — hace falta su propia llave de API igual, con
 * su propio proyecto de facturación en Google Cloud. La web resuelve esto
 * sin ninguna llave con mapcn (MapLibre + CARTO); un WebView con MapLibre
 * adentro consigue el mismo mapa gratis, sin cuenta que crear.
 *
 * ── Por qué no vive montado todo el tiempo ──
 * Es una page HTML completa cargándose adentro de la burbuja: uno por pedido
 * en curso, no uno por pantalla. Por eso BurbujaPedido.js solo lo monta
 * mientras `enCamino` es cierto, igual que la web solo lo dibuja con
 * `enCamino &&`.
 *
 * Se puede tocar para agrandarlo: avisa por `alAgrandar` en vez de abrir el
 * mapa grande él mismo — antes esta miniatura ni dejaba acercar el zoom, una
 * inconsistencia frente al mapa de marcar dirección (ModalMapaDireccion.js),
 * que sí se arrastra y hace zoom libremente.
 *
 * ── Por qué el mapa grande no lo abre este archivo ──
 * `ModalMapaSeguimiento.js` necesita ser hermano de una vista que ya ocupe
 * la pantalla entera para que `StyleSheet.absoluteFillObject` la cubra de
 * verdad — en React Native un elemento `position:absolute` llena a su padre
 * INMEDIATO, no a la pantalla. Esta miniatura vive metida adentro de una
 * tarjeta chica (la de BurbujaPedido.js, o `marcoMapa` en Confirmacion.js),
 * así que si el mapa grande se abriera desde AQUÍ, quedaría encajonado
 * dentro de esa misma tarjeta chica en vez de cubrir la pantalla. Por eso
 * cada quien la usa (BurbujaPedido.js, Confirmacion.js) guarda su propio
 * estado de "abierto" y dibuja `ModalMapaSeguimiento` en su propio nivel más
 * arriba — mismo patrón que ya usa BurbujaPedido.js con `verPedido`/
 * `ModalPedido`.
 * ============================================================
 */

/*
 * @param punto      - dónde va el repartidor ahora ({lat,lng}), o null.
 * @param destino    - la casa del cliente ({lat,lng}), o null.
 * @param ruta       - la línea por las calles que le falta ([{lat,lng}…]), o null.
 * @param origen     - la tienda ({lat,lng}), o null: solo sin GPS del
 *                     repartidor, cuando la ruta es la aproximada desde ahí.
 * @param alto       - alto del mapa en dp.
 * @param colorMarca - color del pin de la casa; el del repartidor es fijo
 *                     (el mismo azul que la web, no cambia con la temporada).
 * @param alAgrandar - se llama al tocar la miniatura; quien la use decide
 *                     qué hacer (abrir ModalMapaSeguimiento.js).
 */
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

  // Sin ningún punto no hay mapa que valga la pena: ver el porqué en
  // BurbujaPedido.js, donde tampoco se monta sin esto. Va DESPUÉS del
  // useMemo: un hook detrás de un return se salta en un dibujo y no en el
  // siguiente, y React truena ("Rendered more hooks…").
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
      {/*
        Encima del WebView: en Android un WebView atrapa el toque aunque
        adentro nada sea arrastrable, así que hace falta esta capa para
        quedarse con el toque ANTES de que llegue al mapa apagado de abajo
        — ahora con `onPress` en vez de quedarse ahí sin hacer nada, más la
        insignia para que se note que se puede agrandar.
      */}
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

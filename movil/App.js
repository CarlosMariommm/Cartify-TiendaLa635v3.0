/*
 * ============================================================
 * CARTIFY MÓVIL — entrada de la app
 * ============================================================
 * Solo arma los proveedores y entrega el árbol a `RootNavigator`
 * (src/navigation/). La navegación en sí —qué pantalla se ve, cómo se pasa de
 * una a otra— vive ahí y no aquí.
 *
 * El orden de los proveedores no es casual:
 *
 *   SafeAreaProvider  va afuera de todo: la barra de abajo le pregunta cuánto
 *                     mide la franja de gestos del teléfono, y un proveedor no
 *                     puede contestarle a quien no envuelve.
 *   ModoProvider      claro u oscuro. Justo adentro, antes de todo lo que
 *                     pinta: hasta el aviso flotante sale del color del modo.
 *                     Y antes de TemaProvider, que calcula la versión oscura
 *                     de la temporada.
 *   AvisoProvider     porque dibuja sus avisos DESPUÉS de sus hijos: así el
 *                     aviso queda encima de la tienda y de las hojas de
 *                     detalle. Envuelto al revés, quedaría debajo.
 *   AuthProvider      porque la tienda y los favoritos necesitan saber de quién
 *                     es la sesión.
 *   TemaProvider      trae los ajustes de la tienda y decide la temporada.
 *   EdadProvider      el candado de los +18: necesita la sesión (por si ya
 *                     hay un DUI guardado) Y el tema (su modal se pinta con
 *                     colores.marca, igual que el resto de la tienda) — por
 *                     eso va DESPUÉS de los dos, no antes. Poniéndolo antes
 *                     de TemaProvider, ModalConfirmarEdad —que EdadProvider
 *                     dibuja junto a sus hijos, no adentro— se queda sin
 *                     TemaContext y truena con "useTema debe usarse dentro
 *                     de <TemaProvider>" en cuanto se abre.
 *   FavoritosProvider y TiendaProvider van últimos: usan los anteriores.
 *   PedidoActivoProvider necesita la sesión (AuthProvider), nada más — va
 *                     junto a TiendaProvider porque a quien de verdad le
 *                     importa es a BurbujaPedido, que vive ahí al lado.
 *
 * `FavoritosProvider` manda a la pantalla de entrar con `navegarA` en vez de
 * un `setPantalla` local: no puede recibir la navegación por props porque él
 * envuelve al propio `RootNavigator`, no al revés.
 *
 * `BurbujaPedido` va como hermano de `RootNavigator`, no adentro de una
 * pantalla: así el seguimiento del pedido sigue viéndose al cambiar de
 * apartado (Tienda, Asistente, Perfil) en vez de desaparecer con la pantalla
 * en la que se abrió.
 *
 * `PedidoDetalleFlotante` va DESPUÉS de `BurbujaPedido` por la misma razón,
 * y en ese orden: el modal de detalle de un pedido tiene que pintarse
 * encima de la burbuja (y de cualquier pantalla del stack), y el último
 * hermano es el que gana esa pulseada — ver el comentario grande de
 * `pedidoAbierto` en `PedidoActivoContext.js`.
 *
 * `VueloAlCarrito` va al final por la misma pulseada de `elevation`, y
 * porque una foto volando tapada por otra cosa se ve rota a medio vuelo —
 * ver el comentario grande de `volarAlCarrito.js`.
 */

import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
// Solo por su efecto secundario: deja GoogleSignin.configure() hecho desde
// el arranque. Ver src/config/googleSignIn.js.
import './src/config/googleSignIn';
import { AuthProvider } from './src/context/AuthContext';
import { AvisoProvider } from './src/context/AvisoContext';
import { EdadProvider } from './src/context/EdadContext';
import { FavoritosProvider } from './src/context/FavoritosContext';
import { TemaProvider } from './src/context/TemaContext';
import { TiendaProvider } from './src/context/TiendaContext';
import { PedidoActivoProvider } from './src/context/PedidoActivoContext';
import { navegarA } from './src/navigation/navigationRef';
// Tocar un aviso lleva justo a lo que avisaba (el pedido, la promo…).
import AvisosTocados from './src/components/UI/AvisosTocados';
import RegistroAvisos from './src/components/UI/RegistroAvisos';
import EnlacesEntrantes from './src/components/UI/EnlacesEntrantes';
import { escucharErroresSueltos } from './src/utils/reportarError';

// Lo que se escapa de todas las pantallas también se anota. Ver utils/reportarError.js.
escucharErroresSueltos();
import RootNavigator from './src/navigation/RootNavigator';
import LimiteDeError from './src/components/UI/LimiteDeError';
import BurbujaPedido from './src/components/Tienda/BurbujaPedido';
import PedidoDetalleFlotante from './src/components/Tienda/PedidoDetalleFlotante';
import VueloAlCarrito from './src/components/Tienda/VueloAlCarrito';
import { useMemo } from 'react';
import { ConPaleta, ModoProvider, useModo } from './src/context/ModoContext';
import { paletaDesdePanel } from './src/utils/paletaPanel';
import { IdiomaProvider } from './src/context/IdiomaContext';
import { View } from 'react-native';
// Quien trabaja en la tienda: la app entera pasa a ser su herramienta de trabajo.
import { PersonalProvider, usePersonal } from './src/context/PersonalContext';
import ModoPersonal from './src/pages/personal/ModoPersonal';

// La hora y la batería en oscuro sobre fondo claro, y al revés.
const BarraDeEstado = () => {
  const { oscuro } = useModo();
  return <StatusBar style={oscuro ? 'light' : 'dark'} />;
};

/*
 * La tienda: lo que ve cualquiera que no entró como personal.
 *
 * IdiomaProvider va por fuera de todo lo de la tienda (español o inglés, ver
 * context/IdiomaContext.js) y SOLO aquí: el modo del personal sigue en
 * español, como el panel en la web.
 */
const LaTienda = () => (
  <IdiomaProvider>
  <AuthProvider>
    <TemaProvider>
      <EdadProvider>
        <FavoritosProvider alPedirSesion={() => navegarA('Login')}>
          <TiendaProvider>
            <PedidoActivoProvider>
              <BarraDeEstado />
              <AvisosTocados />
              <RegistroAvisos />
              <EnlacesEntrantes />
              {/* Si una pantalla se rompe, Tiqui caída en vez de la app en blanco. */}
              <LimiteDeError>
                <RootNavigator />
              </LimiteDeError>
              <BurbujaPedido />
              <PedidoDetalleFlotante />
              <VueloAlCarrito />
            </PedidoActivoProvider>
          </TiendaProvider>
        </FavoritosProvider>
      </EdadProvider>
    </TemaProvider>
  </AuthProvider>
  </IdiomaProvider>
);

/*
 * El modo personal: Tiqui del panel y el Reparto para el administrador, solo
 * el Reparto para el empleado. Nada de la tienda se monta (ni el catálogo, ni
 * el carrito, ni los avisos de pedidos de cliente): no es una pestaña más, es
 * otra app. Ver context/PersonalContext.js.
 */
const ModoDelPersonal = () => {
  /*
   * El administrador ve el modo del personal con la paleta que eligió en el
   * panel (Lectura, Calma, Modo oscuro...): toda esta parte de la app se viste
   * igual que el panel. La tienda no se toca. Ver utils/paletaPanel.js.
   */
  const { esAdmin, paletaPanel } = usePersonal();
  const paleta = useMemo(() => (esAdmin ? paletaDesdePanel(paletaPanel) : null), [esAdmin, paletaPanel]);
  return (
    <ConPaleta paleta={paleta}>
      <TemaProvider marcaFija={paleta?.marca}>
        <BarraDeEstado />
        <LimiteDeError>
          <ModoPersonal />
        </LimiteDeError>
      </TemaProvider>
    </ConPaleta>
  );
};

const Contenido = () => {
  const { sesion, cargando } = usePersonal();
  const { colores } = useModo();
  // Un instante, mientras se lee del almacén si hay sesión del personal.
  if (cargando) return <View style={{ flex: 1, backgroundColor: colores.fondo }} />;
  return sesion ? <ModoDelPersonal /> : <LaTienda />;
};

// GestureHandlerRootView: sin él no funcionan los gestos de jalar para
// recargar (ver components/Tienda/JalarParaRecargar.js).
export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
    <SafeAreaProvider>
      <ModoProvider>
        <AvisoProvider>
          <PersonalProvider>
            <Contenido />
          </PersonalProvider>
        </AvisoProvider>
      </ModoProvider>
    </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

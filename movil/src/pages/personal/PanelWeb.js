// EL PANEL DEL NEGOCIO EN LA APP — PanelWeb.js
// El administrador tiene en la app el MISMO panel de la web (inventario, pedidos, clientes,
// personalización...), abierto en un navegador dentro de la app.

import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { useColores, useEstilos } from '../../context/ModoContext';
import { useTema } from '../../context/TemaContext';
import { usePersonal } from '../../context/PersonalContext';
import { personalApi } from '../../api/personalApi';
import { URL_API, URL_WEB } from '../../api/api';
import { useBotonAtras } from '../../hooks/useBotonAtras';
import Mascota, { CargandoMascota } from '../../components/Tiqui/Mascota';
import { direccionConPase, esDelPanel, queHacerCon } from '../../utils/panelWeb';

// Si el panel se va a su login una y otra vez nada más abrirlo, algo anda mal del lado del
// servidor: después de dos intentos seguidos se para y se avisa, en vez de quedarse pidiendo pases
// para siempre.
const MAXIMO_REINTENTOS = 2;
const VENTANA_REINTENTOS_MS = 30000;

// `inicio`: la pantalla del panel con la que abre la primera vez (p. ej. '/pedidos' cuando se
// llega tocando el aviso de un pedido nuevo).
const PanelWeb = forwardRef(({ activo, inicio }, ref) => {
  const estilos = useEstilos(crearEstilos);
  const COLORES = useColores();
  const { colores } = useTema();
  const { sesion, salir, paletaPanel, cambiarPaletaPanel } = usePersonal();

  // Antes de que cargue el panel, le pasa la paleta guardada en el teléfono para que no cambie los
  // colores de la app; solo acepta letras y guiones.
  const paletaGuardada = /^[a-z0-9-]{1,30}$/.test(paletaPanel?.id || '') ? paletaPanel.id : '';
  const antesDeCargar = paletaGuardada
    ? `try { localStorage.setItem('theme-palette', '${paletaGuardada}'); } catch (e) {} true;`
    : 'true;';

  // Lo que avisa el panel. Por ahora, la paleta que se eligió.
  const alRecibir = useCallback((evento) => {
    let mensaje;
    try { mensaje = JSON.parse(evento.nativeEvent.data); } catch { return; }
    if (mensaje?.tipo === 'paleta-panel') {
      cambiarPaletaPanel(mensaje.id === 'marca' ? null : { id: mensaje.id, oscuro: mensaje.oscuro, colores: mensaje.colores });
    }
  }, [cambiarPaletaPanel]);

  const vista = useRef(null);
  const [direccion, setDireccion] = useState(null);
  // 'pidiendo' el pase · 'cargando' la primera página · 'listo' · 'error' · 'cerrada'
  const [estado, setEstado] = useState('pidiendo');
  const [puedeVolver, setPuedeVolver] = useState(false);
  const reintentos = useRef([]);

  // Pide un pase y abre el panel con él (en `volver`, si la sesión venció).
  const abrir = useCallback(async (volver) => {
    const ahora = Date.now();
    reintentos.current = reintentos.current.filter((t) => ahora - t < VENTANA_REINTENTOS_MS).concat(ahora);
    if (reintentos.current.length > MAXIMO_REINTENTOS + 1) {
      setEstado('error');
      return;
    }
    setEstado('pidiendo');
    try {
      const { pase } = await personalApi.paseDelPanel(sesion?.token);
      setDireccion(direccionConPase(URL_WEB, pase, volver));
      setEstado('cargando');
    } catch (error) {
      // La sesión de la app ya no vale: igual que en Tiqui y el Reparto, se sale.
      if (error?.estado === 401) { salir(); return; }
      setEstado('error');
    }
  }, [sesion?.token, salir]);

  const inicioRef = useRef(inicio);
  useEffect(() => { abrir(inicioRef.current); }, [abrir]);

  useImperativeHandle(ref, () => ({
    recargar: () => (estado === 'listo' ? vista.current?.reload() : abrir()),
    // Ir a otra pantalla del panel. Ya abierto, con su sesión; si no, con un pase nuevo.
    irA: (ruta) => {
      if (estado === 'listo') vista.current?.injectJavaScript(`window.location.assign(${JSON.stringify(ruta)}); true;`);
      else abrir(ruta);
    },
  }), [estado, abrir]);

  // Atrás de Android: hacia atrás dentro del panel, mientras se pueda.
  const atras = useCallback(() => vista.current?.goBack(), []);
  useBotonAtras(atras, activo && estado === 'listo' && puedeVolver);

  const alCambiar = useCallback((navegacion) => {
    setPuedeVolver(navegacion.canGoBack);
    const que = queHacerCon(navegacion.url, URL_WEB);
    if (!que) return;
    vista.current?.stopLoading();
    if (que.accion === 'vencio') abrir(que.volver);
    else setEstado('cerrada');
  }, [abrir]);

  const alIrA = useCallback((pedido) => {
    // Del panel, o del servidor (las descargas de los reportes).
    if (esDelPanel(pedido.url, URL_WEB) || esDelPanel(pedido.url, URL_API)) return true;
    Linking.openURL(pedido.url).catch(() => null);
    return false;
  }, []);

  const pantallaDeAviso = (pose, titulo, texto, boton) => (
    <View style={estilos.aviso}>
      <Mascota pose={pose} alto={130} />
      <Text style={estilos.avisoTitulo}>{titulo}</Text>
      <Text style={estilos.avisoTexto}>{texto}</Text>
      <Pressable
        onPress={() => { reintentos.current = []; abrir(); }}
        accessibilityRole="button"
        style={({ pressed }) => [estilos.boton, { backgroundColor: colores.marca }, pressed && estilos.presionado]}
      >
        <Text style={estilos.botonTexto}>{boton}</Text>
      </Pressable>
    </View>
  );

  if (estado === 'error') {
    return pantallaDeAviso(
      'sin-conexion',
      'No pudimos abrir el panel',
      'Revise su conexión. Si el servidor estaba dormido, puede tardar medio minuto en despertar.',
      'Reintentar'
    );
  }
  if (estado === 'cerrada') {
    return pantallaDeAviso(
      'saludo',
      'Cerró la sesión del panel',
      'Sus secciones de Tiqui y Reparto siguen abiertas. Cuando quiera, vuelva a abrir el panel.',
      'Volver a abrir'
    );
  }

  return (
    <View style={estilos.pantalla}>
      {direccion && (
        <WebView
          ref={vista}
          source={{ uri: direccion }}
          incognito
          domStorageEnabled
          javaScriptEnabled
          thirdPartyCookiesEnabled
          setSupportMultipleWindows={false}
          originWhitelist={['*']}
          injectedJavaScriptBeforeContentLoaded={antesDeCargar}
          onMessage={alRecibir}
          downloadingMessage="Descargando el archivo…"
          lackPermissionToDownloadMessage="Sin permiso para guardar el archivo en el teléfono."
          onShouldStartLoadWithRequest={alIrA}
          onNavigationStateChange={alCambiar}
          onLoadEnd={() => setEstado((e) => (e === 'cargando' ? 'listo' : e))}
          onError={() => setEstado('error')}
          style={[estilos.web, { backgroundColor: COLORES.fondo }]}
        />
      )}
      {(estado === 'pidiendo' || estado === 'cargando') && (
        <View style={[StyleSheet.absoluteFill, estilos.cargando]}>
          <CargandoMascota texto="Abriendo el panel…" />
        </View>
      )}
    </View>
  );
});

PanelWeb.displayName = 'PanelWeb';

const crearEstilos = (COLORES) => StyleSheet.create({
  pantalla: { flex: 1 },
  web: { flex: 1 },
  cargando: { backgroundColor: COLORES.fondo, alignItems: 'center', justifyContent: 'center' },
  aviso: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, gap: 10 },
  avisoTitulo: { fontSize: 19, fontWeight: '800', color: COLORES.tituloFuerte, textAlign: 'center', marginTop: 8 },
  avisoTexto: { fontSize: 14.5, lineHeight: 21, color: COLORES.textoSuave, textAlign: 'center' },
  boton: { marginTop: 10, paddingHorizontal: 26, minHeight: 46, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  presionado: { opacity: 0.85 },
  botonTexto: { color: COLORES.sobreMarca, fontSize: 15, fontWeight: '800' },
});

export default PanelWeb;

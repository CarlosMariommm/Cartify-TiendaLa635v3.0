// EL MODO PERSONAL — la app de quien trabaja en la tienda (ModoPersonal.js)
// Lo que ve quien entró por "¿Trabajas en la tienda?".

import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { BellOff, Bike, Download, LayoutDashboard, LogOut, RotateCw } from 'lucide-react-native';
import { useColores, useEstilos } from '../../context/ModoContext';
import { useTema } from '../../context/TemaContext';
import { usePersonal } from '../../context/PersonalContext';
import { useRepartoPersonal } from '../../hooks/useRepartoPersonal';
import { useMovimientoReducido } from '../../hooks/useMovimientoReducido';
import { useDisposicion } from '../../hooks/useDisposicion';
import { useActualizacionApp } from '../../hooks/useActualizacionApp';
import { useAvisosPersonal } from '../../hooks/useAvisosPersonal';
import { escucharLlegadas, escucharToques } from '../../utils/notificaciones';
import { ALTURA_ESTADO } from '../../theme/pantalla';
import ModalConfirmar from '../../components/UI/ModalConfirmar';
import Reparto from './Reparto';
import PanelWeb from './PanelWeb';

const SECCIONES = [
  { clave: 'reparto', nombre: 'Reparto', Icono: Bike },
  { clave: 'panel', nombre: 'Panel', Icono: LayoutDashboard },
];

// El relleno del selector y el aire entre opciones: la píldora los necesita
// para saber dónde pararse (las opciones son `flex: 1` a partes iguales).
const RELLENO_SELECTOR = 4;
const SEPARACION_OPCIONES = 4;

const anchoOpcionPara = (anchoSelector) =>
  (anchoSelector - RELLENO_SELECTOR * 2 - SEPARACION_OPCIONES * (SECCIONES.length - 1)) / SECCIONES.length;

const xPara = (indice, anchoSelector) =>
  RELLENO_SELECTOR + indice * (anchoOpcionPara(anchoSelector) + SEPARACION_OPCIONES);

const ModoPersonal = () => {
  const estilos = useEstilos(crearEstilos);
  const COLORES = useColores();
  const { colores } = useTema();
  const { sesion, esAdmin, salir } = usePersonal();
  const reparto = useRepartoPersonal();
  // Todos abren en el Reparto; el administrador tiene además el Panel.
  const [seccion, setSeccion] = useState('reparto');
  const actual = esAdmin ? seccion : 'reparto';
  const indiceActivo = SECCIONES.findIndex((s) => s.clave === actual);

  // El Panel se monta la primera vez que se abre; en el teléfono, después del aviso.
  const { esTablet } = useDisposicion();
  const [panelAbierto, setPanelAbierto] = useState(false);
  const [avisoPanel, setAvisoPanel] = useState(false);
  // La pantalla del panel con la que abre, si se llegó tocando un aviso.
  const [inicioPanel, setInicioPanel] = useState(null);
  const panel = useRef(null);

  const elegir = (clave) => {
    if (clave === 'panel' && !panelAbierto && !esTablet) {
      setAvisoPanel(true);
      return;
    }
    if (clave === 'panel') setPanelAbierto(true);
    setSeccion(clave);
  };

  const abrirPanel = () => {
    setAvisoPanel(false);
    setPanelAbierto(true);
    setSeccion('panel');
  };

  const cerrarAvisoPanel = () => {
    setAvisoPanel(false);
    setInicioPanel(null);
  };

  // Pedidos del panel: ya abierto, va directo; si no, abre por ahí (con el aviso en el teléfono).
  const irAPedidosDelPanel = () => {
    if (panelAbierto) {
      panel.current?.irA('/pedidos');
      setSeccion('panel');
      return;
    }
    setInicioPanel('/pedidos');
    if (esTablet) {
      setPanelAbierto(true);
      setSeccion('panel');
    } else {
      setAvisoPanel(true);
    }
  };

  // Los pedidos nuevos. Al llegar, el Reparto se pone al día sin esperar su vuelta; al tocarlo, se
  // va a donde está ese pedido. Los oyentes se ponen una vez y leen lo de este momento por la
  // referencia.
  const avisos = useAvisosPersonal();
  const alTocarAviso = useRef(null);
  alTocarAviso.current = (datos) => {
    if (datos?.tipo !== 'pedidoNuevo') return;
    reparto.recargar();
    if (!esAdmin || datos.entrega === 'delivery') setSeccion('reparto');
    else irAPedidosDelPanel();
  };
  const alLlegarAviso = useRef(null);
  alLlegarAviso.current = (datos) => {
    if (datos?.tipo === 'pedidoNuevo') reparto.recargar();
  };
  useEffect(() => {
    const dejarToques = escucharToques((datos) => alTocarAviso.current?.(datos));
    const dejarLlegadas = escucharLlegadas((datos) => alLlegarAviso.current?.(datos));
    return () => {
      dejarToques();
      dejarLlegadas();
    };
  }, []);

  // La píldora del selector: UNA sola vista que viaja de una opción a la otra, como la de la barra
  // de abajo de la tienda.
  const movimientoReducido = useMovimientoReducido();
  const [anchoSelector, setAnchoSelector] = useState(0);
  const pildoraX = useRef(new Animated.Value(0)).current;
  const contraX = useRef(Animated.multiply(pildoraX, -1)).current;

  useEffect(() => {
    if (!anchoSelector) return;
    const destino = xPara(indiceActivo, anchoSelector);
    if (movimientoReducido) {
      pildoraX.setValue(destino);
      return;
    }
    Animated.timing(pildoraX, {
      toValue: destino,
      duration: 260,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [indiceActivo]);

  const etiqueta = (clave, nombre, Icono, color) => (
    <>
      <Icono size={17} color={color} strokeWidth={2} />
      <Text style={[estilos.opcionTexto, { color }]}>
        {nombre}
        {clave === 'reparto' && reparto.pedidos.length ? ` (${reparto.pedidos.length})` : ''}
      </Text>
    </>
  );

  // La pregunta la hace ModalConfirmar, la misma de "¿Cerrar sesión?" en Mi
  // cuenta del cliente: el Alert del sistema era un cuadro gris de Android.
  const [confirmarSalida, setConfirmarSalida] = useState(false);

  const salirDelModo = () => {
    // Nadie se queda viendo el punto de un repartidor que ya se fue.
    reparto.enViaje.forEach((id) => reparto.quitarDelViaje(id));
    salir();
  };

  // La versión nueva de la app, en cuanto está lista (ver hooks/useActualizacionApp.js). Se aplica
  // con un toque y no sola: si alguien va repartiendo, reiniciar le cortaría el viaje un momento, y
  // eso se pregunta antes.
  const actualizacion = useActualizacionApp();
  const [confirmarActualizar, setConfirmarActualizar] = useState(false);
  const actualizar = () => {
    if (reparto.enViaje.length) setConfirmarActualizar(true);
    else actualizacion.aplicar();
  };

  return (
    <View style={estilos.pantalla}>
      <View style={[estilos.barra, { paddingTop: ALTURA_ESTADO + 10 }]}>
        <View style={estilos.fila}>
          <View style={estilos.flexible}>
            <Text style={estilos.titulo} accessibilityRole="header">
              {sesion?.nombre ? `Hola, ${sesion.nombre}` : 'Personal de la tienda'}
            </Text>
            <Text style={estilos.subtitulo}>{esAdmin ? 'Administración' : 'Equipo de la tienda'}</Text>
            {/* Qué versión corre: para comprobar que ya llegó un arreglo sin adivinar. */}
            <Text style={estilos.version}>Versión de la app: {actualizacion.version}</Text>
          </View>
          {actual === 'panel' && (
            <TouchableOpacity
              onPress={() => panel.current?.recargar()}
              accessibilityRole="button"
              accessibilityLabel="Recargar el panel"
              hitSlop={8}
              style={estilos.accion}
            >
              <RotateCw size={20} color={COLORES.textoSuave} strokeWidth={1.8} />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={() => setConfirmarSalida(true)}
            accessibilityRole="button"
            accessibilityLabel="Salir del modo personal"
            hitSlop={8}
            style={estilos.accion}
          >
            <LogOut size={21} color={COLORES.textoSuave} strokeWidth={1.8} />
          </TouchableOpacity>
        </View>

        {esAdmin && (
          <View
            style={estilos.selector}
            accessibilityRole="tablist"
            onLayout={(e) => {
              const ancho = e.nativeEvent.layout.width;
              // Al abrir no viaja: aparece ya puesta en la sección activa.
              pildoraX.setValue(xPara(indiceActivo, ancho));
              setAnchoSelector(ancho);
            }}
          >
            {SECCIONES.map(({ clave, nombre, Icono }) => (
              <Pressable
                key={clave}
                onPress={() => elegir(clave)}
                accessibilityRole="tab"
                accessibilityState={{ selected: actual === clave }}
                style={estilos.opcion}
              >
                {etiqueta(clave, nombre, Icono, COLORES.textoSuave)}
              </Pressable>
            ))}

            {/* Va encima de las opciones pero no les roba el toque, y el lector de pantalla no la lee: las
               opciones de verdad son las de abajo. */}
            {anchoSelector > 0 && (
              <Animated.View
                pointerEvents="none"
                accessibilityElementsHidden
                importantForAccessibility="no-hide-descendants"
                style={[
                  estilos.pildora,
                  {
                    width: anchoOpcionPara(anchoSelector),
                    backgroundColor: colores.marca,
                    transform: [{ translateX: pildoraX }],
                  },
                ]}
              >
                <Animated.View
                  style={[
                    estilos.opcionesEnBlanco,
                    { width: anchoSelector, transform: [{ translateX: contraX }] },
                  ]}
                >
                  {SECCIONES.map(({ clave, nombre, Icono }) => (
                    <View key={clave} style={estilos.opcion}>
                      {etiqueta(clave, nombre, Icono, COLORES.sobreMarca)}
                    </View>
                  ))}
                </Animated.View>
              </Animated.View>
            )}
          </View>
        )}

        {actualizacion.lista && (
          <Pressable
            onPress={actualizar}
            accessibilityRole="button"
            style={({ pressed }) => [estilos.avisoVersion, pressed && { opacity: 0.6 }]}
          >
            <Download size={17} color={colores.marcaTexto} strokeWidth={2} />
            <Text style={[estilos.avisoVersionTexto, { color: colores.marcaTexto }]}>
              Hay una versión nueva de la app. Toque aquí para estrenarla.
            </Text>
          </Pressable>
        )}

        {avisos.estado === 'sin-permiso' && (
          <Pressable
            onPress={avisos.abrirAjustes}
            accessibilityRole="button"
            style={({ pressed }) => [estilos.avisoVersion, pressed && { opacity: 0.6 }]}
          >
            <BellOff size={17} color={colores.marcaTexto} strokeWidth={2} />
            <Text style={[estilos.avisoVersionTexto, { color: colores.marcaTexto }]}>
              Los avisos de pedidos nuevos están apagados en este teléfono. Toque aquí para activarlos.
            </Text>
          </Pressable>
        )}
      </View>

      <View style={actual === 'reparto' ? estilos.flexible : estilos.oculta}>
        <Reparto reparto={reparto} />
      </View>
      {esAdmin && panelAbierto && (
        <View style={actual === 'panel' ? estilos.flexible : estilos.oculta}>
          <PanelWeb ref={panel} activo={actual === 'panel'} inicio={inicioPanel} />
        </View>
      )}

      {avisoPanel && (
        <ModalConfirmar
          titulo="El panel se trabaja mejor en pantalla grande"
          mensaje="Puede usarlo desde el teléfono, pero tiene tablas y formularios pensados para pantallas amplias. Para trabajar con más comodidad, le recomendamos una tablet o una computadora."
          textoConfirmar="Abrir el panel"
          textoCancelar="Ahora no"
          alConfirmar={abrirPanel}
          alCerrar={cerrarAvisoPanel}
        />
      )}

      {confirmarActualizar && (
        <ModalConfirmar
          titulo="¿Actualizar la app ahora?"
          mensaje="La app se reinicia unos segundos y mientras tanto deja de compartir su ubicación con el cliente. Al volver, vuelva a compartirla desde el Reparto."
          textoConfirmar="Actualizar"
          textoCancelar="Después"
          alConfirmar={actualizacion.aplicar}
          alCerrar={() => setConfirmarActualizar(false)}
        />
      )}

      {confirmarSalida && (
        <ModalConfirmar
          titulo="¿Salir del modo personal?"
          mensaje={
            reparto.enViaje.length
              ? 'Está compartiendo su ubicación con un cliente: al salir se deja de compartir. Además, este teléfono dejará de avisarle de los pedidos nuevos. La app vuelve a ser la tienda.'
              : 'Este teléfono dejará de avisarle de los pedidos nuevos. La app vuelve a ser la tienda, y para volver tendrá que entrar de nuevo con su cuenta y el código del correo.'
          }
          textoConfirmar="Salir"
          textoCancelar="Quedarme"
          destructivo
          alConfirmar={salirDelModo}
          alCerrar={() => setConfirmarSalida(false)}
        />
      )}
    </View>
  );
};

const crearEstilos = (COLORES) => StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: COLORES.fondo },
  flexible: { flex: 1 },
  // Montada pero sin ocupar lugar: conserva la charla y el viaje en curso.
  oculta: { display: 'none' },
  barra: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORES.linea,
    gap: 12,
  },
  fila: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  titulo: { fontSize: 21, fontWeight: '800', color: COLORES.tituloFuerte, letterSpacing: -0.4 },
  subtitulo: { fontSize: 13, color: COLORES.textoSuave, marginTop: 1 },
  version: { fontSize: 11, color: COLORES.textoTenue, marginTop: 2 },
  // La versión nueva lista: una línea y no un recuadro, que no tape el trabajo.
  avisoVersion: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 },
  avisoVersionTexto: { flex: 1, fontSize: 13.5, fontWeight: '700' },
  accion: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  selector: {
    flexDirection: 'row',
    backgroundColor: COLORES.papelGris,
    borderRadius: 999,
    padding: RELLENO_SELECTOR,
    gap: SEPARACION_OPCIONES,
  },
  pildora: {
    position: 'absolute',
    top: RELLENO_SELECTOR,
    bottom: RELLENO_SELECTOR,
    left: 0,
    borderRadius: 999,
    // Recorta la copia en blanco a la forma de la píldora.
    overflow: 'hidden',
  },
  // Del mismo tamaño y con el mismo relleno que el selector, para que cada
  // opción en blanco caiga exacto encima de la suya.
  opcionesEnBlanco: {
    position: 'absolute',
    top: -RELLENO_SELECTOR,
    bottom: -RELLENO_SELECTOR,
    left: 0,
    flexDirection: 'row',
    padding: RELLENO_SELECTOR,
    gap: SEPARACION_OPCIONES,
  },
  opcion: {
    flex: 1,
    minHeight: 40,
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  opcionTexto: { fontSize: 14.5, fontWeight: '800' },
});

export default ModoPersonal;

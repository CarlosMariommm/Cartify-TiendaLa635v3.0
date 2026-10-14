import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Bike, X, ChevronRight, Clock, Store } from 'lucide-react-native';
import { usePedidoActivoCtx } from '../../context/PedidoActivoContext';
import { useAuth } from '../../hooks/useAuth';
import { useTema } from '../../context/TemaContext';
import { useColores, useEstilos } from '../../context/ModoContext';
import { useArranqueResuelto } from '../../navigation/navigationRef';
import { useSeguimientoEnVivo } from '../../hooks/useSeguimientoEnVivo';
import { useTiempoPorZona } from '../../hooks/useTiempoPorZona';
import { pasosDe, indiceDePaso } from '../../utils/pasosPedido';
import { pedidosEnCurso, pedidosNuevos } from '../../utils/pedidosEnCurso';
import { AIRE_ABAJO_MINIMO, ALTURA_BARRA_FLOTANTE } from '../UI/BarraInferior';
import CodigoEntrega from './CodigoEntrega';
import Mascota from '../Tiqui/Mascota';
import PasosPedido from './PasosPedido';
import MapaSeguimiento from './MapaSeguimiento';
import ModalMapaSeguimiento from './ModalMapaSeguimiento';
import { suscribirseAActividad } from '../../utils/actividadUsuario';
import { useIdioma } from '../../context/IdiomaContext';

/*
 * ============================================================
 * BURBUJA DE PEDIDO — el seguimiento sin salir de la tienda
 * ============================================================
 * Copia de `frontend/src/components/Store/BurbujaPedido.jsx`: mientras un
 * pedido no esté entregado, el cliente lo ve flotando en la esquina en
 * cualquier apartado en el que esté — no solo en "Pedidos", que es la
 * pestaña donde iría a buscarlo si no existiera esto.
 *
 * Vive montada junto al navegador (ver App.js), no dentro de una pantalla:
 * así sigue ahí al cambiar de apartado o al abrir el carrito, en vez de
 * desaparecer y tener que ir a buscar el estado a mano.
 *
 * ── Varios pedidos a la vez ──
 * Si el cliente tiene más de uno abierto (uno a domicilio y otro para
 * recoger), la burbuja muestra primero el que más importa ahora —el que va
 * en camino, después el listo para recoger— y no el más reciente (ver
 * utils/pedidosEnCurso.js). En la tarjeta abierta salen todos, para cambiar
 * de uno a otro con un toque.
 *
 * Va abajo a la IZQUIERDA porque no hay nada propio de la app en esa
 * esquina (el asistente de voz y el carrito viven en la barra de arriba).
 * ============================================================
 */

const VERDE_LATIDO = '#8ee6a8';

const BurbujaPedido = () => {
  const { t } = useIdioma();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { colores } = useTema();
  const COLORES = useColores();
  const estilos = useEstilos(crearEstilos);
  const { orders, abrirPedido, cerrarPedidoAbierto, pedidoASeguir, dejarDeSeguir } = usePedidoActivoCtx();
  // El pedido puede estar listo ANTES de que Splash termine de decidir a
  // dónde ir (sesión restaurada + Onboarding leído): sin esto, la burbuja se
  // alcanzaba a ver montándose encima del propio Splash.
  const arranqueResuelto = useArranqueResuelto();
  const [abierta, setAbierta] = useState(false);

  /*
   * Cerrar NO desaparece la burbuja: la encoge. Si el pedido avanza (lo
   * empiezan a preparar, sale el repartidor) se reabre sola.
   */
  const [encogidaEn, setEncogidaEn] = useState(null); // { id, novedad }

  /*
   * Aparte de "encogida" (la decide el cliente, tocando la X): "oculta" la
   * decide la propia pantalla, cuando el cliente está haciendo otra cosa
   * —scrolleando, cambiando de pestaña— y la burbuja se corre casi entera
   * fuera de la pantalla para no estorbar. Un pedacito se queda a la vista a
   * propósito: sigue ahí, se puede volver a sacar con un toque, y no es un
   * "cerrar" del todo.
   */
  const [oculta, setOculta] = useState(false);
  const [anchoPildora, setAnchoPildora] = useState(0);

  // El mapa en grande: ver el porqué de que viva AQUÍ y no dentro de
  // MapaSeguimiento.js en el comentario grande de ese archivo.
  const [mapaGrande, setMapaGrande] = useState(false);

  const esCliente = user?.type === 'client';

  /*
   * Los pedidos abiertos, del que más importa al que menos (ver
   * utils/pedidosEnCurso.js). Se sigue el que eligió el cliente en la
   * tarjeta; si no eligió (o el que eligió ya se cerró), el primero.
   */
  const lista = esCliente ? pedidosEnCurso(orders) : [];
  const [elegidoId, setElegidoId] = useState(null);
  const enCurso = lista.find((o) => String(o._id) === elegidoId) || lista[0] || null;

  // Los hooks necesitan el id ANTES de cualquier return: no se llaman a medias.
  const seguimiento = useSeguimientoEnVivo(enCurso?._id, !!enCurso);

  /*
   * Tocaron el aviso de "va en camino": se despliega la tarjeta con el mapa
   * aunque la burbuja estuviera encogida u oculta. Se espera a que el pedido
   * esté en la lista (al abrir la app desde el aviso, todavía se está
   * cargando).
   */
  const idsAbiertos = lista.map((o) => String(o._id)).join(',');
  useEffect(() => {
    if (!pedidoASeguir || !idsAbiertos.split(',').includes(pedidoASeguir)) return;
    // Con varios pedidos abiertos, se despliega justo ESE (el del aviso).
    setElegidoId(pedidoASeguir);
    setEncogidaEn(null);
    setOculta(false);
    setAbierta(true);
    dejarDeSeguir();
  }, [pedidoASeguir, idsAbiertos, dejarDeSeguir]);
  const zona = useTiempoPorZona(
    !enCurso || seguimiento.enVivo ? null : enCurso.deliveryLat,
    !enCurso || seguimiento.enVivo ? null : enCurso.deliveryLng
  );

  // El puntito que respira, en la burbuja cerrada: ver estilos.pulso.
  const pulso = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const bucle = Animated.loop(
      Animated.timing(pulso, {
        toValue: 1,
        duration: 1800,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      })
    );
    bucle.start();
    return () => bucle.stop();
  }, [pulso]);

  // 0 = a la vista, 1 = corrida casi entera fuera de pantalla.
  const desplazamiento = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(desplazamiento, {
      toValue: oculta ? 1 : 0,
      duration: oculta ? 260 : 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [oculta, desplazamiento]);

  /*
   * El último pedido visto, para seguir pintando algo coherente MIENTRAS la
   * burbuja entera se desvanece. Sin esto, en cuanto el pedido se entrega
   * `enCurso` pasa a `undefined` de golpe y la animación de salida no tiene
   * qué mostrar durante esos 180ms — se vería un hueco en blanco, no un
   * desvanecido.
   */
  const ultimoPedidoRef = useRef(null);
  if (enCurso) ultimoPedidoRef.current = enCurso;
  const pedido = enCurso || ultimoPedidoRef.current;

  const estado = pedido ? seguimiento.estado || pedido.status : null;

  // "Hay pedido activo AHORA" usa `enCurso` (el dato fresco), no `pedido`
  // (que puede ser el último recordado): es lo que decide si la burbuja
  // tiene que estar entrando o saliendo.
  const hayPedidoActivo =
    arranqueResuelto && esCliente && !!enCurso && estado !== 'cancelado' && estado !== 'entregado';

  /*
   * Presencia de TODA la burbuja: entra con un resorte al aparecer el
   * primer pedido en curso, y sale con un fundido al entregarse o
   * cancelarse. `montada` mantiene el árbol vivo durante esos 180ms de
   * salida; sin él, el `return null` de más abajo la borraría de un
   * frame a otro y no habría nada que animar.
   */
  const [montada, setMontada] = useState(false);
  const presencia = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (hayPedidoActivo) {
      setMontada(true);
      setOculta(false);
      Animated.spring(presencia, {
        toValue: 1,
        friction: 9,
        tension: 60,
        useNativeDriver: true,
      }).start();
    } else if (montada) {
      Animated.timing(presencia, {
        toValue: 0,
        duration: 180,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) setMontada(false);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hayPedidoActivo]);

  /*
   * Quien avisa "el usuario se movió" no sabe nada de esta burbuja —son
   * media docena de listas sueltas y la barra de pestañas, ver
   * utils/actividadUsuario.js—; aquí solo se escucha. Si la tarjeta estaba
   * abierta se cierra de una vez: no tiene sentido correr 290px de tarjeta
   * fuera de pantalla, cuando lo que se guarda es la píldora chica.
   */
  useEffect(() => {
    if (!montada) return;
    return suscribirseAActividad(() => {
      setAbierta(false);
      setOculta(true);
    });
  }, [montada]);

  /*
   * Presencia de la TARJETA (el panel expandido) aparte de la burbuja: se
   * abre y se cierra muchas más veces de las que la burbuja entera aparece
   * o desaparece, así que tiene su propio fundido con un empujoncito desde
   * abajo — la misma idea que `.card-in` en la web, pero disparada por
   * `abierta` en vez de por el montaje.
   */
  const [tarjetaMontada, setTarjetaMontada] = useState(false);
  const presenciaTarjeta = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (abierta) {
      setTarjetaMontada(true);
      Animated.timing(presenciaTarjeta, {
        toValue: 1,
        duration: 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    } else if (tarjetaMontada) {
      Animated.timing(presenciaTarjeta, {
        toValue: 0,
        duration: 160,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) setTarjetaMontada(false);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abierta]);

  /*
   * Si se hace un pedido NUEVO mientras otro TODAVÍA sigue activo (no
   * entregado), `hayPedidoActivo` sigue en `true` todo el tiempo: nunca pasa
   * por `false`, así que el efecto de arriba (el que resetea `oculta` al
   * aparecer un pedido) no se entera. Sin este aparte, la tarjeta o el
   * detalle que se habían quedado abiertos seguían abiertos igual — se veían
   * "aparecer solos" encima de la pantalla de confirmación recién abierta.
   *
   * Solo cuenta un pedido que no estaba antes: cambiar de pedido en la
   * tarjeta, o que uno avance de paso, no cierra nada.
   */
  const idsAnterioresRef = useRef(idsAbiertos ? idsAbiertos.split(',') : []);
  useEffect(() => {
    const ahora = idsAbiertos ? idsAbiertos.split(',') : [];
    const anteriores = idsAnterioresRef.current;
    idsAnterioresRef.current = ahora;
    if (anteriores.length && pedidosNuevos(anteriores, ahora).length) {
      setElegidoId(null);
      setAbierta(false);
      cerrarPedidoAbierto();
      setMapaGrande(false);
      setOculta(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idsAbiertos]);

  if (!montada || !pedido) return null;

  const esDomicilio = pedido.deliveryType === 'delivery';
  const PASOS = pasosDe(pedido.deliveryType);
  const pasoActual = indiceDePaso(PASOS, estado);
  const paso = PASOS[pasoActual] || PASOS[0];
  const estaEnCamino = estado === 'en_camino';
  const enCamino = estaEnCamino && seguimiento.enVivo;

  const novedad = `${estado}|${enCamino ? 'en-camino' : ''}`;
  const encogida = encogidaEn?.id === String(pedido._id) && encogidaEn?.novedad === novedad;

  const encoger = () => {
    setAbierta(false);
    setEncogidaEn({ id: String(pedido._id), novedad });
  };

  const agrandar = () => {
    setEncogidaEn(null);
    setAbierta(true);
  };

  const irAPedidos = () => abrirPedido(pedido);

  // El paso de cada pedido abierto, para el selector de la tarjeta.
  const pasoDe = (o) => {
    const pasos = pasosDe(o.deliveryType);
    const actual = String(o._id) === String(pedido._id) ? estado : o.status;
    return pasos[indiceDePaso(pasos, actual)] || pasos[0];
  };
  const variosPedidos = lista.length > 1;

  /*
   * Arriba de la píldora flotante, no encima. `ALTURA_BARRA_FLOTANTE` es el
   * mismo alto que usan las hojas para no tapar su botón de abajo —
   * ver components/UI/BarraInferior.js. Se suma siempre, aunque en las
   * pantallas sueltas (Carrito, Checkout...) esa píldora no exista: ahí la
   * burbuja queda con un poco más de aire abajo de lo estrictamente
   * necesario, que es preferible a que tape el menú en las pantallas donde
   * sí está.
   */
  const posicion = {
    left: Math.max(20, insets.left),
    bottom: Math.max(insets.bottom, AIRE_ABAJO_MINIMO) + ALTURA_BARRA_FLOTANTE - 2,
  };

  // Ancho fijo cuando está encogida (botonRedondo, 44); medido cuando no
  // (el texto de la píldora cambia — "Preparando", "Ya casi llega"... — así
  // que su ancho no se puede saber de antemano, hay que preguntarle).
  const ANCHO_ENCOGIDA = 44;
  /*
   * Lo mínimo para que asome el puntito verde y ni una letra del texto — a
   * ojo contra el dibujo real, no contra la cuenta de paddings de memoria,
   * que salió corta. La confianza al tocarlo no depende de este número: la
   * da el hitSlop de abajo, pensado para una tira angosta.
   */
  const PEDACITO_VISIBLE = 15;
  const anchoActual = encogida ? ANCHO_ENCOGIDA : anchoPildora;
  const maxDesplazamiento = Math.max(anchoActual - PEDACITO_VISIBLE, 0);

  /*
   * La capa de toque de "oculta" (más abajo) va anclada al borde de la
   * PANTALLA (left: 0), no a `posicion.left` como el resto de la burbuja.
   * Ojo con esto: el pedacito visible queda a la IZQUIERDA de
   * `posicion.left` (ahí es donde termina el filo de la píldora ya
   * trasladada), no a la derecha — anclarla en `posicion.left` como el resto
   * dejaba la capa entera tapando el hueco de al lado en vez del filo.
   */
  const estiloCapturaOculta = {
    position: 'absolute',
    left: 0,
    bottom: posicion.bottom,
    width: posicion.left + PEDACITO_VISIBLE + 24,
    height: (encogida ? ANCHO_ENCOGIDA : 52) + 24,
    // Mismo o más alto que estilos.contenedor (elevation 12, zIndex 900):
    // sin esto, en Android la píldora sigue ganando el toque en su lugar
    // ORIGINAL (sin trasladar) del layout aunque su contenido ya se haya
    // deslizado fuera de la vista — la elevación decide quién responde,
    // no dónde se ve pintado el contenido.
    zIndex: 901,
    elevation: 20,
  };

  const estiloPresencia = {
    opacity: presencia,
    transform: [
      { scale: presencia.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] }) },
      {
        translateX: desplazamiento.interpolate({
          inputRange: [0, 1],
          outputRange: [0, -maxDesplazamiento],
        }),
      },
    ],
  };

  /*
   * Encogida: un botón redondo con el icono del paso, nada más. Ocupa poco,
   * no tapa la tienda y siempre se puede volver.
   */
  if (encogida) {
    return (
      <>
        <Animated.View style={[estilos.botonRedondo, posicion, estiloPresencia, { backgroundColor: colores.marca }]}>
          <Pressable
            onPress={() => { setOculta(false); agrandar(); }}
            accessibilityRole="button"
            accessibilityLabel={t('Ver tu pedido: {estado}', { estado: enCamino ? seguimiento.espera : paso.label })}
            style={estilos.botonRedondoToque}
          >
            {/* Tiqui en el paso del pedido, como en la web (en patineta si va en camino). */}
            <Mascota pose={estaEnCamino ? 'en-camino' : paso.pose} alto={34} sobre="color" />
          </Pressable>
        </Animated.View>
        {/* Ver el porqué de este catcher en el comentario grande junto al
            otro uso, más abajo. */}
        {oculta && (
          <View style={estiloCapturaOculta}>
            <Pressable
              onPress={() => { setOculta(false); agrandar(); }}
              style={estilos.capturaOcultaToque}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel={t('Mostrar el seguimiento del pedido')}
            />
          </View>
        )}
      </>
    );
  }

  return (
    <>
    <Animated.View style={[estilos.contenedor, posicion, estiloPresencia]}>
      {tarjetaMontada && (
        <Animated.View
          style={{
            opacity: presenciaTarjeta,
            transform: [
              { translateY: presenciaTarjeta.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) },
              { scale: presenciaTarjeta.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1] }) },
            ],
          }}
        >
          <View style={estilos.tarjeta}>
            <View style={[estilos.cabecera, { backgroundColor: colores.marca }]}>
              <Text style={estilos.cabeceraTexto}>
                {t('Pedido #{numero}', { numero: String(pedido._id).slice(-6).toUpperCase() })}
              </Text>
              <Pressable onPress={encoger} hitSlop={8} accessibilityRole="button" accessibilityLabel={t('Encoger el seguimiento')}>
                <X size={16} color="#FFFFFF" />
              </Pressable>
            </View>

            {/*
              Con más de un pedido abierto, todos aquí: el icono dice si es a
              domicilio o para recoger, y el texto en qué paso va. Tocar uno
              lo sigue en la tarjeta (con su mapa, si va en camino).
            */}
            {variosPedidos && (
              <View style={estilos.selectorPedidos} accessibilityRole="tablist">
                {lista.map((o) => {
                  const esEste = String(o._id) === String(pedido._id);
                  const Icono = o.deliveryType === 'delivery' ? Bike : Store;
                  const color = esEste ? colores.marcaTexto : COLORES.textoSuave;
                  const etiqueta = pasoDe(o).label;
                  return (
                    <Pressable
                      key={String(o._id)}
                      onPress={() => setElegidoId(String(o._id))}
                      accessibilityRole="tab"
                      accessibilityState={{ selected: esEste }}
                      accessibilityLabel={`${t(o.deliveryType === 'delivery' ? 'Envío a domicilio' : 'Retiro en el local')}: ${etiqueta}`}
                      style={[
                        estilos.opcionPedido,
                        { borderColor: esEste ? colores.marca : COLORES.borde },
                        esEste && { backgroundColor: colores.marcaTenue },
                      ]}
                    >
                      <Icono size={14} color={color} strokeWidth={2.2} />
                      <Text style={[estilos.opcionPedidoTexto, { color }]} numberOfLines={1}>
                        {etiqueta}
                        {/* El número: dos pedidos en el mismo paso se distinguen igual. */}
                        <Text style={estilos.opcionPedidoNumero}> · #{String(o._id).slice(-6).toUpperCase()}</Text>
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            )}

            {enCamino && (
              <>
                {/*
                  132 de alto, sin borde propio: mismas medidas que la web
                  para la burbuja (alto={132} borde="transparent"). Va con
                  margen propio en vez de heredar el `gap` de estilos.cuerpo
                  porque ese padding es horizontal Y vertical, y el mapa sí
                  necesita tocar los bordes laterales del bloqueInfo de abajo
                  para leerse como una sola pieza con él.
                */}
                <View style={estilos.marcoMapa}>
                  <MapaSeguimiento
                    // Al volver de ModalMapaSeguimiento.js, Android a veces
                    // deja la miniatura con una franja gris a medio pintar
                    // (el WebView grande le pisó la superficie mientras
                    // estuvo encima) — cambiar la key fuerza un remontaje
                    // limpio apenas se cierra.
                    key={mapaGrande ? 'grande' : 'chica'}
                    punto={seguimiento.punto}
                    destino={seguimiento.destino}
                    ruta={seguimiento.ruta}
                    alto={132}
                    colorMarca={colores.marca}
                    alAgrandar={() => setMapaGrande(true)}
                  />
                </View>
                <View
                  style={[
                    estilos.bloqueInfo,
                    { backgroundColor: seguimiento.yaCasi ? COLORES.exitoFondo : COLORES.infoFondo },
                  ]}
                >
                  <View style={estilos.filaIconoTexto}>
                    <Bike size={15} color={seguimiento.yaCasi ? COLORES.exitoTexto : COLORES.infoTexto} strokeWidth={2.4} />
                    <Text
                      style={[
                        estilos.infoTitulo,
                        { color: seguimiento.yaCasi ? COLORES.exitoTexto : COLORES.infoTexto },
                      ]}
                    >
                      {seguimiento.yaCasi ? t('Ya casi toca tu puerta') : seguimiento.espera}
                    </Text>
                  </View>
                  <Text
                    style={[
                      estilos.infoDetalle,
                      { color: seguimiento.yaCasi ? COLORES.exitoSuave : COLORES.infoSuave },
                    ]}
                  >
                    {seguimiento.repartidor ? `${seguimiento.repartidor} · ` : ''}
                    {seguimiento.distancia ? t('a {distancia} de tu dirección', { distancia: seguimiento.distancia }) : t('Te llevan tu pedido')}
                  </Text>
                </View>
              </>
            )}

            {/*
              El tiempo real a su zona, mientras nadie ha salido todavía. Se
              apaga en cuanto hay repartidor en vivo (arriba): dos tiempos
              distintos en la misma tarjeta solo confunden.
            */}
            {!enCamino && esDomicilio && zona.hayDatos && (
              <View style={[estilos.bloqueInfo, { backgroundColor: COLORES.exitoFondo }]}>
                <View style={estilos.filaIconoTexto}>
                  <Clock size={14} color={COLORES.exitoTexto} strokeWidth={2.4} />
                  <Text style={[estilos.infoTitulo, { color: COLORES.exitoTexto }]}>{zona.tipico === zona.holgado ? t('Llega en unos {min} min', { min: zona.tipico }) : t('Llega entre {desde} y {hasta} min', { desde: zona.tipico, hasta: zona.holgado })}</Text>
                </View>
                <Text style={[estilos.infoDetalle, { color: COLORES.exitoSuave }]}>{t(zona.entregas === 1 ? 'Según {n} entrega a tu zona. No es una promesa: es lo que hemos tardado.' : 'Según {n} entregas a tu zona. No es una promesa: es lo que hemos tardado.', { n: zona.entregas })}</Text>
              </View>
            )}

            <CodigoEntrega codigo={pedido.deliveryCode} estado={estado} compacto />

            <View style={estilos.cuerpo}>
              <PasosPedido deliveryType={pedido.deliveryType} estado={estado} />

              {esDomicilio && seguimiento.senalFria && (
                <Text style={estilos.notaPequena}>
                  {t('Tu pedido va en camino. La última novedad del repartidor fue hace {n} min.', { n: seguimiento.minutosDesdeUltimoDato || 1 })}
                </Text>
              )}

              {esDomicilio && pedido.deliveryAddress && (
                <Text style={estilos.notaPequena}>{t('Te lo llevamos a: {direccion}', { direccion: pedido.deliveryAddress })}</Text>
              )}

              <Pressable accessibilityRole="button" onPress={irAPedidos} style={estilos.botonVerPedido}>
                <Text style={[estilos.botonVerPedidoTexto, { color: colores.marcaTexto }]}>{t('Ver el pedido')}</Text>
                <ChevronRight size={14} color={colores.marca} />
              </Pressable>
            </View>
          </View>
        </Animated.View>
      )}

      {/* La burbuja: el icono del paso actual y su nombre */}
      <Pressable
        onPress={() => { setOculta(false); setAbierta((v) => !v); }}
        onLayout={(e) => setAnchoPildora(e.nativeEvent.layout.width)}
        accessibilityRole="button"
        accessibilityState={{ expanded: abierta }}
        accessibilityLabel={enCamino ? t('Tu pedido va en camino. {espera}', { espera: seguimiento.espera }) : t('Tu pedido: {estado}', { estado: paso.label })}
        style={[estilos.botonBurbuja, { backgroundColor: seguimiento.yaCasi ? '#14663A' : colores.marca }]}
        /*
         * Generoso arriba y abajo a propósito: la píldora tiene las puntas
         * totalmente redondeadas (borderRadius 999), así que el filito que
         * queda a la vista al estar "oculta" se angosta cerca del borde
         * superior e inferior — sin este margen, tocar un poco fuera del
         * centro vertical del filo caía fuera de la forma real.
         */
        hitSlop={{ top: 22, bottom: 22, left: 10, right: 14 }}
      >
        <Mascota pose={estaEnCamino ? 'en-camino' : paso.pose} alto={40} sobre="color" />
        <Text style={estilos.botonBurbujaTexto}>
          {enCamino ? (seguimiento.yaCasi ? t('Ya casi llega') : seguimiento.espera) : paso.label}
        </Text>
        {/* Con más de un pedido abierto, cuántos: los demás están en la tarjeta. */}
        {variosPedidos && (
          <View style={estilos.cuenta} accessibilityLabel={t('Tienes {n} pedidos en curso', { n: lista.length })}>
            <Text style={[estilos.cuentaTexto, { color: colores.marca }]}>{lista.length}</Text>
          </View>
        )}
        {/* El puntito que respira: dice "esto sigue en curso" sin decir nada */}
        <View style={estilos.pulsoContenedor}>
          <Animated.View
            style={[
              estilos.pulsoAnillo,
              {
                opacity: pulso.interpolate({ inputRange: [0, 1], outputRange: [0.7, 0] }),
                transform: [{ scale: pulso.interpolate({ inputRange: [0, 1], outputRange: [1, 2.4] }) }],
              },
            ]}
          />
          <View style={estilos.pulsoPunto} />
        </View>
      </Pressable>
    </Animated.View>

    {/*
      Un Modal transparente de pantalla completa (probado antes que esto)
      funcionaba para tocar el pedacito asomado, pero en Android se quedaba
      comiéndose TODOS los toques de la pantalla mientras la burbuja estaba
      escondida, sin importar dónde tocara el usuario — ni
      `pointerEvents:'box-none'` por `style` en su envoltorio lo arregló, y
      Android trataba la ventana del Modal entera como modal de cualquier
      forma. Sin Modal, con `zIndex`/`elevation` iguales o más altos que
      `estilos.contenedor` (ver estiloCapturaOculta), esta capa sí gana la
      negociación del toque contra el FlatList de atrás.
    */}
    {oculta && (
      <View style={estiloCapturaOculta}>
        <Pressable
          onPress={() => { setOculta(false); setAbierta((v) => !v); }}
          style={estilos.capturaOcultaToque}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={t('Mostrar el seguimiento del pedido')}
        />
      </View>
    )}

    {mapaGrande && (
      <ModalMapaSeguimiento
        punto={seguimiento.punto}
        destino={seguimiento.destino}
        ruta={seguimiento.ruta}
        colorMarca={colores.marca}
        alCerrar={() => setMapaGrande(false)}
      />
    )}
    </>
  );
};

const crearEstilos = (COLORES) => StyleSheet.create({
  contenedor: {
    position: 'absolute',
    zIndex: 900,
    elevation: 12,
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 10,
  },
  // El Pressable de adentro llena esta capa; ver estiloCapturaOculta (en el
  // cuerpo del componente) para su posición, tamaño y elevación reales, y el
  // comentario grande junto a su uso para por qué no lleva Modal.
  capturaOcultaToque: {
    flex: 1,
  },
  botonRedondo: {
    position: 'absolute',
    zIndex: 900,
    elevation: 12,
    width: 44,
    height: 44,
    borderRadius: 22,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  botonRedondoToque: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tarjeta: {
    width: 290,
    backgroundColor: COLORES.papelAlto,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORES.lineaCard,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.22,
    shadowRadius: 24,
  },
  cabecera: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  cabeceraTexto: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  // Los pedidos abiertos, cuando hay más de uno: pastillas en una fila.
  selectorPedidos: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    paddingHorizontal: 12,
    paddingTop: 10,
  },
  opcionPedido: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1.5,
    maxWidth: '100%',
  },
  opcionPedidoTexto: {
    fontSize: 12.5,
    fontWeight: '700',
    flexShrink: 1,
  },
  opcionPedidoNumero: {
    fontWeight: '500',
    opacity: 0.75,
  },
  // El propio MapaSeguimiento ya recorta sus esquinas (ver su estilo
  // `marco`); esta vista solo le da el margen lateral que el resto de la
  // tarjeta trae por padding, ya que el mapa vive FUERA de estilos.cuerpo.
  marcoMapa: {
    marginHorizontal: 14,
    marginTop: 12,
  },
  bloqueInfo: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORES.linea,
  },
  filaIconoTexto: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  infoTitulo: {
    fontSize: 13,
    fontWeight: '800',
  },
  infoDetalle: {
    fontSize: 11.5,
    marginTop: 2,
  },
  cuerpo: {
    padding: 14,
  },
  notaPequena: {
    fontSize: 11.5,
    color: COLORES.tintaTenue,
    marginTop: 10,
    lineHeight: 16,
  },
  botonVerPedido: {
    marginTop: 12,
    width: '100%',
    paddingVertical: 9,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORES.linea,
    backgroundColor: COLORES.papelAlto,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  botonVerPedidoTexto: {
    fontSize: 12.5,
    fontWeight: '700',
  },
  botonBurbuja: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    height: 52,
    paddingHorizontal: 16,
    borderRadius: 999,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 14,
  },
  botonBurbujaTexto: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  // Cuántos pedidos abiertos hay, cuando son más de uno.
  cuenta: {
    minWidth: 18,
    height: 18,
    paddingHorizontal: 5,
    borderRadius: 9,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cuentaTexto: {
    fontSize: 11,
    fontWeight: '800',
  },
  pulsoContenedor: {
    width: 8,
    height: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulsoAnillo: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: VERDE_LATIDO,
  },
  pulsoPunto: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: VERDE_LATIDO,
  },
});

export default BurbujaPedido;

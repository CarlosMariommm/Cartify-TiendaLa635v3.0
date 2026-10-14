import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, PanResponder, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColores, useEstilos } from '../../context/ModoContext';
import { useTema } from '../../context/TemaContext';
import { useBotonAtras } from '../../hooks/useBotonAtras';
import { Equis, Estrella, Paquete } from '../UI/Iconos';
import { estadosPedido, poseDeEstado, textoDevuelto, sellosDeCancelacion } from '../../utils/pasosPedido';
import { usePedidoActivoCtx } from '../../context/PedidoActivoContext';
import { cancelarPedido } from '../../api/pedidosApi';
import Mascota from '../Tiqui/Mascota';
import CodigoEntrega from './CodigoEntrega';
import PasosPedido from './PasosPedido';
import ValoracionPedido from '../Cuenta/ValoracionPedido';
import ValoracionServicio from '../Cuenta/ValoracionServicio';
import { useIdioma } from '../../context/IdiomaContext';
import { foto, ANCHO } from '../../utils/fotos';
import { hojaCentrada } from '../../theme/pantalla';
import { useSeguimientoEnVivo } from '../../hooks/useSeguimientoEnVivo';
import MapaSeguimiento from './MapaSeguimiento';
import ModalMapaSeguimiento from './ModalMapaSeguimiento';

/*
 * Una fila por producto, con su propio estado de "la imagen no cargó": cada
 * línea trae su propia foto, así que el fallback es por línea, no por todo
 * el modal. `item.productId` llega poblado desde el backend (getOrdersByClient
 * hace populate) con el producto completo, `image` incluida — mismo array de
 * URLs de Cloudinary que ya usa el catálogo, ver utils/catalogo.js.
 */
const FilaProducto = ({ item }) => {
  const { t } = useIdioma();
  const COLORES = useColores();
  const estilos = useEstilos(crearEstilos);
  const [fallóImagen, setFallóImagen] = useState(false);
  const imagenBruta = item.productId?.image;
  const imagen = Array.isArray(imagenBruta) ? imagenBruta[0] : imagenBruta;

  return (
    <View style={estilos.filaProductoImagen}>
      <View style={estilos.miniatura}>
        {imagen && !fallóImagen ? (
          <Image
            source={{ uri: foto(imagen, ANCHO.miniatura) }}
            contentFit="contain"
            style={estilos.miniaturaImagen}
            onError={() => setFallóImagen(true)}
          />
        ) : (
          <Paquete size={18} color={COLORES.textoTenue} />
        )}
      </View>
      <Text style={estilos.nombreProducto} numberOfLines={1}>
        {item.amount}× {item.name || item.productId?.name || t('Producto')}
      </Text>
      <Text style={estilos.precioProducto}>
        ${(Number(item.price) * Number(item.amount)).toFixed(2)}
      </Text>
    </View>
  );
};

/*
 * ============================================================
 * DETALLE DE PEDIDO — ModalPedido.js
 * ============================================================
 * Qué llevaba, en qué va y cómo se paga un pedido del historial. Se abre al
 * tocar su tarjeta en "Mis pedidos" — mismo patrón que ModalProducto (hoja
 * que sube desde abajo, con asa para arrastrar y cerrar); ver ese archivo
 * para el porqué de cada pieza del gesto, no se repite aquí.
 *
 * Un pedido a domicilio que sigue abierto se sigue EN VIVO mientras se mira
 * (useSeguimientoEnVivo): el paso al día y, si va en camino, el mapa con el
 * repartidor y su ruta. Antes era solo una foto del pedido, porque para
 * seguirlo estaba la burbuja; pero con dos pedidos abiertos (uno a domicilio
 * y otro para recoger) la burbuja mostraba el otro y el que iba en camino se
 * quedaba sin mapa en ningún lado.
 * ============================================================
 */

// Los mismos motivos que en la web (ModalCancelarMiPedido): los lee el personal.
const MOTIVOS_CANCELAR = [
  'Me equivoqué en el pedido.',
  'Ya no lo necesito.',
  'Quiero cambiar la dirección o la forma de pago.',
  'Encontré lo que buscaba en otro lugar.',
  'Prefiero no decirlo.',
];

const fechaLarga = (iso, locale) => {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString(locale, {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
};

const ModalPedido = ({ pedido, alCerrar }) => {
  const { t, locale } = useIdioma();
  const { colores } = useTema();
  const COLORES = useColores();
  const estilos = useEstilos(crearEstilos);
  const { bottom } = useSafeAreaInsets();

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

  const panelAlturaRef = useRef(0);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_evento, gesto) => Math.abs(gesto.dy) > 4,
      onPanResponderTerminationRequest: () => false,
      onPanResponderMove: (_evento, gesto) => {
        if (gesto.dy > 0) panelY.setValue(gesto.dy);
      },
      onPanResponderRelease: (_evento, gesto) => {
        const mitad = (panelAlturaRef.current || 400) / 2;
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

  /*
   * Cancelar, mientras está por preparar. Se abre aquí mismo, debajo del
   * estado: elegir el motivo con un toque y confirmar, sin otra pantalla.
   */
  const { actualizarPedido, refrescar } = usePedidoActivoCtx();
  const [cancelando, setCancelando] = useState(false);
  const [motivo, setMotivo] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [errorCancelar, setErrorCancelar] = useState('');

  const soltarCancelacion = () => {
    setCancelando(false);
    setMotivo('');
    setErrorCancelar('');
  };

  const confirmarCancelacion = async () => {
    if (!motivo || enviando) return;
    setEnviando(true);
    setErrorCancelar('');
    try {
      const r = await cancelarPedido(pedido._id, motivo);
      // El detalle, la lista y la burbuja se enteran juntos. Ver actualizarPedido.
      actualizarPedido(sellosDeCancelacion(r?.order));
      refrescar();
      soltarCancelacion();
    } catch (e) {
      // Casi siempre: que la tienda ya lo empezó a preparar (lo dice el servidor).
      setErrorCancelar(e?.message || t('No se pudo cancelar. Intenta de nuevo.'));
    } finally {
      setEnviando(false);
    }
  };

  // El seguimiento en vivo: solo un pedido a domicilio que sigue abierto.
  const seguible = pedido?.deliveryType === 'delivery' && ['pagado', 'preparando', 'en_camino'].includes(pedido?.status);
  // Sin aviso de "ya casi": ese lo da la burbuja, y saldría dos veces.
  const seguimiento = useSeguimientoEnVivo(pedido?._id, seguible, { conAviso: false });
  const [mapaGrande, setMapaGrande] = useState(false);

  if (!pedido) return null;

  // El paso al día si se está siguiendo; si no, el de la lista.
  const estadoActual = seguimiento.estado || pedido.status;
  const enCamino = estadoActual === 'en_camino' && seguimiento.enVivo;
  const estados = estadosPedido(COLORES.oscuro);
  const estado = estados[estadoActual] || estados.pagado;
  const numero = String(pedido._id || '').slice(-6).toUpperCase();
  const items = Array.isArray(pedido.items) ? pedido.items : [];
  const esCancelado = estadoActual === 'cancelado';

  /*
   * Los números del desglose. Los pedidos viejos (de antes de que existieran
   * el envío y la tarifa) no traen estos campos: ahí el subtotal cae al total
   * y las demás líneas quedan en cero, que es justo lo que había que cobrar.
   */
  const subtotal = Number(pedido.subtotal ?? pedido.total ?? 0);
  const envio = Number(pedido.shippingCost || 0);
  const servicio = Number(pedido.serviceFee || 0);
  const descuento = Number(pedido.discount || 0);

  // Lo que se le devolvería al cancelar, dicho antes (la misma cuenta del servidor).
  const devolveria = textoDevuelto({
    reembolso: {
      saldo: pedido.paymentMethod === 'saldo' ? Number(pedido.total) || 0 : 0,
      puntos: Number(pedido.pointsRedeemed) || 0,
    },
  }, { antes: true });

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
            <Pressable
              onPress={cerrarConAnimacion}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel={t('Cerrar el detalle del pedido')}
              style={estilos.cerrar}
            >
              <Equis size={16} color={COLORES.textoSuave} />
            </Pressable>
          </View>

          <ScrollView
            contentContainerStyle={[estilos.contenido, { paddingBottom: Math.max(bottom, 18) + 16 }]}
            bounces={false}
          >
            <View style={estilos.filaTitulo}>
              <View style={estilos.identidad}>
                <Text style={estilos.numero}>{t('Pedido #{numero}', { numero })}</Text>
                <Text style={estilos.fecha}>{fechaLarga(pedido.createdAt, locale)}</Text>
              </View>
              <View style={[estilos.chapa, { backgroundColor: estado.fondo }]}>
                <Text style={[estilos.chapaTexto, { color: estado.color }]}>{estado.texto}</Text>
              </View>
            </View>

            {/* Tiqui cuenta en qué va el pedido, como en "Estado del pedido" de la web. */}
            <View style={estilos.tiquiEstado}>
              <Mascota pose={poseDeEstado(estadoActual)} alto={120} />
            </View>

            {/* Va en camino: dónde va el repartidor, su ruta y cuánto falta. */}
            {enCamino && (
              <View style={estilos.bloqueMapa}>
                <MapaSeguimiento
                  key={mapaGrande ? 'grande' : 'chica'}
                  punto={seguimiento.punto}
                  destino={seguimiento.destino}
                  ruta={seguimiento.ruta}
                  alto={170}
                  colorMarca={colores.marca}
                  alAgrandar={() => setMapaGrande(true)}
                />
                <Text style={[estilos.mapaTitulo, { color: seguimiento.yaCasi ? COLORES.exitoTexto : COLORES.infoTexto }]}>
                  {seguimiento.yaCasi ? t('Ya casi toca tu puerta') : seguimiento.espera}
                </Text>
                <Text style={estilos.mapaDetalle}>
                  {seguimiento.repartidor ? `${seguimiento.repartidor} · ` : ''}
                  {seguimiento.distancia ? t('a {distancia} de tu dirección', { distancia: seguimiento.distancia }) : t('Te llevan tu pedido')}
                </Text>
              </View>
            )}

            {/*
              Cancelado: por qué y lo que se le devolvió, igual que en la web.
              Los pedidos cancelados antes de que se pidiera un motivo no
              traen ninguno y se quedan con la frase de siempre.
            */}
            {esCancelado ? (
              <View style={estilos.notaCancelado}>
                {pedido.cancelledByClient && (
                  <Text style={[estilos.notaCanceladoTexto, estilos.notaCanceladoUsted]}>{t('Cancelaste este pedido.')}</Text>
                )}
                <Text style={estilos.notaCanceladoTexto}>
                  {pedido.cancelReason ? (
                    <>
                      <Text style={estilos.notaCanceladoTitulo}>{t('Motivo: ')}</Text>
                      {t(pedido.cancelReason)}
                    </>
                  ) : t('Este pedido fue cancelado.')}
                </Text>
                {!!textoDevuelto(pedido) && (
                  <Text style={[estilos.notaCanceladoTexto, estilos.notaCanceladoDevuelto]}>{textoDevuelto(pedido)}</Text>
                )}
              </View>
            ) : (
              <View style={estilos.bloquePasos}>
                <PasosPedido deliveryType={pedido.deliveryType} estado={estadoActual} />
              </View>
            )}

            {/*
              Cancelar: solo mientras está por preparar (el servidor también
              lo revisa), y nunca el pedido de prueba del simulador.
            */}
            {estadoActual === 'pagado' && !pedido.simulado && (
              !cancelando ? (
                <Pressable
                  onPress={() => setCancelando(true)}
                  accessibilityRole="button"
                  style={({ pressed }) => [estilos.botonCancelar, pressed && { opacity: 0.7 }]}
                >
                  <Text style={estilos.botonCancelarTexto}>{t('Cancelar pedido')}</Text>
                </Pressable>
              ) : (
                <View style={estilos.cancelar}>
                  <Text style={estilos.cancelarTitulo}>{t('¿Por qué lo cancelas?')}</Text>
                  <Text style={estilos.cancelarBajada}>
                    {t('Todavía no lo empezamos a preparar, así que se puede cancelar.')}{devolveria ? ` ${devolveria}` : ''}
                  </Text>
                  <View accessibilityRole="radiogroup" style={estilos.opciones}>
                    {MOTIVOS_CANCELAR.map((m) => {
                      const elegido = motivo === m;
                      return (
                        <Pressable
                          key={m}
                          onPress={() => setMotivo(m)}
                          accessibilityRole="radio"
                          accessibilityState={{ checked: elegido }}
                          style={[estilos.opcion, elegido && { borderColor: colores.marca, backgroundColor: colores.marcaTenue }]}
                        >
                          <Text style={[estilos.opcionTexto, elegido && { fontWeight: '700', color: colores.marcaTexto }]}>{t(m)}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                  {!!errorCancelar && <Text style={estilos.errorCancelar}>{errorCancelar}</Text>}
                  <View style={estilos.filaBotones}>
                    <Pressable onPress={soltarCancelacion} accessibilityRole="button" style={estilos.botonMantener}>
                      <Text style={estilos.botonMantenerTexto}>{t('No, mantenerlo')}</Text>
                    </Pressable>
                    <Pressable
                      onPress={confirmarCancelacion}
                      disabled={!motivo || enviando}
                      accessibilityRole="button"
                      accessibilityState={{ disabled: !motivo || enviando }}
                      style={[estilos.botonConfirmar, (!motivo || enviando) && { opacity: 0.5 }]}
                    >
                      <Text style={estilos.botonConfirmarTexto}>{enviando ? t('Cancelando…') : t('Sí, cancelar')}</Text>
                    </Pressable>
                  </View>
                </View>
              )
            )}

            <CodigoEntrega codigo={pedido.deliveryCode} estado={estadoActual} compacto />

            <View style={estilos.tarjeta}>
              <Text style={estilos.tarjetaTitulo}>{t('Productos')}</Text>
              {items.map((item, i) => (
                // Índice como clave: las líneas del pedido no traen `_id`
                // propio (el esquema las guarda con `_id: false`).
                <FilaProducto key={i} item={item} />
              ))}
              <View style={estilos.separador} />

              {/*
                El desglose, igual que el "Resumen del pedido" de la web: qué
                era producto, qué era envío y qué descontaron los puntos. Antes
                aquí solo estaba el Total, y un total sin desglose deja al
                cliente sumando a mano para entender por qué pagó eso.

                Las líneas que valen cero no se pintan (salvo el envío, que
                dice "Gratis" porque eso sí es una buena noticia).
              */}
              <View style={estilos.filaResumen}>
                <Text style={estilos.resumenEtiqueta}>{t('Productos')}</Text>
                <Text style={estilos.resumenValor}>${subtotal.toFixed(2)}</Text>
              </View>

              {pedido.deliveryType === 'delivery' && (
                <View style={estilos.filaResumen}>
                  <Text style={estilos.resumenEtiqueta}>{t('Gastos de envío')}</Text>
                  <Text style={estilos.resumenValor}>
                    {envio > 0 ? `$${envio.toFixed(2)}` : t('Gratis')}
                  </Text>
                </View>
              )}

              {servicio > 0 && (
                <View style={estilos.filaResumen}>
                  <Text style={estilos.resumenEtiqueta}>{t('Tarifa de servicio')}</Text>
                  <Text style={estilos.resumenValor}>${servicio.toFixed(2)}</Text>
                </View>
              )}

              {descuento > 0 && (
                <View style={estilos.filaResumen}>
                  <Text style={estilos.resumenEtiqueta}>{t('Descuento por puntos')}</Text>
                  <Text style={[estilos.resumenValor, estilos.resumenDescuento]}>
                    −${descuento.toFixed(2)}
                  </Text>
                </View>
              )}

              <View style={estilos.separador} />
              <View style={estilos.filaTotal}>
                <Text style={estilos.totalEtiqueta}>{t('Total')}</Text>
                <Text style={estilos.totalValor}>${Number(pedido.total || 0).toFixed(2)}</Text>
              </View>
            </View>

            <View style={estilos.tarjeta}>
              <Text style={estilos.tarjetaTitulo}>
                {t(pedido.deliveryType === 'delivery' ? 'Envío a domicilio' : 'Retiro en el local')}
              </Text>
              {!!pedido.deliveryAddress && <Text style={estilos.direccion}>{pedido.deliveryAddress}</Text>}
              {!!pedido.deliveryReference && <Text style={estilos.referencia}>{pedido.deliveryReference}</Text>}
              <View style={estilos.separador} />
              <View style={estilos.filaProducto}>
                <Text style={estilos.nombreProducto}>{t('Método de pago')}</Text>
                <Text style={estilos.precioProducto}>
                  {t(pedido.paymentMethod === 'saldo'
                    ? 'Saldo'
                    : pedido.paymentMethod === 'tarjeta'
                      ? 'Tarjeta'
                      : 'Efectivo')}
                </Text>
              </View>
            </View>

            {/*
              Las dos formas de calificar que ya tenía la web: el reparto (solo
              domicilios entregados) y el pedido en sí, que se guarda como
              reseña de cada producto. Cada bloque decide solo si le toca
              aparecer.
            */}
            {/* El pedido de prueba no se califica: guardaría reseñas de verdad. */}
            {!pedido.simulado && <ValoracionServicio pedido={pedido} />}
            {!pedido.simulado && <ValoracionPedido pedido={pedido} />}

            {/* Un cancelado ya no da puntos: se retiraron al cancelarlo. */}
            {pedido.pointsEarned > 0 && !esCancelado && (
              <View style={[estilos.puntos, { backgroundColor: colores.marcaTenue }]}>
                <Estrella size={14} color={colores.marca} />
                <Text style={[estilos.puntosTexto, { color: colores.marcaTexto }]}>
                  {t(pedido.pointsEarned === 1 ? 'Ganó {n} punto con esta compra' : 'Ganó {n} puntos con esta compra', { n: pedido.pointsEarned })}
                </Text>
              </View>
            )}
          </ScrollView>
        </Animated.View>
      </Animated.View>

      {/* El mapa en grande, encima de todo el detalle (la capa ocupa la pantalla entera). */}
      {mapaGrande && (
        <ModalMapaSeguimiento
          punto={seguimiento.punto}
          destino={seguimiento.destino}
          ruta={seguimiento.ruta}
          colorMarca={colores.marca}
          alCerrar={() => setMapaGrande(false)}
        />
      )}
    </View>
  );
};

const crearEstilos = (COLORES) => StyleSheet.create({
  capa: {
    ...StyleSheet.absoluteFillObject,
    /*
     * Más alto que BurbujaPedido.js (zIndex 900 / elevation 12): quien monta
     * ESTE componente (`PedidoDetalleFlotante`, ver App.js) va como el
     * ÚLTIMO hermano del árbol, así que ya gana por orden de pintado nomás
     * — este número de más es solo un cinturón y tirantes, para que ni un
     * `elevation` suelto de otra pantalla alcance a colarse encima.
     */
    zIndex: 950,
    elevation: 20,
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
    maxHeight: '88%',
  },
  encabezado: {
    paddingTop: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
    minHeight: 44,
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
  cerrar: {
    position: 'absolute',
    right: 10,
    top: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contenido: {
    paddingHorizontal: 16,
    paddingTop: 6,
  },
  filaTitulo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 18,
  },
  identidad: {
    flexShrink: 1,
    gap: 2,
  },
  numero: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORES.tituloFuerte,
  },
  fecha: {
    fontSize: 12.5,
    color: COLORES.textoTenue,
  },
  tiquiEstado: {
    alignItems: 'center',
    marginVertical: 10,
  },
  // El repartidor en vivo: el mapa y, debajo, cuánto falta.
  bloqueMapa: {
    marginBottom: 14,
    gap: 6,
  },
  mapaTitulo: {
    fontSize: 15,
    fontWeight: '800',
    marginTop: 4,
  },
  mapaDetalle: {
    fontSize: 13,
    color: COLORES.textoSuave,
  },
  chapa: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  chapaTexto: {
    fontSize: 12,
    fontWeight: '700',
  },
  bloquePasos: {
    borderWidth: 1,
    borderColor: COLORES.lineaCard,
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
  },
  notaCancelado: {
    backgroundColor: COLORES.peligroFondo,
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
    gap: 4,
  },
  notaCanceladoTexto: {
    fontSize: 13.5,
    lineHeight: 19,
    color: COLORES.textoSuave,
  },
  notaCanceladoTitulo: {
    fontWeight: '700',
    color: COLORES.peligro,
  },
  notaCanceladoDevuelto: {
    fontSize: 12.5,
  },
  notaCanceladoUsted: {
    fontWeight: '700',
    color: COLORES.tituloFuerte,
  },
  botonCancelar: {
    alignSelf: 'stretch',
    alignItems: 'center',
    paddingVertical: 11,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORES.lineaCard,
    marginBottom: 14,
  },
  botonCancelarTexto: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORES.peligro,
  },
  cancelar: {
    borderWidth: 1,
    borderColor: COLORES.lineaCard,
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
    gap: 10,
  },
  cancelarTitulo: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORES.tituloFuerte,
  },
  cancelarBajada: {
    fontSize: 13,
    lineHeight: 18,
    color: COLORES.textoSuave,
  },
  opciones: {
    gap: 8,
  },
  opcion: {
    borderWidth: 1.5,
    borderColor: COLORES.lineaCard,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  opcionTexto: {
    fontSize: 13.5,
    color: COLORES.texto,
  },
  errorCancelar: {
    fontSize: 13,
    lineHeight: 18,
    color: COLORES.peligro,
  },
  filaBotones: {
    flexDirection: 'row',
    gap: 10,
  },
  botonMantener: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 11,
    borderRadius: 999,
    backgroundColor: COLORES.papelSuave,
  },
  botonMantenerTexto: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORES.texto,
  },
  botonConfirmar: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 11,
    borderRadius: 999,
    backgroundColor: COLORES.peligro,
  },
  botonConfirmarTexto: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  tarjeta: {
    borderWidth: 1,
    borderColor: COLORES.lineaCard,
    borderRadius: 14,
    padding: 15,
    gap: 9,
    marginBottom: 14,
  },
  tarjetaTitulo: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORES.tituloFuerte,
  },
  filaProducto: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  // Fila de producto CON foto (ver FilaProducto, arriba); distinta de
  // filaProducto porque esa otra la reutiliza "Método de pago" ahí abajo,
  // sin miniatura, y ese `justifyContent:'space-between'` con solo dos
  // textos se rompería si le metiéramos una tercera vista en medio.
  filaProductoImagen: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  miniatura: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: COLORES.papelGris,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 5,
  },
  miniaturaImagen: {
    width: '100%',
    height: '100%',
  },
  nombreProducto: {
    flex: 1,
    fontSize: 13.5,
    color: COLORES.textoVentaja,
  },
  precioProducto: {
    fontSize: 13.5,
    color: COLORES.textoVentaja,
  },
  separador: {
    height: 1,
    backgroundColor: COLORES.lineaCard,
    marginVertical: 2,
  },
  filaResumen: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 12,
  },
  resumenEtiqueta: {
    fontSize: 13,
    color: COLORES.textoSuave,
  },
  resumenValor: {
    fontSize: 13,
    color: COLORES.textoVentaja,
  },
  resumenDescuento: {
    color: COLORES.exitoVivo,
    fontWeight: '600',
  },
  filaTotal: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  totalEtiqueta: {
    fontSize: 14.5,
    fontWeight: '700',
    color: COLORES.tituloFuerte,
  },
  totalValor: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORES.tituloFuerte,
  },
  direccion: {
    fontSize: 13,
    lineHeight: 19,
    color: COLORES.textoVentaja,
  },
  referencia: {
    fontSize: 11.5,
    color: COLORES.textoTenue,
  },
  puntos: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  puntosTexto: {
    flexShrink: 1,
    fontSize: 13,
    fontWeight: '600',
  },
});

export default ModalPedido;

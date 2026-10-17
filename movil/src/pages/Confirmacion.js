// CONFIRMACIÓN — el pedido ya está hecho
// La tercera vista de `ShoppingCart.jsx`: el visto verde, el número del pedido, en qué va y qué
// llevaba. ── Se pinta el pedido que devolvió el servidor, no el carrito ──

import { useMemo, useState } from 'react';
import { StyleSheet, ScrollView, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Bike, Check, Package } from 'lucide-react-native';
import Mascota from '../components/Tiqui/Mascota';
import { useColores, useEstilos } from '../context/ModoContext';
import { ALTURA_ESTADO, contenidoCentrado } from '../theme/pantalla';
import { useTema } from '../context/TemaContext';
import { useTienda } from '../context/TiendaContext';
import { useBotonAtras } from '../hooks/useBotonAtras';
import { useSeguimientoEnVivo } from '../hooks/useSeguimientoEnVivo';
import { pasosDe, indiceDePaso } from '../utils/pasosPedido';
import Boton from '../components/UI/Boton';
import { Estrella } from '../components/UI/Iconos';
import CodigoEntrega from '../components/Tienda/CodigoEntrega';
import MapaSeguimiento from '../components/Tienda/MapaSeguimiento';
import ModalMapaSeguimiento from '../components/Tienda/ModalMapaSeguimiento';
import { useIdioma } from '../context/IdiomaContext';
import { foto, ANCHO } from '../utils/fotos';

// Una fila por producto, con su propia foto.
const FilaProducto = ({ item, imagen }) => {
  const { t } = useIdioma();
  const COLORES = useColores();
  const estilos = useEstilos(crearEstilos);
  const [fallóImagen, setFallóImagen] = useState(false);

  return (
    <View style={estilos.filaProducto}>
      <View style={estilos.miniatura}>
        {imagen && !fallóImagen ? (
          <Image
            source={{ uri: foto(imagen, ANCHO.miniatura) }}
            contentFit="contain"
            style={estilos.miniaturaImagen}
            onError={() => setFallóImagen(true)}
          />
        ) : (
          <Package size={19} color={COLORES.marcador} strokeWidth={1.5} />
        )}
      </View>
      <Text style={estilos.nombreProducto} numberOfLines={2}>
        {item.name || t('Producto')}
      </Text>
      <Text style={estilos.cantidad}>×{item.amount}</Text>
      <Text style={estilos.precio}>
        ${(Number(item.price) * Number(item.amount)).toFixed(2)}
      </Text>
    </View>
  );
};

const fechaLarga = (iso, locale) => {
  try {
    return new Date(iso || Date.now()).toLocaleDateString(locale, {
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

const Confirmacion = ({ respuesta, alCerrar }) => {
  const { t, locale } = useIdioma();
  const { colores } = useTema();
  const COLORES = useColores();
  const estilos = useEstilos(crearEstilos);
  // Mismo caso que Carrito.js: sin esto "Volver a la tienda" queda debajo de
  // la franja de gestos de Android.
  const { bottom } = useSafeAreaInsets();
  const { vaciarTrasPedido, productos } = useTienda();
  // El mapa en grande: vive AQUÍ, en la pantalla entera, y no dentro de MapaSeguimiento.js — ver el
  // porqué en el comentario grande de ese archivo (un `position:absolute` ahí adentro quedaría
  // encajonado en `marcoMapa`, no cubriría la pantalla).
  const [mapaGrande, setMapaGrande] = useState(false);
  const imagenPorId = useMemo(
    () => new Map(productos.map((p) => [String(p.id), p.imagen])),
    [productos]
  );

  // Cerrar es lo único que se puede hacer desde aquí, así que el carrito se vacía justo aquí y no en
  // el checkout: mientras esta pantalla está abierta, el pedido todavía se está leyendo. El botón de
  // atrás de Android hace lo mismo.
  const cerrar = () => {
    vaciarTrasPedido();
    alCerrar();
  };

  useBotonAtras(cerrar);

  const pedido = respuesta?.order || {};
  const items = Array.isArray(pedido.items) ? pedido.items : [];
  const puntosGanados = Number(respuesta?.pointsEarned) || 0;
  const descuento = Number(respuesta?.discount) || 0;
  // Sin estas dos filas, Subtotal − Descuento no daba el Total de abajo: el
  // envío y la tarifa de servicio estaban dentro del total pero en ningún renglón.
  const envio = Number(pedido.shippingCost) || 0;
  const servicio = Number(pedido.serviceFee) || 0;

  // El pedido en sí (productos, subtotal, total, puntos) se queda como llegó de POST /order a
  // propósito — ver el comentario grande arriba de este archivo.
  const seguimiento = useSeguimientoEnVivo(pedido._id, !!pedido._id);
  const estado = seguimiento.estado || pedido.status;

  // Los pasos que le tocan a ESTE pedido: "En camino" solo si es a domicilio.
  const PASOS = pasosDe(pedido.deliveryType);
  const pasoActual = indiceDePaso(PASOS, estado);

  // El mapa: la dirección de entrega desde el principio (para que el cliente vea A DÓNDE se lo van a
  // llevar apenas paga), y el punto del repartidor solo cuando de verdad va en camino con señal
  // fresca. Mismo criterio que `SeguimientoConfirmacion.jsx` en la web.
  const esDomicilio = pedido.deliveryType === 'delivery';
  // Con el punto fresco del repartidor, o con la ruta aproximada desde la tienda.
  const enCamino = esDomicilio && (seguimiento.enVivo || seguimiento.estimado);
  const tieneDestino = esDomicilio && seguimiento.destino?.lat != null && seguimiento.destino?.lng != null;

  // Los últimos seis del id, en mayúsculas: el mismo número corto que enseña
  // "Mis pedidos", para que sean reconociblemente el mismo pedido.
  const numero = String(pedido._id || '').slice(-6).toUpperCase();

  return (
    <View style={estilos.pantalla}>
      <ScrollView contentContainerStyle={[estilos.cuerpo, { paddingTop: ALTURA_ESTADO + 24 }]}>
        {/* Como en la web: Tiqui saltando con confeti. */}
        <View style={estilos.festejo}>
          <Mascota pose="fiesta" alto={130} />
        </View>

        <Text style={estilos.titulo}>{t('Tu pedido está hecho')}</Text>
        {!!numero && <Text style={estilos.numero}>{t('Pedido #{numero}', { numero })}</Text>}
        <Text style={estilos.fecha}>{t('Recibido el {fecha}', { fecha: fechaLarga(pedido.createdAt, locale) })}</Text>

        {/* ── En qué va ── */}
        <View style={estilos.linea}>
          {PASOS.map((paso, i) => {
            // Inclusivo (<=), no exclusivo: el paso actual también cuenta como "hecho" aquí — esta fila no
            // distingue "en curso" de "completado" con un tercer color, a propósito, para que se lea igual de
            // simple que en la web (ver EstadoPedido.jsx).
            const hecho = i <= pasoActual;
            return (
              <View key={paso.id} style={estilos.paso}>
                <View style={estilos.pasoMarca}>
                  {/* La rayita va PRIMERO en el árbol para que el punto se pinte encima de ella y no al revés. */}
                  {i < PASOS.length - 1 && <View style={estilos.raya} />}
                  <View
                    style={[
                      estilos.punto,
                      hecho ? { backgroundColor: colores.marca } : estilos.puntoApagado,
                    ]}
                  />
                </View>
                <Text style={[estilos.pasoTexto, hecho && { color: colores.marcaTexto, fontWeight: '700' }]}>
                  {paso.label}
                </Text>
              </View>
            );
          })}
        </View>

        {tieneDestino && (
          <View style={estilos.marcoMapa}>
            <MapaSeguimiento
              // Ver el comentario del mismo `key` en BurbujaPedido.js: sin
              // esto la miniatura queda con una franja gris a medio pintar
              // al volver de ModalMapaSeguimiento.js.
              key={mapaGrande ? 'grande' : 'chica'}
              punto={enCamino ? seguimiento.punto : null}
              destino={seguimiento.destino}
              ruta={enCamino ? seguimiento.ruta : null}
              origen={enCamino ? seguimiento.origen : null}
              alto={180}
              colorMarca={colores.marca}
              alAgrandar={() => setMapaGrande(true)}
            />
            <View style={estilos.infoMapa}>
              {enCamino ? (
                <>
                  <Bike size={15} color={seguimiento.yaCasi ? COLORES.exitoTexto : COLORES.infoTexto} strokeWidth={2.4} />
                  <Text
                    style={[
                      estilos.infoMapaTexto,
                      { color: seguimiento.yaCasi ? COLORES.exitoTexto : COLORES.infoTexto },
                    ]}
                  >
                    {seguimiento.yaCasi ? t('Ya casi toca tu puerta') : seguimiento.espera}
                    {seguimiento.distancia ? t(' · a {distancia}', { distancia: seguimiento.distancia }) : ''}
                    {seguimiento.estimado ? ` · ${t('calculado desde la tienda')}` : ''}
                  </Text>
                </>
              ) : estado === 'entregado' ? (
                <>
                  <Check size={15} color={COLORES.textoSuave} strokeWidth={2.4} />
                  <Text style={estilos.infoMapaTexto}>{t('Entregado en tu dirección')}</Text>
                </>
              ) : (
                <Text style={estilos.infoMapaTexto}>
                  {t('Aquí te llevaremos tu pedido. En cuanto el repartidor salga, verás su punto moverse.')}
                </Text>
              )}
            </View>
          </View>
        )}

        <View style={estilos.bloqueCodigo}>
          <CodigoEntrega
            codigo={pedido.deliveryCode}
            deliveryType={pedido.deliveryType}
            estado={estado}
          />
        </View>

        {/* ── Qué llevaba ── */}
        <View style={estilos.tarjeta}>
          <Text style={estilos.tarjetaTitulo}>{t('Productos')}</Text>

          {items.map((item, i) => (
            // La clave es el índice porque las líneas del pedido no tienen id
            // propio (el esquema las guarda con `_id: false`).
            <FilaProducto key={i} item={item} imagen={imagenPorId.get(String(item.productId))} />
          ))}

          <View style={estilos.separador} />

          <Fila etiqueta={t('Subtotal')} valor={`$${Number(pedido.subtotal || 0).toFixed(2)}`} />
          {envio > 0 && <Fila etiqueta={t('Costo de envío')} valor={`$${envio.toFixed(2)}`} />}
          {servicio > 0 && <Fila etiqueta={t('Tarifa de servicio')} valor={`$${servicio.toFixed(2)}`} />}
          {descuento > 0 && (
            <Fila etiqueta={t('Descuento por puntos')} valor={`−$${descuento.toFixed(2)}`} verde />
          )}
          <View style={estilos.filaTotal}>
            <Text style={estilos.totalEtiqueta}>{t('Total')}</Text>
            <Text style={estilos.totalValor}>${Number(pedido.total || 0).toFixed(2)}</Text>
          </View>
        </View>

        {/* ── Cómo y dónde ── */}
        <View style={estilos.tarjeta}>
          <Fila
            etiqueta={t(pedido.deliveryType === 'delivery' ? 'Envío a domicilio' : 'Retiro en el local')}
            valor={t(
              pedido.paymentMethod === 'saldo'
                ? 'Pagado con saldo'
                : pedido.paymentMethod === 'tarjeta'
                  ? 'Paga con tarjeta'
                  : 'Paga en efectivo'
            )}
          />
          {!!pedido.deliveryAddress && (
            <Text style={estilos.direccion}>{pedido.deliveryAddress}</Text>
          )}
          {!!pedido.deliveryReference && (
            <Text style={estilos.referencia}>{pedido.deliveryReference}</Text>
          )}
          {/* Se dice DÓNDE se paga, no solo con qué. Es la pregunta que sigue —"¿entonces cuándo pago?"— y
             con la pasarela todavía sin conectar la respuesta importa: nadie va a cobrarle desde la app. */}
          {pedido.paymentMethod !== 'saldo' && (
            <Text style={estilos.aclaracion}>
              {pedido.deliveryType === 'delivery'
                ? t('Se paga al recibir el pedido.')
                : t('Se paga al pasar a traerlo.')}
            </Text>
          )}
        </View>

        {puntosGanados > 0 && (
          <View style={[estilos.puntos, { backgroundColor: colores.marcaTenue }]}>
            <Estrella size={15} color={colores.marca} />
            <Text style={[estilos.puntosTexto, { color: colores.marcaTexto }]}>
              {t(puntosGanados === 1 ? 'Ganó {n} punto con esta compra' : 'Ganó {n} puntos con esta compra', { n: puntosGanados })}
            </Text>
          </View>
        )}
      </ScrollView>

      <View style={[estilos.pie, { paddingBottom: Math.max(bottom + 10, 18) }]}>
        <Boton
          texto={t('Volver a la tienda')}
          alPresionar={cerrar}
          color={colores.marca}
          colorPresionado={colores.marcaOscuro}
        />
      </View>

      {mapaGrande && (
        <ModalMapaSeguimiento
          punto={enCamino ? seguimiento.punto : null}
          destino={seguimiento.destino}
          ruta={enCamino ? seguimiento.ruta : null}
          origen={enCamino ? seguimiento.origen : null}
          colorMarca={colores.marca}
          alCerrar={() => setMapaGrande(false)}
        />
      )}
    </View>
  );
};

const Fila = ({ etiqueta, valor, verde }) => {
  const estilos = useEstilos(crearEstilos);

  return (
    <View style={estilos.fila}>
      <Text style={estilos.filaEtiqueta}>{etiqueta}</Text>
      <Text style={[estilos.filaValor, verde && estilos.filaValorVerde]}>{valor}</Text>
    </View>
  );
};

const crearEstilos = (COLORES) => StyleSheet.create({
  pantalla: {
    flex: 1,
    backgroundColor: COLORES.fondo,
  },
  cuerpo: {
    ...contenidoCentrado,
    paddingHorizontal: 20,
    paddingBottom: 26,
    alignItems: 'center',
  },
  festejo: {
    alignItems: 'center',
    marginBottom: 12,
  },
  titulo: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORES.tituloFuerte,
    textAlign: 'center',
    letterSpacing: -0.4,
  },
  numero: {
    marginTop: 6,
    fontSize: 14.5,
    fontWeight: '700',
    color: COLORES.tituloVentaja,
  },
  fecha: {
    marginTop: 3,
    fontSize: 12.5,
    color: COLORES.textoTenue,
    textAlign: 'center',
  },
  linea: {
    flexDirection: 'row',
    alignSelf: 'stretch',
    marginTop: 24,
    marginBottom: 4,
  },
  bloqueCodigo: {
    alignSelf: 'stretch',
    marginTop: 20,
  },
  marcoMapa: {
    alignSelf: 'stretch',
    marginTop: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORES.lineaCard,
    overflow: 'hidden',
  },
  infoMapa: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: COLORES.papelGris,
  },
  infoMapaTexto: {
    flex: 1,
    fontSize: 12.5,
    fontWeight: '700',
    color: COLORES.textoSuave,
  },
  paso: {
    flex: 1,
    alignItems: 'center',
    gap: 7,
  },
  pasoMarca: {
    width: '100%',
    height: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  punto: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  puntoApagado: {
    backgroundColor: COLORES.borde,
  },
  // Va de la mitad de ESTE punto a la mitad del siguiente: empieza en el centro
  // (left: 50%) y mide un paso completo (width: 100%), así el otro extremo cae
  // justo en el centro del próximo paso, sin importar cuánto mida el texto.
  raya: {
    position: 'absolute',
    left: '50%',
    width: '100%',
    height: 2,
    backgroundColor: COLORES.linea,
  },
  pasoTexto: {
    fontSize: 12,
    color: COLORES.textoTenue,
    textAlign: 'center',
  },
  tarjeta: {
    alignSelf: 'stretch',
    marginTop: 20,
    borderWidth: 1,
    borderColor: COLORES.lineaCard,
    borderRadius: 14,
    padding: 15,
    gap: 9,
  },
  tarjetaTitulo: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORES.tituloFuerte,
  },
  filaProducto: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  miniatura: {
    width: 36,
    height: 36,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORES.papelGris,
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
  cantidad: {
    fontSize: 12.5,
    color: COLORES.textoTenue,
  },
  precio: {
    fontSize: 13.5,
    fontWeight: '600',
    color: COLORES.tituloVentaja,
    minWidth: 58,
    textAlign: 'right',
  },
  separador: {
    height: 1,
    backgroundColor: COLORES.lineaCard,
    marginVertical: 2,
  },
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  filaEtiqueta: {
    flexShrink: 1,
    fontSize: 13,
    color: COLORES.textoSuave,
  },
  filaValor: {
    fontSize: 13,
    color: COLORES.textoVentaja,
  },
  filaValorVerde: {
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
  aclaracion: {
    fontSize: 12,
    color: COLORES.textoSuave,
    fontStyle: 'italic',
  },
  puntos: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'stretch',
    marginTop: 14,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  puntosTexto: {
    flexShrink: 1,
    fontSize: 13,
    fontWeight: '600',
  },
  pie: {
    paddingHorizontal: 20,
    paddingTop: 12,
    // paddingBottom real se pone en línea, con la franja de gestos sumada.
    borderTopWidth: 1,
    borderTopColor: COLORES.linea,
  },
});

export default Confirmacion;

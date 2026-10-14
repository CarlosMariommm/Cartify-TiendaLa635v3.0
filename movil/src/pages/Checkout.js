/*
 * ============================================================
 * CHECKOUT — cómo lo recibe, con qué paga, y el pedido
 * ============================================================
 * La segunda vista de `frontend/src/components/Store/ShoppingCart.jsx`, la que
 * en el carrito de móvil faltaba entera: hasta ahora el carrito sumaba y ahí
 * se acababa.
 *
 * Trae las mismas cuatro decisiones que la web, en el mismo orden:
 *
 *   1. Retiro en el local o envío a domicilio (cobrado por distancia, y solo
 *      si es a domicilio; más allá de la zona de entrega no se acepta)
 *   2. A qué dirección — elegida de las guardadas, o escrita aquí mismo
 *   3. Efectivo, tarjeta o saldo
 *   4. Si usa sus puntos, que no son un método de pago sino un descuento
 *
 * ── Sobre la pasarela de pago ──
 *
 * No falta nada de Wompi aquí, porque la web tampoco lo usa: su propio
 * `handlePlaceOrder` dice "el cobro con pasarela todavía no se conecta", y el
 * modelo Order lo repite — efectivo y tarjeta "se cobran en el local o al
 * entregar". Así que "tarjeta" es la intención de pagar con tarjeta, no un
 * cobro: el dinero se toma en el mostrador o en la puerta. El único método que
 * mueve dinero de verdad es "saldo", y ese lo descuenta el backend de un saldo
 * que ya estaba cargado con una tarjeta de regalo — no hay pasarela de por
 * medio.
 *
 * ── El total que se ve no es el que se cobra ──
 *
 * Bueno, sí, pero no es el que se manda. Aquí se calcula para enseñárselo al
 * cliente; al servidor solo le viajan los productos, sus precios y cuántos
 * puntos quiere canjear, y él vuelve a sumar. Es a propósito: un total que sale
 * del teléfono es un total que se puede editar por el camino. Si las dos cuentas
 * discreparan, manda la del servidor — y esta pantalla usa las MISMAS funciones
 * (`totalDeLinea`) que el carrito, para que no discrepen. Por eso mismo el
 * envío y la tarifa de servicio salen de copias de las cuentas del servidor
 * (utils/envio.js y utils/servicio.js) con los ajustes de la tienda, y no de
 * un número escrito aquí.
 * ============================================================
 */

import { useCallback, useEffect, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { CargandoMascota } from '../components/Tiqui/Mascota';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Check, Clock, CreditCard, Gift, MapPin, Package, Store as Tienda, TriangleAlert, Wallet } from 'lucide-react-native';
import { useColores, useEstilos } from '../context/ModoContext';
import { ALTURA_ESTADO, contenidoCentrado } from '../theme/pantalla';
import { useAuth } from '../hooks/useAuth';
import { useTema } from '../context/TemaContext';
import { useTienda } from '../context/TiendaContext';
import { useAviso } from '../context/AvisoContext';
import { usePedidoActivoCtx } from '../context/PedidoActivoContext';
import { getCliente, actualizarDirecciones } from '../api/clienteApi';
import { getSaldo, canjearTarjeta } from '../api/giftCardApi';
import { getResumenPuntos, getConfigFidelidad } from '../api/fidelidadApi';
import { crearPedido, getTiempoPorZona } from '../api/pedidosApi';
import { getAjustes } from '../api/ajustesApi';
import Boton from '../components/UI/Boton';
import { ChevronIzquierda, Paquete } from '../components/UI/Iconos';
import ModalMapaDireccion from '../components/UI/ModalMapaDireccion';
import { totalDeLinea } from '../utils/catalogo';
import { calcularEnvio } from '../utils/envio';
import { calcularServicio } from '../utils/servicio';
import { useIdioma } from '../context/IdiomaContext';
import { foto, ANCHO } from '../utils/fotos';
import { formatoCodigoTarjeta, LARGO_CODIGO_TARJETA } from '../utils/tarjetaRegalo';

// Cuántas fotos de producto caben en la tira del resumen antes del "+3".
const MINIATURAS = 6;

/*
 * Una opción de las que se eligen tocando: los dos modos de entrega y los tres
 * de pago. En la web son botones que caben de dos en dos a lo ancho; aquí van
 * en renglones completos, que es donde el pulgar no falla, con el visto a la
 * derecha en vez del relleno de color.
 */
const Opcion = ({ icono: Icono, titulo, detalle, activa, apagada, alTocar, colores }) => {
  const COLORES = useColores();
  const estilos = useEstilos(crearEstilos);

  return (
    <Pressable
      onPress={alTocar}
      disabled={apagada}
      accessibilityRole="radio"
      accessibilityState={{ selected: activa, disabled: !!apagada }}
      accessibilityLabel={`${titulo}. ${detalle}`}
      style={({ pressed }) => [
        estilos.opcion,
        activa && { borderColor: colores.marca, backgroundColor: colores.marcaTenue },
        pressed && !apagada && { backgroundColor: colores.marcaSuave },
        apagada && estilos.opcionApagada,
      ]}
    >
      <Icono size={18} color={activa ? colores.marca : COLORES.textoSuave} strokeWidth={2} />
      <View style={estilos.opcionTextos}>
        <Text style={[estilos.opcionTitulo, activa && { color: colores.marcaTexto }]}>{titulo}</Text>
        <Text style={estilos.opcionDetalle}>{detalle}</Text>
      </View>
      {activa && (
        <View style={[estilos.visto, { backgroundColor: colores.marca }]}>
          <Check size={11} color="#FFFFFF" strokeWidth={3} />
        </View>
      )}
    </Pressable>
  );
};

const Seccion = ({ icono: Icono, titulo, colores, children }) => {
  const estilos = useEstilos(crearEstilos);

  return (
    <View style={estilos.seccion}>
      <View style={estilos.seccionCabecera}>
        <View style={[estilos.cuadroIcono, { backgroundColor: colores.marcaSuave }]}>
          <Icono size={17} color={colores.marca} strokeWidth={2} />
        </View>
        <Text style={estilos.seccionTitulo}>{titulo}</Text>
      </View>
      {children}
    </View>
  );
};

const Checkout = ({ alVolver, alConfirmar }) => {
  const { t } = useIdioma();
  const { user } = useAuth();
  const { colores } = useTema();
  const { avisar } = useAviso();
  const { carrito, totalCarrito } = useTienda();
  const COLORES = useColores();
  const estilos = useEstilos(crearEstilos);
  const { refrescar: refrescarPedidoActivo } = usePedidoActivoCtx();
  const { bottom } = useSafeAreaInsets();

  // Los pedidos van a nombre de un CLIENTE. El personal entra por la misma
  // puerta, y el backend rechaza un pedido con un id que no es de la tabla de
  // clientes — mejor no dejar llegar hasta ahí.
  const esCliente = user?.type === 'client' && !!user?.id;

  const [cargando, setCargando] = useState(true);
  const [procesando, setProcesando] = useState(false);
  /*
   * Qué miniaturas de "Tu orden" fallaron al cargar (por id de producto).
   * Sin esto, un WebP/AVIF que expo-image no decodifica —el mismo problema
   * que Carrito.js y TarjetaProducto.js ya cubren con su propio
   * `fallóImagen`— se quedaba en blanco para siempre en vez de caer al
   * icono de repuesto.
   */
  const [fallosImagen, setFallosImagen] = useState({});

  // ── Cómo lo recibe ──
  const [entrega, setEntrega] = useState('retiro');
  const [direcciones, setDirecciones] = useState([]);
  const [indiceDireccion, setIndiceDireccion] = useState(0);
  const [mostrarMapa, setMostrarMapa] = useState(false);
  const [guardandoDireccion, setGuardandoDireccion] = useState(false);
  const [zona, setZona] = useState(null);

  // ── Con qué paga ──
  const [metodoPago, setMetodoPago] = useState('efectivo');
  const [saldo, setSaldo] = useState(0);
  const [codigoTarjeta, setCodigoTarjeta] = useState('');
  const [canjeando, setCanjeando] = useState(false);

  // ── Puntos ──
  const [puntos, setPuntos] = useState(0);
  const [configPuntos, setConfigPuntos] = useState(null);
  const [usarPuntos, setUsarPuntos] = useState(false);

  // ── Tarifas de la tienda (envío y servicio) ──
  // null = no se pudieron consultar. Ver "Las cuentas", más abajo.
  const [ajustes, setAjustes] = useState(null);

  const direccionElegida = direcciones[indiceDireccion] || null;

  /*
   * Las cinco cosas que hay que saber para pagar, en paralelo: sus direcciones,
   * su saldo, sus puntos, la configuración del programa y las tarifas de la
   * tienda. En serie serían cinco viajes seguidos y la pantalla se iría
   * acomodando sola a pedazos mientras el cliente ya está decidiendo.
   *
   * Las tarifas se piden aquí y no se reusan las que trajo la app al abrir:
   * si el dueño cambió el precio por km hace un rato, el número de esta
   * pantalla tiene que ser el que va a cobrar el servidor ahora.
   */
  useEffect(() => {
    if (!esCliente) {
      setCargando(false);
      return;
    }

    let vivo = true;

    (async () => {
      /*
       * Cada una con su propio catch. Con un solo try envolviendo el
       * Promise.all, que fallara la consulta del saldo —la más prescindible de
       * las cuatro— dejaba la pantalla sin direcciones y sin poder pedir nada.
       */
      const [cliente, saldoRes, resumen, config, tarifas] = await Promise.all([
        getCliente(user.id).catch(() => null),
        getSaldo(user.id).catch(() => null),
        getResumenPuntos(user.id).catch(() => null),
        getConfigFidelidad().catch(() => null),
        getAjustes().catch(() => null),
      ]);

      if (!vivo) return;

      const lista = Array.isArray(cliente?.clientAddress) ? cliente.clientAddress : [];
      setDirecciones(lista.map(normalizarDireccion));
      setSaldo(Number(saldoRes?.balance) || 0);
      setPuntos(Number(resumen?.available) || 0);
      setConfigPuntos(config);
      setAjustes(tarifas);
      setCargando(false);
    })();

    return () => {
      vivo = false;
    };
  }, [esCliente, user?.id]);

  /*
   * Cuánto se tarda en llegar a SU zona. Solo se pregunta cuando hay punto en
   * el mapa: las direcciones viejas se guardaron como texto suelto y no tienen
   * coordenadas que consultar.
   */
  useEffect(() => {
    const { lat, lng } = direccionElegida || {};
    if (entrega !== 'delivery' || lat == null || lng == null) {
      setZona(null);
      return;
    }

    let vivo = true;
    getTiempoPorZona(lat, lng)
      .then((r) => vivo && setZona(r))
      // Que falle no dice nada: la pantalla se calla, que es mejor que quedarse
      // esperando para siempre o inventar un tiempo.
      .catch(() => vivo && setZona(null));

    return () => {
      vivo = false;
    };
  }, [entrega, direccionElegida?.lat, direccionElegida?.lng]);

  // ── Las cuentas ──
  /*
   * El envío se cobra por DISTANCIA desde la tienda hasta el punto de la
   * dirección elegida (zona → por km → solo la base), con la misma cuenta que
   * hace el servidor. Antes aquí había $4.78 fijos: a quien vive a la vuelta se
   * le enseñaba de más y a quien vive lejos de menos, y el total del pedido
   * confirmado no era el de esta pantalla.
   *
   * Sin ajustes (la consulta falló) no se sabe cuánto es, y un número de relleno
   * sería justo el problema que se está quitando: se dice que se calcula al
   * confirmar, que es cuando lo pone el servidor.
   */
  const envioCalc = ajustes
    ? calcularEnvio(ajustes, { lat: direccionElegida?.lat, lng: direccionElegida?.lng })
    : null;
  // Muy lejos de la tienda no se entrega: el servidor rechaza el pedido a
  // domicilio (ver RADIO_MAXIMO_KM en utils/envio.js), así que ni se intenta.
  const fueraDeCobertura = entrega === 'delivery' && !!envioCalc?.fueraDeCobertura;
  // Fuera de cobertura no se suma: sería el precio de un envío que no va a
  // existir (desde el GPS de fábrica del emulador, miles de dólares).
  const envio = carrito.length > 0 && entrega === 'delivery' && envioCalc && !fueraDeCobertura
    ? envioCalc.costo
    : 0;
  const subtotal = totalCarrito;
  // La fija el panel (apagada, fija o % del subtotal) y va a domicilio y a retiro.
  const servicio = carrito.length > 0 && ajustes ? calcularServicio(ajustes, subtotal) : 0;
  const totalConCargos = subtotal + envio + servicio;

  const tasaCanje = configPuntos?.pointsPerDollarRedeem ?? 100;
  const minimoCanje = configPuntos?.minRedeemPoints ?? 100;
  const puedeCanjear = puntos >= minimoCanje;
  // No se canjea más de lo que valen los productos: los puntos no pagan el envío.
  const topeUtil = Math.floor(subtotal * tasaCanje);
  const puntosAUsar = usarPuntos && puedeCanjear ? Math.min(puntos, topeUtil) : 0;
  const descuento = Number((puntosAUsar / tasaCanje).toFixed(2));
  const totalAPagar = Math.max(0, Number((totalConCargos - descuento).toFixed(2)));

  const saldoAlcanza = saldo >= totalAPagar;

  /*
   * Si el saldo deja de alcanzar —porque sumó un producto, o porque marcó los
   * puntos y el total bajó y volvió a subir— el método vuelve a efectivo. Sin
   * esto se podía quedar seleccionado "Mi saldo" con el botón deshabilitado
   * debajo, y el pedido fallaba al final con un error del servidor.
   */
  useEffect(() => {
    if (metodoPago === 'saldo' && !saldoAlcanza) setMetodoPago('efectivo');
  }, [metodoPago, saldoAlcanza]);

  const guardarDireccion = async (nueva) => {
    const lista = [...direcciones, nueva];
    setGuardandoDireccion(true);
    try {
      await actualizarDirecciones(user.id, lista);
      setDirecciones(lista);
      // Se deja elegida la que acaba de escribir: agregarla y que el pedido
      // siguiera saliendo a la anterior es justo el error que se quiere evitar.
      setIndiceDireccion(lista.length - 1);
      setMostrarMapa(false);
      avisar(t('Dirección guardada'), 'exito');
    } catch (e) {
      avisar(e?.message || t('No se pudo guardar la dirección'), 'error');
    } finally {
      setGuardandoDireccion(false);
    }
  };

  /*
   * Canjear la tarjeta sin salir de aquí: si tuviera que irse a otra pantalla a
   * canjearla, pierde el carrito de vista y muchos no vuelven. Si el saldo
   * queda alcanzando, se selecciona solo como método.
   */
  const canjear = async () => {
    const limpio = codigoTarjeta.trim().toUpperCase();
    if (!limpio) return;

    setCanjeando(true);
    try {
      const r = await canjearTarjeta(limpio, user.id);
      const nuevoSaldo = Number(r?.balance) || 0;
      setSaldo(nuevoSaldo);
      setCodigoTarjeta('');
      if (nuevoSaldo >= totalAPagar) setMetodoPago('saldo');
      avisar(r?.message || t('Tarjeta canjeada'), 'exito');
    } catch (e) {
      avisar(e?.message || t('No se pudo canjear la tarjeta'), 'error');
    } finally {
      setCanjeando(false);
    }
  };

  const realizarPedido = async () => {
    if (entrega === 'delivery' && !direccionElegida) {
      avisar(t('Elige una dirección de entrega'), 'error');
      return;
    }
    // El botón ya está apagado en este caso; esto es por si se cuela un toque.
    if (fueraDeCobertura) {
      avisar(t('Esa dirección queda fuera de la zona de entrega. Elige otra o el retiro en el local.'), 'error');
      return;
    }
    if (metodoPago === 'saldo' && !saldoAlcanza) {
      avisar(t('Tu saldo es de ${saldo} y el pedido cuesta ${total}', { saldo: saldo.toFixed(2), total: totalAPagar.toFixed(2) }), 'error');
      return;
    }

    setProcesando(true);
    try {
      const respuesta = await crearPedido({
        clientId: user.id,
        items: carrito.map((i) => ({
          productId: i.id,
          name: i.nombre,
          /*
           * El precio POR UNIDAD que de verdad se paga. En un 2x1 el cliente se
           * lleva dos y paga una, así que el precio de lista multiplicado por la
           * cantidad daría de más — y el servidor, que suma precio × cantidad,
           * cobraría un total distinto del que dice esta pantalla. Se reparte el
           * total de la línea (el mismo `totalDeLinea` del carrito) entre las
           * unidades que se lleva.
           */
          price: Number((totalDeLinea(i) / i.cantidad).toFixed(4)),
          amount: i.cantidad,
        })),
        paymentMethod: metodoPago,
        deliveryType: entrega,
        // Con el texto van la referencia y el punto: con las coordenadas, el
        // repartidor llega al portón y no a media cuadra.
        deliveryAddress: entrega === 'delivery' ? direccionElegida.direccion : undefined,
        deliveryReference: entrega === 'delivery' ? direccionElegida.referencia : undefined,
        deliveryLat: entrega === 'delivery' ? direccionElegida.lat : undefined,
        deliveryLng: entrega === 'delivery' ? direccionElegida.lng : undefined,
        channel: 'web',
        pointsToRedeem: puntosAUsar,
      });

      // El carrito NO se vacía aquí: lo hace la pantalla de confirmación al
      // cerrarse. Vaciarlo ahora dejaría el resumen del pedido recién hecho
      // pintándose sobre una lista que se acaba de quedar vacía.
      alConfirmar(respuesta);
      // La burbuja de seguimiento cargó los pedidos UNA vez al abrir la app;
      // sin este aviso no se enteraría de que hay uno nuevo hasta reabrirla.
      refrescarPedidoActivo();
    } catch (e) {
      /*
       * Aquí caen los mensajes que valen: "Solo quedan 3 de Leche", "Saldo
       * insuficiente", "se acaba de agotar". El backend los escribe en español
       * y con el nombre del producto, así que se muestran tal cual.
       */
      avisar(e?.message || t('No se pudo crear el pedido'), 'error');
    } finally {
      setProcesando(false);
    }
  };

  // ── Sin cuenta de cliente no hay pedido ──
  if (!esCliente) {
    return (
      <View style={estilos.pantalla}>
        <Barra alVolver={alVolver} colores={colores} />
        <View style={estilos.centro}>
          <Text style={estilos.avisoTitulo}>{t('Necesitas una cuenta de cliente')}</Text>
          <Text style={estilos.avisoTexto}>
            {t('El pedido tiene que ir a nombre de alguien y a una dirección. Entra con tu cuenta de cliente para terminarlo.')}
          </Text>
        </View>
      </View>
    );
  }

  if (cargando) {
    return (
      <View style={estilos.pantalla}>
        <Barra alVolver={alVolver} colores={colores} />
        <View style={estilos.centro}>
          <CargandoMascota texto={t('Preparando el pago…')} />
        </View>
      </View>
    );
  }

  return (
    <View style={estilos.pantalla}>
      <Barra alVolver={alVolver} colores={colores} />

      <ScrollView contentContainerStyle={estilos.cuerpo} keyboardShouldPersistTaps="handled">
        {/* ── 1. Cómo lo recibe ── */}
        <Seccion icono={MapPin} titulo={t('¿Cómo lo recibes?')} colores={colores}>
          <Opcion
            icono={Tienda}
            titulo={t('Retiro en el local')}
            detalle={t('Sin costo de envío')}
            activa={entrega === 'retiro'}
            alTocar={() => setEntrega('retiro')}
            colores={colores}
          />
          <Opcion
            icono={MapPin}
            titulo={t('Envío a domicilio')}
            detalle={detalleEnvio(envioCalc, t)}
            activa={entrega === 'delivery'}
            alTocar={() => setEntrega('delivery')}
            colores={colores}
          />

          {entrega === 'delivery' && (
            <>
              {/* Lo mismo que contestaría el servidor al confirmar, pero dicho
                  antes, cuando todavía puede cambiar de dirección o de modo. */}
              {fueraDeCobertura && (
                <View style={estilos.fueraDeZona} accessibilityRole="alert">
                  <TriangleAlert size={15} color={COLORES.peligro} strokeWidth={2.2} />
                  <Text style={estilos.fueraDeZonaTexto}>
                    {t('Esa dirección queda a {km} km de la tienda, fuera de la zona de entrega. Elige otra dirección o el retiro en el local.', { km: envioCalc.distanciaKm })}
                  </Text>
                </View>
              )}

              {/* El tiempo REAL a su zona. Va aquí porque este es el momento en
                  que la persona se pregunta "¿y en cuánto me llega?". Fuera de
                  la zona se calla: no hay entrega de la que dar un tiempo. */}
              {zona?.hayDatos && !fueraDeCobertura && (
                <View style={estilos.tiempo}>
                  <Clock size={15} color={COLORES.exitoTexto} strokeWidth={2} />
                  <View style={estilos.tiempoTextos}>
                    <Text style={estilos.tiempoTitulo}>
                      {zona.tipico === zona.holgado
                        ? t('Llega en unos {min} min', { min: zona.tipico })
                        : t('Llega entre {desde} y {hasta} min', { desde: zona.tipico, hasta: zona.holgado })}
                    </Text>
                    <Text style={estilos.tiempoSub}>
                      {t(zona.entregas === 1 ? 'Según {n} entrega a tu zona. No es una promesa: es lo que hemos tardado.' : 'Según {n} entregas a tu zona. No es una promesa: es lo que hemos tardado.', { n: zona.entregas })}
                    </Text>
                  </View>
                </View>
              )}

              {direcciones.map((dir, i) => {
                const elegida = indiceDireccion === i;
                return (
                  <Pressable
                    key={i}
                    onPress={() => setIndiceDireccion(i)}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: elegida }}
                    style={({ pressed }) => [
                      estilos.direccion,
                      elegida && { borderColor: colores.marca, backgroundColor: colores.marcaTenue },
                      pressed && { backgroundColor: colores.marcaSuave },
                    ]}
                  >
                    <MapPin
                      size={15}
                      color={elegida ? colores.marca : COLORES.marcador}
                      strokeWidth={2}
                    />
                    <View style={estilos.direccionTextos}>
                      {!!dir.nombre && <Text style={estilos.direccionNombre}>{dir.nombre}</Text>}
                      <Text style={estilos.direccionTexto}>{dir.direccion}</Text>
                      {!!dir.referencia && (
                        <Text style={estilos.direccionReferencia}>{dir.referencia}</Text>
                      )}
                    </View>
                  </Pressable>
                );
              })}

              <Pressable accessibilityRole="button" onPress={() => setMostrarMapa(true)} hitSlop={8}>
                <Text style={[estilos.enlace, { color: colores.marcaTexto }]}>
                  {direcciones.length === 0
                    ? t('+ Marcar mi dirección en el mapa')
                    : t('+ Agregar otra dirección')}
                </Text>
              </Pressable>
            </>
          )}
        </Seccion>

        {/* ── 2. Con qué paga ── */}
        <Seccion icono={CreditCard} titulo={t('¿Con qué paga?')} colores={colores}>
          <Opcion
            icono={Wallet}
            titulo={t('Efectivo')}
            detalle={t(entrega === 'delivery' ? 'Al recibirlo' : 'En el local')}
            activa={metodoPago === 'efectivo'}
            alTocar={() => setMetodoPago('efectivo')}
            colores={colores}
          />
          <Opcion
            icono={CreditCard}
            titulo={t('Tarjeta')}
            detalle={t(entrega === 'delivery' ? 'Al recibirlo' : 'En el local')}
            activa={metodoPago === 'tarjeta'}
            alTocar={() => setMetodoPago('tarjeta')}
            colores={colores}
          />
          <Opcion
            icono={Gift}
            titulo={t('Mi saldo')}
            detalle={`$${saldo.toFixed(2)} ${t(saldoAlcanza ? 'disponible' : '· no alcanza')}`}
            activa={metodoPago === 'saldo'}
            apagada={!saldoAlcanza}
            alTocar={() => setMetodoPago('saldo')}
            colores={colores}
          />

          {metodoPago === 'saldo' && (
            <Text style={[estilos.nota, { color: colores.marcaTexto }]}>
              {t('Te quedarán ${monto} después de este pedido.', { monto: (saldo - totalAPagar).toFixed(2) })}
            </Text>
          )}

          {/* Los puntos no son un método aparte sino un descuento: se restan del
              total y el resto se paga con lo de arriba. */}
          {puedeCanjear && (
            <Pressable
              onPress={() => setUsarPuntos((v) => !v)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: usarPuntos }}
              accessibilityLabel={t('Usar mis {n} puntos', { n: puntos })}
              style={({ pressed }) => [
                estilos.puntos,
                usarPuntos && { borderColor: colores.marca, backgroundColor: colores.marcaTenue },
                pressed && { backgroundColor: colores.marcaSuave },
              ]}
            >
              <View
                style={[
                  estilos.casilla,
                  usarPuntos && { backgroundColor: colores.marca, borderColor: colores.marca },
                ]}
              >
                {usarPuntos && <Check size={11} color="#FFFFFF" strokeWidth={3} />}
              </View>
              <View style={estilos.opcionTextos}>
                <Text style={[estilos.opcionTitulo, usarPuntos && { color: colores.marcaTexto }]}>
                  {t('Usar mis {n} puntos', { n: puntos })}
                </Text>
                <Text style={estilos.opcionDetalle}>
                  {usarPuntos
                    ? t('Descuenta ${monto} de este pedido', { monto: descuento.toFixed(2) })
                    : t('Equivalen a ${monto} en esta compra', { monto: (Math.min(puntos, topeUtil) / tasaCanje).toFixed(2) })}
                </Text>
              </View>
            </Pressable>
          )}

          {/* Canjear una tarjeta de regalo sin salir del checkout */}
          <View style={estilos.filaCanje}>
            <TextInput
              value={codigoTarjeta}
              // Los guiones se ponen solos (ver utils/tarjetaRegalo.js).
              onChangeText={(v) => setCodigoTarjeta(formatoCodigoTarjeta(v))}
              maxLength={LARGO_CODIGO_TARJETA}
              placeholder={t('¿Tienes una tarjeta? 635-XXXX-XXXX')}
              placeholderTextColor={COLORES.marcador}
              keyboardAppearance={COLORES.oscuro ? 'dark' : 'light'}
              style={[estilos.campo, estilos.campoCanje]}
              autoCapitalize="characters"
              autoCorrect={false}
              accessibilityLabel={t('Código de tarjeta de regalo')}
            />
            <Pressable accessibilityRole="button"
              onPress={canjear}
              disabled={canjeando || !codigoTarjeta.trim()}
              style={({ pressed }) => [
                estilos.botonCanje,
                { borderColor: colores.marca },
                pressed && { backgroundColor: colores.marcaSuave },
                (canjeando || !codigoTarjeta.trim()) && estilos.botonCanjeApagado,
              ]}
            >
              <Text style={[estilos.botonCanjeTexto, { color: colores.marcaTexto }]}>
                {canjeando ? t('Canjeando…') : t('Canjear')}
              </Text>
            </Pressable>
          </View>
        </Seccion>

        {/* ── 3. Qué lleva ── */}
        {/* El mismo Package de lucide que la píldora usa para "Pedidos": es
            la orden que se está por hacer, así que lleva el mismo icono que
            la sección donde va a vivir después de confirmada. */}
        <Seccion icono={Package} titulo={t('Tu orden')} colores={colores}>
          <View style={estilos.miniaturas}>
            {carrito.slice(0, MINIATURAS).map((item) => (
              <View key={item.id} style={estilos.miniatura}>
                {item.imagen && !fallosImagen[item.id] ? (
                  <Image
                    source={{ uri: foto(item.imagen, ANCHO.miniatura) }}
                    contentFit="contain"
                    style={estilos.miniaturaImagen}
                    onError={() => setFallosImagen((f) => ({ ...f, [item.id]: true }))}
                  />
                ) : (
                  <Paquete size={22} />
                )}
              </View>
            ))}
            {carrito.length > MINIATURAS && (
              <View style={estilos.miniaturaMas}>
                <Text style={estilos.miniaturaMasTexto}>+{carrito.length - MINIATURAS}</Text>
              </View>
            )}
          </View>
        </Seccion>
      </ScrollView>

      {/*
        El resumen y el botón viven FUERA del scroll: son el número por el que
        se abrió esta pantalla y la acción que la cierra. Al final de una
        columna larga habría que desplazarse hasta abajo cada vez que se cambia
        una opción para ver cuánto quedó.
      */}
      <View style={[estilos.pie, { paddingBottom: Math.max(bottom + 10, 18) }]}>
        <Fila etiqueta={t('Total de artículos')} valor={`$${subtotal.toFixed(2)}`} />
        <Fila etiqueta={t('Costo de envío')} valor={valorEnvio(entrega, envioCalc, envio, t)} />
        {/* La tarifa de servicio solo se muestra si la tienda la cobra. */}
        {servicio > 0 && (
          <Fila etiqueta={t('Tarifa de servicio')} valor={`$${servicio.toFixed(2)}`} />
        )}
        {descuento > 0 && (
          <Fila etiqueta={t('Descuento por puntos')} valor={`−$${descuento.toFixed(2)}`} verde />
        )}
        <View style={estilos.separador} />
        <View style={estilos.filaTotal}>
          <Text style={estilos.totalEtiqueta}>{t('Total')}</Text>
          <Text style={estilos.totalValor}>${totalAPagar.toFixed(2)}</Text>
        </View>

        <Boton
          texto={t('Realizar pedido · ${total}', { total: totalAPagar.toFixed(2) })}
          alPresionar={realizarPedido}
          cargando={procesando}
          deshabilitado={carrito.length === 0 || fueraDeCobertura}
          color={colores.marca}
          colorPresionado={colores.marcaOscuro}
          estilo={estilos.botonPedido}
        />
      </View>

      {mostrarMapa && (
        <ModalMapaDireccion
          alCerrar={() => setMostrarMapa(false)}
          alGuardar={guardarDireccion}
          guardando={guardandoDireccion}
        />
      )}
    </View>
  );
};

const Barra = ({ alVolver, colores }) => {
  const { t } = useIdioma();
  const estilos = useEstilos(crearEstilos);

  return (
    <View style={[estilos.barra, { paddingTop: ALTURA_ESTADO + 10 }]}>
      <Pressable
        onPress={alVolver}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel={t('Volver al carrito')}
        style={({ pressed }) => [estilos.botonVolver, pressed && { backgroundColor: colores.marcaSuave }]}
      >
        <ChevronIzquierda size={18} />
      </Pressable>
      <Text style={estilos.tituloBarra}>{t('Confirmar pedido')}</Text>
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

/*
 * El renglón de debajo de "Envío a domicilio": cuánto sale a la dirección
 * elegida y de dónde sale ("a 3.2 km", o el nombre de la zona), para que el
 * número no parezca puesto al azar ahora que cambia de una dirección a otra.
 */
const detalleEnvio = (calc, t) => {
  if (!calc) return t('El costo se calcula al confirmar');
  if (calc.fueraDeCobertura) return t('La dirección elegida queda fuera de la zona');
  const costo = t('+${costo} de envío', { costo: calc.costo.toFixed(2) });
  if (calc.metodo === 'km') return t('{costo} · a {km} km', { costo, km: calc.distanciaKm });
  if (calc.metodo === 'zona' && calc.zona) return `${costo} · ${calc.zona}`;
  return costo;
};

// El "Costo de envío" del resumen: un número solo cuando se sabe y se cobra.
const valorEnvio = (entrega, calc, envio, t) => {
  if (entrega === 'delivery' && !calc) return t('Al confirmar');
  if (entrega === 'delivery' && calc.fueraDeCobertura) return t('Fuera de zona');
  return `$${envio.toFixed(2)}`;
};

/*
 * Las direcciones viejas son texto suelto y las nuevas un objeto. Se normaliza
 * al leer, igual que en la web y que en la pantalla de Direcciones.
 */
const normalizarDireccion = (item) =>
  typeof item === 'string'
    ? { nombre: '', direccion: item, referencia: '', lat: null, lng: null }
    : {
        nombre: item?.nombre || '',
        direccion: item?.direccion || '',
        referencia: item?.referencia || '',
        lat: item?.lat ?? null,
        lng: item?.lng ?? null,
      };

const crearEstilos = (COLORES) => StyleSheet.create({
  pantalla: {
    flex: 1,
    backgroundColor: COLORES.fondo,
  },
  barra: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORES.linea,
  },
  botonVolver: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tituloBarra: {
    fontSize: 19,
    fontWeight: '800',
    color: COLORES.tituloFuerte,
    letterSpacing: -0.3,
  },
  centro: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 8,
  },
  avisoTitulo: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORES.tituloFuerte,
  },
  avisoTexto: {
    fontSize: 14,
    lineHeight: 21,
    color: COLORES.textoSuave,
    textAlign: 'center',
  },
  cuerpo: {
    ...contenidoCentrado,
    padding: 16,
    paddingBottom: 24,
  },
  seccion: {
    marginBottom: 22,
    gap: 9,
  },
  seccionCabecera: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    marginBottom: 3,
  },
  cuadroIcono: {
    width: 34,
    height: 34,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  seccionTitulo: {
    fontSize: 15.5,
    fontWeight: '700',
    color: COLORES.tituloFuerte,
  },
  opcion: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1.5,
    borderColor: COLORES.lineaCard,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  opcionApagada: {
    opacity: 0.45,
  },
  opcionTextos: {
    flex: 1,
    gap: 1,
  },
  opcionTitulo: {
    fontSize: 14.5,
    fontWeight: '600',
    color: COLORES.tituloVentaja,
  },
  opcionDetalle: {
    fontSize: 12,
    color: COLORES.textoSuave,
  },
  visto: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Sin recuadro: el icono y el rojo ya lo separan del resto.
  fueraDeZona: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    paddingVertical: 2,
  },
  fueraDeZonaTexto: {
    flex: 1,
    fontSize: 12.5,
    lineHeight: 18,
    fontWeight: '600',
    color: COLORES.peligro,
  },
  tiempo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 11,
    backgroundColor: COLORES.exitoFondo,
    borderWidth: 1,
    borderColor: COLORES.exitoBorde,
  },
  tiempoTextos: {
    flex: 1,
    gap: 2,
  },
  tiempoTitulo: {
    fontSize: 12.5,
    fontWeight: '700',
    color: COLORES.exitoTexto,
  },
  tiempoSub: {
    fontSize: 11,
    lineHeight: 16,
    color: COLORES.exitoSuave,
  },
  direccion: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    borderWidth: 1.5,
    borderColor: COLORES.lineaCard,
    borderRadius: 12,
    paddingHorizontal: 13,
    paddingVertical: 11,
  },
  direccionTextos: {
    flex: 1,
    gap: 1,
  },
  direccionNombre: {
    fontSize: 13.5,
    fontWeight: '700',
    color: COLORES.tituloVentaja,
  },
  direccionTexto: {
    fontSize: 12.5,
    lineHeight: 18,
    color: COLORES.textoSuave,
  },
  direccionReferencia: {
    fontSize: 11,
    color: COLORES.textoTenue,
  },
  campo: {
    borderWidth: 1,
    borderColor: COLORES.borde,
    borderRadius: 10,
    paddingHorizontal: 13,
    height: 44,
    fontSize: 13.5,
    color: COLORES.texto,
    backgroundColor: COLORES.fondo,
    // Android le mete relleno propio a los TextInput y descuadra el alto.
    paddingVertical: 0,
  },
  enlace: {
    fontSize: 13,
    fontWeight: '700',
    paddingVertical: 4,
  },
  nota: {
    fontSize: 12.5,
    fontWeight: '500',
  },
  puntos: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1.5,
    borderColor: COLORES.lineaCard,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  casilla: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: COLORES.borde,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filaCanje: {
    flexDirection: 'row',
    gap: 8,
  },
  campoCanje: {
    flex: 1,
    letterSpacing: 0.5,
  },
  botonCanje: {
    justifyContent: 'center',
    paddingHorizontal: 18,
    height: 44,
    borderWidth: 1.5,
    borderRadius: 10,
  },
  botonCanjeApagado: {
    opacity: 0.45,
  },
  botonCanjeTexto: {
    fontSize: 13.5,
    fontWeight: '600',
  },
  miniaturas: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  miniatura: {
    width: 54,
    height: 54,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORES.lineaCard,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  miniaturaImagen: {
    width: '82%',
    height: '82%',
  },
  miniaturaMas: {
    width: 54,
    height: 54,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORES.papelGris,
  },
  miniaturaMasTexto: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORES.textoSuave,
  },
  pie: {
    paddingHorizontal: 16,
    paddingTop: 14,
    // paddingBottom real se pone en línea, con la franja de gestos sumada.
    borderTopWidth: 1,
    borderTopColor: COLORES.linea,
    backgroundColor: COLORES.fondo,
    gap: 6,
  },
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  filaEtiqueta: {
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
  separador: {
    height: 1,
    backgroundColor: COLORES.linea,
    marginVertical: 5,
  },
  filaTotal: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  totalEtiqueta: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORES.tituloFuerte,
  },
  totalValor: {
    fontSize: 21,
    fontWeight: '800',
    color: COLORES.tituloFuerte,
  },
  botonPedido: {
    marginTop: 10,
  },
});

export default Checkout;

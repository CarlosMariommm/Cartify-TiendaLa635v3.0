// PEDIDOS — el historial de compras del cliente
// El equivalente de `frontend/src/pages/cliente/MisPedidos.jsx`: una tarjeta por compra con su
// número, su fecha, en qué va, qué llevaba y cuánto sumó.

import { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import Mascota, { CargandoMascota } from '../components/Tiqui/Mascota';
import { useColores, useEstilos } from '../context/ModoContext';
import { useAireBarraFlotante } from '../components/UI/BarraInferior';
import { ALTURA_ESTADO, contenidoCentrado } from '../theme/pantalla';
import { useAuth } from '../hooks/useAuth';
import { useTema } from '../context/TemaContext';
import { usePedidoActivoCtx } from '../context/PedidoActivoContext';
import { getPedidosDeCliente } from '../api/pedidosApi';
// Los estados y su color viven en utils/pasosPedido.js: este historial y
// ModalPedido necesitan la misma chapa, y ya hubo un bug antes por tenerla
// copiada en dos archivos que un día dejaron de decir lo mismo.
import { estadosPedido } from '../utils/pasosPedido';
import Boton from '../components/UI/Boton';
import { Estrella } from '../components/UI/Iconos';
import PastillasCategoria from '../components/Tienda/PastillasCategoria';
import { avisarActividad } from '../utils/actividadUsuario';
import { useIdioma } from '../context/IdiomaContext';

// Las tres ventanas de tiempo del filtro (además de "Todos", que ya resuelve PastillasCategoria).
const FILTROS_FECHA = ['Hoy', 'Semana pasada', 'Mes pasado'];
const DIA_MS = 24 * 60 * 60 * 1000;

const dentroDelFiltro = (iso, filtro) => {
  if (!filtro) return true;
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return false;

  if (filtro === 'Hoy') {
    const hoy = new Date();
    return (
      fecha.getFullYear() === hoy.getFullYear() &&
      fecha.getMonth() === hoy.getMonth() &&
      fecha.getDate() === hoy.getDate()
    );
  }

  const limite = filtro === 'Semana pasada' ? 7 * DIA_MS : 30 * DIA_MS;
  return Date.now() - fecha.getTime() <= limite;
};

// "12 ene 2026". La web usa `toLocaleDateString('es-SV', ...)` y aquí se hace igual, pero con
// respaldo: Android sin los datos de idioma cargados devuelve la fecha en inglés en vez de
// reventar, y eso se ve mal pero no rompe nada.
const fechaCorta = (iso, locale) => {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString(locale, {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return '';
  }
};

// El número que se le enseña al cliente son los últimos seis del id de Mongo, en mayúsculas —
// mismo criterio que la web. El id entero mide 24 caracteres: nadie lo dicta por teléfono, y seis
// bastan para que en el mostrador encuentren cuál es.
const numeroCorto = (id) => String(id || '').slice(-6).toUpperCase();

const TarjetaPedido = ({ pedido, alPresionar }) => {
  const { t, locale } = useIdioma();
  const COLORES = useColores();
  const estilos = useEstilos(crearEstilos);
  const ESTADOS = estadosPedido(COLORES.oscuro);
  const estado = ESTADOS[pedido.status] || ESTADOS.pagado;
  const esCancelado = pedido.status === 'cancelado';

  return (
    <Pressable
      onPress={alPresionar}
      accessibilityRole="button"
      accessibilityLabel={t('Ver el detalle del pedido {numero}', { numero: numeroCorto(pedido._id) })}
      style={({ pressed }) => [estilos.tarjeta, pressed && estilos.tarjetaPresionada]}
    >
      <View style={estilos.cabecera}>
        <View style={estilos.identidad}>
          <Text style={estilos.numero}>{t('Pedido #{numero}', { numero: numeroCorto(pedido._id) })}</Text>
          <Text style={estilos.fecha}>{fechaCorta(pedido.createdAt, locale)}</Text>
        </View>

        <View style={[estilos.chapa, { backgroundColor: estado.fondo }]}>
          <Text style={[estilos.chapaTexto, { color: estado.color }]}>{estado.texto}</Text>
        </View>
      </View>

      <View style={estilos.lineas}>
        {(pedido.items || []).map((item, i) => (
          // La clave es el índice porque las líneas del pedido no tienen `_id` propio (el esquema las guarda
          // con `_id: false`) y el mismo producto puede aparecer dos veces. Es un caso donde el índice sí
          // sirve: la lista de un pedido cerrado no se reordena ni se le quitan renglones.
          <View key={i} style={estilos.linea}>
            <Text style={estilos.lineaNombre} numberOfLines={1}>
              {/* `name` es la foto del nombre al momento de comprar; si un
                  pedido viejo no la trae, se cae al producto poblado. */}
              {item.amount}× {item.name || item.productId?.name || t('Producto')}
            </Text>
            <Text style={estilos.lineaPrecio}>
              ${(Number(item.price) * Number(item.amount)).toFixed(2)}
            </Text>
          </View>
        ))}
      </View>

      {/* Cancelado: el motivo, en una o dos líneas; el detalle completo está al tocarlo. */}
      {esCancelado && !!pedido.cancelReason && (
        <Text style={estilos.motivo} numberOfLines={2}>
          <Text style={estilos.motivoTitulo}>{pedido.cancelledByClient ? t('Lo cancelaste: ') : t('Motivo: ')}</Text>
          {t(pedido.cancelReason)}
        </Text>
      )}

      <View style={estilos.pie}>
        {/* Un cancelado ya no da puntos: se retiraron al cancelarlo. */}
        {pedido.pointsEarned > 0 && !esCancelado ? (
          <View style={estilos.puntos}>
            <Estrella size={13} color={COLORES.marca} />
            <Text style={estilos.puntosTexto}>{t('+{n} puntos', { n: pedido.pointsEarned })}</Text>
          </View>
        ) : (
          // Un hueco vacío para que el total se quede pegado a la derecha
          // aunque el pedido no haya dado puntos.
          <View />
        )}
        <Text style={estilos.total}>{t('Total: ${monto}', { monto: Number(pedido.total).toFixed(2) })}</Text>
      </View>
    </Pressable>
  );
};

const Pedidos = () => {
  const { t } = useIdioma();
  // Lo que hay que dejarle libre abajo a la píldora flotante.
  const aireAbajo = useAireBarraFlotante();
  const { user } = useAuth();
  const { colores } = useTema();
  const estilos = useEstilos(crearEstilos);
  // El detalle (ModalPedido) se pinta en un solo lugar para toda la app —
  // ver el comentario grande de `pedidoAbierto` en PedidoActivoContext.js —
  // así que aquí solo se pide abrirlo, no se dibuja.
  const { abrirPedido, ultimoCambio } = usePedidoActivoCtx();

  const [pedidos, setPedidos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [filtro, setFiltro] = useState(null); // null = "Todos"

  // El más nuevo arriba, sin depender de en qué orden lo haya mandado el
  // servidor — mismo criterio defensivo que ya usa PedidoActivoContext para
  // elegir el pedido en curso.
  const pedidosFiltrados = useMemo(
    () =>
      pedidos
        .filter((p) => dentroDelFiltro(p.createdAt, filtro))
        .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)),
    [pedidos, filtro]
  );

  // Los pedidos son de un CLIENTE. El personal entra por la misma puerta, y
  // preguntar por los pedidos de un id de empleado devuelve una lista vacía que
  // se leería como "usted nunca ha comprado". Mismo criterio que useMyOrders.
  const esCliente = user?.type === 'client' && !!user?.id;

  const cargar = useCallback(async () => {
    if (!esCliente) {
      setPedidos([]);
      setCargando(false);
      return;
    }

    setCargando(true);
    setError('');

    try {
      const lista = await getPedidosDeCliente(user.id);
      setPedidos(Array.isArray(lista) ? lista : []);
    } catch (e) {
      // Se distingue "no ha comprado nada" de "no se pudo preguntar". Sin este estado, el backend
      // apagado se ve exactamente igual que un cliente nuevo — y uno de los dos tiene arreglo.
      setError(e?.message || t('No se pudieron cargar tus pedidos'));
    } finally {
      setCargando(false);
    }
  }, [esCliente, user?.id]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  // Un pedido cambió desde el detalle (el cliente lo canceló): se pinta aquí también, sin volver a
  // pedir la lista. Ver actualizarPedido en PedidoActivoContext. Se ajusta en el mismo render, sin
  // un efecto de más.
  const [cambioVisto, setCambioVisto] = useState(null);
  if (ultimoCambio && ultimoCambio !== cambioVisto) {
    setCambioVisto(ultimoCambio);
    setPedidos((lista) => lista.map((p) => (String(p._id) === String(ultimoCambio._id) ? { ...p, ...ultimoCambio } : p)));
  }

  return (
    <View style={estilos.pantalla}>
      <View style={[estilos.barra, { paddingTop: ALTURA_ESTADO + 10 }]}>
        <Text style={estilos.titulo}>{t('Mis pedidos')}</Text>
        {!cargando && !error && pedidos.length > 0 && (
          <Text style={estilos.conteo}>
            {pedidosFiltrados.length} {t(pedidosFiltrados.length === 1 ? 'pedido' : 'pedidos')}
          </Text>
        )}
      </View>

      {!cargando && !error && pedidos.length > 0 && (
        // Envoltorio que evita que PastillasCategoria (un ScrollView sin alto) se estire a ocupar todo
        // el espacio libre.
        <View>
          <PastillasCategoria categorias={FILTROS_FECHA} seleccionada={filtro} alSeleccionar={setFiltro} />
        </View>
      )}

      {cargando ? (
        <View style={estilos.centro}>
          <CargandoMascota texto={t('Cargando tus pedidos…')} />
        </View>
      ) : error ? (
        <View style={estilos.centro}>
          <Text style={estilos.errorTitulo}>{t('No se pudieron cargar tus pedidos')}</Text>
          <Text style={estilos.errorTexto}>{error}</Text>
          <View style={estilos.botonError}>
            <Boton
              texto={t('Reintentar')}
              alPresionar={cargar}
              color={colores.marca}
              colorPresionado={colores.marcaOscuro}
            />
          </View>
        </View>
      ) : pedidos.length === 0 ? (
        // Vacío es una invitación, no una disculpa (igual que en la web).
        <View style={estilos.centro}>
          <Mascota pose="vacio" alto={120} />
          <Text style={estilos.vacioTitulo}>{t('Todavía no tienes pedidos')}</Text>
          <Text style={estilos.vacioTexto}>
            {t('Cuando compres en la tienda, tus pedidos van a aparecer aquí.')}
          </Text>
        </View>
      ) : pedidosFiltrados.length === 0 ? (
        // Un vacío distinto: sí ha comprado, solo que no en este período.
        <View style={estilos.centro}>
          <Mascota pose="buscando" alto={120} />
          <Text style={estilos.vacioTitulo}>{t('Nada por aquí')}</Text>
          <Text style={estilos.vacioTexto}>{t('No tienes pedidos en ese período.')}</Text>
        </View>
      ) : (
        <FlatList
          data={pedidosFiltrados}
          keyExtractor={(p) => String(p._id)}
          contentContainerStyle={[estilos.lista, { paddingBottom: aireAbajo }]}
          onScrollBeginDrag={avisarActividad}
          renderItem={({ item }) => (
            <TarjetaPedido pedido={item} alPresionar={() => abrirPedido(item)} />
          )}
        />
      )}
    </View>
  );
};

const crearEstilos = (COLORES) => StyleSheet.create({
  pantalla: {
    flex: 1,
    backgroundColor: COLORES.fondo,
  },
  barra: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 10,
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORES.linea,
  },
  titulo: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORES.tituloFuerte,
    letterSpacing: -0.4,
  },
  conteo: {
    fontSize: 12.5,
    fontWeight: '500',
    color: COLORES.subtitulo,
  },
  centro: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 8,
  },
  errorTitulo: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORES.tituloFuerte,
  },
  errorTexto: {
    fontSize: 13.5,
    lineHeight: 20,
    color: COLORES.textoSuave,
    textAlign: 'center',
  },
  botonError: {
    marginTop: 12,
    alignSelf: 'stretch',
  },
  vacioTitulo: {
    marginTop: 4,
    fontSize: 15.5,
    fontWeight: '700',
    color: COLORES.tituloFuerte,
  },
  vacioTexto: {
    fontSize: 14,
    lineHeight: 21,
    color: COLORES.textoSuave,
    textAlign: 'center',
  },
  lista: {
    ...contenidoCentrado,
    padding: 16,
    gap: 12,
  },
  tarjeta: {
    borderWidth: 1,
    borderColor: COLORES.lineaCard,
    borderRadius: 14,
    padding: 15,
    gap: 12,
  },
  tarjetaPresionada: {
    transform: [{ scale: 0.98 }],
    borderColor: COLORES.lineaCard,
  },
  cabecera: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  identidad: {
    flexShrink: 1,
    gap: 2,
  },
  numero: {
    fontSize: 14.5,
    fontWeight: '700',
    color: COLORES.tituloVentaja,
  },
  fecha: {
    fontSize: 12,
    color: COLORES.textoTenue,
  },
  chapa: {
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 5,
  },
  chapaTexto: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  lineas: {
    gap: 5,
  },
  linea: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  lineaNombre: {
    flexShrink: 1,
    fontSize: 13.5,
    color: COLORES.textoVentaja,
  },
  lineaPrecio: {
    fontSize: 13.5,
    color: COLORES.textoVentaja,
  },
  motivo: {
    fontSize: 13,
    lineHeight: 18,
    color: COLORES.textoSuave,
    backgroundColor: COLORES.peligroFondo,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  motivoTitulo: {
    fontWeight: '700',
    color: COLORES.peligro,
  },
  pie: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    paddingTop: 11,
    borderTopWidth: 1,
    borderTopColor: COLORES.lineaCard,
  },
  puntos: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  puntosTexto: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORES.marcaTexto,
  },
  total: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORES.tituloFuerte,
  },
});

export default Pedidos;

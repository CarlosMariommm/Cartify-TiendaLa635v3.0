// RECIBOS — los pedidos ya entregados
// Los mismos pedidos de Pedidos.js, filtrados a los entregados, igual que la web.

import { useCallback, useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import Mascota, { CargandoMascota } from '../../components/Tiqui/Mascota';
import { CircleCheck } from 'lucide-react-native';
import { useColores, useEstilos } from '../../context/ModoContext';
import { useAireBarraFlotante } from '../../components/UI/BarraInferior';
import { useAuth } from '../../hooks/useAuth';
import { useTema } from '../../context/TemaContext';
import { getPedidosDeCliente } from '../../api/pedidosApi';
import BarraCuenta from '../../components/Cuenta/BarraCuenta';
import Boton from '../../components/UI/Boton';
import { Estrella } from '../../components/UI/Iconos';
import { useIdioma } from '../../context/IdiomaContext';
import { contenidoCentrado } from '../../theme/pantalla';

// Mismas tres formas de pago que Checkout.js, con el mismo texto que ahí.
const PAGO = { efectivo: 'Efectivo', tarjeta: 'Tarjeta', saldo: 'Mi saldo' };

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

// Mismo criterio que Pedidos.js: los 6 últimos del id de Mongo, en mayúsculas.
const numeroCorto = (id) => String(id || '').slice(-6).toUpperCase();

const TarjetaRecibo = ({ pedido, colores }) => {
  const { t, locale } = useIdioma();
  const COLORES = useColores();
  const estilos = useEstilos(crearEstilos);

  return (
    <View style={estilos.tarjeta}>
      <View style={estilos.cabecera}>
        <View style={estilos.identidad}>
          <Text style={estilos.numero}>{t('Recibo #{numero}', { numero: numeroCorto(pedido._id) })}</Text>
          <Text style={estilos.fecha}>{fechaCorta(pedido.createdAt, locale)}</Text>
        </View>

        <View style={[estilos.chapa, { backgroundColor: COLORES.exitoFondo }]}>
          <CircleCheck size={12} color={COLORES.exitoVivo} strokeWidth={2.4} />
          <Text style={estilos.chapaTexto}>{t('Entregado')}</Text>
        </View>
      </View>

      <View style={estilos.lineas}>
        {(pedido.items || []).map((item, i) => (
          <View key={i} style={estilos.linea}>
            <Text style={estilos.lineaNombre} numberOfLines={1}>
              {item.amount}× {item.name || item.productId?.name || t('Producto')}
            </Text>
            <Text style={estilos.lineaPrecio}>
              ${(Number(item.price) * Number(item.amount)).toFixed(2)}
            </Text>
          </View>
        ))}
      </View>

      <View style={estilos.pie}>
        <View style={estilos.filaPie}>
          <Text style={estilos.pago}>{t('Pago: {metodo}', { metodo: PAGO[pedido.paymentMethod] ? t(PAGO[pedido.paymentMethod]) : pedido.paymentMethod })}</Text>
          {pedido.pointsEarned > 0 && (
            <View style={estilos.puntos}>
              <Estrella size={12} color={colores.marca} />
              <Text style={[estilos.puntosTexto, { color: colores.marcaTexto }]}>+{pedido.pointsEarned}</Text>
            </View>
          )}
        </View>
        <Text style={estilos.total}>{t('Total: ${monto}', { monto: Number(pedido.total).toFixed(2) })}</Text>
      </View>
    </View>
  );
};

const Recibos = ({ alVolver }) => {
  const { t } = useIdioma();
  // Lo que hay que dejarle libre abajo a la píldora flotante.
  const aireAbajo = useAireBarraFlotante();
  const { user } = useAuth();
  const { colores } = useTema();
  const estilos = useEstilos(crearEstilos);

  const [recibos, setRecibos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  const cargar = useCallback(async () => {
    setCargando(true);
    setError('');
    try {
      const lista = await getPedidosDeCliente(user.id);
      const entregados = (Array.isArray(lista) ? lista : []).filter((p) => p.status === 'entregado');
      setRecibos(entregados);
    } catch (e) {
      setError(e?.message || t('No se pudieron cargar tus recibos'));
    } finally {
      setCargando(false);
    }
  }, [user?.id]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  return (
    <View style={estilos.pantalla}>
      <BarraCuenta titulo={t('Recibos')} alVolver={alVolver} />

      {cargando ? (
        <View style={estilos.centro}>
          <CargandoMascota texto={t('Cargando tus recibos…')} />
        </View>
      ) : error ? (
        <View style={estilos.centro}>
          <Text style={estilos.errorTitulo}>{t('No se pudieron cargar tus recibos')}</Text>
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
      ) : recibos.length === 0 ? (
        <View style={estilos.centro}>
          <Mascota pose="sin-recibos" alto={120} />
          <Text style={estilos.vacioTitulo}>{t('Sin recibos todavía')}</Text>
          <Text style={estilos.vacioTexto}>
            {t('Cuando te entreguen un pedido, tu recibo va a aparecer aquí.')}
          </Text>
        </View>
      ) : (
        <FlatList
          data={recibos}
          keyExtractor={(p) => String(p._id)}
          contentContainerStyle={[estilos.lista, { paddingBottom: aireAbajo }]}
          renderItem={({ item }) => <TarjetaRecibo pedido={item} colores={colores} />}
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 5,
  },
  chapaTexto: {
    fontSize: 11.5,
    fontWeight: '700',
    color: COLORES.exitoVivo,
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
  pie: {
    gap: 6,
    paddingTop: 11,
    borderTopWidth: 1,
    borderTopColor: COLORES.lineaCard,
  },
  filaPie: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  pago: {
    fontSize: 12.5,
    color: COLORES.textoSuave,
  },
  puntos: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  puntosTexto: {
    fontSize: 12,
    fontWeight: '600',
  },
  total: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORES.tituloFuerte,
    textAlign: 'right',
  },
});

export default Recibos;

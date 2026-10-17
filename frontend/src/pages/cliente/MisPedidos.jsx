import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Star, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { useTheme } from '../../hooks/useClientTheme';
import { useMyOrders } from '../../hooks/useMyOrders';
import { orderService } from '../../api/orderService';
import CodigoEntrega from '../../components/Store/CodigoEntrega';
import SeguimientoCompacto from '../../components/Store/SeguimientoCompacto';
import Mascota, { CargandoMascota } from '../../components/UI/Mascota';
import { textoDevuelto, sellosDeCancelacion } from '../../utils/pasosPedido';
import ModalCancelarMiPedido from '../../components/Cuenta/ModalCancelarMiPedido';
import { useIdioma } from '../../hooks/useIdioma';

// MisPedidos — historial de pedidos del cliente (área "Mi Cuenta"). Migrada de mockup a datos
// reales (modelo Order). La lógica de carga vive en useMyOrders; aquí solo pintamos la lista de
// tarjetas de pedido.

// Valoración del SERVICIO de entrega (no del producto). Sale solo en los pedidos a domicilio ya
// entregados: es cuando de verdad hubo un reparto que juzgar. Una vez enviada, se muestra de solo
// lectura.
const ValoracionServicio = ({ order, c }) => {
  const { t } = useIdioma();
  const [sel, setSel] = useState(order.serviceRating?.rating || 0);
  const [hover, setHover] = useState(0);
  const [comentario, setComentario] = useState(order.serviceRating?.comment || '');
  const [enviando, setEnviando] = useState(false);
  const [guardado, setGuardado] = useState(!!order.serviceRating?.rating);

  const mostradas = guardado ? sel : (hover || sel);

  const enviar = async () => {
    if (!sel) { toast(t('Elige de 1 a 5 estrellas')); return; }
    setEnviando(true);
    try {
      await orderService.rateService(order._id, { rating: sel, comment: comentario });
      setGuardado(true);
      toast.success(t('¡Gracias por valorar el servicio!'));
    } catch {
      // El aviso de error ya lo pinta el interceptor de axios.
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div style={{ borderTop: `1px solid ${c.cardBorder}`, paddingTop: 12, marginTop: 12 }}>
      <div className="text-xs font-bold mb-1.5" style={{ color: c.textPrimary }}>
        {guardado ? t('Valoraste el servicio de entrega') : t('¿Qué tal estuvo la entrega?')}
      </div>

      <div className="flex items-center gap-1 mb-2">
        {[1, 2, 3, 4, 5].map((n) => {
          const activa = mostradas >= n;
          return (
            <button
              key={n}
              type="button"
              disabled={guardado || enviando}
              onMouseEnter={() => { if (!guardado) setHover(n); }}
              onMouseLeave={() => setHover(0)}
              onClick={() => setSel(n)}
              aria-label={t('{n} de 5', { n })}
              style={{ background: 'none', border: 'none', padding: 2, cursor: guardado ? 'default' : 'pointer' }}
            >
              <Star className="w-5 h-5" style={{ color: activa ? '#f5a623' : c.textMuted, fill: activa ? '#f5a623' : 'none' }} />
            </button>
          );
        })}
      </div>

      {!guardado ? (
        <>
          <textarea
            rows={2}
            value={comentario}
            onChange={(e) => setComentario(e.target.value)}
            placeholder={t('¿Algo que contar del reparto? (opcional)')}
            className="w-full px-3 py-2 rounded-xl border text-sm outline-none resize-none mb-2"
            style={{ backgroundColor: c.cardBg, borderColor: c.cardBorder, color: c.textPrimary }}
          />
          <button
            type="button"
            onClick={enviar}
            disabled={enviando}
            className="px-5 py-2 rounded-full text-sm font-bold transition-colors disabled:opacity-60"
            style={{ backgroundColor: c.primary, color: c.buttonText }}
          >
            {enviando ? t('Enviando…') : t('Enviar valoración')}
          </button>
        </>
      ) : (
        comentario && <p className="text-sm" style={{ color: c.textSecondary }}>“{comentario}”</p>
      )}
    </div>
  );
};

// Colores de estado (semánticos, fijos — no cambian con la paleta para que el
// estado siempre se lea igual). Coinciden con los estados del modelo Order.
const estadoInfo = {
  pagado:     { label: 'Pagado',     color: 'var(--info-vivo)', bg: 'rgba(37,99,235,.12)' },
  preparando: { label: 'Preparando', color: 'var(--aviso-vivo)', bg: 'rgba(217,119,6,.14)' },
  // "En camino" FALTABA en esta lista, y el respaldo de abajo es `pagado`. O sea: un pedido que ya
  // iba en la moto se etiquetaba "Pagado" en la misma tarjeta donde la linea de tiempo decia "En
  // camino". Dos cosas distintas sobre el mismo pedido, a diez centimetros una de la otra.
  en_camino:  { label: 'En camino',  color: 'var(--info-vivo)', bg: 'rgba(29,78,216,.14)' },
  // Solo retiro en la tienda. Con los tokens de la marca, que ya se leen en claro y en oscuro.
  listo:      { label: 'Listo para recoger', color: 'var(--marca-texto)', bg: 'var(--marca-100)' },
  entregado:  { label: 'Entregado',  color: 'var(--exito-vivo)', bg: 'rgba(22,163,74,.14)' },
  cancelado:  { label: 'Cancelado',  color: 'var(--peligro)', bg: 'rgba(220,38,38,.12)' },
};

const formatFecha = (iso, locale) => {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString(locale, { day: '2-digit', month: 'short', year: 'numeric' });
};

const MisPedidos = () => {
  const navigate = useNavigate();
  const { palette } = useTheme();
  const c = palette.colors;
  const { orders, loading } = useMyOrders();
  const { t, locale } = useIdioma();
  // Cancelar un pedido por preparar. `cambios` guarda lo que devolvió el servidor por id, y se pinta
  // encima de la lista: así la tarjeta cambia al instante sin volver a cargar todo (y sin el
  // "Cargando…" de por medio).
  const [aCancelar, setACancelar] = useState(null);
  const [cambios, setCambios] = useState({});

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6" style={{ color: c.textPrimary }}>{t('Mis pedidos')}</h1>

      {loading ? (
        <CargandoMascota texto={t('Cargando tus pedidos…')} />
      ) : orders.length === 0 ? (
        // Estado vacío: una invitación, no una disculpa.
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="mb-4"><Mascota pose="vacio" alto={120} /></div>
          <p className="text-sm font-semibold mb-1" style={{ color: c.textPrimary }}>{t('Aún no tienes pedidos')}</p>
          <p className="text-sm" style={{ color: c.textSecondary }}>{t('Cuando compres en la tienda, tus pedidos aparecerán aquí.')}</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {orders.map((original) => {
            const order = { ...original, ...cambios[original._id] };
            const estado = estadoInfo[order.status] || estadoInfo.pagado;
            return (
              <div
                key={order._id}
                className="rounded-2xl p-5"
                style={{ backgroundColor: c.cardBg, border: `1px solid ${c.cardBorder}` }}
              >
                {/* Encabezado del pedido */}
                <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
                  <div>
                    <div className="text-sm font-bold" style={{ color: c.textPrimary }}>
                      {t('Pedido #{numero}', { numero: String(order._id).slice(-6).toUpperCase() })}
                    </div>
                    <div className="text-xs" style={{ color: c.textMuted }}>{formatFecha(order.createdAt, locale)}</div>
                  </div>
                  <span
                    className="text-xs font-semibold px-3 py-1 rounded-full"
                    style={{ color: estado.color, backgroundColor: estado.bg }}
                  >
                    {t(estado.label)}
                  </span>
                </div>

                {/* Por donde va el pedido, sin tener que entrar a cada uno. Esta era la unica pantalla con pedidos
                   EN CURSO que no lo decia. Se calla solo en los ya entregados o cancelados. Ver
                   SeguimientoCompacto. */}
                <SeguimientoCompacto pedido={order} />

                {/* Cancelado: por qué, y lo que se le devolvió. */}
                {order.status === 'cancelado' && (order.cancelReason || textoDevuelto(order)) && (
                  <div
                    className="mb-3 rounded-xl px-3 py-2 text-sm"
                    style={{ backgroundColor: 'rgba(220,38,38,.08)', color: c.textSecondary }}
                  >
                    {order.cancelledByClient && (
                      <p className="font-semibold" style={{ color: c.textPrimary }}>{t('Lo cancelaste.')}</p>
                    )}
                    {order.cancelReason && (
                      <p>
                        <span className="font-semibold" style={{ color: 'var(--peligro)' }}>{t('Motivo:')} </span>
                        {order.cancelReason}
                      </p>
                    )}
                    {textoDevuelto(order) && <p className="mt-0.5 text-xs">{textoDevuelto(order)}</p>}
                  </div>
                )}

                {/* El código de entrega, en pequeño. En la lista va la versión compacta y no la tarjeta entera:
                   aquí solo hace falta poder encontrarlo rápido —el cliente ya está en la puerta con el teléfono
                   en la mano—, y el componente se calla solo en los pedidos ya entregados o cancelados. */}
                {order.deliveryCode && (
                  <div className="mb-3">
                    <CodigoEntrega
                      codigo={order.deliveryCode}
                      deliveryType={order.deliveryType}
                      estado={order.status}
                      compacto
                    />
                  </div>
                )}

                {/* Productos del pedido */}
                <div className="flex flex-col gap-1 mb-3">
                  {order.items?.map((item, i) => (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <span style={{ color: c.textSecondary }}>
                        {item.amount}× {item.name || item.productId?.name || t('Producto')}
                      </span>
                      <span style={{ color: c.textSecondary }}>
                        ${(item.price * item.amount).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Pie: puntos ganados + total */}
                <div
                  className="flex items-center justify-between pt-3"
                  style={{ borderTop: `1px solid ${c.cardBorder}` }}
                >
                  {/* Un cancelado ya no da puntos: se retiraron al cancelarlo. */}
                  {order.pointsEarned > 0 && order.status !== 'cancelado' ? (
                    <span className="flex items-center gap-1 text-xs font-medium" style={{ color: c.accent }}>
                      <Star className="w-3.5 h-3.5" /> {t('+{n} puntos', { n: order.pointsEarned })}
                    </span>
                  ) : <span />}
                  <span className="text-base font-bold" style={{ color: c.textPrimary }}>
                    {t('Total: {monto}', { monto: `$${Number(order.total).toFixed(2)}` })}
                  </span>
                </div>

                {/* Ver el estado del pedido en su propia pantalla (línea de
                    tiempo, envío, y el mapa en vivo si va en camino). */}
                <button
                  type="button"
                  onClick={() => navigate(`/mi-cuenta/pedido/${order._id}`)}
                  className="mt-3 w-full flex items-center justify-center gap-1 py-2 rounded-full text-sm font-semibold transition-colors"
                  style={{ border: `1px solid ${c.cardBorder}`, color: c.primary, background: 'transparent' }}
                >
                  {t('Ver estado del pedido')} <ChevronRight className="w-4 h-4" />
                </button>

                {/* Cancelar, solo mientras está por preparar. */}
                {order.status === 'pagado' && (
                  <button
                    type="button"
                    onClick={() => setACancelar(order)}
                    className="mt-2 w-full py-2 rounded-full text-sm font-semibold transition-colors"
                    style={{ color: 'var(--peligro)', background: 'transparent' }}
                  >
                    {t('Cancelar pedido')}
                  </button>
                )}

                {/* Valorar el servicio: solo en domicilios ya entregados. */}
                {order.deliveryType === 'delivery' && order.status === 'entregado' && (
                  <ValoracionServicio order={order} c={c} />
                )}
              </div>
            );
          })}
        </div>
      )}

      <ModalCancelarMiPedido
        pedido={aCancelar}
        onClose={() => setACancelar(null)}
        alCancelar={(cancelado) => {
          if (cancelado) setCambios((prev) => ({ ...prev, [cancelado._id]: sellosDeCancelacion(cancelado) }));
        }}
      />
    </div>
  );
};

export default MisPedidos;

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ChevronLeft, Package, Bike, MapPin, CreditCard,
  Wallet, Banknote, Hash, Store as StoreFront,
} from 'lucide-react';
import { useTheme } from '../../hooks/useClientTheme';
import { orderService } from '../../api/orderService';
import { useSeguimientoEnVivo } from '../../hooks/useSeguimientoEnVivo';
import MapaSeguimiento from '../../components/Store/MapaSeguimiento';
import { pasosDe, indiceDePaso, poseDeEstado, textoDevuelto, sellosDeCancelacion } from '../../utils/pasosPedido';
import ModalCancelarMiPedido from '../../components/Cuenta/ModalCancelarMiPedido';
import ValoracionPedido from '../../components/Store/ValoracionPedido';
import CodigoEntrega from '../../components/Store/CodigoEntrega';
import Mascota, { CargandoMascota } from '../../components/UI/Mascota';
import { foto, ANCHO } from '../../utils/fotos';
import { useIdioma } from '../../hooks/useIdioma';

/*
 * ============================================================
 * ESTADO DEL PEDIDO — la pantalla completa de "Orden en curso"
 * ============================================================
 * Lo que la burbuja muestra en pequeño, aquí en grande y con TODO: la línea de
 * tiempo, los productos, el resumen de cobro (con el envío real que ahora sí se
 * cobra) y, si va en camino, el mapa en vivo del repartidor.
 *
 * Todos los datos salen del pedido de verdad (orderService.getOrderById); no
 * hay nada inventado. Se llega desde "Mis pedidos" y desde la burbuja.
 * ============================================================
 */

const BROWN = 'var(--marca-600)';

/*
 * Los pasos del pedido, iguales que en la burbuja para que la persona vea lo
 * mismo en los dos lados. "En camino" se filtra abajo para retiro en local
 * —no hay repartidor que seguirle— así que ese solo ve tres.
 */
// Los pasos viven en utils/pasosPedido.js: estaban copiados en tres
// pantallas y una de las copias se habia quedado sin "En camino".

// Cómo se nombra cada forma de pago de cara al cliente.
const PAGO = {
  efectivo: { label: 'Efectivo', Icono: Banknote },
  tarjeta: { label: 'Tarjeta', Icono: CreditCard },
  saldo: { label: 'Saldo / Gift card', Icono: Wallet },
};

// Los pines y el encuadre del mapa se mudaron a MapaSeguimiento.jsx: estaban
// copiados en tres pantallas y esta era una de las copias.

const formatFechaLarga = (iso, locale) => {
  if (!iso) return '';
  return new Date(iso).toLocaleString(locale, {
    day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
};

const EstadoPedido = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { palette } = useTheme();
  const c = palette.colors;
  const { t, locale } = useIdioma();

  const [pedido, setPedido] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(false);
  const [cancelando, setCancelando] = useState(false);

  useEffect(() => {
    let vivo = true;
    (async () => {
      try {
        setCargando(true);
        const data = await orderService.getOrderById(id);
        if (vivo) setPedido(data);
      } catch {
        if (vivo) setError(true);
      } finally {
        if (vivo) setCargando(false);
      }
    })();
    return () => { vivo = false; };
  }, [id]);

  // Seguimiento en vivo: solo tiene sentido mientras el pedido está en curso.
  const enCurso = pedido && ['pagado', 'preparando', 'en_camino', 'listo'].includes(pedido.status);
  const seguimiento = useSeguimientoEnVivo(pedido?._id, !!enCurso);

  if (cargando) {
    return <CargandoMascota texto={t('Cargando tu pedido…')} />;
  }
  if (error || !pedido) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="mb-4"><Mascota pose="buscando" alto={130} /></div>
        <p className="text-sm font-semibold mb-1" style={{ color: c.textPrimary }}>{t('No encontramos ese pedido')}</p>
        <button
          type="button"
          onClick={() => navigate('/mi-cuenta/pedidos')}
          className="mt-3 px-5 py-2 rounded-full text-sm font-bold"
          style={{ backgroundColor: c.primary, color: c.buttonText }}
        >
          {t('Ver mis pedidos')}
        </button>
      </div>
    );
  }

  // El estado que manda es el más fresco: el del seguimiento si llegó, si no el
  // guardado del pedido. Salvo cancelado: si lo acaba de cancelar aquí mismo,
  // el seguimiento todavía no se enteró y diría "por preparar" unos segundos.
  const estado = pedido.status === 'cancelado' ? 'cancelado' : (seguimiento.estado || pedido.status);
  const cancelado = estado === 'cancelado';
  const esDomicilio = pedido.deliveryType === 'delivery';
  const PASOS = pasosDe(pedido.deliveryType);
  const pasoActual = indiceDePaso(PASOS, estado);
  const estaEnCamino = estado === 'en_camino';
  // Con el punto fresco del repartidor, o con la ruta aproximada desde la tienda.
  const enCamino = estaEnCamino && (seguimiento.enVivo || seguimiento.estimado);

  const numero = String(pedido._id).slice(-6).toUpperCase();
  const infoPago = PAGO[pedido.paymentMethod] || PAGO.efectivo;

  const subtotal = Number(pedido.subtotal ?? pedido.total ?? 0);
  const envio = Number(pedido.shippingCost || 0);
  const servicio = Number(pedido.serviceFee || 0);
  const descuento = Number(pedido.discount || 0);
  const total = Number(pedido.total || 0);

  const tarjeta = { backgroundColor: c.cardBg, border: `1px solid ${c.cardBorder}`, borderRadius: 16 };

  return (
    <div className="pb-8">
      {/* Volver */}
      <button
        type="button"
        onClick={() => navigate('/mi-cuenta/pedidos')}
        className="inline-flex items-center gap-1 text-sm font-semibold mb-4"
        style={{ color: c.textSecondary }}
      >
        <ChevronLeft className="w-4 h-4" /> {t('Mis pedidos')}
      </button>

      <div className="grid gap-5" style={{ gridTemplateColumns: 'minmax(0,1fr) 320px' }}>
        {/* ── Columna izquierda: estado + productos ── */}
        <div className="flex flex-col gap-5" style={{ minWidth: 0 }}>
          <div style={tarjeta} className="p-6">
            {/* Chip de estado */}
            <span
              className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full mb-3"
              style={{
                color: cancelado ? 'var(--peligro)' : 'var(--exito-vivo)',
                backgroundColor: cancelado ? 'rgba(220,38,38,.12)' : 'rgba(22,163,74,.14)',
              }}
            >
              <span style={{
                width: 7, height: 7, borderRadius: '50%',
                background: cancelado ? '#dc2626' : '#16a34a',
              }} />
              {cancelado ? t('Cancelado') : estado === 'entregado' ? t('Entregado') : t('En proceso')}
            </span>

            <h1 className="text-xl font-extrabold" style={{ color: c.textPrimary }}>
              {cancelado ? t('Pedido cancelado') : estado === 'entregado' ? t('Pedido entregado') : t('Orden en curso')}
            </h1>
            <p className="text-sm mt-0.5" style={{ color: c.textMuted }}>
              {t('Pedido recibido el {fecha}', { fecha: formatFechaLarga(pedido.createdAt, locale) })}
            </p>

            {/*
              La mascota contando en qué va el pedido: mira el recibo, llena
              la bolsa, va en patineta, festeja la entrega… o se pone triste si
              se canceló. Reemplaza al círculo con el ícono del paso.
            */}
            <div className="flex flex-col items-center my-6">
              <div className="mb-3">
                <Mascota pose={poseDeEstado(estado)} alto={140} />
              </div>
              <div className="text-base font-bold text-center" style={{ color: c.textPrimary }}>
                {cancelado
                  ? (pedido.cancelledByClient ? t('Cancelaste este pedido') : t('Este pedido se canceló'))
                  : enCamino
                    ? (seguimiento.yaCasi ? t('Ya casi llega a tu puerta') : seguimiento.espera)
                    : t((PASOS[pasoActual] || PASOS[0]).detalle)}
              </div>

              {/*
                El porqué, que es lo primero que uno se pregunta, y lo que se
                le devolvió. Los pedidos cancelados antes de que se pidiera un
                motivo no traen ninguno: ahí solo queda la invitación a escribir.
              */}
              {cancelado && (
                <div className="mt-3 max-w-md text-center text-sm" style={{ color: c.textSecondary }}>
                  {pedido.cancelReason && (
                    <p>
                      <span className="font-semibold" style={{ color: c.textPrimary }}>{t('Motivo:')} </span>
                      {pedido.cancelReason}
                    </p>
                  )}
                  {textoDevuelto(pedido) && <p className="mt-1">{textoDevuelto(pedido)}</p>}
                  <p className="mt-1" style={{ color: c.textMuted }}>{t('Si tienes dudas, escríbenos y lo revisamos.')}</p>
                </div>
              )}
            </div>

            {!cancelado && (
              <>

                {/* Línea de tiempo real (3 pasos) */}
                <div className="flex items-start">
                  {PASOS.map((p, i) => {
                    const activo = i <= pasoActual;
                    return (
                      <div key={p.id} className="flex-1 flex flex-col items-center relative">
                        {i < PASOS.length - 1 && (
                          <div
                            className="absolute h-0.5"
                            style={{
                              top: 6, left: '50%', right: '-50%',
                              background: i < pasoActual ? BROWN : c.cardBorder,
                            }}
                          />
                        )}
                        <div
                          className="w-3.5 h-3.5 rounded-full mb-1.5 relative z-10"
                          style={{ background: activo ? BROWN : c.cardBorder }}
                        />
                        <div
                          className="text-xs text-center"
                          style={{ color: activo ? BROWN : c.textMuted, fontWeight: activo ? 600 : 400 }}
                        >
                          {t(p.label)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            {/*
              El código con el que recibirá el pedido. Va DEBAJO de la línea de
              tiempo y encima del mapa a propósito: es lo que hace falta en el
              momento exacto en que el repartidor toca el timbre, así que tiene
              que estar donde ya se está mirando y sin tener que bajar.
            */}
            <CodigoEntrega
              codigo={pedido.deliveryCode}
              deliveryType={pedido.deliveryType}
              estado={estado}
            />

            {/* Mapa en vivo, solo cuando de verdad hay alguien en camino.
                El mapa lo dibuja MapaSeguimiento, que es el mismo de la
                burbuja, la confirmacion y Mis Pedidos. */}
            {enCamino && (
              <div className="mt-6 rounded-2xl overflow-hidden" style={{ border: `1px solid ${c.cardBorder}` }}>
                <MapaSeguimiento
                  punto={seguimiento.punto}
                  destino={seguimiento.destino}
                  ruta={seguimiento.ruta}
                  origen={seguimiento.origen}
                  alto={200}
                  borde="transparent"
                />
                <div className="px-4 py-3 flex items-center gap-2 text-sm font-semibold"
                     style={{ color: seguimiento.yaCasi ? 'var(--exito-texto)' : 'var(--info-texto)', background: c.cardBg }}>
                  <Bike className="w-4 h-4" />
                  {seguimiento.yaCasi ? t('Ya casi toca tu puerta') : seguimiento.espera}
                  {seguimiento.distancia ? ` · ${t('a {distancia}', { distancia: seguimiento.distancia })}` : ''}
                  {seguimiento.estimado ? ` · ${t('calculado desde la tienda')}` : ''}
                </div>
              </div>
            )}
          </div>

          {/* Productos */}
          <div style={tarjeta} className="p-6">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wide" style={{ color: c.textMuted }}>{t('Productos')}</span>
              <span className="text-xs font-bold uppercase tracking-wide" style={{ color: c.textMuted }}>{t('N.º ítems')}</span>
            </div>
            <div className="flex flex-col">
              {pedido.items?.map((item, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 py-3"
                  style={{ borderTop: i > 0 ? `1px solid ${c.cardBorder}` : 'none' }}
                >
                  <div
                    className="w-11 h-11 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden"
                    style={{ background: c.primaryLight || 'rgba(0,0,0,0.04)' }}
                  >
                    {item.productId?.image
                      ? <img src={foto(item.productId.image, ANCHO.miniatura)} alt="" loading="lazy" className="max-w-full max-h-full object-contain" />
                      : <Package className="w-5 h-5" style={{ color: c.textMuted }} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate" style={{ color: c.textPrimary }}>
                      {item.name || item.productId?.name || t('Producto')}
                    </div>
                    <div className="text-sm font-bold" style={{ color: c.textPrimary }}>
                      ${(Number(item.price) * Number(item.amount)).toFixed(2)}
                    </div>
                  </div>
                  <div className="text-sm" style={{ color: c.textMuted }}>{t('{n} u', { n: item.amount })}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Valoración: solo cuando el pedido ya se entregó. */}
          {estado === 'entregado' && <ValoracionPedido items={pedido.items} pedidoId={pedido._id} />}
        </div>

        {/* ── Columna derecha: resumen ── */}
        <div style={tarjeta} className="p-6 h-fit">
          <div className="text-sm font-bold mb-1" style={{ color: c.textPrimary }}>{t('Resumen del pedido')}</div>
          <div className="flex items-center gap-1 text-xs font-semibold mb-4" style={{ color: c.primary }}>
            <Hash className="w-3.5 h-3.5" /> {numero}
          </div>

          <div className="flex justify-between text-sm mb-2" style={{ color: c.textSecondary }}>
            <span>{t('Productos')}</span><span style={{ color: c.textPrimary }}>${subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm mb-2" style={{ color: c.textSecondary }}>
            <span>{t('Gastos de envío')}</span>
            <span style={{ color: c.textPrimary }}>{envio > 0 ? `$${envio.toFixed(2)}` : t('Gratis')}</span>
          </div>
          {servicio > 0 && (
            <div className="flex justify-between text-sm mb-2" style={{ color: c.textSecondary }}>
              <span>{t('Tarifa de servicio')}</span>
              <span style={{ color: c.textPrimary }}>${servicio.toFixed(2)}</span>
            </div>
          )}
          {descuento > 0 && (
            <div className="flex justify-between text-sm mb-2" style={{ color: c.textSecondary }}>
              <span>{t('Descuento por puntos')}</span><span style={{ color: 'var(--exito-vivo)' }}>−${descuento.toFixed(2)}</span>
            </div>
          )}

          <div className="flex justify-between items-center pt-3 mt-1" style={{ borderTop: `1px solid ${c.cardBorder}` }}>
            <span className="text-base font-bold" style={{ color: c.textPrimary }}>{t('Total')}</span>
            <span className="text-lg font-extrabold" style={{ color: c.textPrimary }}>${total.toFixed(2)}</span>
          </div>

          {/* Método de pago real */}
          <div className="flex items-center gap-2 text-sm mt-4 pt-4" style={{ borderTop: `1px solid ${c.cardBorder}`, color: c.textPrimary }}>
            <infoPago.Icono className="w-5 h-5" style={{ color: c.primary }} />
            {t(infoPago.label)}
          </div>

          {/* Entrega real */}
          <div className="flex items-start gap-2 text-sm mt-3 pt-4" style={{ borderTop: `1px solid ${c.cardBorder}`, color: c.textPrimary }}>
            {esDomicilio
              ? <MapPin className="w-5 h-5 flex-shrink-0" style={{ color: c.primary }} />
              : <StoreFront className="w-5 h-5 flex-shrink-0" style={{ color: c.primary }} />}
            <div className="min-w-0">
              <div className="font-semibold">{esDomicilio ? t('Dirección de entrega') : t('Retiro en el local')}</div>
              {esDomicilio && (
                <div style={{ color: c.textSecondary }}>
                  {pedido.deliveryAddress || t('Sin dirección')}
                  {pedido.deliveryReference ? ` (${pedido.deliveryReference})` : ''}
                </div>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={() => navigate('/')}
            className="w-full mt-5 py-3 rounded-xl font-bold"
            style={{ backgroundColor: c.primary, color: c.buttonText }}
          >
            {t('Volver a la tienda')}
          </button>

          {/*
            Cancelar, solo mientras está por preparar: después ya hay alguien
            juntando la bolsa (el servidor lo revisa igual). Va debajo y sin
            relleno: es la salida, no lo que se espera que haga.
          */}
          {estado === 'pagado' && (
            <button
              type="button"
              onClick={() => setCancelando(true)}
              className="w-full mt-2 py-2.5 rounded-xl text-sm font-semibold"
              style={{ color: 'var(--peligro)', background: 'transparent', border: `1px solid ${c.cardBorder}` }}
            >
              {t('Cancelar pedido')}
            </button>
          )}
        </div>
      </div>

      <ModalCancelarMiPedido
        pedido={cancelando ? pedido : null}
        onClose={() => setCancelando(false)}
        alCancelar={(cancelado) => cancelado && setPedido((p) => ({ ...p, ...sellosDeCancelacion(cancelado) }))}
      />

      {/* En pantalla chica la rejilla de dos columnas se apila */}
      <style>{`
        @media (max-width: 760px) {
          .grid[style*="320px"] { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
};

export default EstadoPedido;

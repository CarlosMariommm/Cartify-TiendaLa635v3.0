import { useState } from 'react';
import { createPortal } from 'react-dom';
import { CircleX } from 'lucide-react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import toast from 'react-hot-toast';
import { useTheme } from '../../hooks/useClientTheme';
import { useIdioma } from '../../hooks/useIdioma';
import { usePedidoActivoCtx } from '../../context/PedidoActivoContext';
import { orderService } from '../../api/orderService';

// EL CLIENTE CANCELA SU PEDIDO — ModalCancelarMiPedido.jsx
// Solo mientras está "por preparar" (el servidor también lo revisa: ver
// orderController.cancelarPorCliente). Se abre desde Mis pedidos y desde la pantalla del pedido.

const MOTIVOS = [
  'Me equivoqué en el pedido.',
  'Ya no lo necesito.',
  'Quiero cambiar la dirección o la forma de pago.',
  'Encontré lo que buscaba en otro lugar.',
  'Prefiero no decirlo.',
];

const ModalCancelarMiPedido = ({ pedido, onClose, alCancelar }) => {
  const { palette } = useTheme();
  const c = palette.colors;
  const { t } = useIdioma();
  const reduce = useReducedMotion();
  const { refrescar: refrescarPedidoActivo } = usePedidoActivoCtx();
  const [motivo, setMotivo] = useState('');
  const [enviando, setEnviando] = useState(false);

  const abierto = !!pedido;
  const numero = pedido ? String(pedido._id).slice(-6).toUpperCase() : '';

  // Lo que se le va a devolver, dicho antes (la misma cuenta que hará el servidor).
  const saldo = pedido?.paymentMethod === 'saldo' ? Number(pedido.total) || 0 : 0;
  const puntos = Number(pedido?.pointsRedeemed) || 0;
  const partes = [
    saldo > 0 ? t('{monto} a tu saldo', { monto: `$${saldo.toFixed(2)}` }) : '',
    puntos > 0 ? t('{n} puntos', { n: puntos }) : '',
  ].filter(Boolean);
  const devolvera = partes.length ? t('Te devolvemos {que}.', { que: partes.join(` ${t('y')} `) }) : '';

  const confirmar = async () => {
    if (!motivo || enviando) return;
    setEnviando(true);
    try {
      // En español aunque la tienda esté en inglés: lo lee el personal en el panel.
      const r = await orderService.cancelarPorCliente(pedido._id, motivo);
      toast.success(t('Tu pedido quedó cancelado.'));
      // La burbuja de seguimiento se va sola: ya no hay pedido en curso.
      refrescarPedidoActivo();
      alCancelar?.(r?.order);
      onClose();
    } catch {
      // El aviso con el porqué (por ejemplo, que ya lo empezamos a preparar)
      // lo pinta el interceptor de api.js. El modal se queda abierto.
    } finally {
      setEnviando(false);
    }
  };

  // Por un portal al <body>: este modal se abre desde dentro de Mi Cuenta, y la animación de entrada
  // de cada página deja un `transform` que ata un `fixed` a esa caja en vez de a la pantalla. Sin el
  // portal, el encabezado de la tienda y la burbuja del pedido quedaban por encima del velo.
  return createPortal(
    <AnimatePresence>
      {abierto && (
        <div className="fixed inset-0 z-[1060] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
            className="absolute inset-0 bg-black/45"
            onClick={onClose}
          />
          <motion.div
            initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: 12 }}
            transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
            className="relative z-10 w-full max-w-md rounded-2xl p-6 shadow-xl max-h-[92vh] overflow-y-auto"
            style={{ backgroundColor: c.cardBg || 'var(--papel)', color: c.textPrimary }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="titulo-cancelar-mi-pedido"
          >
            <div
              className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full"
              style={{ backgroundColor: 'rgba(220,38,38,.12)', color: 'var(--peligro)' }}
            >
              <CircleX className="h-6 w-6" aria-hidden="true" />
            </div>
            <h2 id="titulo-cancelar-mi-pedido" className="mb-1 text-center text-lg font-bold">
              {t('¿Cancelar el pedido #{numero}?', { numero })}
            </h2>
            <p className="mb-4 text-center text-sm" style={{ color: c.textSecondary }}>
              {t('Todavía no lo empezamos a preparar, así que se puede cancelar.')}
              {devolvera ? ` ${devolvera}` : ''}
            </p>

            <p className="mb-2 text-sm font-semibold">{t('¿Por qué lo cancelas?')}</p>
            <div className="mb-5 flex flex-col gap-2" role="radiogroup" aria-label={t('¿Por qué lo cancelas?')}>
              {MOTIVOS.map((m) => {
                const elegido = motivo === m;
                return (
                  <button
                    key={m}
                    type="button"
                    role="radio"
                    aria-checked={elegido}
                    onClick={() => setMotivo(m)}
                    className="press rounded-xl px-4 py-2.5 text-left text-sm transition-colors"
                    style={{
                      border: `1.5px solid ${elegido ? c.primary : c.cardBorder}`,
                      backgroundColor: elegido ? c.primaryLight : 'transparent',
                      color: c.textPrimary,
                      fontWeight: elegido ? 600 : 400,
                    }}
                  >
                    {t(m)}
                  </button>
                );
              })}
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                autoFocus
                className="press flex-1 rounded-full px-4 py-2.5 text-sm font-medium transition-colors"
                style={{ backgroundColor: c.primaryLight, color: c.textPrimary }}
              >
                {t('No, mantenerlo')}
              </button>
              <button
                type="button"
                onClick={confirmar}
                disabled={!motivo || enviando}
                className="press flex-1 rounded-full px-4 py-2.5 text-sm font-semibold text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ backgroundColor: 'var(--peligro)' }}
              >
                {enviando ? t('Cancelando…') : t('Sí, cancelar')}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
};

export default ModalCancelarMiPedido;

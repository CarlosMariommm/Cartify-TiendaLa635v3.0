import { useState } from 'react';
import { CircleX, CircleAlert } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { modalTransition } from '../../utils/motion';

// CANCELAR UN PEDIDO — ModalCancelarPedido.jsx
// Cancelar pide el PORQUÉ, y ese porqué es para el cliente: le llega en la notificación, en el
// correo y en su pedido (web y app).

const MOTIVOS_RAPIDOS = [
  'Nos quedamos sin uno de los productos de su pedido.',
  'No pudimos comunicarnos con usted para confirmar la entrega.',
  'Su dirección queda fuera de nuestra zona de entrega.',
  'Usted nos pidió cancelarlo.',
  'La tienda tuvo que cerrar antes de poder prepararlo.',
];

const MAXIMO = 300;

const ModalCancelarPedido = ({ isOpen, onClose, onConfirm, pedido }) => {
  const [motivo, setMotivo] = useState('');
  const [enviando, setEnviando] = useState(false);

  if (!pedido) return null;

  const numero = String(pedido._id).slice(-6).toUpperCase();
  const cliente = pedido.clientId?.fullName || 'el cliente';
  const listo = motivo.trim().length >= 4;

  // Lo que se le devuelve al cliente, dicho antes de tocar el botón.
  const devuelve = [
    pedido.paymentMethod === 'saldo' && Number(pedido.total) > 0 ? `$${Number(pedido.total).toFixed(2)} a su saldo` : '',
    Number(pedido.pointsRedeemed) > 0 ? `${pedido.pointsRedeemed} puntos que canjeó` : '',
  ].filter(Boolean);

  const confirmar = async () => {
    if (!listo || enviando) return;
    setEnviando(true);
    try {
      await onConfirm(motivo.trim());
    } finally {
      setEnviando(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        // z-[2000], como el del código de entrega: por encima de cualquier mapa.
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/50"
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="titulo-cancelar-pedido"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={modalTransition}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col overflow-hidden relative z-10 max-h-[92vh]"
          >
            <div className="p-4 text-white flex justify-center items-center gap-2 bg-[#00283D]">
              <CircleX className="w-6 h-6" />
              <h2 id="titulo-cancelar-pedido" className="text-xl font-bold text-center">Cancelar pedido</h2>
            </div>

            <div className="p-6 flex flex-col bg-[#F1F6F9] overflow-y-auto">
              <p className="text-gray-700 text-center mb-4">
                Pedido <span className="font-bold">#{numero}</span> de <span className="font-bold">{cliente}</span>
                {' · '}${Number(pedido.total || 0).toFixed(2)}
              </p>

              <div className="flex items-start gap-2 mb-4 p-3 rounded-xl bg-amber-50 border border-amber-200">
                <CircleAlert className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                <p className="text-xs text-amber-800 leading-relaxed">
                  Los productos vuelven al inventario
                  {devuelve.length ? <> y al cliente se le devuelven <strong>{devuelve.join(' y ')}</strong></> : null}.
                  Le llega el motivo por notificación y por correo. Un pedido cancelado ya no se puede reabrir.
                </p>
              </div>

              <p className="text-sm font-medium text-gray-700 mb-2">Motivos rápidos</p>
              <div className="flex flex-wrap gap-2 mb-4">
                {MOTIVOS_RAPIDOS.map((m) => {
                  const elegido = motivo === m;
                  return (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setMotivo(m)}
                      aria-pressed={elegido}
                      className="text-left text-xs px-3 py-1.5 rounded-full border transition-colors"
                      style={elegido
                        ? { backgroundColor: 'var(--theme-primary)', borderColor: 'var(--theme-primary)', color: 'var(--theme-button-text)' }
                        : { backgroundColor: 'var(--theme-card-bg)', borderColor: 'var(--theme-card-border)', color: 'var(--theme-text-secondary)' }}
                    >
                      {m}
                    </button>
                  );
                })}
              </div>

              <label htmlFor="motivo-cancelacion" className="text-sm font-medium text-gray-700 mb-1">
                Motivo para el cliente
              </label>
              <textarea
                id="motivo-cancelacion"
                rows={3}
                value={motivo}
                onChange={(e) => setMotivo(e.target.value.slice(0, MAXIMO))}
                placeholder="Escríbalo como se lo diría en persona."
                className="w-full px-4 py-2 rounded-xl border border-gray-300 bg-white resize-none focus:outline-none focus:ring-2 focus:ring-[#00283D]"
              />
              <div className="flex justify-between mt-1 text-xs text-gray-500">
                <span>Lo va a leer tal cual.</span>
                <span>{motivo.length}/{MAXIMO}</span>
              </div>

              <div className="flex justify-center gap-4 w-full mt-6">
                <button
                  type="button"
                  onClick={onClose}
                  className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-medium px-6 py-2 rounded-full transition-colors"
                >
                  Volver
                </button>
                <button
                  type="button"
                  onClick={confirmar}
                  disabled={!listo || enviando}
                  className="bg-red-500 hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium px-6 py-2 rounded-full transition-colors"
                >
                  {enviando ? 'Cancelando…' : 'Cancelar pedido'}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default ModalCancelarPedido;

import { useState } from 'react';
import { ShieldCheck, CircleAlert } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { modalTransition } from '../../utils/motion';

// COMPROBAR EL CÓDIGO DE ENTREGA — ModalCodigoEntrega.jsx
// Lo último que pasa antes de dar un pedido por entregado: se le piden al cliente los cuatro
// dígitos que tiene en su pantalla y se escriben aquí.
const ModalCodigoEntrega = ({ isOpen, onClose, onConfirm, pedido }) => {
  const [codigo, setCodigo] = useState('');
  const [omitir, setOmitir] = useState(false);
  const [motivo, setMotivo] = useState('');
  const [enviando, setEnviando] = useState(false);

  // CADA PEDIDO EMPIEZA DE CERO, y de eso se encarga el PADRE con un `key` atado al id del pedido
  // (ver Orders.jsx).

  if (!pedido) return null;

  const numero = String(pedido._id).slice(-6).toUpperCase();
  const esDomicilio = pedido.deliveryType === 'delivery';

  // LOS PEDIDOS DE ANTES NO LLEVAN CÓDIGO.
  // Son los que ya estaban en la calle el día que se estrenó esta función.
  const sinCodigo = pedido.tieneCodigoEntrega === false;

  const listo = sinCodigo ? true : omitir ? motivo.trim().length >= 4 : codigo.length === 4;

  const confirmar = async () => {
    if (!listo || enviando) return;
    setEnviando(true);
    try {
      await onConfirm(
        sinCodigo
          ? {}
          : omitir
            ? { omitirCodigo: true, motivoOmision: motivo.trim() }
            : { codigoEntrega: codigo }
      );
    } finally {
      setEnviando(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        // z-[2000] Y NO z-60: este modal tiene que ganarle a Leaflet. En el panel no habia mapas y 60
        // alcanzaba de sobra.
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/50"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={modalTransition}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col overflow-hidden relative z-10"
          >
            <div className="p-4 text-white flex justify-center items-center gap-2 bg-[#00283D]">
              <ShieldCheck className="w-6 h-6" />
              <h2 className="text-xl font-bold text-center">Confirmar entrega</h2>
            </div>

            <div className="p-6 flex flex-col bg-[#F1F6F9]">
              <p className="text-gray-700 text-center mb-1">
                Pedido <span className="font-bold">#{numero}</span>
              </p>
              <p className="text-gray-600 text-sm text-center mb-6">
                {sinCodigo
                  ? 'Este pedido es anterior al código de entrega, así que no lleva uno. Se entrega como antes.'
                  : esDomicilio
                    ? 'Pídale al cliente los 4 dígitos que ve en su pedido.'
                    : 'Pídale al cliente los 4 dígitos antes de entregarle la bolsa.'}
              </p>

              {sinCodigo ? null : !omitir ? (
                <>
                  <label htmlFor="codigo-entrega" className="sr-only">
                    Código de entrega
                  </label>
                  <input
                    id="codigo-entrega"
                    autoFocus
                    inputMode="numeric"
                    autoComplete="off"
                    maxLength={4}
                    value={codigo}
                    // Solo dígitos. Quien lo dicta a veces lo dice separado ("cero cuatro — cinco uno") y en el
                    // mostrador se escribe con espacios o guiones de por medio.
                    onChange={(e) => setCodigo(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    onKeyDown={(e) => { if (e.key === 'Enter') confirmar(); }}
                    placeholder="0000"
                    className="w-full text-center text-3xl font-bold tracking-[0.5em] indent-[0.5em] py-3 rounded-xl border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#00283D]"
                  />

                  <button
                    type="button"
                    onClick={() => setOmitir(true)}
                    className="mt-4 text-xs text-gray-500 hover:text-gray-700 underline self-center"
                  >
                    El cliente no puede mostrar su código
                  </button>
                </>
              ) : (
                <>
                  <div className="flex items-start gap-2 mb-3 p-3 rounded-xl bg-amber-50 border border-amber-200">
                    <CircleAlert className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                    <p className="text-xs text-amber-800 leading-relaxed">
                      Se va a entregar <strong>sin comprobar</strong> quién recibe. Queda
                      guardado en el pedido junto con lo que escriba aquí.
                    </p>
                  </div>

                  <label htmlFor="motivo-omision" className="text-sm font-medium text-gray-700 mb-1">
                    ¿Por qué?
                  </label>
                  <input
                    id="motivo-omision"
                    autoFocus
                    value={motivo}
                    onChange={(e) => setMotivo(e.target.value.slice(0, 200))}
                    onKeyDown={(e) => { if (e.key === 'Enter') confirmar(); }}
                    placeholder="Recibió un familiar, se quedó sin batería…"
                    className="w-full px-4 py-2 rounded-xl border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#00283D]"
                  />

                  <button
                    type="button"
                    onClick={() => setOmitir(false)}
                    className="mt-4 text-xs text-gray-500 hover:text-gray-700 underline self-center"
                  >
                    Volver a escribir el código
                  </button>
                </>
              )}

              <div className="flex justify-center gap-4 w-full mt-6">
                <button
                  onClick={onClose}
                  className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-medium px-6 py-2 rounded-full transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmar}
                  disabled={!listo || enviando}
                  className="bg-green-500 hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-medium px-8 py-2 rounded-full transition-colors"
                >
                  {enviando ? 'Confirmando…' : 'Confirmar entrega'}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default ModalCodigoEntrega;

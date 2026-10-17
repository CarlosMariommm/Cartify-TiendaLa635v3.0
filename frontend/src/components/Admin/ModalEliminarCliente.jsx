import { useState } from 'react';
import { UserX, Trash2, Archive } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { modalTransition } from '../../utils/motion';

// ELIMINAR UN CLIENTE — ModalEliminarCliente.jsx
// No se puede deshacer, así que antes de confirmar se dice qué se va y qué se queda (lo mismo que
// promete la política de privacidad), y hay que marcar que se entiende.

const SE_VA = [
  'Su cuenta: nombre, correo, teléfono, DUI y fecha de nacimiento.',
  'Sus direcciones, tarjetas guardadas, favoritos y su foto.',
  'Sus puntos, sus reseñas y los archivos que mandó a imprimir.',
];

const SE_QUEDA = 'Sus pedidos, en la contabilidad, sin dirección ni nada que lo identifique.';

const ModalEliminarCliente = ({ cliente, onClose, onConfirm }) => {
  const [entendido, setEntendido] = useState(false);
  const [enviando, setEnviando] = useState(false);

  const confirmar = async () => {
    if (!entendido || enviando) return;
    setEnviando(true);
    try {
      await onConfirm(cliente);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <AnimatePresence>
      {cliente && (
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
            aria-labelledby="titulo-eliminar-cliente"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={modalTransition}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col overflow-hidden relative z-10 max-h-[92vh]"
          >
            <div className="p-4 text-white flex justify-center items-center gap-2 bg-red-500">
              <UserX className="w-6 h-6" />
              <h2 id="titulo-eliminar-cliente" className="text-xl font-bold text-center">Eliminar cliente</h2>
            </div>

            <div className="p-6 flex flex-col bg-[#F1F6F9] overflow-y-auto">
              <p className="text-gray-700 text-center mb-4">
                ¿Eliminar a <span className="font-bold">{cliente.fullName || 'este cliente'}</span>?
                {cliente.email && <span className="block text-sm text-gray-500">{cliente.email}</span>}
              </p>

              <div className="mb-3">
                <p className="text-sm font-semibold text-red-600 mb-1.5 flex items-center gap-1.5">
                  <Trash2 className="w-4 h-4" /> Se borra
                </p>
                <ul className="flex flex-col gap-1 text-sm text-gray-700 pl-6 list-disc">
                  {SE_VA.map((t) => <li key={t}>{t}</li>)}
                </ul>
              </div>

              <div className="mb-5">
                <p className="text-sm font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5">
                  <Archive className="w-4 h-4" /> Se queda
                </p>
                <p className="text-sm text-gray-700 pl-6">{SE_QUEDA}</p>
              </div>

              <label className="flex items-start gap-2 text-sm text-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={entendido}
                  onChange={(e) => setEntendido(e.target.checked)}
                  className="mt-0.5 w-4 h-4"
                />
                Entiendo que esto no se puede deshacer.
              </label>

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
                  disabled={!entendido || enviando}
                  className="bg-red-500 hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium px-6 py-2 rounded-full transition-colors"
                >
                  {enviando ? 'Eliminando…' : 'Eliminar cliente'}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default ModalEliminarCliente;

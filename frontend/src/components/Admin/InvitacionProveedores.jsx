import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Truck } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { supplierService } from '../../api/supplierService';
import { modalTransition } from '../../utils/motion';
import { sinCanalDePedido } from '../../utils/pedidoProveedor';
import { useTurno } from '../../utils/turnoPanel';

// ENLAZAR LOS PROVEEDORES — InvitacionProveedores.jsx
// Al abrir Proveedores, el administrador ve este aviso si algún proveedor activo todavía no tiene
// dicho por dónde se le hacen los pedidos (WhatsApp, una app como BEES o llamada).

export const CLAVE_AHORA_NO = 'cartify:proveedores-ahora-no';
export const CLAVE_NO_MOSTRAR = 'cartify:proveedores-no-mostrar';
export const RUTA_PROVEEDORES = '/proveedores';
// Un momento después de entrar, para no taparle la pantalla mientras carga.
const ESPERA_MS = 1500;

const leer = (almacen, clave) => {
  try { return almacen.getItem(clave); } catch { return null; }
};
const guardar = (almacen, clave) => {
  try { almacen.setItem(clave, '1'); } catch { /* sin almacenamiento: vuelve a salir, nada más */ }
};

const InvitacionProveedores = () => {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const [pendientes, setPendientes] = useState([]);
  const [abierta, setAbierta] = useState(false);
  const esAdmin = user?.type === 'admin';
  const enProveedores = pathname === RUTA_PROVEEDORES;

  useEffect(() => {
    if (!esAdmin || !enProveedores) return undefined;
    if (leer(localStorage, CLAVE_NO_MOSTRAR) || leer(sessionStorage, CLAVE_AHORA_NO)) return undefined;
    let vigente = true;
    const reloj = setTimeout(async () => {
      try {
        const faltan = sinCanalDePedido(await supplierService.getSuppliers());
        if (vigente && faltan.length) {
          setPendientes(faltan);
          setAbierta(true);
        }
      } catch {
        // Sin la lista de proveedores no se avisa; ya saldrá la próxima vez.
      }
    }, ESPERA_MS);
    return () => { vigente = false; clearTimeout(reloj); };
  }, [esAdmin, enProveedores]);

  // Solo en Proveedores. Y si el tutorial del apartado está abierto, espera a
  // que se cierre (ver utils/turnoPanel.js).
  const visible = useTurno('proveedores', abierta && enProveedores);

  const entendido = () => {
    guardar(sessionStorage, CLAVE_AHORA_NO);
    setAbierta(false);
  };
  const noMostrar = () => {
    guardar(localStorage, CLAVE_NO_MOSTRAR);
    setAbierta(false);
  };

  const nombres = pendientes.slice(0, 3).map((p) => p.name).join(', ');
  const resto = pendientes.length - 3;

  return (
    <AnimatePresence>
      {visible && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/50"
            onClick={entendido}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="invitacion-proveedores-titulo"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={modalTransition}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md relative z-10 p-6 flex flex-col gap-4"
          >
            <Truck className="w-8 h-8 text-[#066494]" aria-hidden="true" />
            <h2 id="invitacion-proveedores-titulo" className="text-xl font-bold text-gray-900">
              Enlace sus proveedores
            </h2>
            <p className="text-gray-700">
              Indique por dónde le hace los pedidos a cada proveedor: WhatsApp, una app como BEES o llamada.
              Toque “Editar” en cada uno y elíjalo en “Cómo se le hacen los pedidos”. Así, la compra sugerida
              del pronóstico se le pide con un toque.
            </p>
            <p className="text-sm text-gray-500">
              {pendientes.length === 1 ? 'Falta 1 proveedor' : `Faltan ${pendientes.length} proveedores`}: {nombres}
              {resto > 0 ? ` y ${resto} más` : ''}.
            </p>
            <p className="text-sm text-gray-500">
              Apps como BEES no reciben pedidos de otros sistemas: se abre la app con la lista ya copiada para pegarla.
            </p>
            <div className="flex flex-col sm:flex-row-reverse gap-2 pt-2">
              <button
                onClick={entendido}
                className="px-5 py-2 rounded-full text-sm font-medium bg-[#003049] text-white hover:bg-[#00283D]"
              >
                Entendido
              </button>
              <button
                onClick={noMostrar}
                className="px-3 py-2 text-sm text-gray-500 hover:underline sm:mr-auto"
              >
                No volver a mostrar
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default InvitacionProveedores;

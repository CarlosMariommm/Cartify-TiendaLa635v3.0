import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Truck } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { supplierService } from '../../api/supplierService';
import { modalTransition } from '../../utils/motion';
import { sinCanalDePedido } from '../../utils/pedidoProveedor';

/*
 * ============================================================
 * ENLAZAR LOS PROVEEDORES — InvitacionProveedores.jsx
 * ============================================================
 * Al entrar al panel, el administrador ve esta invitación si algún proveedor
 * activo todavía no tiene dicho por dónde se le hacen los pedidos (WhatsApp,
 * una app como BEES o llamada). Con eso, la compra sugerida del pronóstico
 * sale con un toque. Ver utils/pedidoProveedor.js.
 *
 *   "Enlazar mis proveedores"  lleva a Proveedores.
 *   "Ahora no"                 no vuelve a salir en esta sesión del navegador.
 *   "No volver a mostrar"      no vuelve a salir en este equipo.
 *
 * BEES no tiene una API pública: no se "conecta" la cuenta, se guarda el
 * enlace de la app y el botón la abre con la lista copiada. Se dice así.
 * ============================================================
 */

export const CLAVE_AHORA_NO = 'cartify:proveedores-ahora-no';
export const CLAVE_NO_MOSTRAR = 'cartify:proveedores-no-mostrar';
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
  const navegar = useNavigate();
  const [pendientes, setPendientes] = useState([]);
  const [abierta, setAbierta] = useState(false);
  const esAdmin = user?.type === 'admin';

  useEffect(() => {
    if (!esAdmin) return undefined;
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
        // Sin la lista de proveedores no se invita; ya saldrá la próxima vez.
      }
    }, ESPERA_MS);
    return () => { vigente = false; clearTimeout(reloj); };
  }, [esAdmin]);

  // Ya está en Proveedores: no hace falta invitarlo a ir.
  const visible = abierta && pathname !== '/proveedores';

  const ahoraNo = () => {
    guardar(sessionStorage, CLAVE_AHORA_NO);
    setAbierta(false);
  };
  const noMostrar = () => {
    guardar(localStorage, CLAVE_NO_MOSTRAR);
    setAbierta(false);
  };
  const enlazar = () => {
    guardar(sessionStorage, CLAVE_AHORA_NO);
    setAbierta(false);
    navegar('/proveedores');
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
            onClick={ahoraNo}
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
              Así, la compra sugerida del pronóstico se le pide con un toque.
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
                onClick={enlazar}
                className="px-5 py-2 rounded-full text-sm font-medium bg-[#003049] text-white hover:bg-[#00283D]"
              >
                Enlazar mis proveedores
              </button>
              <button
                onClick={ahoraNo}
                className="px-5 py-2 rounded-full text-sm font-medium text-gray-700 border border-gray-300 hover:bg-gray-100"
              >
                Ahora no
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

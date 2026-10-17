import { createContext, useContext, useState, useMemo, useCallback, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';
import { clientService } from '../api/clientService';
import ModalConfirmarEdad from '../components/Store/ModalConfirmarEdad';

// EDAD — EdadContext.jsx
// El candado de los productos +18, compartido por toda la tienda: la tarjeta, el detalle y el
// carrito preguntan lo mismo desde un solo lado.
const EdadContext = createContext({ mayorConfirmado: true, pedirConfirmacion: (cb) => cb?.() });

export const useEdad = () => useContext(EdadContext);

// Mientras dure la pestaña: un invitado que ya confirmó no vuelve a ver el modal.
const LLAVE = 'edadConfirmada';

export const EdadProvider = ({ children }) => {
  const { user, esCliente, actualizarUsuario } = useAuth();

  const [confirmadoSesion, setConfirmadoSesion] = useState(() => {
    try { return sessionStorage.getItem(LLAVE) === 'si'; } catch { return false; }
  });

  // Si el cliente logueado ya tiene un DUI guardado, no se le pregunta nunca.
  const mayorPorCuenta = esCliente && !!user?.dui;
  const mayorConfirmado = mayorPorCuenta || confirmadoSesion;

  const [abierto, setAbierto] = useState(false);
  const alConfirmarRef = useRef(null);

  const pedirConfirmacion = useCallback((cb) => {
    if (mayorConfirmado) { cb?.(); return; }
    alConfirmarRef.current = cb || null;
    setAbierto(true);
  }, [mayorConfirmado]);

  const cerrar = useCallback(() => {
    setAbierto(false);
    alConfirmarRef.current = null;
  }, []);

  // El modal entrega un DUI que ya validó su formato y dígito verificador.
  const confirmar = useCallback(async (dui) => {
    try { sessionStorage.setItem(LLAVE, 'si'); } catch { /* modo privado: se queda en memoria */ }
    setConfirmadoSesion(true);

    // Con sesión de cliente se guarda el DUI en su cuenta, para no volver a preguntar.
    if (esCliente && user?.id) {
      try {
        await clientService.updateProfile(user.id, { dui });
        actualizarUsuario({ dui });
      } catch { /* la barrera igual quedó levantada en esta sesión */ }
    }

    const cb = alConfirmarRef.current;
    alConfirmarRef.current = null;
    setAbierto(false);
    cb?.();
  }, [esCliente, user?.id, actualizarUsuario]);

  const valor = useMemo(
    () => ({ mayorConfirmado, pedirConfirmacion }),
    [mayorConfirmado, pedirConfirmacion]
  );

  return (
    <EdadContext.Provider value={valor}>
      {children}
      <ModalConfirmarEdad abierto={abierto} onCerrar={cerrar} onConfirmar={confirmar} />
    </EdadContext.Provider>
  );
};

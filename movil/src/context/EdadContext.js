// EDAD — el candado de los productos +18, compartido por toda la app
// Puerto de `frontend/src/context/EdadContext.jsx`. La tarjeta, la ficha del producto y el
// asistente de voz preguntan lo mismo desde un solo lado.

import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { actualizarPerfil } from '../api/clienteApi';
import ModalConfirmarEdad from '../components/Tienda/ModalConfirmarEdad';

const EdadContext = createContext({ mayorConfirmado: true, pedirConfirmacion: (cb) => cb?.() });

export const useEdad = () => useContext(EdadContext);

export const EdadProvider = ({ children }) => {
  const { user, isAuthenticated, actualizarUsuario } = useAuth();

  const [confirmadoSesion, setConfirmadoSesion] = useState(false);

  // Si ya tiene cuenta con DUI guardado, no se le pregunta nunca.
  const mayorPorCuenta = isAuthenticated && !!user?.dui;
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
    setConfirmadoSesion(true);

    // Con sesión de cliente se guarda el DUI en su cuenta, para no volver a
    // preguntar la próxima vez que abra la app.
    if (isAuthenticated && user?.id) {
      try {
        await actualizarPerfil(user.id, { dui });
        actualizarUsuario({ dui });
      } catch {
        // La barrera igual quedó levantada en esta sesión; se reintentará
        // guardar la próxima vez que confirme, si el guardado sigue fallando.
      }
    }

    const cb = alConfirmarRef.current;
    alConfirmarRef.current = null;
    setAbierto(false);
    cb?.();
  }, [isAuthenticated, user?.id, actualizarUsuario]);

  const valor = useMemo(
    () => ({ mayorConfirmado, pedirConfirmacion }),
    [mayorConfirmado, pedirConfirmacion]
  );

  return (
    <EdadContext.Provider value={valor}>
      {children}
      {abierto && <ModalConfirmarEdad alCerrar={cerrar} alConfirmar={confirmar} />}
    </EdadContext.Provider>
  );
};

export default EdadProvider;

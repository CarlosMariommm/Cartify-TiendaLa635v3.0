// LOS PEDIDOS NUEVOS SUENAN EN EL TELÉFONO — useAvisosPersonal.js
// Al entrar al modo personal (administrador o empleado), este teléfono queda apuntado para recibir
// un aviso por cada pedido que entra a la tienda (backend/src/utils/avisosPersonal.js).

import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Linking } from 'react-native';
import { usePersonal } from '../context/PersonalContext';
import { personalApi } from '../api/personalApi';
import { registrarParaAvisos } from '../utils/notificaciones';

// Lo que vale la pena reintentar al volver a la app.
const REINTENTABLES = ['sin-permiso', 'error'];

export const useAvisosPersonal = () => {
  const { sesion, recordarTokenAvisos } = usePersonal();
  const token = sesion?.token;
  const [estado, setEstado] = useState('pendiente');
  const estadoRef = useRef(estado);
  estadoRef.current = estado;
  // Si la sesión se cerró mientras se apuntaba, la baja ya salió sin este token.
  const vigente = useRef(true);

  const apuntar = useCallback(async () => {
    if (!token) return;
    const { token: tokenAvisos, motivo } = await registrarParaAvisos({ personal: true });
    if (!tokenAvisos) {
      if (vigente.current) setEstado(motivo || 'error');
      return;
    }
    try {
      await personalApi.apuntarTelefono(token, tokenAvisos);
      if (!vigente.current) {
        personalApi.salir(tokenAvisos);
        return;
      }
      recordarTokenAvisos(tokenAvisos);
      setEstado('activos');
    } catch {
      if (vigente.current) setEstado('error');
    }
  }, [token, recordarTokenAvisos]);

  useEffect(() => {
    vigente.current = true;
    apuntar();
    const sub = AppState.addEventListener('change', (ahora) => {
      if (ahora === 'active' && REINTENTABLES.includes(estadoRef.current)) apuntar();
    });
    return () => {
      vigente.current = false;
      sub.remove();
    };
  }, [apuntar]);

  const abrirAjustes = useCallback(() => {
    Linking.openSettings().catch(() => null);
  }, []);

  return { estado, abrirAjustes };
};

/*
 * ============================================================
 * LOS PEDIDOS NUEVOS SUENAN EN EL TELÉFONO — useAvisosPersonal.js
 * ============================================================
 * Al entrar al modo personal (administrador o empleado), este teléfono queda
 * apuntado para recibir un aviso por cada pedido que entra a la tienda
 * (backend/src/utils/avisosPersonal.js). Al cerrar sesión se da de baja
 * (PersonalContext.salir): desde ahí ya no le llega ninguno.
 *
 * Se apunta cada vez que se abre la app y no una sola vez: si el teléfono
 * cambió de token (reinstalar, borrar datos) o el servidor estaba dormido, la
 * siguiente apertura lo arregla sola.
 *
 * `estado` dice si quedó funcionando:
 *   'activos'      apuntado; los pedidos nuevos suenan aquí.
 *   'sin-permiso'  el teléfono tiene los avisos de la app apagados. Se le
 *                  ofrece abrir los ajustes, y al volver se intenta de nuevo.
 *   'error'        no se pudo hablar con el servidor; se reintenta al volver
 *                  a la app.
 *   'emulador' / 'sin-proyecto' / 'pendiente'   no hay nada que mostrar.
 * ============================================================
 */

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

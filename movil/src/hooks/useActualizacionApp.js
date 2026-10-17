// LA ACTUALIZACIÓN DE LA APP, AL MOMENTO — useActualizacionApp.js
// Los arreglos de la app llegan por internet (expo-updates, ver app.json): la app baja la versión
// nueva al abrirse, pero la ESTRENA hasta la siguiente vez que se abre desde cero.

import { useCallback, useEffect } from 'react';
import { AppState } from 'react-native';
import * as Updates from 'expo-updates';

// "9 oct, 6:35 p. m.", para decir de cuándo es la versión que corre.
const fechaCorta = (fecha) => {
  if (!fecha) return '';
  try {
    return new Date(fecha).toLocaleString('es-SV', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
  } catch {
    return '';
  }
};

export const useActualizacionApp = () => {
  const { isUpdatePending, currentlyRunning } = Updates.useUpdates();

  const buscar = useCallback(async () => {
    if (!Updates.isEnabled) return;
    try {
      const { isAvailable } = await Updates.checkForUpdateAsync();
      if (isAvailable) await Updates.fetchUpdateAsync();
    } catch {
      // Sin internet o el servidor de actualizaciones no contestó: se intenta la próxima vez.
    }
  }, []);

  useEffect(() => {
    buscar();
    const suscripcion = AppState.addEventListener('change', (estado) => {
      if (estado === 'active') buscar();
    });
    return () => suscripcion.remove();
  }, [buscar]);

  const aplicar = useCallback(() => {
    Updates.reloadAsync().catch(() => null);
  }, []);

  const id = currentlyRunning?.updateId;
  return {
    // Ya la bajó y espera que se reinicie para estrenarla.
    lista: Updates.isEnabled && isUpdatePending,
    aplicar,
    // "de fábrica" = la que venía en la APK, sin ninguna actualización encima.
    version: id ? `${id.slice(0, 8)}${currentlyRunning?.createdAt ? ` · ${fechaCorta(currentlyRunning.createdAt)}` : ''}` : 'de fábrica',
  };
};

export default useActualizacionApp;

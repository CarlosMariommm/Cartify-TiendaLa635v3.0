// EL BOTÓN DE ATRÁS DE ANDROID — useBotonAtras.js
// En Android, el botón de atrás del sistema cierra la app si nadie lo atiende.

import { useEffect } from 'react';
import { BackHandler } from 'react-native';

export const useBotonAtras = (alPresionar, activo = true) => {
  useEffect(() => {
    if (!activo) return;

    const suscripcion = BackHandler.addEventListener('hardwareBackPress', () => {
      alPresionar();
      // `true` = "yo me encargo": sin esto, además de cerrar la hoja, Android
      // seguiría su camino y cerraría también la pantalla de atrás.
      return true;
    });

    return () => suscripcion.remove();
  }, [alPresionar, activo]);
};

export default useBotonAtras;

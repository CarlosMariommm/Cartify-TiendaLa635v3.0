// EL TELÉFONO DEL CLIENTE QUEDA APUNTADO — RegistroAvisos.js
// Para que una oferta, o "tu pedido va en camino", suene en el teléfono, el servidor tiene que
// saber a qué teléfono mandarlo (el token de Expo).

import { useEffect } from 'react';
import { Platform } from 'react-native';
import { useAuth } from '../../hooks/useAuth';
import { registrarTokenPush } from '../../api/clienteApi';
import { registrarParaAvisos, sePuedePreguntar, tokenActual } from '../../utils/notificaciones';
import { guardar, leer, llave } from '../../utils/almacen';

const LLAVE_PREGUNTADO = llave('cartify', 'avisos-preguntado');
const ESPERA_ANTES_DE_PREGUNTAR_MS = 3000;

const RegistroAvisos = () => {
  const { user } = useAuth();

  useEffect(() => {
    // En la vista web de la app (solo para probar) no hay avisos de Expo.
    if (!user?.id || Platform.OS === 'web') return undefined;
    let vivo = true;
    let reloj = null;

    const apuntar = (token) => {
      if (token && vivo) registrarTokenPush(user.id, token).catch(() => null);
    };

    (async () => {
      const token = await tokenActual();
      if (token) {
        apuntar(token);
        return;
      }
      if (!(await sePuedePreguntar()) || (await leer(LLAVE_PREGUNTADO))) return;
      reloj = setTimeout(async () => {
        if (!vivo) return;
        guardar(LLAVE_PREGUNTADO, '1');
        const { token: nuevo } = await registrarParaAvisos();
        apuntar(nuevo);
      }, ESPERA_ANTES_DE_PREGUNTAR_MS);
    })().catch(() => null);

    return () => {
      vivo = false;
      if (reloj) clearTimeout(reloj);
    };
  }, [user?.id]);

  return null;
};

export default RegistroAvisos;

import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { clientService } from '../api/clientService';
import { useIdioma } from './useIdioma';

// DARSE DE BAJA DE UN AVISO — useBajaNotificaciones.js
// Lo que pasa al tocar "Dejar de recibirlos" en el pie de un correo.

export const useBajaNotificaciones = () => {
  const { t } = useIdioma();
  const NOMBRES = {
    promociones: t('las promociones'),
    nuevosProductos: t('los productos nuevos'),
    pedidoCerca: t('el correo de tu pedido en camino'),
  };
  const [params] = useSearchParams();
  const token = params.get('t');

  // "No hay token" se sabe en el primer render, así que el estado nace ya resuelto en vez de
  // arrancar en "aplicando" y corregirse dentro del efecto.
  const SIN_TOKEN = t('Este enlace está incompleto. Puedes apagar los avisos desde Mi Cuenta › Notificaciones.');

  const [estado, setEstado] = useState(token ? 'aplicando' : 'error'); // aplicando | listo | error
  const [mensaje, setMensaje] = useState(token ? '' : SIN_TOKEN);
  const [clave, setClave] = useState(null);

  // En StrictMode el efecto corre dos veces en desarrollo, y esto escribe en la base. La segunda
  // llamada no rompe nada —apagar algo ya apagado da lo mismo— pero ensucia los registros del
  // servidor con una baja duplicada por cada visita. Un candado y se acabó.
  const yaSeAplico = useRef(false);

  useEffect(() => {
    // Sin token no hay nada que pedirle al servidor; el estado ya nació en error.
    if (!token || yaSeAplico.current) return;
    yaSeAplico.current = true;

    clientService
      .bajaNotificacion(token)
      .then((res) => {
        setClave(res?.clave || null);
        setEstado('listo');
      })
      .catch((error) => {
        setEstado('error');
        setMensaje(error?.message || t('No se pudo aplicar. Intenta desde Mi Cuenta › Notificaciones.'));
      });
  }, [token, t]);

  return {
    estado,
    mensaje,
    // "las promociones", para poder decir de qué exactamente se dio de baja en
    // vez de un "listo" que no aclara qué se apagó.
    queSeApago: NOMBRES[clave] || t('esos correos'),
  };
};

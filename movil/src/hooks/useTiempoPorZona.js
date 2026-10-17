import { useEffect, useState } from 'react';
import { getTiempoPorZona } from '../api/pedidosApi';

// useTiempoPorZona — cuánto se ha tardado en llegar a un punto, según las entregas ya hechas por
// ahí.
export const useTiempoPorZona = (lat, lng) => {
  const [zona, setZona] = useState({ hayDatos: false });

  useEffect(() => {
    if (lat == null || lng == null) {
      setZona({ hayDatos: false });
      return;
    }

    let vivo = true;
    getTiempoPorZona(lat, lng)
      .then((r) => vivo && setZona(r || { hayDatos: false }))
      // Que falle no dice nada: mejor callarse que inventar un tiempo.
      .catch(() => vivo && setZona({ hayDatos: false }));

    return () => {
      vivo = false;
    };
  }, [lat, lng]);

  return zona;
};

export default useTiempoPorZona;

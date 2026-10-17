import { useState, useEffect } from 'react';
import { orderService } from '../api/orderService';
import { useIdioma } from './useIdioma';

// TIEMPO POR ZONA — useTiempoPorZona.js
// Cuánto tardamos en llegar a SU zona, calculado con las entregas que ya hicimos por ahí.
export const useTiempoPorZona = (lat, lng) => {
  // El punto va DENTRO de la respuesta guardada. Así, al cambiar de dirección, lo de la anterior se
  // descarta al comparar en vez de tener que limpiarlo con un setState dentro del efecto (que
  // provoca un render de más y deja ver por un instante el tiempo de la otra zona).
  const clave = lat != null && lng != null ? `${lat},${lng}` : null;
  const [datos, setDatos] = useState(null);
  const { t } = useIdioma();

  useEffect(() => {
    // Sin punto en el mapa no hay zona que consultar: pasa con las
    // direcciones viejas, que se guardaron como texto suelto.
    if (!clave) return;

    let vivo = true;

    orderService
      .getTiempoPorZona(lat, lng)
      .then((r) => { if (vivo) setDatos({ clave, ...r }); })
      // Si la consulta falla, se guarda el "no hay datos" igual: la pantalla
      // simplemente no dice nada, que es mejor que quedarse cargando para
      // siempre.
      .catch(() => { if (vivo) setDatos({ clave, hayDatos: false }); });

    return () => { vivo = false; };
  }, [clave, lat, lng]);

  // Lo de otra dirección no cuenta.
  const actual = clave && datos?.clave === clave ? datos : null;
  const cargando = !!clave && !actual;

  // El texto ya armado, para que las pantallas no repitan la misma frase cada una a su manera. Se
  // habla en rango (típico → holgado) porque un número solo se lee como promesa, y el tráfico no lo
  // controlamos.
  const texto = actual?.hayDatos
    ? (actual.tipico === actual.holgado
        ? t('Llega en unos {n} min', { n: actual.tipico })
        : t('Llega entre {min} y {max} min', { min: actual.tipico, max: actual.holgado }))
    : '';

  const respaldo = actual?.hayDatos
    ? t(actual.entregas === 1 ? 'Según {n} entrega a tu zona' : 'Según {n} entregas a tu zona', { n: actual.entregas })
    : '';

  return {
    hayDatos: !!actual?.hayDatos,
    entregas: actual?.entregas || 0,
    tipico: actual?.tipico ?? null,
    holgado: actual?.holgado ?? null,
    texto,
    respaldo,
    cargando,
  };
};

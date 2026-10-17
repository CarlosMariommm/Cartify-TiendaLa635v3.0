// AJUSTES DE LA TIENDA — useAjustesTienda.js
// El nombre (o el logo) que puso el dueño en Personalización, del lado del teléfono.

import { useCallback, useEffect, useState } from 'react';
import peticion from '../api/api';

const DE_RESPALDO = {
  nombreLinea1: 'Tienda',
  nombreLinea2: 'la 635',
  logoUrl: '',
};

export const useAjustesTienda = () => {
  const [ajustes, setAjustes] = useState(DE_RESPALDO);

  const cargar = useCallback(async () => {
    try {
      const datos = await peticion('/storeSettings');
      setAjustes({ ...DE_RESPALDO, ...(datos || {}) });
    } catch {
      // Se deja el respaldo puesto.
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  return { ajustes };
};

export default useAjustesTienda;

import { useMemo } from 'react';
import { useTemaCalculado } from './useTemporada';
import { useAjustesCtx } from '../context/AjustesContext';
import { disfrazDeTema } from '../utils/disfracesTiqui';

// El disfraz que lleva Tiqui AQUÍ, en esta pantalla. Ver utils/disfracesTiqui.js. Sigue las mismas
// reglas que la decoración de la temporada, porque es parte de ella: - Solo en el área del
// cliente.
export const useDisfrazTiqui = () => {
  const { tema, activo, conDecoracion } = useTemaCalculado();
  const { ajustes } = useAjustesCtx();
  const disfraces = ajustes.temporada?.disfraces;
  return useMemo(
    () => (activo && conDecoracion ? disfrazDeTema(tema, disfraces) : null),
    [tema, activo, conDecoracion, disfraces]
  );
};

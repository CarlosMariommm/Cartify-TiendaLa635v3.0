// CÓMO ES LA PANTALLA — useDisposicion.js
// Teléfono o tablet, parado o acostado, y de ahí cuántas columnas caben.

import { useWindowDimensions } from 'react-native';
import { LADO_TABLET, anchoDeCelda, columnasPara } from '../utils/disposicion';

export const useDisposicion = () => {
  const { width, height } = useWindowDimensions();
  const esTablet = Math.min(width, height) >= LADO_TABLET;
  const columnas = columnasPara(width, esTablet);
  return {
    ancho: width,
    alto: height,
    esTablet,
    acostado: width > height,
    columnas,
    anchoCelda: anchoDeCelda(width, columnas),
    escala: esTablet ? 1.45 : 1,
  };
};

export default useDisposicion;

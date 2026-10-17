// "MENOS MOVIMIENTO" — useMovimientoReducido.js
// Si la persona lo pidió en los ajustes de su teléfono (tercera edad, migrañas, mareo), lo que se
// mueve por adorno se queda quieto: Tiqui deja de columpiarse y los avisos aparecen sin rebote.

import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

export const useMovimientoReducido = () => {
  const [reducido, setReducido] = useState(false);
  useEffect(() => {
    let vivo = true;
    AccessibilityInfo.isReduceMotionEnabled?.().then((si) => vivo && setReducido(!!si)).catch(() => {});
    const sub = AccessibilityInfo.addEventListener?.('reduceMotionChanged', (si) => setReducido(!!si));
    return () => {
      vivo = false;
      sub?.remove?.();
    };
  }, []);
  return reducido;
};

export default useMovimientoReducido;

import { useEffect, useState } from 'react';
import { Linking } from 'react-native';
import { irATabs, useArranqueResuelto } from '../../navigation/navigationRef';
import { idDeProductoEnEnlace, pedirProducto } from '../../utils/enlaces';

// EnlacesEntrantes — el enlace con el que se abrió la app, o que llegó con la app ya abierta,
// lleva a donde apunta. Hoy: un producto (/producto/:id). Es el mismo trabajo que hace
// AvisosTocados con los avisos, y vive a su lado en App.js.
const EnlacesEntrantes = () => {
  const arranque = useArranqueResuelto();
  const [enlace, setEnlace] = useState(null);

  useEffect(() => {
    // La app estaba cerrada y la abrió el enlace.
    Linking.getInitialURL().then((url) => { if (url) setEnlace(url); }).catch(() => {});
    // La app ya estaba abierta.
    const sub = Linking.addEventListener('url', ({ url }) => setEnlace(url));
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (!enlace || !arranque) return;
    const id = idDeProductoEnEnlace(enlace);
    if (id) {
      irATabs('inicio');
      pedirProducto(id);
    }
    setEnlace(null);
  }, [enlace, arranque]);

  return null;
};

export default EnlacesEntrantes;

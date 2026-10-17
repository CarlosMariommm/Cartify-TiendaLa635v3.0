import { useState, useEffect } from 'react';
import { moduleService } from '../api/moduleService';
import { modulosVisibles, flujoDeModulo } from '../utils/modulos';

// useModulos — los pasillos de la tienda, tal como los ve el cliente. Ahora la lista sale de la
// base, así que crear un módulo en el panel basta para que aparezca.
export const useModulos = () => {
  const [modulos, setModulos] = useState([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    let vivo = true;
    moduleService.getModules()
      .then((d) => { if (vivo) setModulos(modulosVisibles(d)); })
      .catch(() => { if (vivo) setModulos([]); })
      .finally(() => { if (vivo) setCargando(false); });
    return () => { vivo = false; };
  }, []);

  // Puente temporal: Impresiones nunca se cargó como módulo en la base, vivía escrito a mano en la
  // pantalla de servicios. Si se quita el código y nadie creó el módulo, el cliente se queda sin
  // poder imprimir. Mientras no exista el registro, se agrega uno de mentira para no romper nada.
  const hayImpresiones = modulos.some((m) => flujoDeModulo(m) === 'impresiones');
  const listaCompleta = hayImpresiones
    ? modulos
    : [...modulos, {
        _id: 'impresiones-pendiente',
        name: 'Impresiones',
        description: 'Imprime tus archivos aquí',
        icono: 'impresiones',
        flujo: 'impresiones',
      }];

  // Los que se recorren dentro de la tienda (los que no tienen flujo propio).
  const pasillos = listaCompleta.filter((m) => flujoDeModulo(m) === 'estandar');

  return { modulos: listaCompleta, pasillos, cargando };
};

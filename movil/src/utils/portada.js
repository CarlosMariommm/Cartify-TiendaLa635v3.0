// BLOQUES DE LA PORTADA — portada.js
// Copia de `frontend/src/utils/portada.js`: qué filas se ven en la portada y en qué orden, según lo
// que eligió el dueño en Panel › Personalización › Portada.

// El catálogo. El ORDEN de este arreglo es el orden por defecto — el que ve una tienda recién
// instalada que nunca entró a personalizar nada. `fija` marca las filas que el sistema arma
// siempre igual.
export const BLOQUES_PORTADA = [
  {
    clave: 'promos',
    nombre: 'Promociones',
    descripcion: 'El carrusel de ofertas, arriba del todo.',
    fija: true,
  },
  {
    clave: 'mas-vendidos',
    nombre: 'Más vendidos',
    descripcion: 'Lo que más sale, en una fila que se desliza de lado.',
    fija: true,
  },
  {
    clave: 'volver-a-comprar',
    nombre: 'Volver a comprar',
    descripcion: 'Lo que ese cliente ya llevó antes. En abarrotes es la fila más útil que existe.',
    fija: false,
  },
  {
    clave: 'por-acabarse',
    nombre: 'Se están acabando',
    descripcion: 'Lo que queda poco, medido contra el tope de cada producto. Urgencia real, no inventada.',
    fija: false,
  },
  {
    clave: 'nuevos',
    nombre: 'Nuevos en la tienda',
    descripcion: 'Lo último que se agregó al inventario.',
    fija: false,
  },
  {
    clave: 'familias',
    nombre: 'Estantes automáticos',
    descripcion: 'Quesos, bebidas energizantes, limpieza… los reconoce el clasificador. Van todos juntos o ninguno.',
    fija: false,
  },
];

export const CLAVES_DE_PORTADA = BLOQUES_PORTADA.map((b) => b.clave);

export const bloquePorClave = (clave) => BLOQUES_PORTADA.find((b) => b.clave === clave);

// Las filas que arma useSeccionesTienda tienen claves propias: las tres conocidas y luego
// "familia-quesos", "familia-bebidas"…
export const bloqueDeSeccion = (claveDeSeccion = '') =>
  claveDeSeccion.startsWith('familia-') ? 'familias' : claveDeSeccion;

// Junta lo guardado con el catálogo y devuelve la lista lista para pintar o para editar: en orden,
// sin claves que ya no existan y sin dejar fuera las que se agregaron al catálogo después de la
// última vez que se guardó.
export const resolverPortada = (guardadas = []) => {
  const porClave = new Map(
    (guardadas || [])
      .filter((s) => s && CLAVES_DE_PORTADA.includes(s.clave))
      .map((s) => [s.clave, s])
  );

  return BLOQUES_PORTADA
    .map((bloque, indiceEnCatalogo) => {
      const guardada = porClave.get(bloque.clave);
      return {
        ...bloque,
        visible: guardada ? guardada.visible !== false : true,
        // Sin nada guardado manda el orden del catálogo. El +100 empuja los
        // bloques nuevos al final en vez de mezclarlos con los ya acomodados.
        orden: guardada && Number.isFinite(Number(guardada.orden))
          ? Number(guardada.orden)
          : indiceEnCatalogo + (porClave.size ? 100 : 0),
      };
    })
    .sort((a, b) => a.orden - b.orden)
    // El orden se normaliza a 0,1,2… para que no se vayan acumulando huecos
    // cada vez que alguien mueve una fila.
    .map((bloque, i) => ({ ...bloque, orden: i }));
};

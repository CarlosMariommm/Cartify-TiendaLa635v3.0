import { useMemo } from 'react';
import { useIdioma } from './useIdioma';

// POR DÓNDE PASÓ — useRastroTienda.js
// El camino que hizo la persona hasta llegar al producto que está viendo, en escalones que se
// pueden pisar para devolverse a cualquiera de ellos. Dos problemas.

export const useRastroTienda = ({
  moduloSeleccionado,
  setModuloSeleccionado,
  nombrePasillo,
  categoriaSeleccionada,
  setCategoriaSeleccionada,
  terminoBusqueda,
  setTerminoBusqueda,
  promoSeleccionada,
  setPromoSeleccionada,
}) => {
  const { t } = useIdioma();
  return useMemo(() => {
    // Dejar la tienda en blanco. Es lo que hace "Inicio", y también el punto
    // de partida de cualquier otro escalón: cada uno vuelve a poner lo suyo.
    const limpiarTodo = () => {
      setModuloSeleccionado?.(null);
      setCategoriaSeleccionada?.(null);
      setTerminoBusqueda?.('');
      setPromoSeleccionada?.(null);
    };

    const escalones = [
      {
        etiqueta: t('Inicio'),
        alTocar: () => { limpiarTodo(); },
      },
    ];

    // El pasillo. Va primero porque en la tienda manda sobre todo lo demás: estando en Panadería, las
    // categorías y la búsqueda son de la panadería.
    if (moduloSeleccionado && nombrePasillo) {
      escalones.push({
        etiqueta: nombrePasillo,
        alTocar: () => {
          limpiarTodo();
          setModuloSeleccionado?.(moduloSeleccionado);
        },
      });
    }

    if (categoriaSeleccionada) {
      escalones.push({
        etiqueta: categoriaSeleccionada,
        alTocar: () => {
          // La categoría se conserva; la búsqueda y la promo, que son más
          // finas que ella, se van.
          setTerminoBusqueda?.('');
          setPromoSeleccionada?.(null);
          setCategoriaSeleccionada?.(categoriaSeleccionada);
        },
      });
    }

    // La búsqueda entrecomillada. No es una página, pero para quien buscó es el sitio del que viene, y
    // sin ella el camino se saltaba el paso donde de verdad encontró el producto.
    if (terminoBusqueda) {
      escalones.push({
        etiqueta: `"${terminoBusqueda}"`,
        alTocar: () => { setPromoSeleccionada?.(null); },
      });
    }

    if (promoSeleccionada) {
      escalones.push({
        etiqueta: promoSeleccionada.title || promoSeleccionada.promoDescription || t('Promoción'),
        // Ya se está viendo la promo filtrada: cerrar la ficha basta.
        alTocar: () => {},
      });
    }

    return escalones;
  }, [
    moduloSeleccionado, setModuloSeleccionado, nombrePasillo,
    categoriaSeleccionada, setCategoriaSeleccionada,
    terminoBusqueda, setTerminoBusqueda,
    promoSeleccionada, setPromoSeleccionada, t,
  ]);
};

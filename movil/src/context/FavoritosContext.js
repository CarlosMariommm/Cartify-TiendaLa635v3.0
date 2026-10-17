// FAVORITOS — el corazón de las tarjetas
// Copia del contrato de `useFavoritos` en la web: `esFavorito(id)` y `alternar(id, nombre)`. ──
// Vive en la cuenta, no en el teléfono ──

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { getFavoritos, alternarFavorito } from '../api/favoritosApi';
import { useAuth } from '../hooks/useAuth';
import { useAviso } from './AvisoContext';
import { tAhora } from '../utils/idioma';

const FavoritosContext = createContext(null);

export const FavoritosProvider = ({ children, alPedirSesion }) => {
  const { user } = useAuth();
  const { avisar } = useAviso();
  const [ids, setIds] = useState([]);

  // Solo los clientes tienen favoritos: pedirlos con un id de admin daría 404.
  const esCliente = user?.type === 'client' && !!user?.id;

  const cargar = useCallback(async () => {
    if (!esCliente) {
      // Al cerrar sesión se vacía: si no, los corazones del anterior se
      // quedarían encendidos para el siguiente que entre.
      setIds([]);
      return;
    }
    try {
      const lista = await getFavoritos(user.id);
      setIds((Array.isArray(lista) ? lista : []).map((p) => String(p._id)));
    } catch {
      // Que falle la lista de favoritos no puede tumbar la tienda. Los corazones salen apagados, que es
      // un estado honesto: no sabemos cuáles marcó, así que no encendemos ninguno.
    }
  }, [esCliente, user?.id]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const esFavorito = useCallback((productoId) => ids.includes(String(productoId)), [ids]);

  const alternar = useCallback(
    async (productoId, nombre = tAhora('El producto')) => {
      if (!esCliente) {
        avisar(tAhora('Inicia sesión para guardar tus favoritos'));
        // Se le lleva a entrar, pero no se le arrastra: estaba viendo un
        // producto, no buscando su cuenta.
        alPedirSesion?.();
        return;
      }

      const id = String(productoId);
      const estaba = ids.includes(id);

      // Optimista: el corazón responde al instante.
      setIds((prev) => (estaba ? prev.filter((x) => x !== id) : [...prev, id]));

      try {
        await alternarFavorito(user.id, id);
        avisar(
          estaba ? tAhora('{nombre} salió de favoritos', { nombre }) : tAhora('{nombre} guardado en favoritos', { nombre }),
          estaba ? 'sinFavorito' : 'favorito'
        );
      } catch {
        // Se deshace.
        setIds((prev) => (estaba ? [...prev, id] : prev.filter((x) => x !== id)));
        avisar(tAhora('No se pudo guardar el favorito'), 'error');
      }
    },
    [esCliente, ids, user?.id, avisar, alPedirSesion]
  );

  const valor = useMemo(
    () => ({ ids, esFavorito, alternar, recargar: cargar }),
    [ids, esFavorito, alternar, cargar]
  );

  return <FavoritosContext.Provider value={valor}>{children}</FavoritosContext.Provider>;
};

export const useFavoritos = () => {
  const ctx = useContext(FavoritosContext);
  if (!ctx) throw new Error('useFavoritos debe usarse dentro de <FavoritosProvider>');
  return ctx;
};

// navigationRef — para navegar desde fuera de una pantalla. FavoritosProvider necesita poder
// mandar a la pantalla de entrar cuando se toca un corazón sin sesión, y vive por fuera del
// NavigationContainer (envuelve a toda la app, incluido el árbol de navegación).

import { useSyncExternalStore } from 'react';
import { createNavigationContainerRef } from '@react-navigation/native';

export const navigationRef = createNavigationContainerRef();

export const destinoPendiente = { current: null };

// Se pone en `true` la primera vez que se resuelve el arranque (sesión
// restaurada o no). Antes de eso, un cambio de `isAuthenticated` es el propio
// arranque resolviéndose y no un login interactivo — ver RootNavigator.
export const arranqueResuelto = { current: false };

// Quien solo necesita LEER `.current` dentro de un efecto (AuthWatcher) le alcanza con el ref de
// arriba.
const oyentesArranque = new Set();

export const marcarArranqueResuelto = () => {
  if (arranqueResuelto.current) return;
  arranqueResuelto.current = true;
  oyentesArranque.forEach((fn) => fn());
};

export const useArranqueResuelto = () =>
  useSyncExternalStore(
    (fn) => {
      oyentesArranque.add(fn);
      return () => oyentesArranque.delete(fn);
    },
    () => arranqueResuelto.current
  );

export const navegarA = (nombre, params) => {
  if (navigationRef.isReady()) {
    navigationRef.navigate(nombre, params);
  }
};

// La ficha de un producto, como su propia página (pages/Producto.js), igual que en la web. Va por
// id: la pila distingue una página de otra por él (RootNavigator, getId), así que abrir un
// recomendado apila su página encima y tocar dos veces el mismo no abre dos.
export const abrirProducto = (producto) => {
  const id = producto?.id ?? producto;
  if (id != null) navegarA('Producto', { id: String(id) });
};

// A dónde cae quien acaba de autenticarse: al apartado pendiente si lo había,
// o a la tienda. `Carrito` es un caso aparte porque no es un apartado de la
// barra de abajo, sino una pantalla suelta encima de ella.
export const irATabs = (destino) => {
  if (!navigationRef.isReady()) return;

  if (destino === 'Carrito') {
    navigationRef.reset({ index: 1, routes: [{ name: 'Tabs' }, { name: 'Carrito' }] });
    return;
  }

  navigationRef.reset({
    index: 0,
    routes: [{ name: 'Tabs', state: destino ? { routes: [{ name: destino }] } : undefined }],
  });
};

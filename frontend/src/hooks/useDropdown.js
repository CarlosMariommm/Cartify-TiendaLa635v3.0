import { useState, useRef, useEffect, useCallback } from 'react';

// useDropdown — encapsula TODA la lógica de un menú desplegable: abrir/cerrar, cerrar al hacer
// clic afuera y cerrar con la tecla Escape. Así el componente que lo use queda "tonto": solo pinta
// y consume esto. (Sigue la regla del proyecto: la lógica va en hooks, no en el componente.)
export const useDropdown = () => {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef(null); // se ancla al contenedor para detectar clics "afuera"

  const toggle = useCallback(() => setIsOpen((open) => !open), []);
  const close = useCallback(() => setIsOpen(false), []);

  useEffect(() => {
    // Si está cerrado no hace falta escuchar nada: ahorramos listeners.
    if (!isOpen) return;

    const handleClickOutside = (event) => {
      if (ref.current && !ref.current.contains(event.target)) close();
    };
    const handleEscape = (event) => {
      if (event.key === 'Escape') close();
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    // Limpieza: quitamos los listeners al cerrar o desmontar.
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, close]);

  return { isOpen, toggle, close, ref };
};

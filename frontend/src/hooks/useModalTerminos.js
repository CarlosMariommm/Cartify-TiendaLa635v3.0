import { useCallback, useEffect, useRef, useState } from 'react';

// useModalTerminos — leer las condiciones sin salir del formulario El primer intento fue un enlace
// con target="_blank": pestaña nueva, el formulario intacto atrás. En un navegador de escritorio
// funciona.

export const useModalTerminos = () => {
  const [abierto, setAbierto] = useState(false);
  // Qué documento se abre: la casilla enlaza los términos Y la privacidad.
  const [clave, setClave] = useState('terminos');
  // Quién lo abrió, para devolverle el foco al cerrar.
  const origen = useRef(null);

  const abrir = useCallback((evento, documento = 'terminos') => {
    origen.current = evento?.currentTarget || null;
    setClave(documento);
    setAbierto(true);
  }, []);

  const cerrar = useCallback(() => setAbierto(false), []);

  // El foco vuelve al botón que abrió el documento. Va en un efecto y no dentro de `cerrar` por una
  // razón que costó verla: al cerrar, el elemento enfocado (el botón de cerrar del modal) se
  // desmonta, y el navegador manda el foco al <body>.
  useEffect(() => {
    if (abierto || !origen.current) return;
    origen.current.focus?.();
    origen.current = null;
  }, [abierto]);

  // Escape. Solo mientras está abierto: dejar el listener puesto todo el
  // tiempo le quitaría la tecla a lo que la persona esté haciendo de verdad.
  useEffect(() => {
    if (!abierto) return;
    const alTeclear = (evento) => { if (evento.key === 'Escape') cerrar(); };
    window.addEventListener('keydown', alTeclear);
    return () => window.removeEventListener('keydown', alTeclear);
  }, [abierto, cerrar]);

  // El fondo se queda quieto. Se guarda el valor previo en vez de asumir que estaba vacío, para no
  // pisar un bloqueo que ya hubiera puesto otra cosa.
  useEffect(() => {
    if (!abierto) return;
    const previo = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previo; };
  }, [abierto]);

  return { abierto, abrir, cerrar, clave };
};

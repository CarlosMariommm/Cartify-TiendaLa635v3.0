import { useState, useEffect, useCallback, useRef } from 'react';
import QRCode from 'qrcode';
import { kioscoService } from '../api/kioscoService';

// KIOSCO — useKiosco.js
// "¿A nombre de quién va esta compra?", resuelto con la cámara del cliente.

const CADA_CUANTO_MS = 3000; // se pregunta si ya escanearon

export const useKiosco = () => {
  const [codigo, setCodigo] = useState('');
  const [imagenQR, setImagenQR] = useState('');
  const [cliente, setCliente] = useState(null);
  const [abriendo, setAbriendo] = useState(false);
  const [error, setError] = useState('');

  const codigoRef = useRef('');

  // Abre la sesión y dibuja el QR. El QR lleva la dirección completa —no solo el código— para que el
  // teléfono abra la página de una vez. Un QR que muestra "C265B4" y espera que la persona adivine
  // qué hacer con eso no le sirve a nadie.
  const abrir = useCallback(async () => {
    setAbriendo(true);
    setError('');
    setCliente(null);
    try {
      const sesion = await kioscoService.crearSesion();
      setCodigo(sesion.codigo);
      codigoRef.current = sesion.codigo;

      const url = `${window.location.origin}/vincular/${sesion.codigo}`;
      const png = await QRCode.toDataURL(url, {
        margin: 1,
        width: 320,
        // Alto contraste y corrección de errores media: la pantalla del
        // kiosco tiene reflejos y la cámara de un teléfono viejo no perdona.
        errorCorrectionLevel: 'M',
        color: { dark: '#1C1614', light: '#FFFFFF' },
      });
      setImagenQR(png);
    } catch {
      setError('No se pudo abrir la sesión. Intenta de nuevo.');
    } finally {
      setAbriendo(false);
    }
  }, []);

  // Mientras el QR está en pantalla, se pregunta si ya lo escanearon. Se corta solo en cuanto
  // alguien la reclama: seguir preguntando por una sesión ya vinculada es gastar por gusto.
  useEffect(() => {
    if (!codigo || cliente) return;

    let vivo = true;
    const preguntar = async () => {
      try {
        const estado = await kioscoService.verSesion(codigo);
        if (!vivo) return;
        if (estado?.cliente) setCliente(estado.cliente);
      } catch {
        /* el código venció o no hay red; el kiosco sigue funcionando sin cuenta */
      }
    };

    const reloj = setInterval(preguntar, CADA_CUANTO_MS);
    return () => { vivo = false; clearInterval(reloj); };
  }, [codigo, cliente]);

  // Se cobró: el mismo QR no vuelve a servir.
  const cerrar = useCallback(async () => {
    if (!codigoRef.current) return;
    try { await kioscoService.cerrar(codigoRef.current); } catch { /* da igual: expira solo */ }
    setCodigo('');
    setImagenQR('');
    setCliente(null);
    codigoRef.current = '';
  }, []);

  // Quitar la cuenta sin cobrar: por si alguien escaneó por error.
  const desvincular = useCallback(() => setCliente(null), []);

  return { codigo, imagenQR, cliente, abriendo, error, abrir, cerrar, desvincular };
};

import { useMemo } from 'react';
import { enlaceWhatsApp, DIRECCION_EN_UNA_LINEA, WHATSAPP } from '../utils/tienda';
import { useIdioma } from './useIdioma';

// useCentroAyuda — qué se le puede ofrecer al cliente que llegó buscando ayuda.
// Muestra solo los canales que de verdad tiene la tienda (los de Personalización).

// El mensaje ya escrito le ahorra al cliente tener que explicar de dónde viene.
// Va en español aunque la tienda esté en inglés: lo lee el personal.
const SALUDO_WHATSAPP =
  'Hola, vengo de la tienda en linea y necesito ayuda con mi pedido.';

export const useCentroAyuda = () => {
  const { t } = useIdioma();

  const faqs = [
    {
      q: t('¿Cómo hago un pedido?'),
      a: t('Explora la tienda, agrega productos al carrito y presiona comprar. También puedes usar el asistente por voz para pedir hablando.'),
    },
    {
      q: t('¿Cómo funcionan los puntos de fidelidad?'),
      a: t('Ganas puntos con cada compra según lo que gastes. Los ves en la sección "Puntos de fidelidad" y vencen pasado un tiempo.'),
    },
    {
      q: t('¿Dónde veo mis pedidos?'),
      a: t('En "Mis pedidos" ves el estado de cada compra; cuando te la entregan, pasa a "Recibos".'),
    },
  ];

  // Los canales se arman, no se listan: cada uno entra solo si tiene a dónde llevar. El tipo viaja
  // en lugar del icono porque elegir el dibujito es cosa de la pantalla, no de aquí.
  const canales = useMemo(() => {
    const lista = [];

    const whatsapp = enlaceWhatsApp(SALUDO_WHATSAPP);
    if (whatsapp) {
      lista.push({
        tipo: 'whatsapp',
        etiqueta: 'WhatsApp',
        // Se muestra tal como se marca en El Salvador: 7890-1234.
        valor: WHATSAPP.slice(-8).replace(/(\d{4})(\d{4})/, '$1-$2'),
        enlace: whatsapp,
      });
    }

    if (DIRECCION_EN_UNA_LINEA) {
      lista.push({
        tipo: 'direccion',
        etiqueta: t('Pasa a la tienda'),
        valor: DIRECCION_EN_UNA_LINEA,
        enlace: null,
      });
    }

    return lista;
  }, [t]);

  return { faqs, canales };
};

import { useState } from 'react';
import toast from 'react-hot-toast';
import { aiService } from '../api/aiService';

// usePromoAI — la IA escribe el TEXTO de la promoción (título y descripción).
export const usePromoAI = () => {
  const [generando, setGenerando] = useState(false);

  const generarPromo = async ({ tipo, items, buyQty, payQty }) => {
    if (!items?.length) {
      toast.error('Primero agrega los productos de la promoción');
      return null;
    }

    // NO se lanza un toast de "redactando". El aviso salia arriba a la derecha, lejos del boton que se
    // acababa de tocar, y se iba solo a los pocos segundos: quien miraba el formulario no tenia como
    // saber si la IA seguia trabajando o si ya habia terminado y no habia pasado nada.
    setGenerando(true);
    try {
      const copy = await aiService.generarCopyPromo({
        type: tipo,
        buyQty: Number(buyQty) || 2,
        payQty: Number(payQty) || 1,
        items: items.map((it) => ({
          productId: it.productId,
          discount: Number(it.discount) || 0,
          fixedPrice: it.fixedPrice === '' || it.fixedPrice == null ? null : Number(it.fixedPrice),
        })),
      });

      // De donde salio el texto viaja en `copy.origen` y lo pinta el formulario debajo del boton: si la
      // IA no estaba disponible el servidor responde con plantillas, y se vale saberlo.
      return copy;
    } catch (error) {
      const mensaje = error?.response?.data?.message || 'No se pudo generar el texto';
      toast.error(mensaje, { duration: 5000 });
      return null;
    } finally {
      setGenerando(false);
    }
  };

  return { generando, generarPromo };
};

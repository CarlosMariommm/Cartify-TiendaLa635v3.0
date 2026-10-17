import { tAhora } from './idioma';

// CALCE DE UNA IMAGEN CONTRA EL FORMATO — calceImpresion.js
// Calcula si el archivo que subió el cliente calza con la medida que pagó, para avisarle antes de
// mandarlo; el archivo viaja intacto a la impresora.

// Cuánto se tolera de diferencia de proporción antes de avisar. Una foto nunca calza EXACTO con
// una hoja — 12% deja pasar el ruido normal (un celular no mide igual que una hoja Carta) y solo
// avisa cuando de verdad va a sobrar o faltar imagen al recortarla a la fuerza en ese formato.
const TOLERANCIA_PROPORCION = 0.12;

// Por debajo de esta densidad la impresión sale borrosa de cerca. 150 DPI es
// un mínimo razonable para papelería general (no es una imprenta de fotos
// profesional); el editor sí exporta a 300 (ver usePrintComposer.js).
const DPI_MINIMO = 150;
const CM_POR_PULGADA = 2.54;

// Devuelve el mensaje de aviso (string) si algo no calza, o null si la imagen está lo bastante
// cerca de la medida elegida.
export const evaluarCalce = ({ anchoPx, altoPx, widthCm, heightCm }) => {
  if (!anchoPx || !altoPx || !widthCm || !heightCm) return null;

  const proporcionImagen = anchoPx / altoPx;
  const proporcionHoja = widthCm / heightCm;
  const diferencia = Math.abs(proporcionImagen - proporcionHoja) / proporcionHoja;

  if (diferencia > TOLERANCIA_PROPORCION) {
    return tAhora('La proporción de tu imagen no coincide con la hoja de {ancho}×{alto} cm — puede salir recortada o con márgenes en blanco al imprimirse.', { ancho: widthCm, alto: heightCm });
  }

  const anchoMinimo = Math.round((widthCm / CM_POR_PULGADA) * DPI_MINIMO);
  const altoMinimo = Math.round((heightCm / CM_POR_PULGADA) * DPI_MINIMO);

  if (anchoPx < anchoMinimo || altoPx < altoMinimo) {
    return tAhora('Tu imagen tiene poca resolución para imprimirse a {ancho}×{alto} cm — puede salir borrosa o pixelada.', { ancho: widthCm, alto: heightCm });
  }

  return null;
};

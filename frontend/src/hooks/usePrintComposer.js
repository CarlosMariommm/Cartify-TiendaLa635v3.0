import { useState, useRef, useCallback, useMemo } from 'react';

// usePrintComposer — el "cerebro" del editor de impresiones. La hoja es SIEMPRE tamaño carta (o el
// formato elegido, si es más grande que una carta — un póster no cabe tiled).

const DPI = 300;             // calidad de impresión
const MAX_LADO_PX = 4000;    // tope para que una hoja grande no reviente la memoria

// Papel carta: el que carga la impresora cuando el formato elegido es más chico que una hoja
// entera (10×10, pasaporte...). Un formato más grande que esto (un póster) manda su propio tamaño:
// no tiene sentido "tilear" algo que ya es más grande que el papel de siempre.
const CARTA_ANCHO_CM = 21.6;
const CARTA_ALTO_CM = 27.9;

// Carga una imagen y espera a que esté lista (para dibujarla en el canvas).
const cargarImagen = (src) =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });

export const usePrintComposer = ({ widthCm = 21.6, heightCm = 27.9 } = {}) => {
  // La cuadrícula: cuántas celdas de `widthCm × heightCm` caben en una hoja carta. Un formato más
  // grande que la carta en cualquier lado se queda con SU propio tamaño de hoja y una sola celda —
  // así un póster de 40×60 sigue ocupando su hoja completa, como antes.
  const { columnas, filas, celdasPorHoja, hojaAnchoCm, hojaAltoCm } = useMemo(() => {
    const cabeEnCarta = widthCm <= CARTA_ANCHO_CM && heightCm <= CARTA_ALTO_CM;
    const anchoHoja = cabeEnCarta ? CARTA_ANCHO_CM : widthCm;
    const altoHoja = cabeEnCarta ? CARTA_ALTO_CM : heightCm;
    const cols = Math.max(1, Math.floor(anchoHoja / widthCm));
    const fils = Math.max(1, Math.floor(altoHoja / heightCm));
    return { columnas: cols, filas: fils, celdasPorHoja: cols * fils, hojaAnchoCm: anchoHoja, hojaAltoCm: altoHoja };
  }, [widthCm, heightCm]);

  // Cada página es un arreglo de `celdasPorHoja` casillas: null (vacía) o
  // { id, src }. El índice EN el arreglo es la posición en la cuadrícula.
  const celdaVacia = useCallback(() => Array(celdasPorHoja).fill(null), [celdasPorHoja]);
  const [paginas, setPaginas] = useState([{ id: 'pagina-0', celdas: celdaVacia() }]);
  const [paginaActiva, setPaginaActiva] = useState(0);
  const [seleccionado, setSeleccionado] = useState(null); // { pagina, celda } o null
  const idRef = useRef(100);
  const nuevoId = () => ++idRef.current;

  // Si cambia el formato (otro `widthCm`/`heightCm`, ej. el cliente elige "10x10" después de haber
  // estado en "Carta"), la cuadrícula cambia de forma y las páginas viejas se vuelven a empezar.
  const [celdasPorHojaAnterior, setCeldasPorHojaAnterior] = useState(celdasPorHoja);
  if (celdasPorHojaAnterior !== celdasPorHoja) {
    setCeldasPorHojaAnterior(celdasPorHoja);
    setPaginas([{ id: 'pagina-0', celdas: celdaVacia() }]);
    setPaginaActiva(0);
    setSeleccionado(null);
  }

  // Agregar imágenes: cada una cae en la siguiente celda vacía y, si no queda ninguna, se abren
  // páginas nuevas. El id de cada página sale de su posición, no de un contador.
  const idDePagina = (indice) => `pagina-${indice}`;

  // A dónde saltar después de acomodar: se calcula DENTRO del cálculo puro de
  // abajo y se lee aquí, ya afuera, para no llamar a otro setState desde
  // dentro del actualizador de setPaginas.
  const paginaDestino = useRef(0);

  const agregarImagenes = useCallback((files) => {
    const lista = Array.from(files || []).filter((f) => f.type.startsWith('image/'));
    if (lista.length === 0) return;

    // Los ids y las URLs de objeto se generan UNA vez, aquí afuera — nunca
    // dentro del actualizador de setPaginas. Ver la nota de arriba.
    const nuevas = lista.map((file) => ({ id: nuevoId(), src: URL.createObjectURL(file) }));

    setPaginas((prev) => {
      const copia = prev.map((p) => ({ ...p, celdas: [...p.celdas] }));
      let pag = paginaActiva;

      for (const nueva of nuevas) {
        // Busca la siguiente celda vacía desde `pag`, abriendo páginas si hace falta.
        while (true) {
          if (pag >= copia.length) copia.push({ id: idDePagina(copia.length), celdas: celdaVacia() });
          const libre = copia[pag].celdas.findIndex((c) => c === null);
          if (libre !== -1) {
            copia[pag].celdas[libre] = nueva;
            paginaDestino.current = pag;
            break;
          }
          pag++;
        }
      }
      return copia;
    });
    // La vista salta a donde cayó la última foto agregada: si abrió una
    // página nueva, quien sube las fotos quiere verla, no seguir mirando la
    // que ya se llenó.
    setPaginaActiva(paginaDestino.current);
  }, [paginaActiva, celdaVacia]);

  // Quita la foto de una celda (la celda queda vacía, no desaparece de la cuadrícula).
  const eliminar = useCallback((paginaIdx, celdaIdx) => {
    setPaginas((prev) =>
      prev.map((p, i) => (i !== paginaIdx ? p : { ...p, celdas: p.celdas.map((c, j) => (j === celdaIdx ? null : c)) }))
    );
    setSeleccionado(null);
  }, []);

  // Duplica una foto en la siguiente celda vacía — la manera de repetir un
  // documento (un DUI, un pasaporte) varias veces en la misma hoja.
  const duplicar = useCallback((paginaIdx, celdaIdx) => {
    const origen = paginas[paginaIdx]?.celdas[celdaIdx];
    if (!origen) return;
    const copiaId = nuevoId();

    setPaginas((prev) => {
      const copia = prev.map((p) => ({ ...p, celdas: [...p.celdas] }));
      let pag = paginaIdx;
      while (true) {
        if (pag >= copia.length) copia.push({ id: idDePagina(copia.length), celdas: celdaVacia() });
        const libre = copia[pag].celdas.findIndex((c) => c === null);
        if (libre !== -1) {
          copia[pag].celdas[libre] = { id: copiaId, src: origen.src };
          break;
        }
        pag++;
      }
      return copia;
    });
  }, [paginas, celdaVacia]);

  const agregarPagina = useCallback(() => {
    setPaginas((prev) => {
      paginaDestino.current = prev.length;
      return [...prev, { id: idDePagina(prev.length), celdas: celdaVacia() }];
    });
    setPaginaActiva(paginaDestino.current);
    setSeleccionado(null);
  }, [celdaVacia]);

  const eliminarPagina = useCallback((indice) => {
    setPaginas((prev) => {
      if (prev.length === 1) return prev; // siempre queda al menos una
      return prev.filter((_, i) => i !== indice);
    });
    // Afuera del actualizador de arriba, por la misma razón que paginaDestino:
    // no encadenar otro setState desde dentro de uno.
    setPaginaActiva((act) => Math.max(0, act > indice ? act - 1 : act));
    setSeleccionado(null);
  }, []);

  // Dibuja una página completa en un canvas a resolución de impresión. Cada celda se llena a lo
  // "cubrir" (como object-fit: cover): se recorta lo que sobre del lado más largo, nunca queda un
  // borde en blanco.
  const renderPagina = useCallback(async (pagina) => {
    const pxPorCm = DPI / 2.54;
    let W = Math.round(hojaAnchoCm * pxPorCm);
    let H = Math.round(hojaAltoCm * pxPorCm);
    let escalaHoja = 1;

    const mayor = Math.max(W, H);
    if (mayor > MAX_LADO_PX) {
      escalaHoja = MAX_LADO_PX / mayor;
      W = Math.round(W * escalaHoja);
      H = Math.round(H * escalaHoja);
    }

    // El tamaño de CADA celda en píxeles, calculado de su medida real en cm —no de W/columnas—.
    const celdaWpx = widthCm * pxPorCm * escalaHoja;
    const celdaHpx = heightCm * pxPorCm * escalaHoja;

    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, W, H);

    for (let i = 0; i < pagina.celdas.length; i++) {
      const celda = pagina.celdas[i];
      if (!celda) continue;
      const col = i % columnas;
      const fil = Math.floor(i / columnas);
      const img = await cargarImagen(celda.src);

      // Escala "cubrir": el lado que sobra se recorta, nunca queda margen.
      const escala = Math.max(celdaWpx / img.naturalWidth, celdaHpx / img.naturalHeight);
      const wDibujo = img.naturalWidth * escala;
      const hDibujo = img.naturalHeight * escala;
      const x = col * celdaWpx + (celdaWpx - wDibujo) / 2;
      const y = fil * celdaHpx + (celdaHpx - hDibujo) / 2;

      ctx.save();
      ctx.beginPath();
      ctx.rect(col * celdaWpx, fil * celdaHpx, celdaWpx, celdaHpx);
      ctx.clip();
      ctx.drawImage(img, x, y, wDibujo, hDibujo);
      ctx.restore();
    }
    return canvas;
  }, [hojaAnchoCm, hojaAltoCm, widthCm, heightCm, columnas]);

  // Exporta el trabajo listo para mandar a imprimir.
  const exportar = useCallback(async () => {
    const canvases = [];
    for (const pag of paginas) canvases.push(await renderPagina(pag));

    // PDF con el tamaño real de la hoja en centímetros, tenga una o varias.
    const { jsPDF } = await import('jspdf');
    const orientacion = hojaAnchoCm > hojaAltoCm ? 'landscape' : 'portrait';
    const doc = new jsPDF({ unit: 'cm', format: [hojaAnchoCm, hojaAltoCm], orientation: orientacion });
    canvases.forEach((c, i) => {
      if (i > 0) doc.addPage([hojaAnchoCm, hojaAltoCm], orientacion);
      doc.addImage(c.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, hojaAnchoCm, hojaAltoCm);
    });
    const blob = doc.output('blob');
    return new File([blob], 'impresion.pdf', { type: 'application/pdf' });
  }, [paginas, renderPagina, hojaAnchoCm, hojaAltoCm]);

  const totalItems = paginas.reduce((a, p) => a + p.celdas.filter(Boolean).length, 0);

  return {
    paginas, paginaActiva, setPaginaActiva, seleccionado, setSeleccionado,
    agregarImagenes, eliminar, duplicar,
    agregarPagina, eliminarPagina, exportar, totalItems,
    // Tamaño de la HOJA (para pintarla) y de cada CELDA (para la cuadrícula).
    widthCm: hojaAnchoCm, heightCm: hojaAltoCm,
    celdaAnchoCm: widthCm, celdaAltoCm: heightCm,
    columnas, filas, celdasPorHoja,
  };
};

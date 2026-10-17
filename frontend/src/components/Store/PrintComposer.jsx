import { useRef } from 'react';
import { ImagePlus, Copy, Trash2, Plus, X } from 'lucide-react';
import { pxDesdeCm } from '../../utils/pxImpresion';
import { useIdioma } from '../../hooks/useIdioma';

// PrintComposer — el editor visual de la hoja de impresión. Solo pinta: toda la lógica vive en
// usePrintComposer. La hoja es una CUADRÍCULA de celdas del tamaño real del formato elegido
// (columnas × filas calculadas en el hook).
const BROWN = 'var(--marca-600)';

const PrintComposer = ({ composer }) => {
  const {
    paginas, paginaActiva, setPaginaActiva, seleccionado, setSeleccionado,
    agregarImagenes, eliminar, duplicar,
    agregarPagina, eliminarPagina, widthCm, heightCm,
    celdaAnchoCm, celdaAltoCm, columnas, filas,
  } = composer;

  const inputRef = useRef(null);
  const { t } = useIdioma();
  const pagina = paginas[paginaActiva] || { celdas: [] };

  const btn = {
    display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px',
    borderRadius: 10, border: '1.5px solid var(--linea-fuerte)', background: 'var(--papel)',
    cursor: 'pointer', fontSize: 13, fontWeight: 600, color: 'var(--tinta)',
  };

  const haySeleccion = seleccionado?.pagina === paginaActiva;
  const celdaSeleccionada = haySeleccion ? pagina.celdas[seleccionado.celda] : null;

  return (
    <div>
      {/* Acciones principales */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
        <button type="button" onClick={() => inputRef.current?.click()}
          style={{ ...btn, background: BROWN, color: '#fff', border: 'none', padding: '10px 16px' }}>
          <ImagePlus size={18} /> {t('Agregar imágenes')}
        </button>
        <input ref={inputRef} type="file" accept="image/*" multiple style={{ display: 'none' }}
          onChange={(e) => { agregarImagenes(e.target.files); e.target.value = ''; }} />
        <span style={{ fontSize: 12, color: 'var(--tinta-tenue)', alignSelf: 'center' }}>
          {t('Celda {ancho} × {alto} px — hasta {n} por hoja', { ancho: pxDesdeCm(celdaAnchoCm), alto: pxDesdeCm(celdaAltoCm), n: columnas * filas })}
        </span>
      </div>

      {/* Pestañas de páginas */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
        {paginas.map((p, i) => (
          <div key={p.id} style={{ display: 'flex', alignItems: 'center' }}>
            <button type="button" onClick={() => { setPaginaActiva(i); setSeleccionado(null); }}
              style={{
                ...btn, padding: '6px 12px', fontSize: 12,
                background: i === paginaActiva ? 'var(--marca-100)' : 'var(--papel)',
                borderColor: i === paginaActiva ? BROWN : 'var(--linea-fuerte)',
                color: i === paginaActiva ? BROWN : 'var(--tinta-suave)',
              }}>
              {t('Página {n}', { n: i + 1 })}
            </button>
            {paginas.length > 1 && (
              <button type="button" onClick={() => eliminarPagina(i)} title={t('Eliminar página')}
                style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--peligro)', padding: '0 4px' }}>
                <X size={14} />
              </button>
            )}
          </div>
        ))}
        <button type="button" onClick={agregarPagina} style={{ ...btn, padding: '6px 12px', fontSize: 12 }}>
          <Plus size={14} /> {t('Agregar página')}
        </button>
      </div>

      {/* La hoja, en cuadrícula. Las columnas y filas van en `fr` con el tamaño REAL de la celda (no 1fr
         parejo) — si no, una celda de 10×10 en una hoja de 21.6×27.9 se estira pareja entre las columnas
         y filas que quepan, y una celda cuadrada sale rectangular. */}
      {(() => {
        const sobranteAncho = Math.max(0, widthCm - columnas * celdaAnchoCm);
        const sobranteAlto = Math.max(0, heightCm - filas * celdaAltoCm);
        const colsTemplate = `repeat(${columnas}, ${celdaAnchoCm}fr)` + (sobranteAncho > 0.05 ? ` ${sobranteAncho}fr` : '');
        const rowsTemplate = `repeat(${filas}, ${celdaAltoCm}fr)` + (sobranteAlto > 0.05 ? ` ${sobranteAlto}fr` : '');

        // Hasta dónde dibujar: la última celda llena, más una vacía para la próxima foto. Ni una casilla
        // más — el resto de la hoja no se pinta hasta que haga falta.
        const totalCeldas = pagina.celdas.length;
        const ultimaLlena = pagina.celdas.reduce((max, c, i) => (c ? i : max), -1);
        const hastaIndice = Math.min(ultimaLlena + 1, totalCeldas - 1);
        const celdasAMostrar = pagina.celdas.slice(0, hastaIndice + 1);

        return (
          <div
            style={{
              width: '100%', aspectRatio: `${widthCm} / ${heightCm}`,
              background: 'var(--papel)', border: '1px solid var(--linea-fuerte)', borderRadius: 8,
              overflow: 'hidden', boxShadow: '0 2px 10px rgba(0,0,0,0.06)',
              display: 'grid',
              gridTemplateColumns: colsTemplate,
              gridTemplateRows: rowsTemplate,
              marginBottom: 12,
            }}
          >
            {celdasAMostrar.map((celda, i) => {
              const elegida = seleccionado?.pagina === paginaActiva && seleccionado?.celda === i;
              const col = i % columnas;
              const fil = Math.floor(i / columnas);
              // La próxima vacía: tocarla abre el selector directo, como el
              // "+" del selector de fotos de Instagram.
              const esLaProxima = !celda && i === hastaIndice;
              return (
                <div
                  key={i}
                  onClick={() => {
                    if (celda) setSeleccionado({ pagina: paginaActiva, celda: i });
                    else if (esLaProxima) inputRef.current?.click();
                  }}
                  style={{
                    position: 'relative',
                    gridColumn: col + 1,
                    gridRow: fil + 1,
                    borderRight: (col !== columnas - 1) ? '1px dashed var(--linea)' : 'none',
                    borderBottom: (fil !== filas - 1) ? '1px dashed var(--linea)' : 'none',
                    outline: elegida ? `2px solid ${BROWN}` : 'none',
                    outlineOffset: -2,
                    cursor: (celda || esLaProxima) ? 'pointer' : 'default',
                    background: celda ? 'transparent' : 'var(--papel-suave)',
                  }}
                >
                  {celda ? (
                    <img
                      src={celda.src}
                      alt=""
                      draggable={false}
                      style={{ width: '100%', height: '100%', objectFit: 'cover', userSelect: 'none' }}
                    />
                  ) : (
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--tinta-apagada)' }}>
                      <Plus size={18} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        );
      })()}

      {/* Toolbar de la celda seleccionada */}
      {celdaSeleccionada && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
          <button type="button" style={btn} onClick={() => duplicar(seleccionado.pagina, seleccionado.celda)}><Copy size={16} /> {t('Duplicar')}</button>
          <button type="button" style={{ ...btn, color: 'var(--peligro)', borderColor: 'var(--peligro-borde)' }} onClick={() => eliminar(seleccionado.pagina, seleccionado.celda)}>
            <Trash2 size={16} /> {t('Quitar')}
          </button>
        </div>
      )}
      {!celdaSeleccionada && pagina.celdas.some(Boolean) && (
        <p style={{ fontSize: 12, color: 'var(--tinta-tenue)', margin: 0 }}>{t('Toca una foto para duplicarla o quitarla.')}</p>
      )}
    </div>
  );
};

export default PrintComposer;

import { useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import { X, ExternalLink } from 'lucide-react';
import TextoTerminos from './TextoTerminos';
import { useDocumentoLegal } from '../../hooks/useTerminos';
import { DOCUMENTOS_LEGALES } from '../../utils/legales';
import { useIdioma } from '../../hooks/useIdioma';

// TÉRMINOS EN UNA VENTANA — ModalTerminos.jsx
// El mismo documento de /terminos, encima del formulario de registro y sin navegar a ningún lado.

const Velo = styled.div`
  position: fixed;
  inset: 0;
  z-index: 1000;
  background: rgba(20, 12, 6, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;

  /* En el teléfono la hoja sube desde abajo y ocupa casi todo: centrarla
     dejaría dos franjas de velo inútiles arriba y abajo. */
  @media (max-width: 640px) {
    padding: 0;
    align-items: flex-end;
  }
`;

const Panel = styled.div`
  background: var(--papel);
  border-radius: 16px;
  width: 100%;
  max-width: 720px;
  max-height: 88vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.22);

  @media (max-width: 640px) {
    max-height: 92vh;
    border-radius: 16px 16px 0 0;
  }
`;

/* La cabecera se queda arriba mientras se lee: el documento es largo y el
   botón de cerrar tiene que estar donde uno lo busca, no al final del scroll. */
const Cabecera = styled.div`
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 18px 20px 16px;
  border-bottom: 1px solid var(--linea);
`;

const Titulos = styled.div`
  flex: 1;
  min-width: 0;

  h2 {
    margin: 0;
    font-size: 18px;
    font-weight: 700;
    color: var(--tinta);
  }

  p {
    margin: 2px 0 0;
    font-size: 12.5px;
    color: var(--tinta-tenue);
  }
`;

const Salida = styled.a`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12.5px;
  font-weight: 600;
  color: var(--tinta-suave);
  text-decoration: none;
  white-space: nowrap;

  @media (hover: hover) and (pointer: fine) {
    &:hover { color: var(--marca-texto-fuerte); }
  }

  /* En el teléfono no cabe junto al título y al botón de cerrar; y ahí abrir
     otra pestaña es justo lo que menos conviene. */
  @media (max-width: 640px) { display: none; }
`;

const Cerrar = styled.button`
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--linea);
  border-radius: 50%;
  background: var(--papel);
  color: var(--tinta-suave);
  cursor: pointer;
  transition: border-color var(--dur-press) var(--ease-out),
              color var(--dur-press) var(--ease-out),
              transform var(--dur-press) var(--ease-out);

  @media (hover: hover) and (pointer: fine) {
    &:hover { border-color: var(--marca-600); color: var(--marca-texto-fuerte); }
  }
  &:active { transform: scale(0.94); }
`;

const Contenido = styled.div`
  overflow-y: auto;
  padding: 22px 24px 26px;
  -webkit-overflow-scrolling: touch;

  @media (max-width: 640px) { padding: 18px 18px 24px; }
`;

const Pie = styled.div`
  flex-shrink: 0;
  padding: 14px 20px;
  border-top: 1px solid var(--linea);
  background: var(--papel);
  display: flex;
  justify-content: flex-end;
`;

const BotonListo = styled.button`
  padding: 11px 22px;
  border: none;
  border-radius: var(--radio-pill);
  background: var(--marca-600);
  color: #fff;
  font-family: inherit;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: background-color var(--dur-press) var(--ease-out),
              transform var(--dur-press) var(--ease-out);

  @media (hover: hover) and (pointer: fine) {
    &:hover { background: var(--marca-700); }
  }
  &:active { transform: scale(0.97); }
`;

const ModalTerminos = ({ abierto, onCerrar, clave = 'terminos' }) => {
  // Qué documento se lee. Arranca con el que pidió el registro (términos o privacidad) y cambia si
  // adentro se toca "Ver la política de…". Al cerrarse vuelve a empezar: la próxima vez abre el que
  // se pida.
  const [elegido, setElegido] = useState(null);
  const [abiertoAntes, setAbiertoAntes] = useState(abierto);
  if (abierto !== abiertoAntes) {
    setAbiertoAntes(abierto);
    if (!abierto) setElegido(null);
  }
  const { documento, secciones, whatsappBorrado, direccion, nombre, negocio, version, fecha } =
    useDocumentoLegal(elegido || clave);
  const botonCerrar = useRef(null);
  const contenido = useRef(null);
  const { t, idioma } = useIdioma();

  // Otro documento empieza desde arriba, no a la altura del anterior.
  const abrirDocumento = (ruta) => {
    const otro = DOCUMENTOS_LEGALES.find((d) => d.ruta === ruta);
    if (!otro) return;
    setElegido(otro.clave);
    contenido.current?.scrollTo(0, 0);
  };

  // Al abrir, el foco entra al modal. Si no, el tabulador seguiría recorriendo
  // el formulario de atrás, que está tapado.
  useEffect(() => {
    if (abierto) botonCerrar.current?.focus();
  }, [abierto]);
  if (!abierto) return null;

  return (
    <Velo
      /* Tocar el velo cierra; tocar el panel no. Sin la comparación con
         currentTarget, un clic que empieza dentro del documento y termina
         soltándose en el borde cerraría la ventana en la cara. */
      onClick={(e) => { if (e.target === e.currentTarget) onCerrar(); }}
    >
      <Panel role="dialog" aria-modal="true" aria-labelledby="titulo-terminos">
        <Cabecera>
          <Titulos>
            <h2 id="titulo-terminos">{t(documento.titulo)}</h2>
            <p>
              {t('Versión {version} · {fecha}', { version, fecha })}
              {idioma !== 'es' && <> · {t('Solo disponible en español')}</>}
            </p>
          </Titulos>

          <Salida href={documento.ruta} target="_blank" rel="noopener noreferrer">
            <ExternalLink size={14} strokeWidth={2.2} />
            {t('Ver la página completa')}
          </Salida>

          <Cerrar ref={botonCerrar} onClick={onCerrar} aria-label={t('Cerrar: {titulo}', { titulo: t(documento.titulo) })}>
            <X size={18} strokeWidth={2.3} />
          </Cerrar>
        </Cabecera>

        <Contenido ref={contenido}>
          <TextoTerminos
            secciones={secciones}
            whatsappBorrado={whatsappBorrado}
            direccion={direccion}
            nombre={nombre}
            negocio={negocio}
            alAbrirDocumento={abrirDocumento}
          />
        </Contenido>

        {/* "Listo" y no "Acepto": el modal no marca la casilla por nadie. Quien lo cierra vuelve al
           formulario y decide ahí. Un botón de aceptar aquí dentro convertiría "cerré la ventana" en
           "estuve de acuerdo". */}
        <Pie>
          <BotonListo onClick={onCerrar}>{t('Listo')}</BotonListo>
        </Pie>
      </Panel>
    </Velo>
  );
};

export default ModalTerminos;

import { useEffect } from 'react';
import styled from 'styled-components';
import { ArrowLeft } from 'lucide-react';
import HeaderTienda from '../components/Store/HeaderTienda';
import PieTienda from '../components/Store/PieTienda';
import { Link } from 'react-router-dom';
import TextoTerminos from '../components/Store/TextoTerminos';
import { useDocumentoLegal } from '../hooks/useTerminos';

// LAS PÁGINAS LEGALES — Legal.jsx
// El documento que hasta ahora no existía: se pedían nombre, DUI, teléfono, correo y dirección sin
// decir en ninguna parte para qué.

const Contenedor = styled.div`
  min-height: 100vh;
  background: var(--papel);
  display: flex;
  flex-direction: column;
`;

/* Igual que en Seccion: la barra de volver NO es pegajosa —el encabezado de la
   tienda ya lo es— y se va con el scroll. Tampoco lleva línea abajo: con la del
   encabezado encima, esta franja quedaba entre dos rayas paralelas. */
const Barra = styled.header`
  background: var(--papel);
  height: 56px;
  display: flex;
  align-items: center;
`;

const BarraInterior = styled.div`
  max-width: 1400px;
  width: 100%;
  margin: 0 auto;
  padding: 0 28px;
  display: flex;
  align-items: center;

  @media (max-width: 560px) { padding: 0 16px; }
`;

const Volver = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  background: none;
  border: 1px solid var(--linea);
  border-radius: var(--radio-pill);
  padding: 8px 15px 8px 12px;
  font-family: inherit;
  font-size: 13.5px;
  font-weight: 600;
  color: var(--tinta);
  cursor: pointer;
  transition: border-color var(--dur-press) var(--ease-out),
              color var(--dur-press) var(--ease-out),
              transform var(--dur-press) var(--ease-out);

  @media (hover: hover) and (pointer: fine) {
    &:hover { border-color: var(--marca-600); color: var(--marca-texto-fuerte); }
  }
  &:active { transform: scale(0.97); }
`;

// Dos columnas: el índice a la izquierda y el documento a la derecha. El ancho del texto se topa a
// 74ch y no al ancho del monitor.
const Cuerpo = styled.main`
  flex: 1;
  width: 100%;
  max-width: 1400px;
  margin: 0 auto;
  padding: 34px 28px 30px;
  display: grid;
  grid-template-columns: 230px minmax(0, 1fr);
  gap: 48px;

  @media (max-width: 980px) {
    grid-template-columns: 1fr;
    gap: 26px;
  }
  @media (max-width: 560px) { padding: 24px 16px 20px; }
`;

// El índice se queda a la vista mientras se baja. En un documento largo es la diferencia entre
// "leo lo que me interesa" y "hago scroll a ciegas".
const Indice = styled.nav`
  position: sticky;
  top: 86px;
  align-self: start;

  @media (max-width: 980px) {
    position: static;
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    padding-bottom: 4px;
  }
`;

const TituloIndice = styled.p`
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.6px;
  color: var(--tinta-tenue);
  margin: 0 0 12px;

  @media (max-width: 980px) { display: none; }
`;

const EnlaceIndice = styled.button`
  display: block;
  width: 100%;
  text-align: left;
  background: none;
  border: none;
  padding: 7px 0;
  font-family: inherit;
  font-size: 13.5px;
  color: var(--tinta-suave);
  cursor: pointer;
  transition: color var(--dur-press) var(--ease-out);

  @media (hover: hover) and (pointer: fine) {
    &:hover { color: var(--marca-texto-fuerte); }
  }

  @media (max-width: 980px) {
    width: auto;
    padding: 7px 13px;
    border: 1px solid var(--linea);
    border-radius: var(--radio-pill);
    font-size: 12.5px;
    background: var(--papel);
  }
`;

const Documento = styled.article`
  max-width: 74ch;
`;

const Titulo = styled.h1`
  font-size: 34px;
  font-weight: 800;
  letter-spacing: -0.02em;
  color: var(--tinta);
  margin: 0 0 8px;

  @media (max-width: 560px) { font-size: 26px; }
`;

const Firma = styled.p`
  font-size: 13px;
  color: var(--tinta-tenue);
  margin: 0 0 34px;
`;

const Cierre = styled.div`
  margin-top: 44px;
  padding-top: 20px;
  border-top: 1px solid var(--linea);
  font-size: 13px;
  line-height: 1.7;
  color: var(--tinta-tenue);
`;

/* Los otros documentos, al final: quien leyó privacidad suele buscar cookies. */
const Otros = styled.nav`
  margin-top: 26px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px 18px;
  font-size: 14px;

  a {
    color: var(--marca-texto-fuerte);
    font-weight: 600;
    text-decoration: underline;
    text-underline-offset: 3px;
  }
`;

const Legal = ({ clave = 'terminos' }) => {
  const {
    documento, secciones, indice, irASeccion, volver,
    nombre, direccion, negocio, version, fecha, whatsappBorrado, otros,
  } = useDocumentoLegal(clave);

  // El título de la pestaña del navegador dice qué documento es.
  useEffect(() => {
    const previo = document.title;
    document.title = `${documento.titulo} · ${nombre}`;
    return () => { document.title = previo; };
  }, [documento.titulo, nombre]);

  // Cada documento empieza desde arriba.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [clave]);

  return (
    <Contenedor>
      <HeaderTienda />

      <Barra>
        <BarraInterior>
          <Volver onClick={volver}>
            <ArrowLeft size={17} strokeWidth={2.3} aria-hidden="true" />
            Volver
          </Volver>
        </BarraInterior>
      </Barra>

      <Cuerpo id="contenido">
        <Indice aria-label="Secciones del documento">
          <TituloIndice>En esta página</TituloIndice>
          {indice.map((s) => (
            <EnlaceIndice key={s.id} onClick={() => irASeccion(s.id)}>
              {s.titulo}
            </EnlaceIndice>
          ))}
        </Indice>

        <Documento>
          <Titulo>{documento.titulo}</Titulo>
          <Firma>
            Versión {version} · {fecha} · {nombre}
          </Firma>

          <TextoTerminos
            secciones={secciones}
            whatsappBorrado={whatsappBorrado}
            direccion={direccion}
            nombre={nombre}
            negocio={negocio}
          />

          <Cierre>
            {[nombre, negocio.titular, direccion].filter(Boolean).join(' · ')}
            <br />
            Si algo de aquí no le cuadra, escríbanos antes de aceptar. Preferimos
            explicarlo a que se quede con la duda.
            <Otros aria-label="Otros documentos legales">
              {otros.map((d) => (
                <Link key={d.clave} to={d.ruta}>{d.titulo}</Link>
              ))}
            </Otros>
          </Cierre>
        </Documento>
      </Cuerpo>

      <PieTienda />
    </Contenedor>
  );
};

export default Legal;

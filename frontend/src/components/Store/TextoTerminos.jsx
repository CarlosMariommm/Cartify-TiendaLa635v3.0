import styled, { css } from 'styled-components';
import { Link } from 'react-router-dom';
import { MessageCircle, ShieldCheck, Info, ArrowRight } from 'lucide-react';

// EL TEXTO DE LOS TÉRMINOS — TextoTerminos.jsx
// El documento, pintado. Nada más: ni encabezado, ni índice, ni botón de volver. Eso lo pone quien
// lo muestre.

const TituloSeccion = styled.h2`
  font-size: 21px;
  font-weight: 700;
  letter-spacing: -0.01em;
  color: var(--tinta);
  margin: 38px 0 14px;
  /* Para que al saltar desde el índice el título no quede pegado al
     encabezado, que es pegajoso y se lo comería. */
  scroll-margin-top: 84px;

  /* El primero no necesita despegarse de nada: arriba está el título del
     documento, que ya trae su propio aire. */
  section:first-of-type & { margin-top: 0; }

  @media (max-width: 560px) { font-size: 19px; }
`;

const Parrafo = styled.p`
  font-size: 15px;
  line-height: 1.7;
  color: var(--tinta-suave);
  margin: 0 0 14px;
`;

/* El resumen de arriba, con el peso visual de una respuesta. Es lo único que
   va a leer mucha gente, así que se lee primero y se lee solo. */
const Destacado = styled.div`
  display: flex;
  gap: 14px;
  background: var(--marca-50);
  border: 1px solid var(--linea);
  border-radius: 14px;
  padding: 18px 20px;
  margin: 0 0 16px;

  svg { flex-shrink: 0; color: var(--marca-texto); margin-top: 2px; }

  p {
    margin: 0;
    font-size: 15.5px;
    line-height: 1.65;
    color: var(--tinta);
    font-weight: 500;
  }
`;

const Nota = styled.div`
  display: flex;
  gap: 11px;
  border-left: 3px solid var(--linea);
  padding: 2px 0 2px 14px;
  margin: 16px 0;

  svg { flex-shrink: 0; color: var(--tinta-tenue); margin-top: 3px; }

  p {
    margin: 0;
    font-size: 14px;
    line-height: 1.65;
    color: var(--tinta-suave);
  }
`;

const Lista = styled.ul`
  margin: 0 0 14px;
  padding-left: 20px;
  display: flex;
  flex-direction: column;
  gap: 10px;

  li {
    font-size: 15px;
    line-height: 1.65;
    color: var(--tinta-suave);
    &::marker { color: var(--marca-texto); }
  }
`;

const EnvolturaTabla = styled.div`
  margin: 18px 0 6px;
  border: 1px solid var(--linea);
  border-radius: 14px;
  overflow: hidden;
  background: var(--papel);
`;

// La tabla de datos, que en el teléfono deja de ser tabla. Cuatro columnas de texto en 375px son
// ilegibles de las dos formas posibles: apretadas quedan en una palabra por renglón, y con scroll
// horizontal nadie descubre que hay dos columnas más a la derecha.
const Tabla = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;

  thead th {
    text-align: left;
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: var(--tinta-tenue);
    background: var(--papel);
    padding: 12px 16px;
    border-bottom: 1px solid var(--linea);
  }

  td {
    padding: 14px 16px;
    vertical-align: top;
    line-height: 1.6;
    color: var(--tinta-suave);
    border-bottom: 1px solid var(--linea);
  }

  /* La primera columna es el nombre del dato: el ancla de la fila. Va como encabezado de fila (th
     scope="row") para que el lector de pantalla diga "Teléfono" antes de cada dato de esa fila. */
  tbody th {
    text-align: left;
    padding: 14px 16px;
    vertical-align: top;
    line-height: 1.6;
    color: var(--tinta);
    font-weight: 600;
    border-bottom: 1px solid var(--linea);
  }

  tbody tr:last-child td,
  tbody tr:last-child th { border-bottom: none; }

  @media (max-width: 760px) {
    thead { display: none; }
    tr { display: block; padding: 4px 0; border-bottom: 1px solid var(--linea); }
    tbody tr:last-child { border-bottom: none; }
    td, tbody th { display: block; border: none; padding: 6px 16px; }
    tbody th { padding-top: 14px; font-size: 15px; }
    td:last-child { padding-bottom: 14px; }

    td[data-columna]:not(:first-child)::before {
      content: attr(data-columna);
      display: block;
      font-size: 10.5px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--tinta-tenue);
      margin-bottom: 2px;
    }
  }
`;

const BotonBorrado = styled.a`
  display: inline-flex;
  align-items: center;
  gap: 9px;
  margin: 6px 0 4px;
  padding: 12px 20px;
  border-radius: var(--radio-pill);
  border: 1px solid var(--marca-600);
  background: var(--papel);
  color: var(--marca-texto-fuerte);
  font-size: 14px;
  font-weight: 600;
  text-decoration: none;
  transition: background-color var(--dur-press) var(--ease-out),
              color var(--dur-press) var(--ease-out),
              transform var(--dur-press) var(--ease-out);

  @media (hover: hover) and (pointer: fine) {
    &:hover { background: var(--marca-600); color: #fff; }
  }
  &:active { transform: scale(0.97); }
`;

// Los datos del negocio, como lista de dos columnas: qué es y el dato.
const DatosNegocio = styled.dl`
  display: grid;
  grid-template-columns: max-content 1fr;
  gap: 8px 18px;
  margin: 4px 0 16px;
  font-size: 14.5px;
  line-height: 1.55;

  dt { color: var(--tinta-tenue); font-weight: 600; }
  dd { margin: 0; color: var(--tinta); }
  a { color: var(--marca-texto-fuerte); font-weight: 600; }

  @media (max-width: 480px) {
    grid-template-columns: 1fr;
    gap: 2px;
    dd { margin-bottom: 8px; }
  }
`;

// El enlace a otro documento legal: "Ver la política de privacidad →".
const estiloEnlace = css`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin: 2px 18px 10px 0;
  color: var(--marca-texto-fuerte);
  font-size: 14.5px;
  font-weight: 600;
  text-decoration: underline;
  text-underline-offset: 3px;
`;

const EnlaceDocumento = styled(Link)`${estiloEnlace}`;

// El mismo enlace, como botón: dentro del modal no se navega (ver alAbrirDocumento).
const BotonDocumento = styled.button.attrs({ type: 'button' })`
  ${estiloEnlace}
  background: none;
  border: none;
  padding: 0;
  font-family: inherit;
  cursor: pointer;
`;

// `alAbrirDocumento`: lo pasa el modal de términos. Con él, "Ver la política de privacidad" cambia
// el documento DENTRO del modal en vez de navegar: el modal se abre desde el registro, y un enlace
// de verdad sacaba a la persona del formulario a medio llenar.
const TextoTerminos = ({ secciones, whatsappBorrado, direccion, nombre, negocio = {}, alAbrirDocumento }) => {
  // Los datos del negocio que haya: lo que el dueño dejó vacío no se pinta. Nada inventado en un
  // texto legal.
  const filasNegocio = [
    ['Negocio', nombre],
    ['Titular', negocio.titular],
    ['NIT', negocio.nit],
    ['NRC', negocio.nrc],
    ['Dirección', direccion ? `${direccion}, El Salvador` : ''],
    ['Correo', negocio.correo && <a href={`mailto:${negocio.correo}`}>{negocio.correo}</a>],
    ['Teléfono', negocio.telefono && <a href={`tel:${negocio.telefono.replace(/[^\d+]/g, '')}`}>{negocio.telefono}</a>],
    ['WhatsApp', negocio.whatsapp],
    ['Horario', negocio.horario],
  ].filter(([, valor]) => valor);


  // Cada tipo de bloque, una forma de pintarse. El texto no sabe nada de esto.
  const pintarBloque = (bloque, i) => {
    switch (bloque.tipo) {
      case 'destacado':
        return (
          <Destacado key={i}>
            <ShieldCheck size={20} strokeWidth={2.1} />
            <p>{bloque.texto}</p>
          </Destacado>
        );

      case 'nota':
        return (
          <Nota key={i}>
            <Info size={16} strokeWidth={2.2} />
            <p>{bloque.texto}</p>
          </Nota>
        );

      case 'lista':
        return (
          <Lista key={i}>
            {bloque.puntos.map((punto, j) => <li key={j}>{punto}</li>)}
          </Lista>
        );

      // Cada tabla trae sus columnas y sus filas (arreglos en el mismo orden).
      case 'tabla':
        return (
          <EnvolturaTabla key={i}>
            <Tabla>
              <thead>
                <tr>{bloque.columnas.map((c) => <th key={c} scope="col">{c}</th>)}</tr>
              </thead>
              <tbody>
                {bloque.filas.map((fila) => (
                  <tr key={fila[0]}>
                    {fila.map((celda, j) => (
                      j === 0
                        ? <th key={j} scope="row" data-columna={bloque.columnas[j]}>{celda}</th>
                        : <td key={j} data-columna={bloque.columnas[j]}>{celda}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </Tabla>
          </EnvolturaTabla>
        );

      case 'negocio':
        return (
          <DatosNegocio key={i}>
            {filasNegocio.map(([etiqueta, valor]) => (
              <div key={etiqueta} style={{ display: 'contents' }}>
                <dt>{etiqueta}</dt>
                <dd>{valor}</dd>
              </div>
            ))}
          </DatosNegocio>
        );

      case 'enlace':
        return alAbrirDocumento ? (
          <BotonDocumento key={i} onClick={() => alAbrirDocumento(bloque.a)}>
            {bloque.texto}
            <ArrowRight size={15} strokeWidth={2.4} aria-hidden="true" />
          </BotonDocumento>
        ) : (
          <EnlaceDocumento key={i} to={bloque.a}>
            {bloque.texto}
            <ArrowRight size={15} strokeWidth={2.4} aria-hidden="true" />
          </EnlaceDocumento>
        );

      // El botón de borrado. Sin WhatsApp configurado no se pinta un botón muerto: se dice por dónde sí,
      // que es la misma tienda.
      case 'borrado':
        return whatsappBorrado ? (
          <BotonBorrado key={i} href={whatsappBorrado} target="_blank" rel="noopener noreferrer">
            <MessageCircle size={17} strokeWidth={2.2} />
            Pedir que borren mis datos
          </BotonBorrado>
        ) : (
          <Parrafo key={i}>
            Para pedir el borrado, pásese por la tienda en {direccion} y lo
            resolvemos ahí mismo.
          </Parrafo>
        );

      default:
        return <Parrafo key={i}>{bloque.texto}</Parrafo>;
    }
  };

  return secciones.map((seccion) => (
    <section key={seccion.id}>
      <TituloSeccion id={seccion.id}>{seccion.titulo}</TituloSeccion>
      {seccion.bloques.map(pintarBloque)}
    </section>
  ));
};

export default TextoTerminos;

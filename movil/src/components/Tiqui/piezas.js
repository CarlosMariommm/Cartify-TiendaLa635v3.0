// PIEZAS DE TIQUI — lo que comparten todas sus versiones en la app
// La forma de Tiqui, sus disfraces de temporada, sus colores en claro y oscuro, el parpadeo y el
// respeto por "menos movimiento".

import { useEffect, useMemo, useState } from 'react';
import { Circle, Ellipse, G, Path, Rect } from 'react-native-svg';
import { useColores } from '../../context/ModoContext';
import { useTema } from '../../context/TemaContext';
import { disfrazDeTema, normalizarDisfraz } from '../../utils/disfracesTiqui';
import { PIEZAS_DISFRAZ, RUBOR as RUBOR_DISFRAZ } from '../../utils/piezasDisfraz';

export const CUERPO =
  'M183,127 Q200,110 217,127 L261.6,171.6 Q280,190 280,216 C284,258 284,302 280,344 ' +
  'Q280,380 244,380 C215,383 185,383 156,380 Q120,380 120,344 C116,302 116,258 120,216 ' +
  'Q120,190 138.4,171.6 Z';
export const AGUJERO = ' M212,160 A12,12 0 1 0 188,160 A12,12 0 1 0 212,160 Z';
export const CORDON = 'M200,160 C200,126 216,118 223,96 C230,74 212,64 219,44';

export const RUBOR = '#F0707F';
export const AMARILLO = '#FFC23D';
export const HOJA = '#4CC27A';

// Los trazos redondeados de siempre.
export const TRAZO = { fill: 'none', strokeLinecap: 'round', strokeLinejoin: 'round' };

// Sus colores. En claro, la etiqueta navy con la cara blanca; en oscuro se voltea (blanca con la
// cara navy), como el logo. No usa el color de la temporada: la temporada le cambia la ropa, no la
// piel.
export const useColoresTiqui = (sobre) => {
  const COLORES = useColores();
  const { colores } = useTema();
  return useMemo(() => {
    const base = COLORES.oscuro
      ? { cuerpo: '#FFFFFF', rasgo: '#003049' }
      : { cuerpo: '#003049', rasgo: '#FFFFFF' };
    const encima =
      sobre === 'color' ? { cuerpo: '#FFFFFF', rasgo: colores.marca }
      : sobre === 'oscuro' ? { cuerpo: '#FFFFFF', rasgo: '#003049' }
      : {};
    return {
      ...base,
      ...encima,
      cordon: '#009AEB',
      fondo: COLORES.fondo,
      linea: COLORES.linea,
      suave: COLORES.textoSuave,
    };
  }, [COLORES, colores.marca, sobre]);
};

// Lo que lleva puesto según la temporada de la tienda (o nada): el que le
// armó el dueño en el panel, o el de fábrica de la temporada.
export const useDisfrazTiqui = () => {
  const { tema, decoracion, disfraces } = useTema();
  return useMemo(() => (tema && decoracion ? disfrazDeTema(tema, disfraces) : null), [tema, decoracion, disfraces]);
};

// Quien pidió menos movimiento en su teléfono la ve quieta. El gancho vive en
// hooks/ porque también lo usan los avisos; aquí se reexporta para Tiqui.
export { useMovimientoReducido } from '../../hooks/useMovimientoReducido';

// Parpadea cada tanto: es lo que hace que se sienta viva y no un dibujo.
export const useParpadeo = (activo = true) => {
  const [cerrado, setCerrado] = useState(false);
  useEffect(() => {
    if (!activo) return undefined;
    let cerrar;
    const reloj = setInterval(() => {
      setCerrado(true);
      cerrar = setTimeout(() => setCerrado(false), 140);
    }, 3800);
    return () => {
      clearInterval(reloj);
      clearTimeout(cerrar);
    };
  }, [activo]);
  return cerrado;
};

// Los disfraces. Las piezas son datos (utils/piezasDisfraz.js, el mismo archivo que usa la web);
// aquí solo se dibujan con react-native-svg, igual que DisfrazTiqui.jsx en la web. Cada pieza
// lleva un borde del color de los rasgos, así se despega del cuerpo en claro y en oscuro.
const ELEMENTOS = { path: Path, rect: Rect, circle: Circle, ellipse: Ellipse };
const MEDIDAS = ['d', 'x', 'y', 'width', 'height', 'rx', 'ry', 'cx', 'cy', 'r'];
// Primero el cuello, después la cara y arriba de todo el sombrero.
const ORDEN = ['cuello', 'cara', 'cabeza'];

const colorDe = (valor, pieza) =>
  valor === 'principal' ? pieza.principal : valor === 'acento' ? pieza.acento : valor;

const medidasDe = (forma) => {
  const props = {};
  MEDIDAS.forEach((m) => { if (forma[m] !== undefined) props[m] = forma[m]; });
  if (forma.evenodd) props.fillRule = 'evenodd';
  return props;
};

// Las formas que arman la silueta: las que tienen relleno y cuentan para el borde.
const enLaSilueta = (forma) => forma.relleno !== 'none' && !forma.trazo && !forma.sinContorno;

// 1.ª pasada: la silueta, toda del color del borde y con el borde alrededor.
const Silueta = ({ forma, contorno }) => {
  const El = ELEMENTOS[forma.el];
  if (!El) return null;
  return <El {...medidasDe(forma)} fill={contorno} stroke={contorno} strokeWidth={4} strokeLinejoin="round" />;
};

// 2.ª pasada: la forma con sus colores.
const Forma = ({ forma, pieza, contorno }) => {
  const El = ELEMENTOS[forma.el];
  if (!El) return null;
  const props = medidasDe(forma);
  props.fill = colorDe(forma.relleno, pieza);
  if (forma.trazo) {
    props.stroke = colorDe(forma.trazo, pieza);
    props.strokeWidth = forma.anchoTrazo;
    if (forma.opacidadTrazo !== undefined) props.strokeOpacity = forma.opacidadTrazo;
    if (forma.redondo) props.strokeLinecap = 'round';
  } else if (forma.separar) {
    props.stroke = contorno;
    props.strokeWidth = 4;
    props.strokeLinejoin = 'round';
  }
  if (forma.opacidad !== undefined) props.opacity = forma.opacidad;
  return <El {...props} />;
};

// Lo que Tiqui lleva puesto. Va encima del cuerpo y del cordón.
export const Disfraz = ({ disfraz, contorno }) => {
  const puesto = normalizarDisfraz(disfraz);
  if (!puesto) return null;
  return (
    <G>
      {puesto.rubor && (
        <G opacity={RUBOR_DISFRAZ.opacidad}>
          {RUBOR_DISFRAZ.formas.map((f) => (
            <Ellipse key={f.cx} cx={f.cx} cy={f.cy} rx={f.rx} ry={f.ry} fill={RUBOR_DISFRAZ.color} />
          ))}
        </G>
      )}
      {ORDEN.map((ranura) => {
        const pieza = puesto[ranura];
        const def = pieza && PIEZAS_DISFRAZ[pieza.tipo];
        if (!def) return null;
        return (
          <G key={ranura} transform={def.giro}>
            {def.formas.filter(enLaSilueta).map((forma, i) => <Silueta key={i} forma={forma} contorno={contorno} />)}
            {def.formas.map((forma, i) => <Forma key={i} forma={forma} pieza={pieza} contorno={contorno} />)}
          </G>
        );
      })}
    </G>
  );
};

// El cuerpo con su agujero, del color que toque.
export const Cuerpo = ({ color }) => <Path d={CUERPO + AGUJERO} fillRule="evenodd" fill={color} />;

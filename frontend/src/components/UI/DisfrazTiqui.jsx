import { PIEZAS_DISFRAZ, RUBOR } from '../../utils/piezasDisfraz';
import { normalizarDisfraz } from '../../utils/disfracesTiqui';

// DISFRAZ DE TIQUI — DisfrazTiqui.jsx
// Lo que Tiqui lleva puesto: una pieza en la cabeza, otra en la cara y otra en el cuello, más los
// cachetes colorados.

// Primero el cuello, después la cara y arriba de todo el sombrero.
const ORDEN = ['cuello', 'cara', 'cabeza'];

const MEDIDAS = ['d', 'x', 'y', 'width', 'height', 'rx', 'ry', 'cx', 'cy', 'r'];

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
  const El = forma.el;
  return <El {...medidasDe(forma)} fill={contorno} stroke={contorno} strokeWidth="4" strokeLinejoin="round" />;
};

// 2.ª pasada: la forma con sus colores.
const Forma = ({ forma, pieza, contorno }) => {
  const El = forma.el;
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
    props.paintOrder = 'stroke';
  }
  if (forma.opacidad !== undefined) props.opacity = forma.opacidad;
  return <El {...props} />;
};

// `contorno`: el color del borde de las piezas. Por defecto el de los rasgos (el token que ya se
// voltea en modo oscuro); el asistente, que pinta a Tiqui con colores fijos, pasa el suyo.
const DisfrazTiqui = ({ disfraz, contorno = 'var(--mascota-rasgo)' }) => {
  const puesto = normalizarDisfraz(disfraz);
  if (!puesto) return null;

  return (
    <g className="tiqui-disfraz">
      {puesto.rubor && (
        <g opacity={RUBOR.opacidad}>
          {RUBOR.formas.map((f) => <ellipse key={f.cx} cx={f.cx} cy={f.cy} rx={f.rx} ry={f.ry} fill={RUBOR.color} />)}
        </g>
      )}
      {ORDEN.map((ranura) => {
        const pieza = puesto[ranura];
        const def = pieza && PIEZAS_DISFRAZ[pieza.tipo];
        if (!def) return null;
        return (
          <g key={ranura} data-pieza={pieza.tipo} transform={def.giro}>
            {def.formas.filter(enLaSilueta).map((forma, i) => <Silueta key={i} forma={forma} contorno={contorno} />)}
            {def.formas.map((forma, i) => <Forma key={i} forma={forma} pieza={pieza} contorno={contorno} />)}
          </g>
        );
      })}
    </g>
  );
};

export default DisfrazTiqui;

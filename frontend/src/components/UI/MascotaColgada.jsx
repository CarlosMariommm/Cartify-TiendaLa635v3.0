import { useEffect, useState } from 'react';
import { CUERPO, AGUJERO } from './mascotaFormas';
import DisfrazTiqui from './DisfrazTiqui';
import { useDisfrazTiqui } from '../../hooks/useDisfrazTiqui';
import { sinSombrero } from '../../utils/disfracesTiqui';

// MASCOTA COLGADA — MascotaColgada.jsx
// La etiqueta colgando de la página en el inicio de sesión: el cordón baja desde la línea del
// encabezado, agarrado con un broche, y la etiqueta se mece despacio.

// Cuánto cordón hay entre el broche y la punta de la etiqueta (unidades del dibujo).
const LARGO = 140;

const RASGO = 'var(--mascota-rasgo)';
const trazo = { fill: 'none', strokeLinecap: 'round', strokeLinejoin: 'round' };

// El formulario queda a la derecha en pantalla ancha y debajo en el teléfono.
const ANGOSTA = '(max-width: 940px)';

function useFormularioAbajo() {
  const [abajo, setAbajo] = useState(() => typeof window !== 'undefined' && !!window.matchMedia?.(ANGOSTA).matches);
  useEffect(() => {
    const mq = window.matchMedia?.(ANGOSTA);
    if (!mq) return undefined;
    const alCambiar = () => setAbajo(mq.matches);
    mq.addEventListener('change', alCambiar);
    return () => mq.removeEventListener('change', alCambiar);
  }, []);
  return abajo;
}

// Hacia dónde miran los ojos (x, y en unidades del dibujo).
function mirarA(mirada, progreso, abajo) {
  if (mirada === 'correo') {
    // Lee lo que se escribe: de izquierda a derecha a medida que avanza.
    return abajo ? [-6 + 12 * progreso, 9] : [4 + 7 * progreso, 6];
  }
  if (mirada === 'espia') return abajo ? [2, 9] : [8, 5];
  return abajo ? [0, 8] : [8, 2];
}

const cerrado = ([x, y]) => `M${x - 12},${y - 2} Q${x},${y + 9} ${x + 12},${y - 2}`;

const MascotaColgada = ({ mirada = 'formulario', progreso = 0, estado = 'reposo', className = '' }) => {
  const abajo = useFormularioAbajo();
  const [mx, my] = mirarA(mirada, progreso, abajo);
  const ojosCerrados = mirada === 'tapada';
  const espia = mirada === 'espia';
  // Sin sombrero: colgando junto al título, crecería hacia el texto. Ver sinSombrero.
  const disfraz = sinSombrero(useDisfrazTiqui());

  return (
    <svg
      viewBox={`96 -6 208 ${398 + LARGO}`}
      className={`mascota mascota-colgada ${className}`}
      data-mirada={mirada}
      data-estado={estado}
      aria-hidden="true"
      style={{ overflow: 'visible' }}
    >
      <g className="colgada-vaiven">
        <path d={`M200,0 L200,${160 + LARGO}`} stroke="var(--mascota-cordon)" strokeWidth="7" {...trazo} />
        <g transform={`translate(0 ${LARGO})`}>
          <g className="colgada-cuerpo">
            <path d={CUERPO + AGUJERO} fillRule="evenodd" fill="var(--mascota-cuerpo)" />

            <g className="colgada-cara" style={{ transform: `translate(${(mx * 0.5).toFixed(1)}px, ${(my * 0.5).toFixed(1)}px)` }}>
              <path className="colgada-cejas" d="M162,231 L186,222 M214,222 L238,231" stroke={RASGO} strokeWidth="6.5" {...trazo} />

              {/* Ojos abiertos: los que siguen al formulario. */}
              <g className="colgada-abiertos" style={{ opacity: ojosCerrados || espia ? 0 : 1 }}>
                <g style={{ transform: `translate(${(mx * 0.5).toFixed(1)}px, ${(my * 0.5).toFixed(1)}px)` }} className="colgada-ojos">
                  <g className="mascota-parpadeo" style={{ transformOrigin: '200px 252px' }}>
                    <ellipse cx="174" cy="252" rx="10" ry="14" fill={RASGO} />
                    <ellipse cx="226" cy="252" rx="10" ry="14" fill={RASGO} />
                  </g>
                </g>
              </g>

              {/* Cerrados (no está mirando la contraseña) o espiando con uno. */}
              <path
                className="colgada-cerrados"
                d={ojosCerrados ? `${cerrado([174, 252])} ${cerrado([226, 252])}` : cerrado([174, 252])}
                stroke={RASGO} strokeWidth="7" {...trazo}
                style={{ opacity: ojosCerrados || espia ? 1 : 0 }}
              />
              {espia && <ellipse cx={226 + mx * 0.5} cy={252 + my * 0.5} rx="10" ry="14" fill={RASGO} />}

              {/* Colorada: la pillaron cerca de una contraseña. */}
              <g className="colgada-rubor" style={{ opacity: ojosCerrados ? 0.5 : 0 }}>
                <ellipse cx="150" cy="282" rx="12" ry="7" fill="#F0707F" />
                <ellipse cx="250" cy="282" rx="12" ry="7" fill="#F0707F" />
              </g>

              <path className="colgada-boca colgada-b-sonrisa" d="M184,284 Q200,300 216,284" stroke={RASGO} strokeWidth="7.5" {...trazo} />
              <path className="colgada-boca colgada-b-lado" d="M188,292 Q204,297 214,286" stroke={RASGO} strokeWidth="7" {...trazo} />
              <path className="colgada-boca colgada-b-ondulada" d="M180,292 q5,-7 10,0 q5,7 10,0 q5,-7 10,0 q5,7 10,0" stroke={RASGO} strokeWidth="6.5" {...trazo} />
            </g>

            {/* Lo de la temporada, siempre en el cuello (bufanda o corbatín). */}
            <DisfrazTiqui disfraz={disfraz} />
          </g>
        </g>
      </g>

      {/* El broche que la sujeta a la línea del encabezado. No se mece. */}
      <rect x="188" y="-6" width="24" height="12" rx="4" fill="var(--mascota-cuerpo)" />
    </svg>
  );
};

export default MascotaColgada;

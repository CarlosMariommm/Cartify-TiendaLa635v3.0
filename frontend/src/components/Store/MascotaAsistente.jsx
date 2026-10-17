import { useEffect, useRef } from 'react';
import { CUERPO, AGUJERO, CORDON } from '../UI/mascotaFormas';
import DisfrazTiqui from '../UI/DisfrazTiqui';
import { useDisfrazTiqui } from '../../hooks/useDisfrazTiqui';

// MascotaAsistente — la etiqueta del logo con cara. En el asistente de voz es A QUIEN se le habla:
// reemplaza al orbe del micrófono. Estilo plano: la etiqueta blanca, los rasgos en el navy de la
// casa y el cordón en el azul de acento.

const BLANCO = '#FFFFFF';
const NAVY = '#003049';
const ACENTO = '#009AEB';

function rasgos(estado, animo) {
  const feliz = animo === 'feliz' || animo === 'contento';
  return {
    boca: estado === 'hablando' ? 'habla'
      : animo === 'feliz' ? 'abierta'
      : animo === 'confundido' ? 'ondulada'
      : estado === 'escuchando' ? 'o'
      : estado === 'pensando' ? 'lado' : 'sonrisa',
    ojos: feliz ? 'felices'
      : animo === 'confundido' ? 'confundidos'
      : estado === 'escuchando' ? 'grandes' : 'normales',
    cejas: animo === 'confundido' || estado === 'pensando' ? 'una'
      : estado === 'escuchando' ? 'arriba' : 'no',
    pose: estado === 'escuchando' ? 'atento' : animo === 'confundido' ? 'ladeado' : 'normal',
    mov: estado === 'hablando' ? 'rebota'
      : animo === 'feliz' ? 'salta'
      : estado === 'pensando' ? 'piensa'
      : estado === 'escuchando' ? 'respira' : 'flota',
    antena: estado === 'escuchando' ? 'recibe' : estado === 'pensando' ? 'gira' : 'suave',
  };
}

// Hacia dónde mira cuando NO sigue al puntero (en unidades del dibujo).
const MIRADA_FIJA = { escuchando: [0, 4], pensando: [7, -9], hablando: [0, 0] };
// Si nadie mueve el puntero, mira alrededor y de vez en cuando al botón de abajo.
const MIRADAS_OCIOSAS = [[0, 0], [0, 9], [0, 9], [0, 0], [-7, -2], [0, 0], [7, -3]];

const CONFETI = [
  { x: 96, y: 60, c: ACENTO, d: '-.2s' },
  { x: 300, y: 44, c: '#FFC23D', d: '-.9s' },
  { x: 130, y: 30, c: '#F0707F', d: '-1.3s' },
  { x: 268, y: 84, c: '#8ECBE8', d: '-.5s' },
  { x: 84, y: 140, c: '#FFC23D', d: '-1.6s' },
  { x: 318, y: 150, c: '#F0707F', d: '-1.1s' },
];

const MascotaAsistente = ({ estado = 'reposo', animo = 'normal', latido, compacta = false, vozReal = false, sobreClaro = false, className = '' }) => {
  // El cuerpo y los rasgos, al revés sobre fondo claro (ver sobreClaro arriba).
  const cuerpo = sobreClaro ? NAVY : BLANCO;
  const tinta = sobreClaro ? BLANCO : NAVY;
  const raizRef = useRef(null);
  const caraRef = useRef(null);
  const ojosRef = useRef(null);
  const cabezaRef = useRef(null);
  const r = rasgos(estado, animo);
  const disfraz = useDisfrazTiqui();

  const mirar = (x, y) => {
    if (caraRef.current) caraRef.current.style.transform = `translate(${(x * 0.55).toFixed(1)}px, ${(y * 0.55).toFixed(1)}px)`;
    if (ojosRef.current) ojosRef.current.style.transform = `translate(${(x * 0.5).toFixed(1)}px, ${(y * 0.5).toFixed(1)}px)`;
  };

  // La mirada fija de cada estado: a uno cuando escucha, arriba cuando piensa.
  useEffect(() => {
    const fija = animo === 'confundido' ? [-5, -1] : MIRADA_FIJA[estado];
    if (fija) mirar(fija[0], fija[1]);
  }, [estado, animo]);

  // Esperando, sigue al puntero con los ojos. Es lo que hace que se sienta que hay alguien ahí y no
  // un botón con cara.
  useEffect(() => {
    if (compacta || estado !== 'reposo' || animo === 'confundido') return undefined;
    let ultimo = 0;
    let vuelta = 0;

    const alMover = (e) => {
      ultimo = Date.now();
      const caja = raizRef.current?.getBoundingClientRect();
      if (!caja) return;
      const cx = caja.left + caja.width / 2;
      const cy = caja.top + caja.height * 0.62;
      const dx = Math.max(-1, Math.min(1, (e.clientX - cx) / 280));
      const dy = Math.max(-1, Math.min(1, (e.clientY - cy) / 280));
      mirar(dx * 8, dy * 7);
    };
    window.addEventListener('pointermove', alMover);

    // Mirar alrededor solo es movimiento de adorno: con movimiento reducido, no.
    const quieto = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const reloj = quieto ? null : setInterval(() => {
      if (Date.now() - ultimo < 4000) return;
      const [x, y] = MIRADAS_OCIOSAS[vuelta++ % MIRADAS_OCIOSAS.length];
      mirar(x, y);
    }, 1300);

    return () => {
      window.removeEventListener('pointermove', alMover);
      if (reloj) clearInterval(reloj);
    };
  }, [estado, animo, compacta]);

  // Asiente con cada palabra nueva que le llega: "te estoy oyendo".
  useEffect(() => {
    const g = cabezaRef.current;
    if (!g || estado !== 'escuchando' || !latido) return;
    g.classList.remove('masc-asiente');
    void g.getBoundingClientRect(); // reinicia la animación aunque ya estuviera puesta
    g.classList.add('masc-asiente');
  }, [latido, estado]);

  return (
    <svg
      ref={raizRef}
      // En chico se encuadra solo la etiqueta: sin confeti ni "?" no hace falta el aire.
      viewBox={compacta ? '106 34 188 356' : '80 14 240 384'}
      className={`masc ${className}`}
      data-boca={r.boca}
      data-ojos={r.ojos}
      data-cejas={r.cejas}
      data-pose={r.pose}
      data-mov={r.mov}
      data-antena={r.antena}
      data-animo={animo}
      data-voz-real={vozReal ? 'si' : undefined}
      aria-hidden="true"
      style={{ overflow: 'visible' }}
    >
      {!compacta && (
        <g className="masc-confeti">
          {CONFETI.map((p) => (
            <rect key={p.x} className="masc-papelito" x={p.x} y={p.y} width="8" height="18" rx="4" fill={p.c} style={{ animationDelay: p.d }} />
          ))}
        </g>
      )}

      <g className="masc-pose">
        <g className="masc-mueve">
          <g ref={cabezaRef} className="masc-cabeza">
            <g className="masc-antena">
              {!compacta && [0, 1, 2].map((i) => (
                <circle key={i} className="masc-llega" cx="219" cy="44" r="14" fill="none" stroke="#8ECBE8" strokeWidth="3" />
              ))}
              <path d={CORDON} fill="none" stroke={ACENTO} strokeWidth="7" strokeLinecap="round" />
            </g>

            <path d={CUERPO + AGUJERO} fillRule="evenodd" fill={cuerpo} />

            <g ref={caraRef} className="masc-cara">
              <path className="masc-ceja masc-ceja-i" d="M162,224 Q174,213 186,224" fill="none" stroke={tinta} strokeWidth="6.5" strokeLinecap="round" />
              <path className="masc-ceja masc-ceja-d" d="M214,224 Q226,213 238,224" fill="none" stroke={tinta} strokeWidth="6.5" strokeLinecap="round" />

              <g className="masc-ojos-abiertos">
                <g ref={ojosRef} className="masc-ojos">
                  <g className="masc-parpadeo">
                    <ellipse className="masc-ojo masc-ojo-i" cx="174" cy="252" rx="10" ry="14" fill={tinta} />
                    <ellipse className="masc-ojo masc-ojo-d" cx="226" cy="252" rx="10" ry="14" fill={tinta} />
                  </g>
                </g>
              </g>
              <path className="masc-ojos-felices" d="M162,257 Q174,239 186,257 M214,257 Q226,239 238,257" fill="none" stroke={tinta} strokeWidth="7" strokeLinecap="round" />

              <path className="masc-boca masc-b-sonrisa" d="M184,284 Q200,300 216,284" fill="none" stroke={tinta} strokeWidth="7.5" strokeLinecap="round" />
              <ellipse className="masc-boca masc-b-o" cx="200" cy="291" rx="8" ry="10" fill={tinta} />
              <g className="masc-boca masc-b-habla">
                <ellipse className="masc-habla" cx="200" cy="290" rx="11" ry="12" fill={tinta} />
              </g>
              <path className="masc-boca masc-b-abierta" d="M182,280 Q200,316 218,280 Z" fill={tinta} stroke={tinta} strokeWidth="4" strokeLinejoin="round" />
              <path className="masc-boca masc-b-lado" d="M188,292 Q204,297 214,286" fill="none" stroke={tinta} strokeWidth="7" strokeLinecap="round" />
              <path className="masc-boca masc-b-ondulada" d="M180,292 q5,-7 10,0 q5,7 10,0 q5,-7 10,0 q5,7 10,0" fill="none" stroke={tinta} strokeWidth="6.5" strokeLinecap="round" strokeLinejoin="round" />
            </g>

            {/* Lo de la temporada, dentro de la cabeza: asiente y salta con ella. */}
            <DisfrazTiqui disfraz={disfraz} contorno={tinta} />
          </g>
        </g>

        {!compacta && (
          <g className="masc-pregunta">
            <path d="M288,94 C288,78 314,78 314,94 C314,104 301,104 301,116" fill="none" stroke={ACENTO} strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="301" cy="131" r="5.5" fill={ACENTO} />
          </g>
        )}
      </g>
    </svg>
  );
};

export default MascotaAsistente;

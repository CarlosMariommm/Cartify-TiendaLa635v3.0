import { useEffect, useLayoutEffect, useRef } from 'react';
import { CUERPO, AGUJERO } from '../UI/mascotaFormas';
import { giroHasta, porcionEnLaFlecha } from '../../utils/juegoTiqui';
import { sonarTic } from '../../utils/sonidosJuego';

/*
 * ============================================================
 * LA RULETA DEL RETO DE TIQUI — RuletaTiqui.jsx
 * ============================================================
 * Dibuja las porciones que le pasan (utils/juegoTiqui.js → armarRuleta) con
 * el ancho que tienen de verdad: el premio mayor se ve tan chico como es
 * de difícil.
 *
 * El giro corre en JavaScript, cuadro a cuadro, y no con una transición de
 * CSS: así se sabe en todo momento qué porción pasa bajo la flecha, que es
 * lo que hace sonar el tic y saltar la flecha. Se frena de a poco (ease-out)
 * y se detiene en el ángulo que ya eligió el juego antes de empezar.
 *
 *   girando + premio  gira hasta premio.angulo y avisa con alParar.
 *   lento             da vueltas despacio (la pantalla de inicio, para llamar).
 * ============================================================
 */

const R = 180;
const FOCOS = 24;

const COLORES_DULCE = [
  { fondo: '#009AEB', tinta: '#FFFFFF' },
  { fondo: '#FFC23D', tinta: '#003049' },
  { fondo: '#F0707F', tinta: '#FFFFFF' },
];

const punto = (grados, r) => {
  const a = (grados * Math.PI) / 180;
  return [r * Math.sin(a), -r * Math.cos(a)];
};

const rebanada = (desde, hasta) => {
  const [x1, y1] = punto(desde, R);
  const [x2, y2] = punto(hasta, R);
  const grande = hasta - desde > 180 ? 1 : 0;
  return `M0,0 L${x1.toFixed(2)},${y1.toFixed(2)} A${R},${R} 0 ${grande} 1 ${x2.toFixed(2)},${y2.toFixed(2)} Z`;
};

const estrella = (r1, r2) => Array.from({ length: 10 }, (_, i) => {
  const [x, y] = punto(i * 36, i % 2 ? r2 : r1);
  return `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`;
}).join(' ') + ' Z';

// Un caramelo envuelto, centrado en 0,0.
const Caramelo = ({ tinta }) => (
  <g>
    <path d="M-9,0 L-21,-9 L-18,0 L-21,9 Z M9,0 L21,-9 L18,0 L21,9 Z" fill={tinta} />
    <ellipse rx="12" ry="9" fill={tinta} />
  </g>
);

// La forma de tiempo de giro: arranca rápido y se frena suave al final.
const frenar = (t) => 1 - (1 - t) ** 4;

const ponerGiro = (rueda, giro, g) => {
  giro.current = g;
  rueda.current?.setAttribute('transform', `rotate(${g.toFixed(2)})`);
};

const RuletaTiqui = ({ porciones, girando = false, premio = null, alParar, lento = false, className = '' }) => {
  const ruedaRef = useRef(null);
  const flechaRef = useRef(null);
  const giro = useRef(0);
  const alPararRef = useRef(alParar);
  useLayoutEffect(() => { alPararRef.current = alParar; });

  // Vueltas lentas en la pantalla de inicio.
  useEffect(() => {
    if (!lento || girando) return undefined;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return undefined;
    let cuadro = 0;
    let antes = performance.now();
    const paso = (ahora) => {
      ponerGiro(ruedaRef, giro, giro.current + ((ahora - antes) / 1000) * 9);
      antes = ahora;
      cuadro = requestAnimationFrame(paso);
    };
    cuadro = requestAnimationFrame(paso);
    return () => cancelAnimationFrame(cuadro);
  }, [lento, girando]);

  // El giro de verdad.
  useEffect(() => {
    if (!girando || !premio) return undefined;
    const quieto = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const desde = giro.current % 360;
    const hasta = giroHasta(desde, premio.angulo, quieto ? 1 : 7);
    const dura = quieto ? 1400 : 6200;
    const inicio = performance.now();
    let ultima = porcionEnLaFlecha(porciones, desde);
    let cuadro = 0;

    const tic = () => {
      sonarTic();
      const f = flechaRef.current;
      if (!f) return;
      f.classList.remove('juego-flecha-tic');
      void f.getBoundingClientRect(); // reinicia la animación aunque siga puesta
      f.classList.add('juego-flecha-tic');
    };

    const paso = (ahora) => {
      const t = Math.min(1, (ahora - inicio) / dura);
      const g = desde + (hasta - desde) * frenar(t);
      ponerGiro(ruedaRef, giro, g);
      const enFlecha = porcionEnLaFlecha(porciones, g);
      if (enFlecha !== ultima) {
        ultima = enFlecha;
        tic();
      }
      if (t < 1) cuadro = requestAnimationFrame(paso);
      else alPararRef.current?.();
    };
    cuadro = requestAnimationFrame(paso);
    return () => cancelAnimationFrame(cuadro);
  }, [girando, premio, porciones]);

  // La porción que ganó brilla cuando la ruleta se detiene.
  const ganadora = premio && !girando
    ? porciones.findIndex((p) => premio.angulo >= p.desde && premio.angulo < p.hasta)
    : -1;

  return (
    <svg
      viewBox="-215 -232 430 447"
      className={`juego-ruleta ${girando ? 'juego-ruleta-girando' : ''} ${className}`}
      role="img"
      aria-label="Ruleta de premios"
    >
      {/* El aro con los focos */}
      <circle r={R + 22} fill="#003049" />
      <circle r={R + 22} fill="none" stroke="#8ECBE8" strokeOpacity=".35" strokeWidth="2" />
      {Array.from({ length: FOCOS }, (_, i) => {
        const [x, y] = punto((i * 360) / FOCOS, R + 11);
        return <circle key={i} className={i % 2 ? 'juego-foco juego-foco-b' : 'juego-foco'} cx={x} cy={y} r="4.5" />;
      })}

      <g ref={ruedaRef}>
        {porciones.map((p, i) => {
          const medio = (p.desde + p.hasta) / 2;
          const ancho = p.hasta - p.desde;
          if (p.tipo === 'dulce') {
            const c = COLORES_DULCE[porciones.slice(0, i).filter((x) => x.tipo === 'dulce').length % COLORES_DULCE.length];
            return (
              <g key={i}>
                <path d={rebanada(p.desde, p.hasta)} fill={c.fondo} stroke="#003049" strokeWidth="3" />
                <g transform={`rotate(${medio})`}>
                  <g transform={`translate(0 ${-R + 42})`}><Caramelo tinta={c.tinta} /></g>
                  {/* Con el secreto muy grande, los dulces quedan angostos: solo el caramelo. */}
                  {ancho >= 40 && (
                    <text y={-R + 92} textAnchor="middle" fill={c.tinta} fontSize="17" fontWeight="800" letterSpacing="1">DULCE</text>
                  )}
                </g>
              </g>
            );
          }
          const agotado = p.agotado;
          return (
            <g key={i}>
              <path d={rebanada(p.desde, p.hasta)} fill={agotado ? '#4B5560' : '#0B1B2E'} stroke="#003049" strokeWidth="3" />
              <g transform={`rotate(${medio})`}>
                {/* La estrella late con CSS, que pisaría el transform del mismo elemento: va adentro. */}
                <g transform={`translate(0 ${-R + 40})`}>
                  <path d={estrella(17, 7.5)} fill={agotado ? '#8A949D' : '#FFC23D'} className={agotado ? '' : 'juego-estrella'} />
                </g>
                {ancho >= 30 && (
                  agotado ? (
                    <text y={-R + 86} textAnchor="middle" fill="#C9D0D6" fontSize="13" fontWeight="800" letterSpacing="1">AGOTADO</text>
                  ) : (
                    <text textAnchor="middle" fill="#FFC23D" fontSize="13.5" fontWeight="800" letterSpacing="1">
                      <tspan x="0" y={-R + 84}>PREMIO</tspan>
                      <tspan x="0" y={-R + 101}>MAYOR</tspan>
                    </text>
                  )
                )}
              </g>
            </g>
          );
        })}

        {ganadora >= 0 && (
          <path
            d={rebanada(porciones[ganadora].desde, porciones[ganadora].hasta)}
            className="juego-ganadora"
            fill="none"
            stroke="#FFFFFF"
            strokeWidth="7"
            strokeLinejoin="round"
          />
        )}
      </g>

      {/* El centro, con la etiqueta de Tiqui */}
      <circle r="40" fill="#FFFFFF" stroke="#003049" strokeWidth="5" />
      <path d={CUERPO + AGUJERO} fillRule="evenodd" fill="#003049" transform="translate(-34 -42) scale(0.17)" />

      {/* La flecha, arriba, fija */}
      <g ref={flechaRef} className="juego-flecha">
        <path d={`M-19,${-R - 30} L19,${-R - 30} L0,${-R + 14} Z`} fill="#FFFFFF" stroke="#003049" strokeWidth="5" strokeLinejoin="round" />
        <circle cy={-R - 22} r="5" fill="#009AEB" />
      </g>
    </svg>
  );
};

export default RuletaTiqui;

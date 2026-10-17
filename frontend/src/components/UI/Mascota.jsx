import { CUERPO, AGUJERO, CORDON } from './mascotaFormas';
import DisfrazTiqui from './DisfrazTiqui';
import { useDisfrazTiqui } from '../../hooks/useDisfrazTiqui';

// MASCOTA — Mascota.jsx
// La etiqueta del logo con cara, en estilo plano: dos colores y el cordón azul.

const CORDON_COLOR = 'var(--mascota-cordon)';
const RASGO = 'var(--mascota-rasgo)';
const CUERPO_COLOR = 'var(--mascota-cuerpo)';

// Cada pose: qué cara pone, qué hace el cordón, cómo se mueve y qué la acompaña. `vista` es el
// encuadre (viewBox): cada una deja el aire justo para lo que tiene alrededor.
const POSES = {
  // Colgando de su cordón y balanceándose, como una etiqueta en el estante.
  cargando: { vista: '0 0 400 400', cordon: 'colgado', mov: 'mascota-pendulo' },
  // Con una lupa en un ojo: no encontró lo que se buscaba.
  buscando: {
    vista: '80 26 240 370', ojos: 'lupa', mira: [4, -2], cejas: 'una', boca: 'lado',
    mov: 'mascota-balanceo', delante: 'lupa',
  },
  // Mirando un carrito vacío.
  vacio: {
    vista: '56 26 344 412', correr: 'translate(-46 0)', mira: [7, 4], cejas: 'preocupado',
    boca: 'plana', mov: 'mascota-respira', aparte: 'carrito',
  },
  // El cordón desenchufado: se cortó la conexión.
  'sin-conexion': {
    vista: '96 26 304 364', mira: [6, -3], cejas: 'preocupado', boca: 'o',
    cordon: 'enchufe', aparte: 'toma',
  },
  // Se le cortó el cordón y se cayó. Queda APOYADA en el piso: la esquina de más abajo toca justo el
  // borde de arriba de la línea (y 443.5).
  error: {
    vista: '40 0 320 460', correr: 'translate(210 340) rotate(-66) scale(.88) translate(-200 -246)',
    ojos: 'x', boca: 'o', cordon: 'cortado', aparte: 'caida',
  },
  // Perdida, mirando a un lado. Es el "0" del 404.
  perdida: { vista: '104 30 192 360', mira: [-8, 0], cejas: 'una', boca: 'o', mov: 'mascota-balanceo' },
  // Saltando con confeti.
  fiesta: { vista: '40 0 320 395', ojos: 'feliz', boca: 'abierta', mov: 'mascota-salta', aparte: 'confeti' },
  // Guiñando un ojo y moviéndose como quien saluda.
  saludo: { vista: '104 30 192 360', ojos: 'guino', mov: 'mascota-saluda' },
  // Quieta y sonriendo, con aire para cualquier disfraz: la vista previa del
  // panel, donde varias juntas moviéndose serían un mareo.
  posando: { vista: '84 30 232 400' },

  // Los estados de un pedido (ver utils/pasosPedido.js). Cada uno cuenta lo que está pasando sin
  // tener que leer la etiqueta de texto.
  // Le llegó el pedido: mira el recibo con su ✓.
  recibido: { vista: '100 26 290 380', mira: [7, 1], mov: 'mascota-respira', aparte: 'recibo' },
  // Lo están armando: van cayendo productos a la bolsa y ella mira, concentrada.
  preparando: { vista: '100 26 270 400', mira: [6, 7], boca: 'lado', mov: 'mascota-respira', aparte: 'bolsa' },
  // Va para su casa: en patineta, inclinada hacia adelante, con el cordón al viento.
  'en-camino': {
    vista: '20 20 350 434', correr: 'rotate(8 200 382)', mira: [8, -1], cordon: 'viento',
    todo: 'mascota-traqueteo', detras: 'velocidad', aparte: 'patineta',
  },
  // Llegó: contenta junto a la bolsa entregada.
  entregado: { vista: '100 20 270 410', ojos: 'feliz', boca: 'abierta', mov: 'mascota-respira', aparte: 'entrega' },
  // Se canceló: triste, con el cordón caído.
  cancelado: { vista: '104 30 200 360', mira: [0, 5], cejas: 'preocupado', boca: 'triste', cordon: 'caido' },

  // Las secciones de Mi Cuenta que todavía no tienen nada. Ella se corre a la izquierda y mira lo
  // que falta, que flota a su lado: no es un error, es una invitación a llenarlo.
  // Mirando hacia arriba un corazón vacío: todavía no guardaste favoritos.
  'sin-favoritos': {
    vista: '56 26 344 370', correr: 'translate(-46 0)', mira: [7, -5],
    mov: 'mascota-respira', aparte: 'corazon-vacio',
  },
  // Un recibo en blanco, que todavía no dice nada.
  'sin-recibos': {
    vista: '56 26 344 370', correr: 'translate(-46 0)', mira: [7, 1], cejas: 'una', boca: 'lado',
    mov: 'mascota-respira', aparte: 'recibo-vacio',
  },
  // El pin del mapa esperando que le digan dónde va.
  'sin-direcciones': {
    vista: '56 26 344 370', correr: 'translate(-46 0)', mira: [7, -1],
    mov: 'mascota-respira', aparte: 'pin',
  },
  // Una tarjeta flotando, lista para guardarse.
  'sin-tarjetas': {
    vista: '56 26 344 370', correr: 'translate(-46 0)', mira: [7, 1],
    mov: 'mascota-respira', aparte: 'tarjeta',
  },
};

// En los botones va solo la etiqueta colgando, sin aire alrededor.
const VISTA_MINI = '110 0 180 392';

// Sobre qué va pintada. En la página toma los tokens; dentro de un botón del color de la marca o
// sobre un velo oscuro, la etiqueta tiene que ser blanca para verse.
const SOBRE = {
  color: { '--mascota-cuerpo': '#FFFFFF', '--mascota-rasgo': 'var(--marca-600)' },
  oscuro: { '--mascota-cuerpo': '#FFFFFF', '--mascota-rasgo': '#003049' },
};

const trazo = { fill: 'none', strokeLinecap: 'round', strokeLinejoin: 'round' };

const Ojos = ({ tipo = 'normal', mira = [0, 0] }) => {
  const I = [174, 252];
  const D = [226, 252];
  const lleno = ([x, y], k = 1) => (
    <ellipse cx={x + mira[0]} cy={y + mira[1]} rx={10 * k} ry={14 * k} fill={RASGO} />
  );
  const feliz = ([x, y]) => (
    <path d={`M${x - 12},${y + 5} Q${x},${y - 13} ${x + 12},${y + 5}`} stroke={RASGO} strokeWidth="7" {...trazo} />
  );
  const equis = ([x, y]) => (
    <path d={`M${x - 10},${y - 10} L${x + 10},${y + 10} M${x + 10},${y - 10} L${x - 10},${y + 10}`} stroke={RASGO} strokeWidth="7" {...trazo} />
  );

  if (tipo === 'feliz') return <>{feliz(I)}{feliz(D)}</>;
  if (tipo === 'x') return <>{equis(I)}{equis(D)}</>;
  if (tipo === 'guino') return <>{lleno(I)}{feliz(D)}</>;

  // Los ojos abiertos parpadean de vez en cuando.
  return (
    <g className="mascota-parpadeo" style={{ transformOrigin: `200px ${252 + mira[1]}px` }}>
      {lleno(I)}
      {lleno(D, tipo === 'lupa' ? 1.75 : 1)}
    </g>
  );
};

const CEJAS = {
  preocupado: 'M162,231 L186,222 M214,222 L238,231',
  una: 'M162,229 L186,229 M214,223 Q226,211 238,221',
};

const Boca = ({ tipo = 'sonrisa' }) => {
  if (tipo === 'abierta') {
    return <path d="M182,280 Q200,316 218,280 Z" fill={RASGO} stroke={RASGO} strokeWidth="4" strokeLinejoin="round" />;
  }
  if (tipo === 'o') return <ellipse cx="200" cy="291" rx="8" ry="10" fill={RASGO} />;
  const d = {
    sonrisa: 'M184,284 Q200,300 216,284',
    plana: 'M188,292 L212,292',
    lado: 'M188,292 Q204,297 214,286',
    triste: 'M186,296 Q200,284 214,296',
  }[tipo];
  return <path d={d} stroke={RASGO} strokeWidth="7.5" {...trazo} />;
};

const Cordon = ({ tipo }) => {
  if (tipo === 'colgado') return <path d="M200,0 L200,160" stroke={CORDON_COLOR} strokeWidth="7" {...trazo} />;
  if (tipo === 'cortado') {
    return <path d="M200,160 L200,112 M200,112 l-8,-12 M200,112 l0,-14 M200,112 l8,-12" stroke={CORDON_COLOR} strokeWidth="7" {...trazo} />;
  }
  // Al viento, hacia atrás: va rápido.
  if (tipo === 'viento') {
    return <path d="M200,160 C194,126 170,110 146,104 C120,98 108,84 96,78" stroke={CORDON_COLOR} strokeWidth="7" {...trazo} />;
  }
  // Caído sobre el hombro: sin ánimo.
  if (tipo === 'caido') {
    return <path d="M200,160 C216,150 244,152 260,172 C274,190 280,212 282,234" stroke={CORDON_COLOR} strokeWidth="7" {...trazo} />;
  }
  if (tipo === 'enchufe') {
    return (
      <>
        <path d="M200,160 C200,96 286,92 300,160 C306,190 296,246 316,250" stroke={CORDON_COLOR} strokeWidth="7" {...trazo} />
        <rect x="316" y="236" width="26" height="28" rx="6" fill={CORDON_COLOR} />
        <path d="M342,244 L355,244 M342,256 L355,256" stroke={CORDON_COLOR} strokeWidth="5" {...trazo} />
      </>
    );
  }
  return (
    <g className="mascota-antena">
      <path d={CORDON} stroke={CORDON_COLOR} strokeWidth="7" {...trazo} />
    </g>
  );
};

// Lo que se mueve CON la etiqueta (va dentro de su grupo).
const Lupa = () => (
  <>
    <circle cx="228" cy="250" r="36" fill={CORDON_COLOR} fillOpacity=".16" stroke={CORDON_COLOR} strokeWidth="9" />
    <path d="M254,276 L288,312" stroke={CORDON_COLOR} strokeWidth="12" {...trazo} />
    <path d="M206,238 A24,24 0 0 1 220,226" stroke="#FFFFFF" strokeWidth="5" opacity=".75" {...trazo} />
  </>
);

// Lo que se queda quieto alrededor.
const APARTE = {
  carrito: (
    <>
      <path d="M258,318 L280,318 L296,396 L370,396 L386,340 L286,340" stroke={CUERPO_COLOR} strokeWidth="9" {...trazo} />
      <circle cx="306" cy="420" r="10" fill={CUERPO_COLOR} />
      <circle cx="362" cy="420" r="10" fill={CUERPO_COLOR} />
    </>
  ),
  toma: (
    <>
      <rect x="368" y="214" width="24" height="72" rx="8" fill={CUERPO_COLOR} />
      <circle cx="380" cy="244" r="3.5" fill="var(--mascota-fondo, var(--papel))" />
      <circle cx="380" cy="256" r="3.5" fill="var(--mascota-fondo, var(--papel))" />
      <path className="mascota-chispa" d="M358,236 l3,-10 M360,264 l4,9" stroke="#FFC23D" strokeWidth="4" {...trazo} />
    </>
  ),
  caida: (
    <>
      <g className="mascota-cabo">
        <path d="M200,0 L200,66 M200,66 l-8,12 M200,66 l0,14 M200,66 l8,12" stroke={CORDON_COLOR} strokeWidth="7" {...trazo} />
      </g>
      {/* El piso, un poco más largo que la etiqueta tumbada (llega hasta x 337). */}
      <path d="M64,446 L350,446" stroke="var(--linea)" strokeWidth="5" {...trazo} />
      {/* Las rayas de la caída, a un lado de la etiqueta: suben con ella. */}
      <path d="M84,376 l-16,-8 M80,398 l-20,0" stroke="var(--tinta-suave)" strokeWidth="5" opacity=".6" {...trazo} />
    </>
  ),
  confeti: (
    <>
      {[
        [74, 120, -25, CORDON_COLOR], [330, 110, 30, '#FFC23D'], [52, 250, 60, '#F0707F'],
        [352, 236, -40, CORDON_COLOR], [104, 58, 15, '#FFC23D'], [296, 48, -20, '#F0707F'],
      ].map(([x, y, giro, color]) => (
        <rect key={`${x}-${y}`} x={x - 4} y={y - 9} width="8" height="18" rx="4" fill={color} transform={`rotate(${giro} ${x} ${y})`} />
      ))}
    </>
  ),
  // Recibido: un recibo con su ✓, flotando al lado.
  recibo: (
    <g className="mascota-flota-suave">
      <g transform="rotate(10 312 280)">
        <rect x="276" y="228" width="72" height="100" rx="8" fill="var(--mascota-fondo, var(--papel))" stroke={CUERPO_COLOR} strokeWidth="6" />
        <path d="M290,256 L334,256 M290,276 L334,276 M290,296 L318,296" stroke={CUERPO_COLOR} strokeWidth="6" opacity=".45" {...trazo} />
      </g>
      <circle cx="346" cy="232" r="19" fill={CORDON_COLOR} />
      <path d="M337,232 L344,239 L356,226" stroke="#FFFFFF" strokeWidth="5" {...trazo} />
    </g>
  ),
  // Preparando: una manzana y una caja caen a la bolsa (la bolsa va delante y se las traga).
  bolsa: (
    <>
      <g className="mascota-cae">
        <circle cx="300" cy="236" r="13" fill="#F0707F" />
        <path d="M300,223 q4,-8 10,-8" stroke="#4CC27A" strokeWidth="4" {...trazo} />
      </g>
      <g className="mascota-cae" style={{ animationDelay: '-0.8s' }}>
        <rect x="318" y="220" width="18" height="30" rx="5" fill="#FFC23D" />
      </g>
      <path d="M280,318 C280,296 320,296 320,318" stroke={CORDON_COLOR} strokeWidth="6" {...trazo} />
      <path d="M256,318 L344,318 L352,404 Q352,414 342,414 L258,414 Q248,414 248,404 Z" fill={CORDON_COLOR} />
      <path d="M256,318 L344,318 L345,332 L255,332 Z" fill="#000000" opacity=".12" />
    </>
  ),
  // En camino: la patineta. Las ruedas giran (ver .mascota-rueda).
  patineta: (
    <>
      <path d="M312,396 L334,262 M318,262 L350,262" stroke={CUERPO_COLOR} strokeWidth="9" {...trazo} />
      <rect x="110" y="386" width="212" height="14" rx="7" fill={CUERPO_COLOR} />
      {[140, 300].map((x) => (
        <g key={x}>
          <circle cx={x} cy="424" r="20" fill="var(--mascota-fondo, var(--papel))" stroke={CUERPO_COLOR} strokeWidth="8" />
          <path className="mascota-rueda" style={{ transformOrigin: `${x}px 424px` }} d={`M${x - 10},424 L${x + 10},424`} stroke={CORDON_COLOR} strokeWidth="5" {...trazo} />
        </g>
      ))}
    </>
  ),
  // Entregado: la bolsa en el piso con su ✓, y un corazón que sube.
  entrega: (
    <>
      <path d="M282,332 C282,312 314,312 314,332" stroke={CORDON_COLOR} strokeWidth="6" {...trazo} />
      <path d="M258,332 L338,332 L345,410 Q345,418 337,418 L259,418 Q251,418 251,410 Z" fill={CORDON_COLOR} />
      <circle cx="340" cy="336" r="17" fill={CUERPO_COLOR} />
      <path d="M332,336 L338,342 L349,330" stroke={RASGO} strokeWidth="4.5" {...trazo} />
      <path className="mascota-corazon" d="M322,196 c-8,-12 -26,-4 -18,10 l18,16 l18,-16 c8,-14 -10,-22 -18,-10 z" fill="#F0707F" />
    </>
  ),
  // Sin favoritos: un corazón con solo el borde, flotando.
  'corazon-vacio': (
    <g className="mascota-flota-suave">
      <path transform="translate(322 256) scale(1.2) translate(-322 -256)"
        d="M322,300 C276,268 266,236 286,216 C302,202 322,212 322,230 C322,212 342,202 358,216 C378,236 368,268 322,300 Z"
        fill="#F0707F" fillOpacity=".12" stroke="#F0707F" strokeWidth="9" strokeLinejoin="round"
      />
    </g>
  ),
  // Sin recibos: el papel con el borde de abajo cortado y las líneas apenas marcadas.
  'recibo-vacio': (
    <g className="mascota-flota-suave">
      <g transform="translate(312 278) rotate(8) scale(1.3) translate(-312 -278)">
        <path
          d="M276,226 L348,226 L348,330 L336,320 L324,330 L312,320 L300,330 L288,320 L276,330 Z"
          fill="var(--mascota-fondo, var(--papel))" stroke={CUERPO_COLOR} strokeWidth="6" strokeLinejoin="round"
        />
        <path d="M290,254 L334,254 M290,276 L334,276 M290,298 L318,298" stroke={CUERPO_COLOR} strokeWidth="5" strokeDasharray="1 11" opacity=".45" {...trazo} />
      </g>
    </g>
  ),
  // Sin direcciones: el pin del mapa, y su sombra quieta en el piso.
  pin: (
    <>
      <ellipse cx="322" cy="374" rx="30" ry="7" fill="var(--linea)" />
      {/* El tamaño va en un grupo aparte: la animación de flotar pisa el transform del suyo. */}
      <g className="mascota-flota-suave">
        <g transform="translate(322 340) scale(1.3) translate(-322 -332)">
          <path d="M322,332 C300,302 286,284 286,264 A36,36 0 0 1 358,264 C358,284 344,302 322,332 Z" fill={CORDON_COLOR} />
          <circle cx="322" cy="264" r="13" fill="var(--mascota-fondo, var(--papel))" />
        </g>
      </g>
    </>
  ),
  // Sin tarjetas: una tarjeta de plástico con su banda y su chip.
  tarjeta: (
    <g className="mascota-flota-suave">
      <g transform="translate(322 270) rotate(-10) scale(1.3) translate(-322 -270)">
        <rect x="272" y="238" width="100" height="64" rx="10" fill={CORDON_COLOR} />
        <rect x="272" y="252" width="100" height="12" fill="#000000" opacity=".18" />
        <rect x="284" y="274" width="18" height="13" rx="3" fill="#FFC23D" />
      </g>
    </g>
  ),
};

// Lo que va DETRÁS de la etiqueta.
const DETRAS = {
  // Las líneas de velocidad de "en camino".
  velocidad: (
    <g className="mascota-viento">
      <path d="M40,250 L100,250 M20,300 L92,300 M44,350 L100,350" stroke="var(--tinta-suave)" strokeWidth="6" opacity=".45" {...trazo} />
    </g>
  ),
};

// `disfraz`: lo que lleva puesto. Si no se pasa, el de la temporada de la tienda (ver
// useDisfrazTiqui); `null` lo deja sin nada. El panel lo pasa a mano para mostrar cómo se verá en
// cada temporada.
const Mascota = ({ pose = 'cargando', alto, mini = false, sobre, titulo, className = '', style, disfraz }) => {
  const p = POSES[pose] || POSES.cargando;
  const vista = mini ? VISTA_MINI : p.vista;
  // En chico el péndulo va más corto: dentro de un botón no puede irse encima del texto.
  const mov = mini && p.mov === 'mascota-pendulo' ? 'mascota-pendulo-corto' : p.mov;

  const deTemporada = useDisfrazTiqui();
  // En los botones va sin disfraz: a la altura de una línea de texto el gorro se vuelve una mancha
  // roja al lado de "Iniciar sesión".
  const puesto = mini ? null : disfraz === undefined ? deTemporada : disfraz;

  return (
    <svg
      viewBox={vista}
      className={`mascota ${className}`}
      style={{ height: alto, width: 'auto', overflow: 'visible', flexShrink: 0, ...(SOBRE[sobre] || {}), ...style }}
      {...(titulo ? { role: 'img', 'aria-label': titulo } : { 'aria-hidden': true })}
    >
      {/* `todo` mueve la escena entera (la patineta traquetea con ella encima). */}
      <g className={p.todo}>
        {p.detras && DETRAS[p.detras]}
        <g transform={p.correr}>
          <g className={mov}>
            <path d={CUERPO + AGUJERO} fillRule="evenodd" fill={CUERPO_COLOR} />
            {CEJAS[p.cejas] && <path d={CEJAS[p.cejas]} stroke={RASGO} strokeWidth="6.5" {...trazo} />}
            <Ojos tipo={p.ojos} mira={p.mira} />
            <Boca tipo={p.boca} />
            <Cordon tipo={p.cordon} />
            {/* Encima del cordón: el gorro tapa por dónde sale. */}
            <DisfrazTiqui disfraz={puesto} />
            {p.delante === 'lupa' && <Lupa />}
          </g>
        </g>
        {p.aparte && APARTE[p.aparte]}
      </g>
    </svg>
  );
};

// Para las esperas cortas dentro de un botón ("Procesando…", "Iniciar sesión"): la etiqueta
// colgando, del alto de una línea de texto.
export const EsperaMascota = ({ alto = 22, sobre }) => <Mascota pose="cargando" mini alto={alto} sobre={sobre} />;

// Para cuando una pantalla entera está cargando: la etiqueta balanceándose y el texto de lo que se
// está trayendo. Aparece con un poquito de retraso (ver .mascota-aparece en index.css): si los
// datos llegan rápido, no alcanza a verse y no queda un parpadeo de mascota que sale y se va.
export const CargandoMascota = ({ texto, alto = 92 }) => (
  <div className="mascota-aparece flex flex-col items-center justify-center py-14 text-center" role="status">
    <Mascota pose="cargando" alto={alto} />
    <p className="text-sm mt-4" style={{ color: 'var(--tinta-suave)' }}>{texto}</p>
  </div>
);

export default Mascota;

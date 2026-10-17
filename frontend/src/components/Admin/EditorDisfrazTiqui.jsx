import { useMemo, useState } from 'react';
import { Check, Moon, RotateCcw, Sun } from 'lucide-react';
import Mascota from '../UI/Mascota';
import DisfrazTiqui from '../UI/DisfrazTiqui';
import { CUERPO, AGUJERO, CORDON } from '../UI/mascotaFormas';
import { RANURAS_DISFRAZ, PIEZAS_DISFRAZ, piezasDeRanura } from '../../utils/piezasDisfraz';
import {
  describirDisfraz,
  disfrazDeFabrica,
  disfrazVacio,
  estaVacio,
  mismoDisfraz,
  normalizarDisfraz,
  piezaCon,
} from '../../utils/disfracesTiqui';
import { temaActivo, temaDeLaFecha, todosLosTemas } from '../../utils/temporadas';

// EL DISFRAZ DE TIQUI (Admin) — EditorDisfrazTiqui.jsx
// El dueño viste a Tiqui para cada temporada: una pieza en la cabeza, otra en la cara y otra en
// el cuello, con sus colores; la vista previa cambia mientras elige.

// Los colores que se ofrecen de un toque. Cualquier otro sale del selector.
const MUESTRAS = [
  '#C1121F', '#E11D48', '#F472B6', '#EA580C', '#FFC23D', '#4CC27A',
  '#166534', '#0F47AF', '#009AEB', '#7C3AED', '#1F2937', '#FFFFFF',
];

const POSES = [
  { clave: 'posando', nombre: 'Quieta' },
  { clave: 'saludo', nombre: 'Saludando' },
  { clave: 'fiesta', nombre: 'Feliz' },
  { clave: 'cancelado', nombre: 'Triste' },
];

// Cómo se ve Tiqui en la tienda, en claro o en oscuro. Se fija a mano y no con los tokens: el
// panel tiene sus propias paletas y la vista previa tiene que enseñar la tienda, no el panel.
const ESCENARIO = {
  claro: { '--mascota-cuerpo': '#003049', '--mascota-rasgo': '#FFFFFF', '--mascota-cordon': '#009AEB', fondo: '#FFFFFF' },
  oscuro: { '--mascota-cuerpo': '#FFFFFF', '--mascota-rasgo': '#003049', '--mascota-cordon': '#009AEB', fondo: '#121417' },
};

// El pedazo de Tiqui que enseña cada botón: la cabeza, la cara o el cuello.
const VISTAS = {
  cabeza: '84 24 232 224',
  cara: '104 200 192 96',
  cuello: '96 290 208 140',
};

// Tiqui quieta y sin animar, recortada al lugar de la pieza.
const MiniTiqui = ({ disfraz, vista }) => (
  <svg viewBox={vista} className="w-full h-full" aria-hidden="true">
    <path d={CUERPO + AGUJERO} fillRule="evenodd" fill="var(--mascota-cuerpo)" />
    <path d={CORDON} stroke="var(--mascota-cordon)" strokeWidth="7" fill="none" strokeLinecap="round" />
    <ellipse cx="174" cy="252" rx="10" ry="14" fill="var(--mascota-rasgo)" />
    <ellipse cx="226" cy="252" rx="10" ry="14" fill="var(--mascota-rasgo)" />
    <path d="M184,284 Q200,300 216,284" stroke="var(--mascota-rasgo)" strokeWidth="7.5" fill="none" strokeLinecap="round" />
    <DisfrazTiqui disfraz={disfraz} />
  </svg>
);

const SelectorColor = ({ etiqueta, valor, onChange }) => (
  <div className="space-y-1.5">
    <span className="block text-xs font-bold" style={{ color: 'var(--theme-text-secondary)' }}>{etiqueta}</span>
    <div className="flex flex-wrap items-center gap-1.5">
      {MUESTRAS.map((color) => {
        const elegido = valor === color;
        return (
          <button
            key={color}
            type="button"
            onClick={() => onChange(color)}
            aria-label={`${etiqueta}: ${color}`}
            aria-pressed={elegido}
            className="w-7 h-7 rounded-full border grid place-items-center transition-transform active:scale-90"
            style={{
              backgroundColor: color,
              borderColor: elegido ? 'var(--theme-primary)' : 'rgba(0,0,0,0.15)',
              boxShadow: elegido ? '0 0 0 2px var(--theme-card-bg), 0 0 0 4px var(--theme-primary)' : 'none',
            }}
          >
            {elegido && <Check className="w-3.5 h-3.5" style={{ color: color === '#FFFFFF' || color === '#FFC23D' ? '#1F2937' : '#FFFFFF' }} />}
          </button>
        );
      })}
      <input
        type="color"
        aria-label={`${etiqueta}: otro color`}
        title="Otro color"
        value={valor}
        onChange={(e) => onChange(e.target.value.toUpperCase())}
        className="w-9 h-9 rounded-lg border cursor-pointer p-0.5"
        style={{ borderColor: 'var(--theme-card-border)', backgroundColor: 'var(--theme-card-bg)' }}
      />
    </div>
  </div>
);

const EditorDisfrazTiqui = ({ temporada, guardar, guardando }) => {
  const temas = useMemo(() => todosLosTemas(temporada), [temporada]);
  const guardados = useMemo(() => temporada?.disfraces || {}, [temporada]);

  // Arranca en la temporada que está puesta, o en la que cae por fecha.
  const [elegida, setElegida] = useState(
    () => temaActivo(temporada)?.clave || temaDeLaFecha(new Date(), todosLosTemas(temporada))?.clave || ''
  );
  const [borradores, setBorradores] = useState({});
  const [pose, setPose] = useState('posando');
  const [modo, setModo] = useState('claro');

  const tema = temas.find((t) => t.clave === elegida) || temas[0];

  const deFabrica = (t) => disfrazDeFabrica(t) || disfrazVacio();
  const guardadoDe = (t) =>
    guardados[t.clave] ? normalizarDisfraz(guardados[t.clave]) || disfrazVacio() : deFabrica(t);
  const actualDe = (t) => borradores[t.clave] || guardadoDe(t);
  const pendiente = (t) => !!borradores[t.clave] && !mismoDisfraz(borradores[t.clave], guardadoDe(t));

  const pendientes = temas.filter(pendiente);
  const actual = tema ? actualDe(tema) : disfrazVacio();
  const esDeFabrica = tema ? mismoDisfraz(actual, deFabrica(tema)) : true;

  const cambiar = (nuevo) => setBorradores((b) => ({ ...b, [tema.clave]: nuevo }));

  // Otra pieza en el mismo lugar llega con sus colores pensados para ella.
  const elegirPieza = (ranura, tipo) => cambiar({ ...actual, [ranura]: tipo ? piezaCon(tipo) : null });

  const pintar = (ranura, cual, color) =>
    cambiar({ ...actual, [ranura]: { ...actual[ranura], [cual]: color } });

  // Al guardar, el disfraz que quedó igual al de fábrica no se guarda: así esa temporada sigue al de
  // fábrica (y a lo que cambie en él) en vez de quedar con una copia congelada.
  const onGuardar = async () => {
    // Los de temporadas propias que ya se borraron no viajan más.
    const nuevos = Object.fromEntries(
      Object.entries(guardados).filter(([clave]) => temas.some((t) => t.clave === clave))
    );
    for (const t of pendientes) {
      const borrador = normalizarDisfraz(borradores[t.clave]) || disfrazVacio();
      if (mismoDisfraz(borrador, deFabrica(t))) delete nuevos[t.clave];
      else nuevos[t.clave] = borrador;
    }
    const ok = await guardar({ temporada: { disfraces: nuevos } });
    if (ok) setBorradores({});
  };

  if (!tema) return null;

  const escenario = ESCENARIO[modo];
  const varsEscenario = Object.fromEntries(Object.entries(escenario).filter(([k]) => k.startsWith('--')));
  const descripcion = describirDisfraz(actual);
  const decoracionApagada = temporada?.decoracion === false;
  const sinTemporadas = temporada?.modo === 'ninguno';

  return (
    <div
      className="p-6 rounded-2xl shadow-sm border mt-6"
      style={{ backgroundColor: 'var(--theme-card-bg)', borderColor: 'var(--theme-card-border)' }}
    >
      <div className="mb-4">
        <h2 className="text-lg font-bold" style={{ color: 'var(--theme-text-primary)' }}>
          El disfraz de Tiqui
        </h2>
        <p className="text-xs mt-0.5 max-w-2xl" style={{ color: 'var(--theme-text-secondary)' }}>
          Vista a Tiqui para cada temporada: algo en la cabeza, en la cara y en el cuello, con los
          colores que quiera. Se ve en la tienda y en la app mientras dure esa temporada. Si no le
          arma nada, Tiqui lleva el disfraz de fábrica.
        </p>
      </div>

      {/* Para qué temporada */}
      <div className="flex flex-wrap gap-2 mb-5" role="radiogroup" aria-label="Temporada">
        {temas.map((t) => {
          const esta = t.clave === tema.clave;
          return (
            <button
              key={t.clave}
              type="button"
              role="radio"
              aria-checked={esta}
              onClick={() => setElegida(t.clave)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold border transition-colors"
              style={{
                backgroundColor: esta ? 'var(--theme-primary)' : 'transparent',
                borderColor: esta ? 'var(--theme-primary)' : 'var(--theme-card-border)',
                color: esta ? 'var(--theme-button-text)' : 'var(--theme-text-secondary)',
              }}
            >
              {t.nombre}
              {/* El puntito: hay cambios de esta temporada sin guardar. */}
              {pendiente(t) && (
                <>
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: esta ? 'var(--theme-button-text)' : 'var(--theme-primary)' }}
                    aria-hidden="true"
                  />
                  <span className="sr-only">(sin guardar)</span>
                </>
              )}
            </button>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
        {/* La vista previa */}
        <div className="space-y-3 lg:sticky lg:top-4 self-start">
          <div
            className="rounded-2xl grid place-items-center py-6 transition-colors"
            style={{ ...varsEscenario, backgroundColor: escenario.fondo }}
          >
            <Mascota pose={pose} alto={250} disfraz={estaVacio(actual) ? null : actual} />
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {POSES.map((p) => (
              <button
                key={p.clave}
                type="button"
                onClick={() => setPose(p.clave)}
                aria-pressed={pose === p.clave}
                className="px-3 py-1.5 rounded-full text-xs font-semibold border"
                style={{
                  backgroundColor: pose === p.clave ? 'var(--theme-primary-light)' : 'transparent',
                  borderColor: pose === p.clave ? 'var(--theme-primary)' : 'var(--theme-card-border)',
                  color: pose === p.clave ? 'var(--theme-primary)' : 'var(--theme-text-secondary)',
                }}
              >
                {p.nombre}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setModo((m) => (m === 'claro' ? 'oscuro' : 'claro'))}
              className="ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border"
              style={{ borderColor: 'var(--theme-card-border)', color: 'var(--theme-text-secondary)' }}
              title="Cómo se ve en el modo claro o en el oscuro de la tienda"
            >
              {modo === 'claro' ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />}
              {modo === 'claro' ? 'Ver en oscuro' : 'Ver en claro'}
            </button>
          </div>

          <p className="text-xs" style={{ color: 'var(--theme-text-secondary)' }}>
            {descripcion
              ? <>En <strong>{tema.nombre}</strong> Tiqui se pone {descripcion}.</>
              : <>En <strong>{tema.nombre}</strong> Tiqui va sin disfraz, como siempre.</>}
            {' '}
            <span style={{ color: 'var(--theme-text-muted)' }}>
              {esDeFabrica ? 'Es el de fábrica.' : 'Armado por usted.'} {tema.descripcion}.
            </span>
          </p>

          {(decoracionApagada || sinTemporadas) && (
            <p className="text-xs font-semibold" style={{ color: '#b45309' }}>
              {sinTemporadas
                ? 'La temporada está en "Ninguno": mientras siga así, la tienda no se viste de ninguna y Tiqui va sin disfraz.'
                : 'La decoración está apagada: mientras siga así, Tiqui va sin disfraz.'}
            </p>
          )}
        </div>

        {/* Las piezas */}
        <div className="space-y-6" style={varsEscenario}>
          {RANURAS_DISFRAZ.map(({ clave: ranura, nombre }) => {
            const puesta = actual[ranura];
            const def = puesta && PIEZAS_DISFRAZ[puesta.tipo];
            const opciones = [{ tipo: null, nombre: 'Nada' }, ...piezasDeRanura(ranura)];
            return (
              <section key={ranura}>
                <h3 className="text-sm font-bold mb-2" style={{ color: 'var(--theme-text-primary)' }}>{nombre}</h3>
                <div
                  className="grid gap-2"
                  style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(84px, 1fr))' }}
                  role="radiogroup"
                  aria-label={nombre}
                >
                  {opciones.map((o) => {
                    const esta = (puesta?.tipo || null) === o.tipo;
                    const muestra = esta && puesta
                      ? { [ranura]: puesta }
                      : o.tipo ? { [ranura]: piezaCon(o.tipo) } : null;
                    return (
                      <button
                        key={o.tipo || 'nada'}
                        type="button"
                        role="radio"
                        aria-checked={esta}
                        onClick={() => elegirPieza(ranura, o.tipo)}
                        className="flex flex-col items-center gap-1 p-1.5 rounded-xl border-2 transition-colors"
                        style={{
                          borderColor: esta ? 'var(--theme-primary)' : 'var(--theme-card-border)',
                          backgroundColor: esta ? 'var(--theme-primary-light)' : 'transparent',
                        }}
                      >
                        <span className="w-full h-14 rounded-lg overflow-hidden" style={{ backgroundColor: escenario.fondo }}>
                          <MiniTiqui disfraz={muestra} vista={VISTAS[ranura]} />
                        </span>
                        <span
                          className="text-[11px] font-semibold leading-tight text-center"
                          style={{ color: esta ? 'var(--theme-primary)' : 'var(--theme-text-secondary)' }}
                        >
                          {o.nombre}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {def && (
                  <div className="grid gap-4 sm:grid-cols-2 mt-3">
                    <SelectorColor
                      etiqueta={def.nombresColores[0]}
                      valor={puesta.principal}
                      onChange={(c) => pintar(ranura, 'principal', c)}
                    />
                    {def.colores.length > 1 && (
                      <SelectorColor
                        etiqueta={def.nombresColores[1]}
                        valor={puesta.acento}
                        onChange={(c) => pintar(ranura, 'acento', c)}
                      />
                    )}
                  </div>
                )}
              </section>
            );
          })}

          {/* Los cachetes colorados */}
          <div
            className="flex items-center justify-between gap-4 pt-5 border-t"
            style={{ borderColor: 'var(--theme-card-border)' }}
          >
            <div className="min-w-0">
              <div className="text-sm font-bold" style={{ color: 'var(--theme-text-primary)' }}>Cachetes colorados</div>
              <div className="text-xs mt-0.5" style={{ color: 'var(--theme-text-secondary)' }}>
                Como en San Valentín: Tiqui anda sonrojada.
              </div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={actual.rubor}
              aria-label="Cachetes colorados"
              onClick={() => cambiar({ ...actual, rubor: !actual.rubor })}
              className="relative w-11 h-6 rounded-full transition-colors flex-none"
              style={{ backgroundColor: actual.rubor ? 'var(--theme-primary)' : 'var(--theme-card-border)' }}
            >
              <span
                className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white"
                style={{
                  transform: actual.rubor ? 'translateX(20px)' : 'translateX(0)',
                  transition: 'transform var(--dur-press) var(--ease-out)',
                }}
              />
            </button>
          </div>

          {/* Guardar */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <button
              type="button"
              onClick={onGuardar}
              disabled={guardando || pendientes.length === 0}
              className="px-8 py-2.5 rounded-full font-bold shadow-sm disabled:opacity-50"
              style={{ backgroundColor: 'var(--theme-primary)', color: 'var(--theme-button-text)' }}
            >
              {guardando
                ? 'Guardando…'
                : pendientes.length > 1 ? `Guardar ${pendientes.length} disfraces` : 'Guardar disfraz'}
            </button>
            {pendientes.length > 0 && (
              <button
                type="button"
                onClick={() => setBorradores({})}
                disabled={guardando}
                className="px-6 py-2.5 rounded-full font-semibold border"
                style={{ borderColor: 'var(--theme-card-border)', color: 'var(--theme-text-secondary)' }}
              >
                Descartar cambios
              </button>
            )}
            {!esDeFabrica && (
              <button
                type="button"
                onClick={() => cambiar(deFabrica(tema))}
                disabled={guardando}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full text-sm font-semibold"
                style={{ color: 'var(--theme-text-secondary)' }}
              >
                <RotateCcw className="w-4 h-4" /> Volver al de fábrica
              </button>
            )}
          </div>
          {pendientes.length > 0 && (
            <p className="text-xs -mt-3" style={{ color: 'var(--theme-text-muted)' }}>
              Sin guardar: {pendientes.map((t) => t.nombre).join(', ')}.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default EditorDisfrazTiqui;

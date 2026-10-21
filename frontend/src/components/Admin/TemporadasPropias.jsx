import { useState } from 'react';
import { Plus, Pencil, Trash2, Sparkles, Star, Heart, Snowflake, Leaf, Moon, Ban, TriangleAlert, Info } from 'lucide-react';
import {
  FIGURAS_DE_TEMPORADA,
  NOMBRES_DE_MES,
  temasDeFabrica,
  paletaDesdeColores,
  contrasteConBlanco,
  describirRango,
  temaDeLaFecha,
} from '../../utils/temporadas';

// TEMPORADAS PROPIAS (Admin) — TemporadasPropias.jsx
// Las temporadas que no vienen de fábrica: "Regreso a clases", "Día de la madre", el aniversario
// de la tienda.

const MAXIMO = 12;
const DIAS_POR_MES = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

const ICONO_DE_FIGURA = {
  confeti: Sparkles,
  estrella: Star,
  corazon: Heart,
  copo: Snowflake,
  hoja: Leaf,
  murcielago: Moon,
  ninguna: Ban,
};

const nuevaTemporada = () => ({
  clave: '',
  nombre: '',
  desde: { mes: 1, dia: 15 },
  hasta: { mes: 2, dia: 15 },
  colorPrincipal: '#C2410C',
  colorAcento: '#1D4ED8',
  figura: 'estrella',
  saludo: '',
});

const esHex = (v) => /^#[0-9a-fA-F]{6}$/.test(v);

// ¿El rango pisa alguna temporada de fábrica? Se recorre día por día un año bisiesto: son 366
// comparaciones, nada, y así no hay que pensar en los rangos que cruzan el año.
const coincideConFabrica = (desde, hasta, fabrica) => {
  const encontradas = new Set();
  const inicio = desde.mes * 100 + desde.dia;
  const fin = hasta.mes * 100 + hasta.dia;
  for (let d = new Date(2024, 0, 1); d.getFullYear() === 2024; d.setDate(d.getDate() + 1)) {
    const n = (d.getMonth() + 1) * 100 + d.getDate();
    const dentro = inicio <= fin ? n >= inicio && n <= fin : n >= inicio || n <= fin;
    if (!dentro) continue;
    const tema = temaDeLaFecha(d, fabrica);
    if (tema) encontradas.add(tema.nombre);
  }
  return [...encontradas];
};

const SelectorFecha = ({ etiqueta, valor, onChange, estilo }) => (
  <div className="space-y-1.5">
    <span className="block text-sm font-bold" style={{ color: 'var(--theme-text-primary)' }}>{etiqueta}</span>
    <div className="flex gap-2">
      <select
        aria-label={`${etiqueta}: día`}
        value={valor.dia}
        onChange={(e) => onChange({ ...valor, dia: Number(e.target.value) })}
        className="px-3 py-2.5 rounded-xl border outline-none"
        style={estilo}
      >
        {Array.from({ length: DIAS_POR_MES[valor.mes - 1] }, (_, i) => i + 1).map((d) => (
          <option key={d} value={d}>{d}</option>
        ))}
      </select>
      <select
        aria-label={`${etiqueta}: mes`}
        value={valor.mes}
        onChange={(e) => {
          const mes = Number(e.target.value);
          // Del 31 de enero a febrero: el día se ajusta al último que existe.
          onChange({ mes, dia: Math.min(valor.dia, DIAS_POR_MES[mes - 1]) });
        }}
        className="flex-1 px-3 py-2.5 rounded-xl border outline-none capitalize"
        style={estilo}
      >
        {NOMBRES_DE_MES.map((m, i) => (
          <option key={m} value={i + 1}>{m}</option>
        ))}
      </select>
    </div>
  </div>
);

const SelectorColor = ({ etiqueta, ayuda, valor, onChange, estilo }) => {
  // El texto va aparte del valor para poder escribir a medias ("#C2") sin que
  // el color salte; el valor solo cambia cuando el hex está completo.
  const [texto, setTexto] = useState(valor);

  return (
    <div className="space-y-1.5">
      <span className="block text-sm font-bold" style={{ color: 'var(--theme-text-primary)' }}>{etiqueta}</span>
      <div className="flex items-center gap-2">
        <input
          type="color"
          aria-label={etiqueta}
          value={esHex(valor) ? valor : '#000000'}
          onChange={(e) => { setTexto(e.target.value.toUpperCase()); onChange(e.target.value.toUpperCase()); }}
          className="w-11 h-11 rounded-xl border cursor-pointer p-1"
          style={estilo}
        />
        <input
          type="text"
          value={texto}
          maxLength={7}
          onChange={(e) => {
            const v = e.target.value.startsWith('#') ? e.target.value : `#${e.target.value}`;
            setTexto(v);
            if (esHex(v)) onChange(v.toUpperCase());
          }}
          className="w-28 px-3 py-2.5 rounded-xl border outline-none font-mono text-sm uppercase"
          style={estilo}
        />
      </div>
      <p className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>{ayuda}</p>
    </div>
  );
};

// Cómo se va a ver: la cinta, un botón y una pastilla de la tienda, con la paleta ya derivada. Se
// dibuja con estilos en línea y NO con las variables --marca-*, que en el panel no están pintadas
// por la temporada.
const VistaPrevia = ({ borrador }) => {
  const p = paletaDesdeColores(borrador.colorPrincipal, borrador.colorAcento);
  const Icono = ICONO_DE_FIGURA[borrador.figura] || Sparkles;
  return (
    <div className="rounded-2xl overflow-hidden border" style={{ borderColor: 'var(--theme-card-border)', backgroundColor: '#fff' }}>
      <div className="flex items-center justify-between px-4 py-3">
        <span className="text-[13px] font-extrabold leading-none" style={{ color: '#1C1614' }}>Tienda<br />la 635</span>
        <span className="text-xs font-semibold px-3 py-1.5 rounded-full" style={{ backgroundColor: p['--marca-600'], color: '#fff' }}>
          Asistente
        </span>
      </div>
      {borrador.saludo.trim() ? (
        <div className="text-center text-[12.5px] font-semibold px-3 py-2" style={{ backgroundColor: p['--marca-600'], color: '#fff' }}>
          {borrador.saludo}
        </div>
      ) : (
        <div className="text-center text-[11.5px] px-3 py-2" style={{ backgroundColor: p['--marca-50'], color: '#6B6560' }}>
          Sin saludo: esta temporada no muestra cinta
        </div>
      )}
      <div className="px-4 py-4 flex flex-wrap items-center gap-2" style={{ backgroundColor: p['--marca-50'] }}>
        <span className="text-xs font-semibold px-3 py-1.5 rounded-full" style={{ backgroundColor: p['--marca-600'], color: '#fff' }}>Todos</span>
        <span className="text-xs font-semibold px-3 py-1.5 rounded-full" style={{ backgroundColor: p['--marca-100'], color: p['--marca-700'] }}>Frutas</span>
        <span className="text-xs font-semibold px-3 py-1.5 rounded-full border" style={{ borderColor: p['--marca-400'], color: p['--marca-700'], backgroundColor: '#fff' }}>Snacks</span>
        <span className="ml-auto text-xs font-bold" style={{ color: p['--acento'] }}>Editar</span>
        <Icono className="w-4 h-4" style={{ color: p['--acento'] }} />
      </div>
      <div className="flex">
        {['--marca-700', '--marca-600', '--marca-400', '--marca-100', '--marca-50', '--acento'].map((v) => (
          <span key={v} className="flex-1 h-3" style={{ backgroundColor: p[v] }} />
        ))}
      </div>
    </div>
  );
};

const TemporadasPropias = ({ temporada, guardar, guardando }) => {
  const propias = Array.isArray(temporada?.personalizados) ? temporada.personalizados : [];

  const [borrador, setBorrador] = useState(null);
  const [indice, setIndice] = useState(null); // null = nueva
  const [error, setError] = useState('');
  const [porBorrar, setPorBorrar] = useState(null);

  const estiloCampo = {
    backgroundColor: 'var(--theme-card-bg)',
    borderColor: 'var(--theme-card-border)',
    color: 'var(--theme-text-primary)',
  };

  const abrir = (i) => {
    setError('');
    setPorBorrar(null);
    setIndice(i);
    setBorrador(i === null ? nuevaTemporada() : { ...nuevaTemporada(), ...propias[i] });
  };

  const cerrar = () => {
    setBorrador(null);
    setIndice(null);
    setError('');
  };

  const cambiar = (campo, valor) => setBorrador((b) => ({ ...b, [campo]: valor }));

  const onGuardar = async (e) => {
    e.preventDefault();
    const nombre = borrador.nombre.trim();
    if (!nombre) { setError('Póngale un nombre a la temporada.'); return; }
    if (!esHex(borrador.colorPrincipal) || !esHex(borrador.colorAcento)) {
      setError('Revise los colores: tienen que ser como #C2410C.');
      return;
    }
    const limpia = { ...borrador, nombre, saludo: borrador.saludo.trim() };
    const lista = [...propias];
    if (indice === null) lista.push(limpia);
    else lista[indice] = limpia;

    const ok = await guardar({ temporada: { personalizados: lista } });
    if (ok) cerrar();
  };

  const borrar = async (clave) => {
    const ok = await guardar({ temporada: { personalizados: propias.filter((t) => t.clave !== clave) } });
    if (ok) setPorBorrar(null);
  };

  const pocoContraste = borrador && esHex(borrador.colorPrincipal) && contrasteConBlanco(borrador.colorPrincipal) < 4.5;
  const pisa = borrador ? coincideConFabrica(borrador.desde, borrador.hasta, temasDeFabrica(temporada)) : [];

  return (
    <div
      className="p-6 rounded-2xl shadow-sm border mt-6"
      style={{ backgroundColor: 'var(--theme-card-bg)', borderColor: 'var(--theme-card-border)' }}
    >
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div>
          <h2 className="text-lg font-bold" style={{ color: 'var(--theme-text-primary)' }}>
            Sus temporadas
          </h2>
          <p className="text-xs mt-0.5 max-w-xl" style={{ color: 'var(--theme-text-secondary)' }}>
            Cree las fechas que le importan a su tienda —regreso a clases, día de la madre, su
            aniversario— con sus colores, su figura y su saludo. Aparecen junto a las de fábrica,
            se activan solas en sus fechas y también se pueden elegir a mano.
          </p>
        </div>
        {!borrador && (
          <button
            type="button"
            onClick={() => abrir(null)}
            disabled={guardando || propias.length >= MAXIMO}
            title={propias.length >= MAXIMO ? `Hasta ${MAXIMO} temporadas propias` : undefined}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full font-bold text-sm shadow-sm disabled:opacity-50"
            style={{ backgroundColor: 'var(--theme-primary)', color: 'var(--theme-button-text)' }}
          >
            <Plus className="w-4 h-4" /> Crear temporada
          </button>
        )}
      </div>

      {/* La lista */}
      {!borrador && (
        propias.length === 0 ? (
          <p className="text-sm rounded-xl px-4 py-3" style={{ backgroundColor: 'var(--theme-primary-light)', color: 'var(--theme-text-secondary)' }}>
            Todavía no ha creado ninguna. Toque <strong>Crear temporada</strong> para hacer la primera.
          </p>
        ) : (
          <ul className="space-y-2">
            {propias.map((t, i) => {
              const p = paletaDesdeColores(t.colorPrincipal, t.colorAcento);
              const Icono = ICONO_DE_FIGURA[t.figura] || Sparkles;
              return (
                <li
                  key={t.clave || i}
                  className="flex flex-wrap items-center gap-3 p-3 rounded-xl border"
                  style={{ borderColor: 'var(--theme-card-border)' }}
                >
                  <div className="flex gap-1 flex-none">
                    {[p['--marca-600'], p['--acento'], p['--marca-100']].map((c) => (
                      <span key={c} className="w-5 h-5 rounded-full border" style={{ backgroundColor: c, borderColor: 'rgba(0,0,0,0.08)' }} />
                    ))}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-bold flex items-center gap-1.5" style={{ color: 'var(--theme-text-primary)' }}>
                      {t.nombre}
                      <Icono className="w-3.5 h-3.5" style={{ color: p['--acento'] }} />
                    </div>
                    <div className="text-xs mt-0.5 truncate" style={{ color: 'var(--theme-text-secondary)' }}>
                      {describirRango(t.desde, t.hasta)}{t.saludo ? ` · “${t.saludo}”` : ' · sin cinta'}
                    </div>
                  </div>

                  {porBorrar === t.clave ? (
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold" style={{ color: 'var(--theme-text-secondary)' }}>¿Eliminarla?</span>
                      <button
                        type="button"
                        onClick={() => borrar(t.clave)}
                        disabled={guardando}
                        className="px-3 py-1.5 rounded-full text-xs font-bold text-white disabled:opacity-60"
                        style={{ backgroundColor: '#dc2626' }}
                      >
                        Sí, eliminar
                      </button>
                      <button
                        type="button"
                        onClick={() => setPorBorrar(null)}
                        className="px-3 py-1.5 rounded-full text-xs font-semibold border"
                        style={{ borderColor: 'var(--theme-card-border)', color: 'var(--theme-text-secondary)' }}
                      >
                        No
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-1 flex-none">
                      <button
                        type="button"
                        onClick={() => abrir(i)}
                        aria-label={`Editar ${t.nombre}`}
                        className="w-8 h-8 grid place-items-center rounded-lg border"
                        style={{ borderColor: 'var(--theme-card-border)', color: 'var(--theme-text-secondary)' }}
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setPorBorrar(t.clave)}
                        aria-label={`Eliminar ${t.nombre}`}
                        className="w-8 h-8 grid place-items-center rounded-lg border"
                        style={{ borderColor: 'var(--theme-card-border)', color: 'var(--theme-text-secondary)' }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )
      )}

      {/* El formulario */}
      {borrador && (
        <form onSubmit={onGuardar} className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-5">
            <div className="space-y-1.5">
              <label htmlFor="temporada-nombre" className="block text-sm font-bold" style={{ color: 'var(--theme-text-primary)' }}>
                Nombre
              </label>
              <input
                id="temporada-nombre"
                type="text"
                maxLength={40}
                value={borrador.nombre}
                onChange={(e) => cambiar('nombre', e.target.value)}
                placeholder="Regreso a clases"
                className="w-full px-4 py-2.5 rounded-xl border outline-none"
                style={estiloCampo}
                autoFocus
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <SelectorFecha etiqueta="Desde" valor={borrador.desde} onChange={(v) => cambiar('desde', v)} estilo={estiloCampo} />
              <SelectorFecha etiqueta="Hasta" valor={borrador.hasta} onChange={(v) => cambiar('hasta', v)} estilo={estiloCampo} />
            </div>
            {pisa.length > 0 && (
              <p className="text-xs flex items-start gap-1.5 -mt-2" style={{ color: 'var(--theme-text-secondary)' }}>
                <Info className="w-3.5 h-3.5 flex-none mt-px" />
                Coincide con {pisa.join(' y ')}. En esos días se ve esta temporada, no la de fábrica.
              </p>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <SelectorColor
                etiqueta="Color principal"
                ayuda="Botones, pastillas y la cinta."
                valor={borrador.colorPrincipal}
                onChange={(v) => cambiar('colorPrincipal', v)}
                estilo={estiloCampo}
              />
              <SelectorColor
                etiqueta="Color de acento"
                ayuda="Enlaces y detalles."
                valor={borrador.colorAcento}
                onChange={(v) => cambiar('colorAcento', v)}
                estilo={estiloCampo}
              />
            </div>
            {pocoContraste && (
              <p className="text-xs font-semibold flex items-start gap-1.5 -mt-2" style={{ color: '#b45309' }}>
                <TriangleAlert className="w-3.5 h-3.5 flex-none mt-px" />
                Con este color principal el texto blanco de los botones cuesta leerlo. Pruebe uno más oscuro.
              </p>
            )}

            <div className="space-y-1.5">
              <span className="block text-sm font-bold" style={{ color: 'var(--theme-text-primary)' }}>Figuras de fondo</span>
              <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Figuras de fondo">
                {FIGURAS_DE_TEMPORADA.map((f) => {
                  const Icono = ICONO_DE_FIGURA[f.clave];
                  const elegida = borrador.figura === f.clave;
                  return (
                    <button
                      key={f.clave}
                      type="button"
                      role="radio"
                      aria-checked={elegida}
                      onClick={() => cambiar('figura', f.clave)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-sm font-semibold border transition-colors"
                      style={{
                        backgroundColor: elegida ? 'var(--theme-primary)' : 'transparent',
                        borderColor: elegida ? 'var(--theme-primary)' : 'var(--theme-card-border)',
                        color: elegida ? 'var(--theme-button-text)' : 'var(--theme-text-secondary)',
                      }}
                    >
                      <Icono className="w-4 h-4" /> {f.nombre}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="temporada-saludo" className="block text-sm font-bold" style={{ color: 'var(--theme-text-primary)' }}>
                Saludo de la cinta
              </label>
              <input
                id="temporada-saludo"
                type="text"
                maxLength={160}
                value={borrador.saludo}
                onChange={(e) => cambiar('saludo', e.target.value)}
                placeholder="Regreso a clases — imprima sus tareas aquí"
                className="w-full px-4 py-2.5 rounded-xl border outline-none"
                style={estiloCampo}
              />
              <p className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>
                En blanco, la temporada cambia los colores pero no muestra cinta.
              </p>
            </div>

            {error && (
              <p className="text-sm font-semibold" style={{ color: '#dc2626' }} role="alert">{error}</p>
            )}

            <div className="flex flex-wrap gap-2">
              <button
                type="submit"
                disabled={guardando}
                className="px-8 py-2.5 rounded-full font-bold shadow-sm disabled:opacity-60"
                style={{ backgroundColor: 'var(--theme-primary)', color: 'var(--theme-button-text)' }}
              >
                {guardando ? 'Guardando…' : indice === null ? 'Crear temporada' : 'Guardar cambios'}
              </button>
              <button
                type="button"
                onClick={cerrar}
                disabled={guardando}
                className="px-6 py-2.5 rounded-full font-semibold border"
                style={{ borderColor: 'var(--theme-card-border)', color: 'var(--theme-text-secondary)' }}
              >
                Cancelar
              </button>
            </div>
          </div>

          <div className="space-y-2 lg:sticky lg:top-4 self-start">
            <span className="block text-sm font-bold" style={{ color: 'var(--theme-text-primary)' }}>Vista previa</span>
            <VistaPrevia borrador={borrador} />
            <p className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>
              {describirRango(borrador.desde, borrador.hasta)}.
            </p>
          </div>
        </form>
      )}
    </div>
  );
};

export default TemporadasPropias;

import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowRight, LifeBuoy, Search } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { GRUPOS_AYUDA, buscarEnTemas, temasPara } from '../utils/ayudaPanel';

// AYUDA — cómo funciona cada apartado del panel
// Para el administrador (o el empleado) que no sabe, o no recuerda, dónde se hace algo. El
// contenido vive en utils/ayudaPanel.js; aquí solo se pinta.
const AyudaPanel = () => {
  const { user } = useAuth();
  const esAdmin = user?.type === 'admin';
  const [params] = useSearchParams();
  const temaPedido = params.get('tema');
  const [busqueda, setBusqueda] = useState('');

  const temas = useMemo(() => temasPara(esAdmin), [esAdmin]);
  const visibles = useMemo(() => buscarEnTemas(temas, busqueda), [temas, busqueda]);

  // Llegó pidiendo un tema: se baja hasta él y se marca un momento, para que el ojo sepa dónde
  // empezar a leer.
  const [resaltado, setResaltado] = useState(null);
  useEffect(() => {
    if (!temaPedido) return undefined;
    let vivo = true;
    const relojes = [];
    const titulo = () => document.querySelector(`#tema-${temaPedido} h2`);
    const ir = (suave) =>
      document.getElementById(`tema-${temaPedido}`)?.scrollIntoView({ behavior: suave ? 'smooth' : 'auto', block: 'start' });

    // Después de que cargan las letras, no al instante: con la tipografía de respaldo los textos miden
    // otra cosa, y al llegar la de verdad la página cambiaba de alto y el título del tema quedaba
    // escondido bajo la barra (o corto, más abajo).
    (document.fonts?.ready ?? Promise.resolve()).then(() => {
      if (!vivo) return;
      relojes.push(setTimeout(() => { ir(true); setResaltado(temaPedido); }, 120));
      relojes.push(setTimeout(() => {
        const arriba = titulo()?.getBoundingClientRect().top ?? 0;
        if (arriba < 80 || arriba > 220) ir(false);
      }, 1400));
      relojes.push(setTimeout(() => setResaltado(null), 2800));
    });
    return () => { vivo = false; relojes.forEach(clearTimeout); };
  }, [temaPedido]);

  const texto = { color: 'var(--theme-text-primary)' };
  const secundario = { color: 'var(--theme-text-secondary)' };
  const linea = { borderColor: 'var(--theme-card-border)' };

  return (
    <div className="max-w-6xl">
      <div className="flex items-center gap-3 mb-2">
        <LifeBuoy className="w-8 h-8" style={{ color: 'var(--theme-accent-text)' }} />
        <h1 className="text-4xl font-extrabold" style={{ color: 'var(--theme-accent-text)' }}>Ayuda</h1>
      </div>
      <p className="text-base mb-6" style={secundario}>
        Cómo funciona cada parte del panel. Si no encuentra algo, pregúntele a Tiqui, abajo a la derecha.
      </p>

      <label className="relative block max-w-md mb-8">
        <span className="sr-only">Buscar en la ayuda</span>
        <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2" style={{ color: 'var(--theme-text-muted)' }} />
        <input
          type="text"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar: envío, factura, puntos, código…"
          className="w-full pl-10 pr-4 py-2.5 rounded-full border text-sm focus:outline-none"
          style={{ backgroundColor: 'var(--theme-card-bg)', borderColor: 'var(--theme-card-border)', color: 'var(--theme-text-primary)' }}
        />
      </label>

      <div className="lg:grid lg:grid-cols-[210px_1fr] lg:gap-12">
        {/* El índice: solo en pantalla ancha. En el teléfono, el buscador basta. */}
        <nav aria-label="Temas de la ayuda" className="hidden lg:block">
          <div className="sticky top-28 space-y-5">
            {GRUPOS_AYUDA.map((g) => {
              const deGrupo = visibles.filter((t) => t.grupo === g.id);
              if (!deGrupo.length) return null;
              return (
                <div key={g.id}>
                  <p className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: 'var(--theme-text-muted)' }}>{g.nombre}</p>
                  <ul className="space-y-1">
                    {deGrupo.map((t) => (
                      <li key={t.id}>
                        <a
                          href={`#tema-${t.id}`}
                          className="block text-sm py-1 hover:underline"
                          style={resaltado === t.id ? { color: 'var(--theme-accent-text)', fontWeight: 700 } : secundario}
                        >
                          {t.titulo}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </nav>

        <div>
          {visibles.length === 0 && (
            <p className="text-base py-10" style={secundario}>
              No encontré nada con “{busqueda}”. Pruebe con otra palabra, o pregúntele a Tiqui.
            </p>
          )}

          {visibles.map((t, i) => {
            const { Icono } = t;
            return (
              <section
                key={t.id}
                id={`tema-${t.id}`}
                className={`scroll-mt-28 py-8 transition-colors duration-700 rounded-xl ${i ? 'border-t' : ''}`}
                style={{
                  ...linea,
                  // El tema al que se llegó se tiñe un momento y se apaga solo.
                  backgroundColor: resaltado === t.id ? 'var(--theme-primary-light)' : 'transparent',
                  paddingLeft: resaltado === t.id ? 16 : 0,
                  paddingRight: resaltado === t.id ? 16 : 0,
                }}
              >
                <div className="flex items-center gap-3 mb-2">
                  <Icono className="w-6 h-6 flex-none" style={{ color: 'var(--theme-primary)' }} />
                  <h2 className="text-2xl font-bold" style={texto}>{t.titulo}</h2>
                </div>
                <p className="text-base mb-5" style={secundario}>{t.resumen}</p>

                <h3 className="text-sm font-bold uppercase tracking-wide mb-3" style={{ color: 'var(--theme-text-muted)' }}>Cómo se usa</h3>
                <ol className="space-y-3 mb-5">
                  {t.pasos.map((paso, n) => (
                    <li key={paso} className="flex gap-3 text-[15px] leading-relaxed" style={texto}>
                      <span
                        className="flex-none w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center mt-0.5"
                        style={{ backgroundColor: 'var(--theme-primary-light)', color: 'var(--theme-accent-text)' }}
                        aria-hidden="true"
                      >
                        {n + 1}
                      </span>
                      <span>{paso}</span>
                    </li>
                  ))}
                </ol>

                {t.consejos.length > 0 && (
                  <>
                    <h3 className="text-sm font-bold uppercase tracking-wide mb-2" style={{ color: 'var(--theme-text-muted)' }}>Bueno saber</h3>
                    <ul className="space-y-2 mb-5 list-disc pl-5">
                      {t.consejos.map((c) => (
                        <li key={c} className="text-[15px] leading-relaxed" style={secundario}>{c}</li>
                      ))}
                    </ul>
                  </>
                )}

                {t.ruta && (
                  <Link
                    to={t.ruta}
                    className="inline-flex items-center gap-2 text-sm font-bold hover:underline"
                    style={{ color: 'var(--theme-accent-text)' }}
                  >
                    Ir a {t.titulo} <ArrowRight className="w-4 h-4" />
                  </Link>
                )}
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default AyudaPanel;

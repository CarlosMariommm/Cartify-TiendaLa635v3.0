import { useState, useEffect } from 'react';
import { Palette, ArrowUp, ArrowDown, Eye, EyeOff, Trash2, Lock, Check, Store as StoreIcon, Truck, LayoutGrid } from 'lucide-react';
import { useAjustesCtx } from '../context/AjustesContext';
import SubidorArchivo from '../components/UI/SubidorArchivo';
import ConfiguracionEnvio from '../components/Admin/ConfiguracionEnvio';
import ServicioTarifa from '../components/Admin/ServicioTarifa';
import TemporadasPropias from '../components/Admin/TemporadasPropias';
import EditorDisfrazTiqui from '../components/Admin/EditorDisfrazTiqui';
import DatosNegocio from '../components/Admin/DatosNegocio';
import { TEMAS_DE_TEMPORADA, temaDeLaFecha, temaActivo, todosLosTemas } from '../utils/temporadas';
import Mascota from '../components/UI/Mascota';
import { disfrazDeTema, describirDisfraz } from '../utils/disfracesTiqui';

// Los apartados de la izquierda.
// Los tres colores que se enseñan cuando NO hay temporada pintando: son la marca de la casa, la
// misma que declara index.css.
const MUESTRAS_DE_MARCA = ['#003049', '#066494', '#DDECF3'];

const SECCIONES = [
  { id: 'identidad', label: 'Identidad', Icono: StoreIcon },
  { id: 'apariencia', label: 'Apariencia', Icono: Palette },
  { id: 'cobros', label: 'Envío y cobros', Icono: Truck },
  { id: 'portada', label: 'Portada', Icono: LayoutGrid },
];

// PERSONALIZACIÓN (Admin) — Personalizacion.jsx
// Cómo se ve la tienda de cara al cliente: su nombre, su logo y el orden de su portada.
const Personalizacion = () => {
  const {
    ajustes, portada, cargando, guardando,
    guardar, mover, alternarVisible, subirLogo, quitarLogo,
  } = useAjustesCtx();

  const [form, setForm] = useState({
    nombreLinea1: '', nombreLinea2: '', lema: '', direccion: '',
  });

  // Qué apartado se está viendo (navegación lateral).
  const [seccion, setSeccion] = useState('identidad');

  useEffect(() => {
    setForm({
      nombreLinea1: ajustes.nombreLinea1 || '',
      nombreLinea2: ajustes.nombreLinea2 || '',
      lema: ajustes.lema || '',
      direccion: ajustes.direccion || '',
    });
  }, [ajustes.nombreLinea1, ajustes.nombreLinea2, ajustes.lema, ajustes.direccion]);

  const onSubmit = (e) => {
    e.preventDefault();
    guardar(form);
  };

  const inputStyle = {
    backgroundColor: 'var(--theme-card-bg)',
    borderColor: 'var(--theme-card-border)',
    color: 'var(--theme-text-primary)',
  };

  const tarjeta = {
    backgroundColor: 'var(--theme-card-bg)',
    borderColor: 'var(--theme-card-border)',
  };

  // Cuántas quedan encendidas: con una sola, su interruptor se bloquea para
  // que nadie deje la portada en blanco sin querer.
  const encendidas = portada.filter((b) => b.visible).length;

  // Temporada. Se guardan los dos campos por separado porque el backend los mezcla campo a campo:
  // elegir un tema NO tiene por qué cambiar el modo, y al revés. Ver storeSettingsController.
  const temporada = ajustes.temporada || { modo: 'automatico', tema: '' };
  // Las de fábrica más las que creó el dueño: las dos se eligen igual.
  const temas = todosLosTemas(temporada);
  const porCalendario = temaDeLaFecha(new Date(), temas);
  const pintandoAhora = temaActivo(temporada);

  const MODOS = [
    { clave: 'automatico', nombre: 'Automático', ayuda: 'Lo elige la fecha, sin que nadie entre a cambiarlo.' },
    { clave: 'manual', nombre: 'Manual', ayuda: 'Manda el tema que usted elija, aunque el calendario diga otra cosa.' },
    { clave: 'ninguno', nombre: 'Ninguno', ayuda: 'Los colores de siempre, todo el año.' },
  ];

  // El saludo de la cinta, por tema. Se edita aparte del resto de la temporada
  // (modo/tema/decoración) porque es texto largo que se escribe con calma, no un botón que se toca y
  // guarda de una vez.
  const [saludos, setSaludos] = useState({});
  const [saludoNormal, setSaludoNormal] = useState('');
  useEffect(() => {
    setSaludos({ ...(ajustes.temporada?.saludos || {}) });
    setSaludoNormal(ajustes.temporada?.saludoNormal || '');
  }, [ajustes.temporada?.saludos, ajustes.temporada?.saludoNormal]);

  const guardarSaludos = (e) => {
    e.preventDefault();
    guardar({ temporada: { saludos, saludoNormal } });
  };

  return (
    <div className="flex flex-col gap-6 w-full pb-8 max-w-6xl">
      <div className="flex items-center gap-3">
        <Palette className="w-8 h-8" style={{ color: 'var(--theme-accent-text)' }} />
        <h1 className="text-4xl font-extrabold" style={{ color: 'var(--theme-accent-text)' }}>
          Personalización
        </h1>
      </div>

      {cargando ? (
        <p className="text-sm" style={{ color: 'var(--theme-text-secondary)' }}>
          Cargando los ajustes de la tienda…
        </p>
      ) : (
        <div className="flex flex-col md:flex-row gap-6 items-start">
          {/* Navegación lateral: cada apartado en su pestaña, sin scroll eterno */}
          <nav className="flex md:flex-col gap-1 md:w-52 flex-none overflow-x-auto">
            {SECCIONES.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setSeccion(s.id)}
                className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-sm font-semibold text-left whitespace-nowrap transition-colors flex-none"
                style={{
                  backgroundColor: seccion === s.id ? 'var(--theme-primary-light)' : 'transparent',
                  color: seccion === s.id ? 'var(--theme-primary)' : 'var(--theme-text-secondary)',
                }}
              >
                <s.Icono className="w-4 h-4 flex-none" /> {s.label}
              </button>
            ))}
          </nav>

          {/* Contenido del apartado elegido */}
          <div className="flex-1 min-w-0 flex flex-col gap-6">
            {seccion === 'identidad' && (
          <form
            onSubmit={onSubmit}
            className="p-6 rounded-2xl shadow-sm border space-y-6"
            style={tarjeta}
          >
            <div>
              <h2 className="text-lg font-bold" style={{ color: 'var(--theme-text-primary)' }}>
                Identidad
              </h2>
              <p className="text-xs mt-0.5" style={{ color: 'var(--theme-text-secondary)' }}>
                El nombre y el logo salen en el encabezado de la tienda y en el pie de página.
              </p>
            </div>

            {/* Logo */}
            <div className="space-y-2">
              <label className="block text-sm font-bold" style={{ color: 'var(--theme-text-primary)' }}>
                Logo
              </label>

              <SubidorArchivo
                accept="image/*"
                maxMB={8}
                valorInicial={ajustes.logoUrl || null}
                onArchivo={(archivo) => { if (archivo) subirLogo(archivo); }}
                variante="panel"
                alto={140}
                titulo="Arrastre el logo o haga clic para elegirlo"
                ayuda="PNG con fondo transparente se ve mejor. Se muestra a 38 px de alto."
                etiquetaAria="Subir el logo de la tienda"
              />

              {/* Quitar el logo es distinto de subir otro: se vuelve al nombre escrito, que es un resultado
                 legítimo y no un paso intermedio. */}
              {ajustes.logoUrl && (
                <button
                  type="button"
                  onClick={quitarLogo}
                  disabled={guardando}
                  className="inline-flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors disabled:opacity-60"
                  style={{ borderColor: 'var(--theme-card-border)', color: 'var(--theme-text-secondary)' }}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Quitar el logo y usar el nombre escrito
                </button>
              )}
            </div>

            {/* Nombre en dos líneas */}
            <div className="space-y-1.5">
              <label className="block text-sm font-bold" style={{ color: 'var(--theme-text-primary)' }}>
                Nombre de la tienda
              </label>
              <p className="text-xs" style={{ color: 'var(--theme-text-secondary)' }}>
                Va en dos líneas apiladas, con el mismo peso. Deje la segunda vacía si su
                nombre es de una sola línea.
              </p>
              <div className="flex gap-3 flex-wrap">
                <input
                  type="text" maxLength={24}
                  value={form.nombreLinea1}
                  onChange={(e) => setForm({ ...form, nombreLinea1: e.target.value })}
                  placeholder="Tienda"
                  className="w-44 px-4 py-2.5 rounded-xl border outline-none"
                  style={inputStyle}
                />
                <input
                  type="text" maxLength={24}
                  value={form.nombreLinea2}
                  onChange={(e) => setForm({ ...form, nombreLinea2: e.target.value })}
                  placeholder="la 635"
                  className="w-44 px-4 py-2.5 rounded-xl border outline-none"
                  style={inputStyle}
                />
              </div>

              {/* Cómo va a verse, con la misma pinta que en el encabezado. */}
              <div
                className="mt-3 inline-flex flex-col leading-none rounded-xl px-4 py-3"
                style={{ backgroundColor: 'var(--theme-primary-light)' }}
              >
                <span className="text-[19px] font-extrabold tracking-tight"
                      style={{ color: 'var(--theme-text-primary)' }}>
                  {form.nombreLinea1 || 'Tienda'}
                </span>
                {form.nombreLinea2 && (
                  <span className="text-[19px] font-extrabold tracking-tight"
                        style={{ color: 'var(--theme-text-primary)' }}>
                    {form.nombreLinea2}
                  </span>
                )}
              </div>
            </div>

            {/* Lema */}
            <div className="space-y-1.5">
              <label className="block text-sm font-bold" style={{ color: 'var(--theme-text-primary)' }}>
                Frase del pie de página
              </label>
              <textarea
                rows={2} maxLength={160}
                value={form.lema}
                onChange={(e) => setForm({ ...form, lema: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border outline-none resize-none"
                style={inputStyle}
              />
              <div className="text-xs text-right" style={{ color: 'var(--theme-text-muted)' }}>
                {form.lema.length}/160
              </div>
            </div>

            {/* Dirección */}
            <div className="space-y-1.5">
              <label className="block text-sm font-bold" style={{ color: 'var(--theme-text-primary)' }}>
                Dirección de la tienda
              </label>
              <p className="text-xs" style={{ color: 'var(--theme-text-secondary)' }}>
                Sale en el pie y es de donde salen los repartos.
              </p>
              <input
                type="text"
                value={form.direccion}
                onChange={(e) => setForm({ ...form, direccion: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border outline-none"
                style={inputStyle}
              />
            </div>

            <button
              type="submit" disabled={guardando}
              className="px-8 py-2.5 rounded-full font-bold shadow-sm transition-colors disabled:opacity-60"
              style={{ backgroundColor: 'var(--theme-primary)', color: 'var(--theme-button-text)' }}
            >
              {guardando ? 'Guardando…' : 'Guardar identidad'}
            </button>
          </form>
            )}

            {/* ── Identidad (2.ª parte): los datos del negocio ── */}
            {seccion === 'identidad' && (
              <DatosNegocio
                key={JSON.stringify(ajustes.negocio || {})}
                negocio={ajustes.negocio}
                guardar={guardar}
                guardando={guardando}
                estiloTarjeta={tarjeta}
                estiloCampo={inputStyle}
              />
            )}


            {/* ── Envío y cobros ── */}
            {seccion === 'cobros' && (
              <>
                <ConfiguracionEnvio />
                <ServicioTarifa />
              </>
            )}

            {seccion === 'portada' && (
          <div className="p-6 rounded-2xl shadow-sm border" style={tarjeta}>
            <div className="mb-4">
              <h2 className="text-lg font-bold" style={{ color: 'var(--theme-text-primary)' }}>
                Portada de la tienda
              </h2>
              <p className="text-xs mt-0.5" style={{ color: 'var(--theme-text-secondary)' }}>
                Elija qué filas se muestran y en qué orden. Lo que va DENTRO de cada fila lo
                arma el sistema con su inventario, así que no se queda desactualizado.
                Se guarda solo al mover o apagar.
              </p>
            </div>

            <ul className="space-y-2">
              {portada.map((bloque, i) => {
                // La última encendida no se puede apagar: la portada no puede
                // quedar en blanco.
                const esLaUltima = bloque.visible && encendidas === 1;

                return (
                  <li
                    key={bloque.clave}
                    className="flex items-center gap-3 p-3 rounded-xl border transition-opacity"
                    style={{
                      borderColor: 'var(--theme-card-border)',
                      backgroundColor: bloque.visible ? 'transparent' : 'var(--theme-primary-light)',
                      opacity: bloque.visible ? 1 : 0.65,
                    }}
                  >
                    {/* Orden */}
                    <span
                      className="w-7 h-7 flex-none rounded-full grid place-items-center text-xs font-bold"
                      style={{
                        backgroundColor: 'var(--theme-primary-light)',
                        color: 'var(--theme-primary)',
                      }}
                    >
                      {i + 1}
                    </span>

                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-bold" style={{ color: 'var(--theme-text-primary)' }}>
                        {bloque.nombre}
                      </div>
                      <div className="text-xs mt-0.5" style={{ color: 'var(--theme-text-secondary)' }}>
                        {bloque.descripcion}
                      </div>
                    </div>

                    {/* Subir / bajar */}
                    <div className="flex flex-none gap-1">
                      <button
                        type="button"
                        onClick={() => mover(bloque.clave, 'arriba')}
                        disabled={i === 0 || guardando}
                        aria-label={`Subir ${bloque.nombre}`}
                        className="w-8 h-8 grid place-items-center rounded-lg border transition-colors disabled:opacity-30"
                        style={{ borderColor: 'var(--theme-card-border)', color: 'var(--theme-text-secondary)' }}
                      >
                        <ArrowUp className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => mover(bloque.clave, 'abajo')}
                        disabled={i === portada.length - 1 || guardando}
                        aria-label={`Bajar ${bloque.nombre}`}
                        className="w-8 h-8 grid place-items-center rounded-lg border transition-colors disabled:opacity-30"
                        style={{ borderColor: 'var(--theme-card-border)', color: 'var(--theme-text-secondary)' }}
                      >
                        <ArrowDown className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Encender / apagar */}
                    <button
                      type="button"
                      onClick={() => alternarVisible(bloque.clave)}
                      disabled={esLaUltima || guardando}
                      title={esLaUltima ? 'La portada no puede quedar vacía' : undefined}
                      aria-label={`${bloque.visible ? 'Ocultar' : 'Mostrar'} ${bloque.nombre}`}
                      className="w-8 h-8 flex-none grid place-items-center rounded-lg border transition-colors disabled:opacity-40"
                      style={{
                        borderColor: bloque.visible ? 'var(--theme-primary)' : 'var(--theme-card-border)',
                        color: bloque.visible ? 'var(--theme-primary)' : 'var(--theme-text-muted)',
                      }}
                    >
                      {esLaUltima
                        ? <Lock className="w-4 h-4" />
                        : bloque.visible
                          ? <Eye className="w-4 h-4" />
                          : <EyeOff className="w-4 h-4" />}
                    </button>
                  </li>
                );
              })}
            </ul>

            <p className="text-xs mt-4" style={{ color: 'var(--theme-text-muted)' }}>
              El catálogo completo ("Todos los productos") siempre va al final y no se puede
              quitar: es la tienda en sí, no una fila de adorno.
            </p>
          </div>
            )}

            {/* ── Apariencia (2.ª parte): Temporada ── */}
            {seccion === 'apariencia' && (
          <>
          <div className="p-6 rounded-2xl shadow-sm border" style={tarjeta}>
            <div className="mb-4">
              <h2 className="text-lg font-bold" style={{ color: 'var(--theme-text-primary)' }}>
                Temporada
              </h2>
              <p className="text-xs mt-0.5" style={{ color: 'var(--theme-text-secondary)' }}>
                La tienda se pinta de los colores de la fecha. Solo cambia lo que ve el
                cliente: este panel conserva su paleta de accesibilidad.
              </p>
            </div>

            {/* Qué se está pintando ahora mismo */}
            <div
              className="flex items-center gap-3 rounded-xl px-4 py-3 mb-5"
              style={{ backgroundColor: 'var(--theme-primary-light)' }}
            >
              <div className="flex gap-1 flex-none">
                {(pintandoAhora?.muestras || MUESTRAS_DE_MARCA).map((color) => (
                  <span
                    key={color}
                    className="w-5 h-5 rounded-full border"
                    style={{ backgroundColor: color, borderColor: 'rgba(0,0,0,0.08)' }}
                  />
                ))}
              </div>
              <div className="text-xs" style={{ color: 'var(--theme-text-secondary)' }}>
                {pintandoAhora
                  ? <>Ahora la tienda se ve de <strong>{pintandoAhora.nombre}</strong>.</>
                  : <>Ahora la tienda se ve con sus colores de siempre.</>}
                {temporada.modo === 'automatico' && (
                  porCalendario
                    ? <> El calendario manda.</>
                    : <> Hoy no cae ninguna temporada.</>
                )}
              </div>
            </div>

            {/* Modo */}
            <div className="flex flex-wrap gap-2 mb-5">
              {MODOS.map((m) => {
                const elegido = temporada.modo === m.clave;
                return (
                  <button
                    key={m.clave}
                    type="button"
                    onClick={() => guardar({ temporada: { modo: m.clave } })}
                    disabled={guardando}
                    title={m.ayuda}
                    className="px-4 py-2 rounded-full text-sm font-semibold border transition-colors disabled:opacity-60"
                    style={{
                      backgroundColor: elegido ? 'var(--theme-primary)' : 'transparent',
                      borderColor: elegido ? 'var(--theme-primary)' : 'var(--theme-card-border)',
                      color: elegido ? 'var(--theme-button-text)' : 'var(--theme-text-secondary)',
                    }}
                  >
                    {m.nombre}
                  </button>
                );
              })}
            </div>

            <p className="text-xs mb-3" style={{ color: 'var(--theme-text-secondary)' }}>
              {MODOS.find((m) => m.clave === temporada.modo)?.ayuda}
            </p>

            {/* Los temas se muestran SIEMPRE, no solo en modo manual: sirven para ver de qué color se va a
               poner la tienda en diciembre sin esperar a diciembre. En automático no se pueden tocar, pero se
               ven. */}
            <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}>
              {temas.map((tema) => {
                const elegido = temporada.modo === 'manual' && temporada.tema === tema.clave;
                const esElDeHoy = porCalendario?.clave === tema.clave;
                const seleccionable = temporada.modo === 'manual';
                // Cómo se viste Tiqui en esta temporada (el de fábrica o el que
                // armó el dueño). Ver utils/disfracesTiqui.js.
                const disfraz = disfrazDeTema(tema, temporada.disfraces);

                return (
                  <button
                    key={tema.clave}
                    type="button"
                    onClick={() => guardar({ temporada: { tema: tema.clave } })}
                    disabled={!seleccionable || guardando}
                    className="flex items-center gap-3 p-3 rounded-xl border text-left transition-colors disabled:cursor-default"
                    style={{
                      borderColor: elegido ? 'var(--theme-primary)' : 'var(--theme-card-border)',
                      backgroundColor: elegido ? 'var(--theme-primary-light)' : 'transparent',
                      opacity: seleccionable || esElDeHoy ? 1 : 0.6,
                    }}
                  >
                    {/* Tiqui con el disfraz de esta temporada, quieto: son varias juntas. */}
                    <Mascota pose="posando" alto={64} disfraz={disfraz} />

                    <div className="flex gap-1 flex-none">
                      {tema.muestras.map((color) => (
                        <span
                          key={color}
                          className="w-5 h-5 rounded-full border"
                          style={{ backgroundColor: color, borderColor: 'rgba(0,0,0,0.08)' }}
                        />
                      ))}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-bold flex items-center gap-1.5"
                           style={{ color: 'var(--theme-text-primary)' }}>
                        {tema.nombre}
                        {tema.propio && (
                          <span
                            className="text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded"
                            style={{ backgroundColor: 'var(--theme-primary-light)', color: 'var(--theme-primary)' }}
                          >
                            Suya
                          </span>
                        )}
                        {elegido && <Check className="w-3.5 h-3.5" style={{ color: 'var(--theme-primary)' }} />}
                      </div>
                      <div className="text-xs mt-0.5" style={{ color: 'var(--theme-text-secondary)' }}>
                        {tema.descripcion}
                        {esElDeHoy && ' · es la de hoy'}
                      </div>
                      {disfraz && (
                        <div className="text-xs mt-0.5" style={{ color: 'var(--theme-text-muted)' }}>
                          Tiqui se pone {describirDisfraz(disfraz)}
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {temporada.modo !== 'manual' && (
              <p className="text-xs mt-4" style={{ color: 'var(--theme-text-muted)' }}>
                Para elegir un tema a mano —adelantar la Navidad porque ya llegó el producto
                navideño, por ejemplo— cambie el modo a Manual.
              </p>
            )}

            {/* Decoración: cinta + figuras cayendo, o solo los colores. */}
            <div
              className="flex items-center justify-between gap-4 mt-5 pt-5 border-t"
              style={{ borderColor: 'var(--theme-card-border)' }}
            >
              <div className="min-w-0">
                <div className="text-sm font-bold" style={{ color: 'var(--theme-text-primary)' }}>
                  Decoración
                </div>
                <div className="text-xs mt-0.5" style={{ color: 'var(--theme-text-secondary)' }}>
                  La cinta con el saludo y las figuras cayendo de fondo. Apagada, la temporada
                  se nota solo en los colores. Las figuras van siempre detrás del contenido y
                  no se muestran a quien pidió menos movimiento en su sistema.
                </div>
              </div>

              <button
                type="button"
                role="switch"
                aria-checked={temporada.decoracion !== false}
                disabled={guardando}
                onClick={() => guardar({ temporada: { decoracion: temporada.decoracion === false } })}
                className="relative w-11 h-6 rounded-full transition-colors flex-none disabled:opacity-60"
                style={{
                  backgroundColor: temporada.decoracion !== false
                    ? 'var(--theme-primary)'
                    : 'var(--theme-card-border)',
                }}
              >
                {/* transform en vez de `left`: se mueve en la GPU, sin recalcular layout */}
                <span
                  className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white"
                  style={{
                    transform: temporada.decoracion !== false ? 'translateX(20px)' : 'translateX(0)',
                    transition: 'transform var(--dur-press) var(--ease-out)',
                  }}
                />
              </button>
            </div>
          </div>

          {/* ── Apariencia (3.ª parte): las temporadas que crea el dueño ── */}
          <TemporadasPropias temporada={temporada} guardar={guardar} guardando={guardando} />

          {/* ── Apariencia: cómo se viste Tiqui en cada temporada ── */}
          <EditorDisfrazTiqui temporada={temporada} guardar={guardar} guardando={guardando} />

          {/* ── Apariencia (4.ª parte): el saludo de cada temporada ── */}
          <div className="p-6 rounded-2xl shadow-sm border mt-6" style={tarjeta}>
            <div className="mb-4">
              <h2 className="text-lg font-bold" style={{ color: 'var(--theme-text-primary)' }}>
                Saludo de cada temporada
              </h2>
              <p className="text-xs mt-0.5" style={{ color: 'var(--theme-text-secondary)' }}>
                El texto de la cinta que aparece debajo del encabezado. En las temporadas de
                fábrica, en blanco se usa el saludo de siempre. El de sus temporadas se escribe
                al crearlas, arriba.
              </p>
            </div>

            <form onSubmit={guardarSaludos} className="flex flex-col gap-4">
              {/* Los días sin temporada: la mayor parte del año. En blanco no sale cinta, que es como se veía la
                 tienda antes. */}
              <div
                className="space-y-1.5 rounded-xl p-4"
                style={{ backgroundColor: 'var(--theme-primary-light)' }}
              >
                <label htmlFor="saludo-normal" className="block text-sm font-bold" style={{ color: 'var(--theme-text-primary)' }}>
                  Días sin temporada
                </label>
                <input
                  id="saludo-normal"
                  type="text"
                  maxLength={160}
                  value={saludoNormal}
                  onChange={(e) => setSaludoNormal(e.target.value)}
                  placeholder="Ej. Envío gratis los martes — pida antes de las 5 p. m."
                  className="w-full px-4 py-2.5 rounded-xl border outline-none"
                  style={inputStyle}
                />
                <p className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>
                  Sale el resto del año, con los colores de siempre. En blanco no se muestra cinta.
                </p>
              </div>

              {TEMAS_DE_TEMPORADA.map((tema) => (
                <div key={tema.clave} className="space-y-1.5">
                  <label className="block text-sm font-bold" style={{ color: 'var(--theme-text-primary)' }}>
                    {tema.nombre}
                  </label>
                  <input
                    type="text"
                    maxLength={160}
                    value={saludos[tema.clave] || ''}
                    onChange={(e) => setSaludos({ ...saludos, [tema.clave]: e.target.value })}
                    placeholder={tema.decoracion.saludo}
                    className="w-full px-4 py-2.5 rounded-xl border outline-none"
                    style={inputStyle}
                  />
                </div>
              ))}

              <button
                type="submit" disabled={guardando}
                className="self-start px-8 py-2.5 rounded-full font-bold shadow-sm transition-colors disabled:opacity-60"
                style={{ backgroundColor: 'var(--theme-primary)', color: 'var(--theme-button-text)' }}
              >
                {guardando ? 'Guardando…' : 'Guardar saludos'}
              </button>
            </form>
          </div>
          </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Personalizacion;

import { useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { CreditCard, Wallet, Trash2, Plus, Gift, Lock, CircleAlert } from 'lucide-react';
import { useIdioma } from '../../hooks/useIdioma';
import { useTheme } from '../../hooks/useClientTheme';
import { usePaymentMethods } from '../../hooks/usePaymentMethods';
import { useSaldo } from '../../hooks/useSaldo';
import MarcaTarjeta from '../../components/Cuenta/MarcaTarjeta';
import VistaTarjeta from '../../components/Cuenta/VistaTarjeta';
import { formatoCodigoTarjeta, LARGO_CODIGO_TARJETA } from '../../utils/tarjetaRegalo';
import Mascota, { CargandoMascota } from '../../components/UI/Mascota';
import {
  NOMBRE_MARCA,
  detectarMarca,
  estaVencida,
  formatearNumero,
  formatearVencimiento,
  largoDe,
  leerVencimiento,
  pasaLuhn,
  soloDigitos,
  vencimientoEnTexto,
} from '../../utils/tarjetas';

// MetodoPago — el cliente gestiona sus métodos de pago (área "Mi Cuenta"). AGREGAR UNA TARJETA se
// hace como en cualquier tienda seria: número completo con la marca reconocida al vuelo, titular y
// vencimiento, con una tarjeta de vista previa que se va llenando.

// "Visa crédito", "Mastercard débito"... o "Tarjeta" para las guardadas antes de conocer la marca.
// Sin `t`, en español: así es como se guarda el nombre que se pone solo, y con `t` se muestra en
// el idioma elegido.
const nombreMarcaTipo = (m, t = (x) => x) =>
  `${NOMBRE_MARCA[m.brand] && m.brand !== 'otra' ? NOMBRE_MARCA[m.brand] : t('Tarjeta')}${m.cardType ? ` ${m.cardType === 'debito' ? t('débito') : t('crédito')}` : ''}`;

const FORM_VACIO = { tipo: 'credito', numero: '', titular: '', vencimiento: '', alias: '' };

const Etiqueta = ({ htmlFor, color, children }) => (
  <label htmlFor={htmlFor} className="block text-sm font-semibold mb-1.5" style={{ color }}>
    {children}
  </label>
);

const MensajeError = ({ texto }) => (texto ? (
  <p className="flex items-center gap-1.5 text-xs mt-1.5" style={{ color: 'var(--peligro)' }} role="alert">
    <CircleAlert className="w-3.5 h-3.5 flex-none" /> {texto}
  </p>
) : null);

const MetodoPago = () => {
  const { palette } = useTheme();
  const c = palette.colors;
  const reducir = useReducedMotion();
  const { t } = useIdioma();
  const { methods, loading, saving, agregar, eliminar } = usePaymentMethods();

  // Saldo digital cargado con tarjetas de regalo.
  const { saldo, cargando: cargandoSaldo, canjeando, canjear } = useSaldo();
  const [codigo, setCodigo] = useState('');

  const [agregando, setAgregando] = useState(false);
  const [form, setForm] = useState(FORM_VACIO);
  const [tocado, setTocado] = useState({});
  const [porQuitar, setPorQuitar] = useState(null);

  const onCanjear = async (e) => {
    e.preventDefault();
    // Solo limpiamos el campo si el canje funcionó: si el código estaba mal,
    // que no tenga que escribirlo de nuevo entero.
    if (await canjear(codigo)) setCodigo('');
  };

  /* ── Validación del formulario ── */
  const digitos = soloDigitos(form.numero);
  const marca = detectarMarca(digitos);
  const numeroCompleto = digitos.length === largoDe(marca);
  const numeroValido = numeroCompleto && pasaLuhn(digitos);
  const venc = leerVencimiento(form.vencimiento);
  const vencida = venc ? estaVencida(venc.mes, venc.anio) : false;
  const titularValido = form.titular.trim().replace(/[^a-zA-ZÀ-ÿ]/g, '').length >= 3;
  const duplicada = numeroValido && venc && methods.some((m) =>
    m.type !== 'efectivo' && m.last4 === digitos.slice(-4) && m.brand === marca
    && Number(m.expMonth) === venc.mes && Number(m.expYear) === venc.anio
  );

  const errores = {
    numero: !tocado.numero || !digitos ? ''
      : !numeroCompleto ? t('Faltan dígitos: {marca} lleva {n}.', { marca: marca === 'otra' ? t('la tarjeta') : NOMBRE_MARCA[marca], n: largoDe(marca) })
      : !numeroValido ? t('Revisa el número: no corresponde a una tarjeta válida.')
      : duplicada ? t('Esa tarjeta ya está guardada.')
      : '',
    vencimiento: !tocado.vencimiento || !form.vencimiento ? ''
      : !venc ? t('Usa el formato MM/AA, con un mes entre 01 y 12.')
      : vencida ? t('Esta tarjeta ya venció.')
      : '',
    titular: tocado.titular && !titularValido ? t('Escribe el nombre como aparece en la tarjeta.') : '',
  };

  const listo = numeroValido && venc && !vencida && titularValido && !duplicada && !saving;

  const cambiar = (campo, valor) => setForm((f) => ({ ...f, [campo]: valor }));
  const tocar = (campo) => setTocado((t) => ({ ...t, [campo]: true }));

  const cerrar = () => {
    setAgregando(false);
    setForm(FORM_VACIO);
    setTocado({});
  };

  const onGuardar = async (e) => {
    e.preventDefault();
    setTocado({ numero: true, vencimiento: true, titular: true });
    if (!listo) return;
    const ok = await agregar({
      type: 'tarjeta',
      alias: form.alias.trim() || `${NOMBRE_MARCA[marca]} ${form.tipo === 'debito' ? 'débito' : 'crédito'}`,
      last4: digitos.slice(-4),
      brand: marca,
      cardType: form.tipo,
      holder: form.titular.trim().toUpperCase(),
      expMonth: venc.mes,
      expYear: venc.anio,
    });
    if (ok) cerrar();
  };

  // Lo que se ve de cada método: su alias, o el nombre que se puso solo, ya traducido.
  const aliasDe = (m) => {
    if (!m.alias) return m.type === 'efectivo' ? t('Efectivo') : t('Tarjeta');
    return m.alias === nombreMarcaTipo(m) ? nombreMarcaTipo(m, t) : m.alias;
  };

  const campo = (error) => ({
    backgroundColor: c.cardBg,
    borderColor: error ? 'var(--peligro)' : c.cardBorder,
    color: c.textPrimary,
  });

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold" style={{ color: c.textPrimary }}>{t('Métodos de pago')}</h1>
      <p className="text-sm mt-1" style={{ color: c.textSecondary }}>
        {t('Tus tarjetas guardadas y el saldo de tus tarjetas de regalo.')}
      </p>

      {/* ── Saldo digital ── */}
      <section className="mt-8 pb-8 flex items-end justify-between gap-6 flex-wrap" style={{ borderBottom: `1px solid ${c.cardBorder}` }}>
        <div>
          <div className="flex items-center gap-2 text-sm font-medium" style={{ color: c.textSecondary }}>
            <Gift className="w-4 h-4" /> {t('Saldo disponible')}
          </div>
          <div className="text-4xl font-extrabold tracking-tight mt-1 tabular-nums" style={{ color: c.primary }}>
            {cargandoSaldo ? '—' : `$${saldo.toFixed(2)}`}
          </div>
          <p className="text-xs mt-1" style={{ color: c.textMuted }}>
            {t('Puedes pagar tus compras con este saldo al finalizar el pedido.')}
          </p>
        </div>

        <form onSubmit={onCanjear} className="flex gap-2 items-start">
          <div>
            <input
              value={codigo}
              // Los guiones se ponen solos (ver utils/tarjetaRegalo.js).
              onChange={(e) => setCodigo(formatoCodigoTarjeta(e.target.value))}
              maxLength={LARGO_CODIGO_TARJETA}
              autoCapitalize="characters"
              autoComplete="off"
              spellCheck={false}
              placeholder="635-XXXX-XXXX"
              aria-label={t('Código de la tarjeta de regalo')}
              className="px-3 py-2.5 rounded-xl border outline-none font-mono tracking-wider w-48"
              style={campo()}
            />
            <p className="text-xs mt-1" style={{ color: c.textMuted }}>{t('Código de tu tarjeta de regalo')}</p>
          </div>
          <button
            type="submit"
            disabled={canjeando}
            className="press px-5 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-60"
            style={{ backgroundColor: c.primary }}
          >
            {canjeando ? t('Canjeando…') : t('Canjear')}
          </button>
        </form>
      </section>

      {/* ── Tarjetas guardadas ── */}
      <section className="mt-8">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-lg font-bold" style={{ color: c.textPrimary }}>{t('Tarjetas')}</h2>
          {!agregando && (
            <button
              type="button"
              onClick={() => setAgregando(true)}
              className="press inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold"
              style={{ backgroundColor: c.primary, color: c.buttonText }}
            >
              <Plus className="w-4 h-4" /> {t('Agregar tarjeta')}
            </button>
          )}
        </div>

        {loading ? (
          <CargandoMascota texto={t('Cargando tus métodos…')} />
        ) : methods.length === 0 && !agregando ? (
          <div className="flex flex-col items-center text-center py-12">
            <div className="mb-4"><Mascota pose="sin-tarjetas" alto={120} /></div>
            <p className="text-sm font-semibold" style={{ color: c.textPrimary }}>{t('Todavía no tienes tarjetas guardadas')}</p>
            <p className="text-sm mt-1" style={{ color: c.textSecondary }}>{t('Guárdala una vez y la tendrás a mano en tu próxima compra.')}</p>
          </div>
        ) : (
          <ul className="mt-4">
            {methods.map((m, i) => {
              const esEfectivo = m.type === 'efectivo';
              const vencidaGuardada = !esEfectivo && estaVencida(Number(m.expMonth), Number(m.expYear));
              const detalle = esEfectivo
                ? t('Efectivo')
                : [
                  // El nombre de la marca solo si el alias no lo dice ya ("Mastercard débito" dos veces se lee como error).
                  nombreMarcaTipo(m) !== m.alias && nombreMarcaTipo(m, t),
                  `•••• ${m.last4 || '••••'}`,
                  vencimientoEnTexto(m.expMonth, m.expYear) && t('Vence {fecha}', { fecha: vencimientoEnTexto(m.expMonth, m.expYear) }),
                ].filter(Boolean).join(' · ');

              return (
                <li
                  key={`${m.last4}-${i}`}
                  className="flex items-center gap-4 py-4"
                  style={{ borderTop: i === 0 ? 'none' : `1px solid ${c.cardBorder}` }}
                >
                  {esEfectivo
                    ? <span className="grid place-items-center flex-none" style={{ width: 45, height: 30 }}><Wallet className="w-5 h-5" style={{ color: c.primary }} /></span>
                    : <MarcaTarjeta marca={m.brand || 'otra'} />}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold truncate" style={{ color: c.textPrimary }}>
                      {aliasDe(m)}
                    </div>
                    <div className="text-xs mt-0.5 truncate" style={{ color: c.textMuted }}>{detalle}</div>
                  </div>
                  {vencidaGuardada && (
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ color: 'var(--peligro)', backgroundColor: 'var(--peligro-fondo)' }}>
                      {t('Vencida')}
                    </span>
                  )}
                  {porQuitar === i ? (
                    <span className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={async () => { await eliminar(i); setPorQuitar(null); }}
                        disabled={saving}
                        className="text-xs font-bold px-3 py-1.5 rounded-full text-white disabled:opacity-60"
                        style={{ backgroundColor: '#dc2626' }}
                      >
                        {t('Quitar')}
                      </button>
                      <button type="button" onClick={() => setPorQuitar(null)} className="text-xs font-semibold px-2 py-1.5" style={{ color: c.textSecondary }}>
                        {t('Cancelar')}
                      </button>
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setPorQuitar(i)}
                      disabled={saving}
                      aria-label={t('Quitar {nombre}', { nombre: m.alias ? aliasDe(m) : t('método de pago') })}
                      className="p-2 rounded-lg transition-colors disabled:opacity-60 hover:bg-[var(--peligro-fondo)]"
                      style={{ color: 'var(--peligro)' }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        {/* ── Agregar tarjeta ── */}
        <AnimatePresence initial={false}>
          {agregando && (
            <motion.form
              key="agregar"
              onSubmit={onGuardar}
              noValidate
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: reducir ? 0 : 0.28, ease: [0.23, 1, 0.32, 1] }}
              style={{ overflow: 'hidden' }}
            >
              <div className="pt-6 mt-2 grid gap-8 md:grid-cols-[minmax(0,340px)_minmax(0,1fr)]" style={{ borderTop: methods.length ? `1px solid ${c.cardBorder}` : 'none' }}>
                <div className="flex flex-col items-center md:items-start gap-4">
                  <VistaTarjeta numero={digitos} titular={form.titular} vencimiento={form.vencimiento} tipo={form.tipo} />
                  <p className="flex items-start gap-2 text-xs max-w-[340px]" style={{ color: c.textMuted }}>
                    <Lock className="w-3.5 h-3.5 flex-none mt-0.5" />
                    {t('Solo guardamos la marca, los últimos 4 dígitos, el titular y el vencimiento. El número completo no sale de este formulario, y el código de seguridad se pide solo al pagar.')}
                  </p>
                </div>

                <div className="flex flex-col gap-5">
                  {/* Crédito o débito */}
                  <div role="radiogroup" aria-label={t('Tipo de tarjeta')} className="inline-flex self-start p-1 rounded-full" style={{ backgroundColor: c.primaryLight }}>
                    {[['credito', t('Crédito')], ['debito', t('Débito')]].map(([valor, texto]) => {
                      const elegido = form.tipo === valor;
                      return (
                        <button
                          key={valor}
                          type="button"
                          role="radio"
                          aria-checked={elegido}
                          onClick={() => cambiar('tipo', valor)}
                          className="px-5 py-2 rounded-full text-sm font-semibold transition-colors"
                          style={{
                            backgroundColor: elegido ? c.cardBg : 'transparent',
                            color: elegido ? c.primary : c.textSecondary,
                            boxShadow: elegido ? '0 1px 4px rgba(0,0,0,.12)' : 'none',
                          }}
                        >
                          {texto}
                        </button>
                      );
                    })}
                  </div>

                  <div>
                    <Etiqueta htmlFor="tarjeta-numero" color={c.textPrimary}>{t('Número de tarjeta')}</Etiqueta>
                    <div className="relative">
                      <input
                        id="tarjeta-numero"
                        name="cc-number"
                        autoComplete="cc-number"
                        inputMode="numeric"
                        placeholder="1234 5678 9012 3456"
                        value={formatearNumero(form.numero)}
                        onChange={(e) => {
                          // Recortado al largo de la marca: pegar un número con espacios o de más no deja dígitos escondidos.
                          const d = soloDigitos(e.target.value);
                          cambiar('numero', d.slice(0, largoDe(detectarMarca(d))));
                        }}
                        onBlur={() => tocar('numero')}
                        aria-invalid={!!errores.numero}
                        className="w-full pl-4 pr-16 py-3 rounded-xl border outline-none font-mono tracking-wider text-base"
                        style={campo(errores.numero)}
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2">
                        {digitos ? <MarcaTarjeta marca={marca} alto={24} /> : <CreditCard className="w-5 h-5" style={{ color: c.textMuted }} />}
                      </span>
                    </div>
                    <MensajeError texto={errores.numero} />
                  </div>

                  <div>
                    <Etiqueta htmlFor="tarjeta-titular" color={c.textPrimary}>{t('Nombre del titular')}</Etiqueta>
                    <input
                      id="tarjeta-titular"
                      name="cc-name"
                      autoComplete="cc-name"
                      placeholder={t('Como aparece en la tarjeta')}
                      value={form.titular}
                      maxLength={40}
                      onChange={(e) => cambiar('titular', e.target.value)}
                      onBlur={() => tocar('titular')}
                      aria-invalid={!!errores.titular}
                      className="w-full px-4 py-3 rounded-xl border outline-none uppercase placeholder:normal-case"
                      style={campo(errores.titular)}
                    />
                    <MensajeError texto={errores.titular} />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <Etiqueta htmlFor="tarjeta-vencimiento" color={c.textPrimary}>{t('Vencimiento')}</Etiqueta>
                      <input
                        id="tarjeta-vencimiento"
                        name="cc-exp"
                        autoComplete="cc-exp"
                        inputMode="numeric"
                        placeholder={t('MM/AA')}
                        value={form.vencimiento}
                        onChange={(e) => cambiar('vencimiento', formatearVencimiento(e.target.value))}
                        onBlur={() => tocar('vencimiento')}
                        aria-invalid={!!errores.vencimiento}
                        className="w-full px-4 py-3 rounded-xl border outline-none font-mono tracking-wider"
                        style={campo(errores.vencimiento)}
                      />
                      <MensajeError texto={errores.vencimiento} />
                    </div>
                    <div>
                      <Etiqueta htmlFor="tarjeta-alias" color={c.textPrimary}>
                        {t('Nombre para reconocerla')} <span className="font-normal" style={{ color: c.textMuted }}>{t('(opcional)')}</span>
                      </Etiqueta>
                      <input
                        id="tarjeta-alias"
                        placeholder={digitos ? nombreMarcaTipo({ brand: marca, cardType: form.tipo }, t) : t('Ej. Tarjeta del trabajo')}
                        value={form.alias}
                        maxLength={40}
                        onChange={(e) => cambiar('alias', e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border outline-none"
                        style={campo()}
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3 pt-1">
                    <button
                      type="submit"
                      disabled={saving}
                      className="press inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full text-sm font-bold disabled:opacity-60"
                      style={{ backgroundColor: listo ? c.primary : c.cardBorder, color: listo ? c.buttonText : c.textMuted }}
                    >
                      <Lock className="w-4 h-4" /> {saving ? t('Guardando…') : t('Guardar tarjeta')}
                    </button>
                    <button
                      type="button"
                      onClick={cerrar}
                      className="px-5 py-3 rounded-full text-sm font-semibold"
                      style={{ color: c.textSecondary }}
                    >
                      {t('Cancelar')}
                    </button>
                  </div>
                </div>
              </div>
            </motion.form>
          )}
        </AnimatePresence>
      </section>
    </div>
  );
};

export default MetodoPago;

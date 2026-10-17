import { useState, useEffect } from 'react';
import { Award } from 'lucide-react';
import toast from 'react-hot-toast';
import { useLoyaltyConfig } from '../hooks/useLoyaltyConfig';
import { numeroEnRango, bloquearTeclasNumero } from '../utils/validaciones';

// Fidelidad (Admin) — el gerente configura el programa de puntos: - cuántos puntos se ganan por
// cada $1 - a los cuántos meses vencen - encender/apagar el programa La lógica vive en
// useLoyaltyConfig; aquí solo está el formulario.
const Fidelidad = () => {
  const { config, loading, saving, guardar } = useLoyaltyConfig();
  const [form, setForm] = useState({
    pointsPerDollar: 1, expiryMonths: 3,
    pointsPerDollarRedeem: 100, minRedeemPoints: 100, isActive: true,
  });

  useEffect(() => {
    if (config) {
      setForm({
        pointsPerDollar: config.pointsPerDollar ?? 1,
        expiryMonths: config.expiryMonths ?? 3,
        pointsPerDollarRedeem: config.pointsPerDollarRedeem ?? 100,
        minRedeemPoints: config.minRedeemPoints ?? 100,
        isActive: config.isActive ?? true,
      });
    }
  }, [config]);

  const onSubmit = (e) => {
    e.preventDefault();

    // Cada número tiene que tener sentido antes de guardarse.
    const ganancia = numeroEnRango(form.pointsPerDollar, { min: 0.01, max: 1000 });
    if (ganancia === null) { toast.error('Los puntos por cada $1 deben ser mayores que 0'); return; }

    const meses = numeroEnRango(form.expiryMonths, { min: 1, max: 60, entero: true });
    if (meses === null) { toast.error('El vencimiento debe ser un número entero de 1 a 60 meses'); return; }

    const tasa = numeroEnRango(form.pointsPerDollarRedeem, { min: 1, max: 100000, entero: true });
    if (tasa === null) { toast.error('Los puntos por cada $1 de descuento deben ser 1 o más'); return; }

    const minimo = numeroEnRango(form.minRedeemPoints, { min: 0, max: 1000000, entero: true });
    if (minimo === null) { toast.error('El mínimo para canjear debe ser un número entero de 0 o más'); return; }

    guardar({
      pointsPerDollar: ganancia,
      expiryMonths: meses,
      pointsPerDollarRedeem: tasa,
      minRedeemPoints: minimo,
      isActive: form.isActive,
    });
  };

  // Ejemplos en vivo para que el gerente entienda el impacto de cada número.
  const ejemplo = Math.floor(10 * (Number(form.pointsPerDollar) || 0));
  const valorCanje = ((Number(form.minRedeemPoints) || 0) / (Number(form.pointsPerDollarRedeem) || 1)).toFixed(2);

  const inputStyle = {
    backgroundColor: 'var(--theme-card-bg)',
    borderColor: 'var(--theme-card-border)',
    color: 'var(--theme-text-primary)',
  };

  return (
    <div className="flex flex-col gap-6 w-full pb-8 max-w-2xl">
      <div className="flex items-center gap-3">
        <Award className="w-8 h-8" style={{ color: 'var(--theme-accent-text)' }} />
        <h1 className="text-4xl font-extrabold" style={{ color: 'var(--theme-accent-text)' }}>Programa de Fidelidad</h1>
      </div>

      {loading ? (
        <p className="text-sm" style={{ color: 'var(--theme-text-secondary)' }}>Cargando configuración…</p>
      ) : (
        <form
          onSubmit={onSubmit}
          className="p-6 rounded-2xl shadow-sm border space-y-6"
          style={{ backgroundColor: 'var(--theme-card-bg)', borderColor: 'var(--theme-card-border)' }}
        >
          {/* Activo/Inactivo */}
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-bold" style={{ color: 'var(--theme-text-primary)' }}>Programa activo</div>
              <div className="text-xs mt-0.5" style={{ color: 'var(--theme-text-secondary)' }}>
                Si lo apagas, las compras dejan de otorgar puntos.
              </div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={form.isActive}
              onClick={() => setForm({ ...form, isActive: !form.isActive })}
              className="relative w-11 h-6 rounded-full transition-colors flex-none"
              style={{ backgroundColor: form.isActive ? 'var(--theme-primary)' : 'var(--theme-card-border)' }}
            >
              {/* transform en vez de `left`: se mueve en la GPU, sin recalcular layout */}
              <span className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white"
                    style={{
                      transform: form.isActive ? 'translateX(20px)' : 'translateX(0)',
                      transition: 'transform var(--dur-press) var(--ease-out)',
                    }} />
            </button>
          </div>

          {/* Puntos por dólar */}
          <div className="space-y-1.5">
            <label className="block text-sm font-bold" style={{ color: 'var(--theme-text-primary)' }}>
              Puntos por cada $1 gastado
            </label>
            <input
              type="number" min="0" step="1" onKeyDown={bloquearTeclasNumero}
              value={form.pointsPerDollar}
              onChange={(e) => setForm({ ...form, pointsPerDollar: e.target.value })}
              className="w-40 px-4 py-2.5 rounded-xl border outline-none"
              style={inputStyle}
            />
          </div>

          {/* Vencimiento */}
          <div className="space-y-1.5">
            <label className="block text-sm font-bold" style={{ color: 'var(--theme-text-primary)' }}>
              Los puntos vencen a los (meses)
            </label>
            <input
              type="number" min="1" step="1" onKeyDown={bloquearTeclasNumero}
              value={form.expiryMonths}
              onChange={(e) => setForm({ ...form, expiryMonths: e.target.value })}
              className="w-40 px-4 py-2.5 rounded-xl border outline-none"
              style={inputStyle}
            />
          </div>

          {/* ── Canje ── */}
          <div className="pt-2 border-t" style={{ borderColor: 'var(--theme-card-border)' }}>
            <div className="text-sm font-bold mb-3 mt-3" style={{ color: 'var(--theme-text-primary)' }}>
              Canje de puntos
            </div>

            <div className="space-y-1.5 mb-4">
              <label className="block text-sm font-bold" style={{ color: 'var(--theme-text-primary)' }}>
                ¿Cuántos puntos equivalen a $1?
              </label>
              <input
                type="number" min="1" step="1" onKeyDown={bloquearTeclasNumero}
                value={form.pointsPerDollarRedeem}
                onChange={(e) => setForm({ ...form, pointsPerDollarRedeem: e.target.value })}
                className="w-40 px-4 py-2.5 rounded-xl border outline-none"
                style={inputStyle}
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-bold" style={{ color: 'var(--theme-text-primary)' }}>
                Mínimo de puntos para canjear
              </label>
              <input
                type="number" min="0" step="1" onKeyDown={bloquearTeclasNumero}
                value={form.minRedeemPoints}
                onChange={(e) => setForm({ ...form, minRedeemPoints: e.target.value })}
                className="w-40 px-4 py-2.5 rounded-xl border outline-none"
                style={inputStyle}
              />
            </div>
          </div>

          {/* Ejemplos en vivo */}
          <div className="text-sm rounded-xl px-4 py-3 space-y-1"
               style={{ backgroundColor: 'var(--theme-primary-light)', color: 'var(--theme-text-secondary)' }}>
            <div>
              Gana: un cliente que gasta <strong>$10</strong> recibe <strong>{ejemplo} puntos</strong>,
              que vencen en <strong>{form.expiryMonths} meses</strong>.
            </div>
            <div>
              Canjea: con <strong>{form.minRedeemPoints} puntos</strong> obtiene
              <strong> ${valorCanje}</strong> de descuento en su compra.
            </div>
          </div>

          <button
            type="submit" disabled={saving}
            className="px-8 py-2.5 rounded-full font-bold shadow-sm transition-colors disabled:opacity-60"
            style={{ backgroundColor: 'var(--theme-primary)', color: 'var(--theme-button-text)' }}
          >
            {saving ? 'Guardando…' : 'Guardar configuración'}
          </button>
        </form>
      )}
    </div>
  );
};

export default Fidelidad;

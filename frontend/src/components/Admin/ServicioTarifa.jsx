import { useState, useEffect } from 'react';
import { Receipt } from 'lucide-react';
import { useAjustesCtx } from '../../context/AjustesContext';

// TARIFA DE SERVICIO (Admin) — ServicioTarifa.jsx
// Un cobro extra opcional de la casa (empaque, comisión, lo que sea). El dueño lo prende o apaga,
// y elige si es un monto fijo o un porcentaje del subtotal.
const ServicioTarifa = () => {
  const { ajustes, guardar, guardando } = useAjustesCtx();

  const [activo, setActivo] = useState(false);
  const [tipo, setTipo] = useState('fijo'); // 'fijo' | 'porcentaje'
  const [valor, setValor] = useState('');

  useEffect(() => {
    setActivo(!!ajustes.servicioActivo);
    setTipo(ajustes.servicioTipo === 'porcentaje' ? 'porcentaje' : 'fijo');
    setValor(ajustes.servicioValor != null ? String(ajustes.servicioValor) : '');
  }, [ajustes.servicioActivo, ajustes.servicioTipo, ajustes.servicioValor]);

  const onGuardar = async () => {
    const nValor = Number(valor);
    await guardar({
      servicioActivo: activo,
      servicioTipo: tipo,
      servicioValor: Number.isFinite(nValor) && nValor >= 0 ? nValor : 0,
    });
  };

  const inputStyle = {
    backgroundColor: 'var(--theme-card-bg)',
    borderColor: 'var(--theme-card-border)',
    color: 'var(--theme-text-primary)',
  };

  // Un ejemplo con un subtotal de muestra, para que se entienda el porcentaje.
  const ejemplo = tipo === 'porcentaje'
    ? `Un pedido de $10.00 pagaría $${((10 * (Number(valor) || 0)) / 100).toFixed(2)} de servicio.`
    : `Cada pedido paga $${(Number(valor) || 0).toFixed(2)} de servicio.`;

  return (
    <div className="p-6 rounded-2xl shadow-sm border" style={{ backgroundColor: 'var(--theme-card-bg)', borderColor: 'var(--theme-card-border)' }}>
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2" style={{ color: 'var(--theme-text-primary)' }}>
            <Receipt className="w-5 h-5" style={{ color: 'var(--theme-primary)' }} />
            Tarifa de servicio
          </h2>
          <p className="text-xs mt-0.5" style={{ color: 'var(--theme-text-secondary)' }}>
            Un cobro extra opcional que se suma al pedido (empaque, comisión, lo que decida).
            Apagada, el cliente no ve ninguna línea de servicio.
          </p>
        </div>

        {/* Interruptor de encendido */}
        <button
          type="button"
          role="switch"
          aria-checked={activo}
          onClick={() => setActivo((v) => !v)}
          className="relative w-11 h-6 rounded-full transition-colors flex-none mt-1"
          style={{ backgroundColor: activo ? 'var(--theme-primary)' : 'var(--theme-card-border)' }}
        >
          <span
            className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white"
            style={{
              transform: activo ? 'translateX(20px)' : 'translateX(0)',
              transition: 'transform var(--dur-press) var(--ease-out)',
            }}
          />
        </button>
      </div>

      {/* Tipo + valor, atenuados si está apagada */}
      <div style={{ opacity: activo ? 1 : 0.5, pointerEvents: activo ? 'auto' : 'none' }}>
        <div className="flex flex-wrap items-end gap-4 mb-3">
          <div className="space-y-1.5">
            <span className="block text-sm font-bold" style={{ color: 'var(--theme-text-primary)' }}>Tipo</span>
            <div className="flex gap-1.5">
              {[{ id: 'fijo', label: 'Monto fijo' }, { id: 'porcentaje', label: 'Porcentaje' }].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTipo(t.id)}
                  className="px-4 py-2 rounded-full text-sm font-semibold border transition-colors"
                  style={{
                    backgroundColor: tipo === t.id ? 'var(--theme-primary)' : 'var(--theme-card-bg)',
                    color: tipo === t.id ? 'var(--theme-button-text)' : 'var(--theme-text-secondary)',
                    borderColor: 'var(--theme-card-border)',
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-sm font-bold" style={{ color: 'var(--theme-text-primary)' }}>
              {tipo === 'porcentaje' ? 'Porcentaje del pedido' : 'Monto por pedido'}
            </label>
            <div className="flex items-center gap-2">
              {tipo === 'fijo' && <span className="text-sm font-bold" style={{ color: 'var(--theme-text-secondary)' }}>$</span>}
              <input
                type="number" min="0" step={tipo === 'porcentaje' ? '0.5' : '0.01'} inputMode="decimal"
                value={valor}
                onChange={(e) => setValor(e.target.value)}
                placeholder={tipo === 'porcentaje' ? '5' : '0.50'}
                className="w-28 px-4 py-2.5 rounded-xl border outline-none"
                style={inputStyle}
              />
              {tipo === 'porcentaje' && <span className="text-sm font-bold" style={{ color: 'var(--theme-text-secondary)' }}>%</span>}
            </div>
          </div>
        </div>

        <p className="text-xs mb-4" style={{ color: 'var(--theme-text-muted)' }}>{ejemplo}</p>
      </div>

      <button
        type="button"
        onClick={onGuardar}
        disabled={guardando}
        className="px-8 py-2.5 rounded-full font-bold shadow-sm transition-colors disabled:opacity-60"
        style={{ backgroundColor: 'var(--theme-primary)', color: 'var(--theme-button-text)' }}
      >
        {guardando ? 'Guardando…' : 'Guardar servicio'}
      </button>
    </div>
  );
};

export default ServicioTarifa;

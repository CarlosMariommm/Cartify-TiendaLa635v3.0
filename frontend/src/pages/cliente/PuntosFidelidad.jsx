import { Star, AlertTriangle } from 'lucide-react';
import { useTheme } from '../../hooks/useClientTheme';
import { useAuth } from '../../hooks/useAuth';
import { useLoyalty } from '../../hooks/useLoyalty';
import { useAjustesCtx } from '../../context/AjustesContext';
import { useIdioma } from '../../hooks/useIdioma';

// PuntosFidelidad — tarjeta de fidelidad del cliente (área "Mi Cuenta"). Muestra el saldo
// DISPONIBLE real (lotes no vencidos) y la próxima fecha de vencimiento, ambos del ledger. La
// lógica vive en useLoyalty; aquí solo pintamos.
const PuntosFidelidad = () => {
  // El nombre de la tienda sale de los ajustes, no escrito a mano.
  const { ajustes } = useAjustesCtx();
  const { palette } = useTheme();
  const c = palette.colors;
  const { user } = useAuth();
  const { t, locale } = useIdioma();
  const { points, pointsPerDollar, expiryMonths, nextExpiry, expiringSoon, loading,
          redeemRate, minRedeem, valorEnDinero } = useLoyalty();

  // Próximo vencimiento REAL (del lote que vence primero). Si no hay puntos, "—".
  const venceStr = nextExpiry
    ? new Date(nextExpiry).toLocaleDateString(locale, { day: '2-digit', month: '2-digit', year: 'numeric' })
    : '—';

  const puntosPorDolar = pointsPerDollar === 1 ? t('punto') : t('puntos');

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6" style={{ color: c.textPrimary }}>{t('Puntos de fidelidad')}</h1>

      {/* ── Tarjeta de fidelidad ── */}
      <div
        className="rounded-2xl p-6 mb-4 relative overflow-hidden text-white"
        style={{ background: `linear-gradient(130deg, ${c.primary} 0%, ${c.accent} 55%, ${c.primaryHover} 100%)` }}
      >
        <div
          className="absolute right-7 top-1/2 -translate-y-1/2 w-24 h-24 rounded-xl flex flex-col items-center justify-center"
          style={{ backgroundColor: 'rgba(255,255,255,0.18)' }}
        >
          <div className="w-2 h-2 rounded-full mb-1" style={{ backgroundColor: 'rgba(255,255,255,0.6)' }} />
          {/* El nombre sale de los ajustes, no del codigo. Ver MarcaTienda. */}
          <div className="font-extrabold text-xs text-center leading-tight">
            {ajustes.nombreLinea1}
            {ajustes.nombreLinea2 && <><br />{ajustes.nombreLinea2}</>}
          </div>
        </div>

        <div className="relative z-10">
          <div className="text-xl font-bold">{user?.fullName || t('Cliente')}</div>
          <div className="text-sm opacity-80 mt-1 flex items-center gap-1">
            <Star className="w-4 h-4" /> {t('{n} puntos disponibles', { n: loading ? '…' : points })}
          </div>
        </div>

        <div className="relative z-10 mt-6">
          {/* Lo que de verdad le importa al cliente: cuánto valen sus puntos */}
          <div className="text-lg font-bold">
            {t('Valen {monto} en tu próxima compra', { monto: `$${valorEnDinero.toFixed(2)}` })}
          </div>
          <div className="text-sm opacity-90 mt-1">
            {t('Ganas {n} {puntos} por cada $1 que gastas.', { n: pointsPerDollar, puntos: puntosPorDolar })}
          </div>
          <div className="text-sm opacity-80 mt-1">
            {t('Próximo vencimiento:')} <strong>{venceStr}</strong>
          </div>
        </div>
      </div>

      {/* Aviso de puntos que vencen pronto (30 días) */}
      {expiringSoon > 0 && (
        <div
          className="flex items-center gap-2 rounded-xl px-4 py-3 mb-8 text-sm"
          style={{ backgroundColor: 'rgba(217,119,6,.12)', color: 'var(--aviso-vivo)' }}
        >
          <AlertTriangle className="w-4 h-4 flex-none" />
          <span>{t('Tienes')} <strong>{t('{n} puntos', { n: expiringSoon })}</strong> {t('que vencen en los próximos 30 días. ¡Aprovéchalos!')}</span>
        </div>
      )}

      {/* ── Preguntas frecuentes (reflejan la config real) ── */}
      <div className="flex flex-col gap-5">
        <div>
          <div className="text-sm font-bold mb-1" style={{ color: c.textPrimary }}>{t('¿Cómo consigo puntos?')}</div>
          <div className="text-sm leading-relaxed" style={{ color: c.textSecondary }}>
            {t('Por cada $1 que gastas en la tienda ganas {n} {puntos}. Se acumulan automáticamente con cada compra que haces.', { n: pointsPerDollar, puntos: puntosPorDolar })}
          </div>
        </div>
        <div>
          <div className="text-sm font-bold mb-1" style={{ color: c.textPrimary }}>{t('¿Cómo los uso?')}</div>
          <div className="text-sm leading-relaxed" style={{ color: c.textSecondary }}>
            {t('Cada {n} puntos equivalen a $1 de descuento. Al pagar tu compra en la tienda podrás elegir usarlos (necesitas al menos {minimo} puntos).', { n: redeemRate, minimo: minRedeem })}
          </div>
        </div>
        <div>
          <div className="text-sm font-bold mb-1" style={{ color: c.textPrimary }}>{t('¿Cuándo vencen?')}</div>
          <div className="text-sm leading-relaxed" style={{ color: c.textSecondary }}>
            {t('Los puntos de cada compra vencen a los {n} meses de haberlos ganado. Arriba ves la fecha del lote que vence primero.', { n: expiryMonths })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PuntosFidelidad;

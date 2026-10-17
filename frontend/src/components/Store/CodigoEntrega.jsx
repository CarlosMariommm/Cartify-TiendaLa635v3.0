import { ShieldCheck, Store as StoreFront, Bike } from 'lucide-react';
import { useTheme } from '../../hooks/useClientTheme';
import { useIdioma } from '../../hooks/useIdioma';

// EL CÓDIGO DE ENTREGA — CodigoEntrega.jsx
// Los cuatro dígitos que el cliente dicta al recibir su pedido. En el mostrador, igual.
const CodigoEntrega = ({ codigo, deliveryType, estado, compacto = false, enBurbuja = false }) => {
  const { palette } = useTheme();
  const c = palette.colors;
  const { t } = useIdioma();

  // Sin código no se pinta nada. Pasa en los pedidos anteriores a esta función, que se quedaron sin
  // uno: mejor que no aparezca la tarjeta a que aparezca vacía y el cliente crea que se le perdió
  // algo.
  if (!codigo) return null;

  // Ya entregado o cancelado: el código cumplió (o ya no aplica).
  if (estado === 'entregado' || estado === 'cancelado') return null;

  const esDomicilio = deliveryType === 'delivery';
  const Icono = esDomicilio ? Bike : StoreFront;

  const explicacion = esDomicilio
    ? t('Díselos a quien te entregue el pedido en la puerta.')
    : t('Díselos en el mostrador al recoger tu pedido.');

  // Los dígitos, separados. Un "0451" de corrido se lee mal en un teléfono a
  // contraluz; separados se dictan de un vistazo.
  const digitos = String(codigo).split('');

  if (compacto) {
    return (
      <div className="flex items-center gap-2">
        <ShieldCheck className="w-3.5 h-3.5" style={{ color: 'var(--marca-texto)' }} />
        <span className="text-xs" style={{ color: c.textMuted }}>{t('Código de entrega')}</span>
        <span
          className="text-sm font-bold tracking-[0.2em]"
          style={{ color: c.textPrimary }}
        >
          {codigo}
        </span>
      </div>
    );
  }

  // SIN RECUADRO. Ahora va directo sobre lo que tenga debajo. En las páginas lo separa de lo de
  // arriba una línea fina; en la burbuja no hace falta, porque arriba ya está el encabezado. Lo que
  // salta a la vista son los dígitos: grandes, sobre un tono suave de la marca y sin bordes.
  return (
    <div
      className={enBurbuja ? 'px-3.5 pt-4' : 'mt-6 pt-5'}
      style={enBurbuja ? undefined : { borderTop: `1px solid ${c.cardBorder}` }}
    >
      <div className="flex items-center gap-2 mb-3">
        <ShieldCheck className="w-4 h-4" style={{ color: 'var(--marca-texto)' }} />
        <span className="text-sm font-bold" style={{ color: c.textPrimary }}>
          {t('Tu código de entrega')}
        </span>
      </div>

      <div className="flex items-center gap-2 mb-3">
        {digitos.map((d, i) => (
          <span
            key={i}
            className="flex items-center justify-center rounded-xl font-extrabold tabular-nums"
            style={{
              width: 48,
              height: 58,
              fontSize: 28,
              color: c.textPrimary,
              background: 'var(--marca-50)',
            }}
          >
            {d}
          </span>
        ))}
      </div>

      <div className="flex items-start gap-2">
        <Icono className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: c.textMuted }} />
        <p className="text-xs leading-relaxed" style={{ color: c.textSecondary }}>
          {explicacion}{' '}
          <span style={{ color: c.textMuted }}>
            {t('Nadie de la tienda lo ve en su pantalla: te lo tienen que pedir a ti.')}
          </span>
        </p>
      </div>
    </div>
  );
};

export default CodigoEntrega;

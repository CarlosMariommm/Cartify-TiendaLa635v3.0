import { useTheme } from '../../hooks/useClientTheme';
import { useNotifications } from '../../hooks/useNotifications';
import { CargandoMascota } from '../../components/UI/Mascota';
import { useIdioma } from '../../hooks/useIdioma';

/*
 * Notificaciones — el cliente elige qué le avisamos y por dónde (área "Mi
 * Cuenta"). Cada aviso tiene su interruptor en la app (el teléfono) y, si lo
 * hay, por correo: apagar uno no toca al otro. Es la misma lista que la de
 * la app (movil/src/pages/cuenta/Notificaciones.js): escriben en el mismo
 * documento. La lógica vive en useNotifications.
 */

// Interruptor tipo "switch" reutilizable, temeable.
const Toggle = ({ on, onClick, colors, label }) => (
  <button
    onClick={onClick}
    role="switch"
    aria-checked={on}
    aria-label={label}
    className="relative w-11 h-6 rounded-full transition-colors flex-none"
    style={{ backgroundColor: on ? colors.primary : colors.cardBorder }}
  >
    {/* Movemos con transform (GPU), no con `left` — que obliga a recalcular layout. */}
    <span
      className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white"
      style={{
        transform: on ? 'translateX(20px)' : 'translateX(0)',
        transition: 'transform var(--dur-press) var(--ease-out)',
      }}
    />
  </button>
);

/*
 * `app`: la clave en avisosApp. `correo`: la de notificationPrefs, solo si ese
 * aviso también sale por correo. "Sale o está listo" usa `pedidoCerca`, el
 * correo de siempre de "tu pedido va en camino".
 */
const GRUPOS = [
  {
    titulo: 'Ofertas y novedades',
    avisos: [
      { app: 'promociones', correo: 'promociones', titulo: 'Promociones nuevas', sub: 'Ofertas y descuentos de la tienda.' },
      { app: 'favoritosEnOferta', titulo: 'Mis favoritos en oferta', sub: 'Cuando algo que guardaste en favoritos entra en una promoción.' },
      { app: 'nuevosProductos', correo: 'nuevosProductos', titulo: 'Productos nuevos', sub: 'Cuando llegan productos a la tienda.' },
    ],
  },
  {
    titulo: 'Tu pedido',
    avisos: [
      { app: 'pedidoPreparando', titulo: 'Lo empiezan a preparar', sub: 'Cuando la tienda junta tus productos.' },
      { app: 'pedidoListo', correo: 'pedidoCerca', titulo: 'Sale o está listo para recoger', sub: 'El correo es solo cuando sale a domicilio.' },
      { app: 'pedidoEntregado', titulo: 'Cuando te llega', sub: 'Solo en pedidos a domicilio.' },
      { app: 'pedidoCancelado', titulo: 'Si se cancela', sub: 'El correo con el motivo te llega siempre.' },
    ],
  },
];

const Notificaciones = () => {
  const { palette } = useTheme();
  const c = palette.colors;
  const { prefs, loading, toggle } = useNotifications();
  const { t } = useIdioma();

  // Las dos columnas de interruptores, del mismo ancho que su título.
  const columna = 'w-14 flex justify-center';

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2" style={{ color: c.textPrimary }}>{t('Notificaciones')}</h1>
      <p className="text-sm mb-6" style={{ color: c.textSecondary }}>
        {t('Elige qué te avisamos y por dónde: en la app del teléfono o por correo.')}
      </p>

      {loading ? (
        <CargandoMascota texto={t('Cargando tus preferencias…')} />
      ) : (
        <div className="flex flex-col gap-8">
          {GRUPOS.map((grupo) => (
            <section key={grupo.titulo}>
              <div className="flex items-end gap-4 pb-2">
                <h2 className="flex-1 text-base font-bold" style={{ color: c.textPrimary }}>{t(grupo.titulo)}</h2>
                <span className={`${columna} text-xs font-semibold`} style={{ color: c.textSecondary }}>{t('App')}</span>
                <span className={`${columna} text-xs font-semibold`} style={{ color: c.textSecondary }}>{t('Correo')}</span>
              </div>

              {grupo.avisos.map((aviso) => {
                const titulo = t(aviso.titulo);
                return (
                  <div
                    key={aviso.app}
                    className="flex items-center gap-4 py-3"
                    style={{ borderTop: `1px solid ${c.cardBorder}` }}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold" style={{ color: c.textPrimary }}>{titulo}</div>
                      <div className="text-xs mt-0.5" style={{ color: c.textSecondary }}>{t(aviso.sub)}</div>
                    </div>
                    <div className={columna}>
                      <Toggle
                        on={!!prefs.app[aviso.app]}
                        onClick={() => toggle('app', aviso.app)}
                        colors={c}
                        label={t('{aviso}, en la app', { aviso: titulo })}
                      />
                    </div>
                    <div className={columna}>
                      {aviso.correo && (
                        <Toggle
                          on={!!prefs.correo[aviso.correo]}
                          onClick={() => toggle('correo', aviso.correo)}
                          colors={c}
                          label={t('{aviso}, por correo', { aviso: titulo })}
                        />
                      )}
                    </div>
                  </div>
                );
              })}
            </section>
          ))}
        </div>
      )}
    </div>
  );
};

export default Notificaciones;

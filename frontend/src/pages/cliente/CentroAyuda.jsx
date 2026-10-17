import { HelpCircle, MapPin, MessageCircle } from 'lucide-react';
import { useTheme } from '../../hooks/useClientTheme';
import { useCentroAyuda } from '../../hooks/useCentroAyuda';
import { useIdioma } from '../../hooks/useIdioma';

// CentroAyuda — preguntas frecuentes y los canales REALES de la tienda. Qué se puede ofrecer lo
// decide useCentroAyuda; aquí solo se pinta.

// El tipo de canal manda el icono: la lista viene del hook sin saber de dibujos.
const ICONOS = { whatsapp: MessageCircle, direccion: MapPin };

const CentroAyuda = () => {
  const { palette } = useTheme();
  const c = palette.colors;
  const { faqs, canales } = useCentroAyuda();
  const { t } = useIdioma();

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6" style={{ color: c.textPrimary }}>{t('Centro de ayuda')}</h1>

      {/* Canales de contacto. Si no hay ninguno configurado no se pinta nada: más vale un centro de ayuda
         sin bloque de contacto que uno con un número que no contesta. */}
      {canales.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
          {canales.map((canal) => {
            const Icon = ICONOS[canal.tipo] || HelpCircle;
            const contenido = (
              <>
                <Icon className="w-5 h-5 flex-none" style={{ color: c.primary }} />
                <div>
                  <div className="text-xs" style={{ color: c.textMuted }}>{canal.etiqueta}</div>
                  <div className="text-sm font-semibold" style={{ color: c.textPrimary }}>{canal.valor}</div>
                </div>
              </>
            );
            const estilo = { backgroundColor: c.cardBg, border: `1px solid ${c.cardBorder}` };
            const clases = 'p-4 rounded-xl flex items-center gap-3';

            // Solo lo que lleva a algún lado se comporta como enlace; la
            // dirección se lee, no se toca.
            return canal.enlace ? (
              <a
                key={canal.tipo}
                href={canal.enlace}
                target="_blank"
                rel="noopener noreferrer"
                className={`${clases} transition-transform hover:-translate-y-0.5`}
                style={estilo}
              >
                {contenido}
              </a>
            ) : (
              <div key={canal.tipo} className={clases} style={estilo}>
                {contenido}
              </div>
            );
          })}
        </div>
      )}

      {/* Preguntas frecuentes */}
      <div className="flex items-center gap-2 mb-3">
        <HelpCircle className="w-5 h-5" style={{ color: c.primary }} />
        <h2 className="text-base font-bold" style={{ color: c.textPrimary }}>{t('Preguntas frecuentes')}</h2>
      </div>
      <div className="flex flex-col gap-5">
        {faqs.map((faq, i) => (
          <div key={i}>
            <div className="text-sm font-bold mb-1" style={{ color: c.textPrimary }}>{faq.q}</div>
            <div className="text-sm leading-relaxed" style={{ color: c.textSecondary }}>{faq.a}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CentroAyuda;

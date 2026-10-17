import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Nfc } from 'lucide-react';
import MarcaTarjeta from './MarcaTarjeta';
import { useIdioma } from '../../hooks/useIdioma';
import { detectarMarca, formatearNumero, largoDe, soloDigitos } from '../../utils/tarjetas';

// La tarjeta de plástico, dibujada mientras se llenan los datos: el número aparece dígito a
// dígito, el nombre y el vencimiento en su lugar, y el color cambia con la marca apenas se
// reconoce por los primeros dígitos.

const FONDOS = {
  visa: 'linear-gradient(135deg, #1A1F71 0%, #2A3AA8 55%, #0B1447 100%)',
  mastercard: 'linear-gradient(135deg, #1C1C1C 0%, #3B2A1C 60%, #111 100%)',
  amex: 'linear-gradient(135deg, #1F6FB2 0%, #2E9FD8 55%, #155A93 100%)',
  discover: 'linear-gradient(135deg, #2B2B2B 0%, #4A4A4A 60%, #1F1F1F 100%)',
  otra: 'linear-gradient(135deg, var(--marca-700) 0%, var(--marca-600) 55%, var(--acento) 140%)',
};

// Los dígitos escritos, y puntos donde todavía faltan.
const numeroParaMostrar = (numero) => {
  const marca = detectarMarca(numero);
  const d = soloDigitos(numero);
  const relleno = d + '•'.repeat(Math.max(0, largoDe(marca) - d.length));
  // formatearNumero agrupa dígitos; con los puntos se agrupa a mano igual.
  const grupos = marca === 'amex' ? [4, 6, 5] : [4, 4, 4, 4];
  let i = 0;
  return grupos.map((g) => { const p = relleno.slice(i, i + g); i += g; return p; }).join(' ') || formatearNumero(numero);
};

const VistaTarjeta = ({ numero = '', titular = '', vencimiento = '', tipo = '' }) => {
  const reducir = useReducedMotion();
  const { t } = useIdioma();
  const marca = detectarMarca(numero);

  return (
    <div
      aria-hidden="true"
      style={{
        position: 'relative',
        width: '100%',
        maxWidth: 340,
        aspectRatio: '1.586',
        borderRadius: 18,
        overflow: 'hidden',
        color: '#fff',
        boxShadow: '0 24px 48px -20px rgba(0, 26, 41, 0.55)',
        fontFamily: 'inherit',
      }}
    >
      {/* El color de la marca, con fundido al cambiar. */}
      <AnimatePresence initial={false}>
        <motion.div
          key={marca}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reducir ? 0 : 0.35 }}
          style={{ position: 'absolute', inset: 0, background: FONDOS[marca] }}
        />
      </AnimatePresence>
      {/* Brillo diagonal y los círculos de fondo, como en una tarjeta real. */}
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(115deg, transparent 30%, rgba(255,255,255,.14) 45%, transparent 60%)' }} />
      <div style={{ position: 'absolute', width: 260, height: 260, right: -90, bottom: -140, borderRadius: '50%', border: '36px solid rgba(255,255,255,.06)' }} />

      <div style={{ position: 'relative', height: '100%', padding: '18px 20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ width: 40, height: 30, borderRadius: 6, background: 'linear-gradient(135deg, #F4DD9B, #C9A44C)', boxShadow: 'inset 0 0 0 1px rgba(0,0,0,.12)' }} />
            <Nfc size={20} style={{ opacity: 0.85 }} />
          </div>
          <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', opacity: 0.85 }}>
            {tipo === 'debito' ? t('Débito') : tipo === 'credito' ? t('Crédito') : ''}
          </span>
        </div>

        <div style={{ fontFamily: 'ui-monospace, "Cascadia Mono", Consolas, monospace', fontSize: 'clamp(15px, 4.6vw, 20px)', letterSpacing: '0.08em', textShadow: '0 1px 2px rgba(0,0,0,.25)' }}>
          {numeroParaMostrar(numero)}
        </div>

        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', opacity: 0.7 }}>{t('Titular')}</div>
            <div style={{ fontSize: 13, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {titular.trim() || t('Nombre en la tarjeta')}
            </div>
          </div>
          <div style={{ flex: 'none' }}>
            <div style={{ fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', opacity: 0.7 }}>{t('Vence')}</div>
            <div style={{ fontSize: 13, fontWeight: 600, fontFamily: 'ui-monospace, "Cascadia Mono", Consolas, monospace' }}>
              {vencimiento || t('MM/AA')}
            </div>
          </div>
          <MarcaTarjeta marca={marca} sobreColor alto={34} />
        </div>
      </div>
    </div>
  );
};

export default VistaTarjeta;

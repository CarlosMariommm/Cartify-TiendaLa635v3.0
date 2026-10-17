import { AlertTriangle, Bike, Check, Heart, HeartOff, Info, Trash2, X } from 'lucide-react';

// LOS ICONOS DE LOS AVISOS — iconosAviso.jsx
// El círculo a la izquierda de la píldora (components/UI/PildoraAviso.jsx).

// El círculo. Con `fondo` es de color y el icono va en blanco; sin él es un círculo tenue del
// mismo color que el texto, que sirve igual sobre la píldora oscura que sobre la clara del modo
// oscuro.
const circulo = (hijos, fondo) => (
  <span
    aria-hidden="true"
    style={{
      width: 24,
      height: 24,
      borderRadius: '50%',
      background: fondo || 'color-mix(in srgb, currentColor 18%, transparent)',
      color: fondo ? '#fff' : 'inherit',
      display: 'grid',
      placeItems: 'center',
      flex: 'none',
      fontSize: 14,
      lineHeight: 1,
    }}
  >
    {hijos}
  </span>
);

// Colores de estado, no de marca: no cambian con la paleta, y los tres pasan
// 3:1 contra la píldora oscura y contra la clara.
const VERDE = '#16A34A';
const ROJO = '#DC2626';
const NARANJA = '#C2410C';

export const ICONOS = {
  exito: circulo(<Check size={15} strokeWidth={3} />, VERDE),
  error: circulo(<X size={15} strokeWidth={3} />, ROJO),
  atencion: circulo(<AlertTriangle size={14} strokeWidth={2.5} />, NARANJA),
  info: circulo(<Info size={15} strokeWidth={2.5} />),
  quitar: circulo(<Trash2 size={14} strokeWidth={2.5} />),
  favorito: circulo(<Heart size={13} strokeWidth={3} fill="currentColor" />, ROJO),
  sinFavorito: circulo(<HeartOff size={14} strokeWidth={2.5} />),
  reparto: circulo(<Bike size={15} strokeWidth={2.5} />),
  cargando: circulo(
    <span
      className="animate-spin"
      style={{ width: 13, height: 13, borderRadius: '50%', border: '2px solid currentColor', borderTopColor: 'transparent' }}
    />
  ),
};

// Un emoji suelto ("🎉") que alguien pase en `icon`, dentro del círculo tenue.
export const iconoConEmoji = (emoji) => circulo(emoji);

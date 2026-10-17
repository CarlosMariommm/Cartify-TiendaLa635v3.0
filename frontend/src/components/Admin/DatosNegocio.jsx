import { useId, useState } from 'react';

// DATOS DEL NEGOCIO — DatosNegocio.jsx
// Quién es el responsable de la tienda y cómo se le contacta: lo que citan las páginas legales
// (privacidad, términos, devoluciones) y el pie de página. Vive en Personalización → Identidad.

const CAMPOS = [
  {
    clave: 'titular',
    etiqueta: 'Titular o razón social',
    ayuda: 'El nombre de la persona dueña del negocio o de la sociedad. Es quien responde por los datos de los clientes.',
    autoComplete: 'organization',
    max: 120,
  },
  { clave: 'nit', etiqueta: 'NIT', ayuda: 'Números y guiones.', inputMode: 'numeric', max: 20, placeholder: '0614-000000-000-0' },
  { clave: 'nrc', etiqueta: 'NRC', ayuda: 'Si el negocio está inscrito como contribuyente de IVA.', inputMode: 'numeric', max: 20 },
  { clave: 'correo', etiqueta: 'Correo de contacto', ayuda: 'A donde escriben los clientes para dudas, reclamos o sus datos personales.', tipo: 'email', autoComplete: 'email', max: 120 },
  { clave: 'telefono', etiqueta: 'Teléfono', tipo: 'tel', autoComplete: 'tel', max: 20, placeholder: '2222-0000' },
  { clave: 'whatsapp', etiqueta: 'WhatsApp', ayuda: 'Con código de país si es de fuera: +503 7000-0000.', tipo: 'tel', max: 20 },
  { clave: 'horario', etiqueta: 'Horario de atención', ayuda: 'Tal como lo diría en la puerta: "Lunes a sábado de 7:00 a. m. a 8:00 p. m.".', max: 160 },
];

const VACIO = Object.fromEntries(CAMPOS.map((c) => [c.clave, '']));

// El formulario arranca con lo guardado. Quien lo monta le pone como `key` los datos guardados,
// así que cuando llegan del servidor (o se guardan) se vuelve a montar con los valores nuevos, sin
// copiarlos en un efecto.
const DatosNegocio = ({ negocio = {}, guardar, guardando, estiloTarjeta, estiloCampo }) => {
  const id = useId();
  const [form, setForm] = useState(() => ({
    ...VACIO,
    ...Object.fromEntries(CAMPOS.map((c) => [c.clave, negocio[c.clave] || ''])),
  }));

  const onSubmit = (e) => {
    e.preventDefault();
    guardar({ negocio: form });
  };

  return (
    <form onSubmit={onSubmit} className="p-6 rounded-2xl shadow-sm border space-y-5" style={estiloTarjeta} aria-labelledby={`${id}-titulo`}>
      <div>
        <h2 id={`${id}-titulo`} className="text-lg font-bold" style={{ color: 'var(--theme-text-primary)' }}>
          Datos del negocio
        </h2>
        <p className="text-xs mt-0.5" style={{ color: 'var(--theme-text-secondary)' }}>
          Salen en el pie de la tienda y en las páginas de privacidad, términos y devoluciones.
          Lo que deje vacío no se muestra.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {CAMPOS.map((c) => (
          <div key={c.clave} className={`space-y-1.5 ${c.clave === 'titular' || c.clave === 'horario' ? 'sm:col-span-2' : ''}`}>
            <label htmlFor={`${id}-${c.clave}`} className="block text-sm font-bold" style={{ color: 'var(--theme-text-primary)' }}>
              {c.etiqueta}
            </label>
            {c.ayuda && (
              <p id={`${id}-${c.clave}-ayuda`} className="text-xs" style={{ color: 'var(--theme-text-secondary)' }}>
                {c.ayuda}
              </p>
            )}
            <input
              id={`${id}-${c.clave}`}
              type={c.tipo || 'text'}
              inputMode={c.inputMode}
              autoComplete={c.autoComplete || 'off'}
              maxLength={c.max}
              placeholder={c.placeholder}
              aria-describedby={c.ayuda ? `${id}-${c.clave}-ayuda` : undefined}
              value={form[c.clave]}
              onChange={(e) => setForm({ ...form, [c.clave]: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl border outline-none"
              style={estiloCampo}
            />
          </div>
        ))}
      </div>

      <button
        type="submit"
        disabled={guardando}
        className="px-8 py-2.5 rounded-full font-bold shadow-sm transition-colors disabled:opacity-60"
        style={{ backgroundColor: 'var(--theme-primary)', color: 'var(--theme-button-text)' }}
      >
        {guardando ? 'Guardando…' : 'Guardar datos del negocio'}
      </button>
    </form>
  );
};

export default DatosNegocio;

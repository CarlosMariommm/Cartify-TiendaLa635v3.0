import { Minus, Plus, X, Maximize, RotateCcw, Play } from 'lucide-react';

// EL PANEL DEL OPERADOR — PanelOperador.jsx
// Lo que maneja quien atiende el stand, escondido de los visitantes: se abre tocando 5 veces
// seguidas el nombre de arriba a la izquierda.

const TIEMPOS = [
  { valor: 20, texto: '20 s' },
  { valor: 30, texto: '30 s' },
  { valor: 45, texto: '45 s' },
  { valor: 0, texto: 'Sin tiempo' },
];

const Fila = ({ titulo, detalle, children }) => (
  <div className="flex flex-wrap items-center justify-between gap-4 py-4" style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}>
    <div className="min-w-0">
      <div className="text-base font-semibold">{titulo}</div>
      {detalle && <div className="text-sm mt-0.5" style={{ color: 'rgba(255,255,255,0.55)' }}>{detalle}</div>}
    </div>
    <div className="flex items-center gap-2">{children}</div>
  </div>
);

const Boton = ({ children, activo, ...props }) => (
  <button
    type="button"
    className="h-10 min-w-10 px-3 rounded-full text-sm font-semibold flex items-center justify-center gap-1.5 transition-colors disabled:opacity-40"
    style={activo
      ? { background: '#FFFFFF', color: '#001a29' }
      : { background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.16)' }}
    {...props}
  >
    {children}
  </button>
);

// Un número con − y +, que también se puede escribir: con 60 dulces, llegar a punta de "+" sería
// eterno. Borrarlo todo cuenta como 0 mientras se escribe el nuevo.
const Contador = ({ valor, alCambiar, min, max, paso = 1, sufijo = '', etiqueta }) => {
  const poner = (v) => alCambiar(Math.min(max, Math.max(min, v)));
  return (
    <>
      <Boton aria-label={`Menos ${etiqueta}`} onClick={() => poner(valor - paso)} disabled={valor <= min}><Minus className="w-4 h-4" /></Boton>
      <label className="flex items-baseline justify-center gap-0.5 w-20">
        <span className="sr-only">{etiqueta}</span>
        <input
          type="number"
          inputMode="numeric"
          min={min}
          max={max}
          value={valor}
          onChange={(e) => {
            const v = e.target.value === '' ? 0 : Math.round(Number(e.target.value));
            if (Number.isFinite(v)) poner(v);
          }}
          onFocus={(e) => e.target.select()}
          className="juego-numero w-full bg-transparent text-center text-2xl font-bold tabular-nums outline-none border-b-2 border-transparent focus:border-[#009AEB]"
        />
        {sufijo && <span className="text-xl font-bold">{sufijo}</span>}
      </label>
      <Boton aria-label={`Más ${etiqueta}`} onClick={() => poner(valor + paso)} disabled={valor >= max}><Plus className="w-4 h-4" /></Boton>
    </>
  );
};

// Cómo se lee la probabilidad: "14 %" y "1 de cada 7".
const enPalabras = (pct) => {
  const redondo = pct < 10 ? Math.round(pct * 10) / 10 : Math.round(pct);
  return { porcentaje: `${redondo} %`, cadaCuantos: Math.max(1, Math.round(100 / pct)) };
};

// La parte de los premios: cuántos quedan de cada uno y, de ahí, cada cuánto sale el secreto. En
// automático la probabilidad es la de sacar un secreto de la bolsa de premios que quedan
// (utils/juegoTiqui.js → probabilidadSecreta), así que se mueve sola con cada premio entregado.
const Premios = ({ ajustes, probabilidad, cambiarAjuste }) => {
  const { secretos, dulces, modo } = ajustes;
  const total = secretos + dulces;
  const { porcentaje, cadaCuantos } = enPalabras(probabilidad);
  const auto = modo === 'auto';

  let explicacion;
  if (secretos <= 0) explicacion = 'Se acabaron los premios mayores: la ruleta solo da dulces.';
  else if (!auto) explicacion = 'Fija: no cambia aunque se vayan acabando los premios.';
  else if (dulces <= 0) explicacion = `Sin dulces, el premio mayor queda en ${porcentaje}, lo máximo: súmale los dulces que tengas.`;
  else if (probabilidad <= 1 && (100 * secretos) / total < 1) explicacion = `${secretos} de ${total} premios daría menos de 1 %: queda en 1 % para que la porción se vea.`;
  else explicacion = `${secretos} premios mayores entre ${total} premios. Se ajusta sola cada vez que alguien gana.`;

  return (
    <>
      <p className="text-xs font-semibold tracking-[0.14em] uppercase pt-2 pb-1" style={{ color: '#6fb3d9' }}>Premios</p>

      <Fila
        titulo="Premios mayores que quedan"
        detalle={secretos > 0 ? 'Cada vez que sale uno, baja solo.' : 'Agotados: la ruleta solo da dulces.'}
      >
        <Contador etiqueta="premios mayores" valor={secretos} min={0} max={999} alCambiar={(v) => cambiarAjuste('secretos', v)} />
      </Fila>

      <Fila
        titulo="Dulces que quedan"
        detalle={dulces > 0 ? 'Cada vez que sale uno, baja solo.' : 'Se acabaron: súmale los que tengas.'}
      >
        <Contador etiqueta="dulces" valor={dulces} min={0} max={9999} alCambiar={(v) => cambiarAjuste('dulces', v)} />
      </Fila>

      <Fila titulo="Probabilidad del premio mayor" detalle={auto ? 'Sale de cuántos premios quedan.' : 'La eliges tú.'}>
        <Boton activo={auto} onClick={() => cambiarAjuste('modo', 'auto')}>Según los premios</Boton>
        <Boton activo={!auto} onClick={() => cambiarAjuste('modo', 'fija')}>Fija</Boton>
      </Fila>

      {!auto && (
        <Fila titulo="Probabilidad fija">
          <Contador etiqueta="por ciento" valor={ajustes.porcentaje} min={1} max={50} paso={5} sufijo="%" alCambiar={(v) => cambiarAjuste('porcentaje', v)} />
        </Fila>
      )}

      {/* El resultado, en grande: lo que de verdad va a pasar en la ruleta. */}
      <div className="flex flex-wrap items-end gap-x-6 gap-y-2 pb-5 pt-1">
        <div>
          <div className="text-5xl font-extrabold tabular-nums" style={{ color: secretos > 0 ? '#FFC23D' : 'rgba(255,255,255,0.35)' }}>
            {secretos > 0 ? porcentaje : '0 %'}
          </div>
          <div className="text-sm" style={{ color: 'rgba(255,255,255,0.55)' }}>de probabilidad del premio mayor</div>
        </div>
        {secretos > 0 && (
          <div className="pb-1">
            <div className="text-xl font-bold">1 de cada {cadaCuantos}</div>
            <div className="text-sm" style={{ color: 'rgba(255,255,255,0.55)' }}>de los que llegan a la ruleta</div>
          </div>
        )}
        <p className="basis-full text-sm" style={{ color: 'rgba(255,255,255,0.7)' }}>{explicacion}</p>
      </div>
    </>
  );
};

const PanelOperador = ({
  ajustes, probabilidad, contadores, grabadas, totalDeFrases,
  cambiarAjuste, reiniciarContadores, probarRuleta, pantallaCompleta, alCerrar,
}) => (
  <div
    className="fixed inset-0 z-[10060] overflow-y-auto text-white"
    style={{ background: 'rgba(0, 8, 14, 0.94)', backdropFilter: 'blur(6px)' }}
    role="dialog"
    aria-modal="true"
    aria-label="Panel del operador"
  >
    <div className="mx-auto w-full max-w-2xl px-5 py-10">
      <div className="flex items-center justify-between gap-4 mb-6">
        <div>
          <p className="text-xs font-semibold tracking-[0.14em] uppercase" style={{ color: '#6fb3d9' }}>Solo para el stand</p>
          <h2 className="text-3xl font-bold mt-1">Panel del operador</h2>
        </div>
        <Boton onClick={alCerrar} activo><X className="w-4 h-4" /> Cerrar</Boton>
      </div>

      <Premios ajustes={ajustes} probabilidad={probabilidad} cambiarAjuste={cambiarAjuste} />

      <p className="text-xs font-semibold tracking-[0.14em] uppercase pt-4 pb-1" style={{ color: '#6fb3d9' }}>Juego</p>

      <Fila titulo="Tiempo por pregunta">
        {TIEMPOS.map((t) => (
          <Boton key={t.valor} activo={ajustes.segundos === t.valor} onClick={() => cambiarAjuste('segundos', t.valor)}>{t.texto}</Boton>
        ))}
      </Fila>

      <Fila
        titulo="Voz de Tiqui"
        detalle={grabadas == null
          ? 'Cargando sus audios…'
          : grabadas === totalDeFrases
            ? `Grabada: ${grabadas} de ${totalDeFrases} frases, funciona sin internet.`
            : `Grabadas ${grabadas} de ${totalDeFrases} frases; lo demás lo dice la voz del navegador.`}
      >
        <Boton activo={ajustes.voz} onClick={() => cambiarAjuste('voz', true)}>Encendida</Boton>
        <Boton activo={!ajustes.voz} onClick={() => cambiarAjuste('voz', false)}>Apagada</Boton>
      </Fila>

      <Fila titulo="Música de fondo" detalle="Alegre en el inicio y la ruleta, de suspenso en las preguntas. Baja sola cuando Tiqui habla.">
        <Boton activo={ajustes.musica} onClick={() => cambiarAjuste('musica', true)}>Encendida</Boton>
        <Boton activo={!ajustes.musica} onClick={() => cambiarAjuste('musica', false)}>Apagada</Boton>
      </Fila>

      <Fila titulo="Efectos de sonido" detalle="Toques, acierto, error, el reloj, el redoble de la ruleta, aplausos y fanfarrias.">
        <Boton activo={ajustes.sonidos} onClick={() => cambiarAjuste('sonidos', true)}>Encendidos</Boton>
        <Boton activo={!ajustes.sonidos} onClick={() => cambiarAjuste('sonidos', false)}>Apagados</Boton>
      </Fila>

      <Fila titulo="Hoy" detalle="Se reinicia solo cada día.">
        <Boton onClick={reiniciarContadores}><RotateCcw className="w-4 h-4" /> Reiniciar</Boton>
      </Fila>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pb-4">
        {[
          ['Jugaron', contadores.jugaron],
          ['Llegaron a la ruleta', contadores.ruleta],
          ['Dulces', contadores.dulces],
          ['Premios mayores', contadores.secretos],
        ].map(([texto, n]) => (
          <div key={texto}>
            <div className="text-3xl font-bold tabular-nums">{n}</div>
            <div className="text-sm" style={{ color: 'rgba(255,255,255,0.55)' }}>{texto}</div>
          </div>
        ))}
      </div>

      <Fila titulo="Probar la ruleta" detalle="Un giro que no cuenta ni gasta premios.">
        <Boton onClick={probarRuleta}><Play className="w-4 h-4" /> Probar</Boton>
      </Fila>

      <Fila titulo="Pantalla completa" detalle="Para salir: tecla Esc.">
        <Boton onClick={pantallaCompleta}><Maximize className="w-4 h-4" /> Activar</Boton>
      </Fila>
    </div>
  </div>
);

export default PanelOperador;

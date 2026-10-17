import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Mic, X, ShoppingCart, Volume2, VolumeX, Minimize2, QrCode, UserCheck, Package } from 'lucide-react';
import toast from 'react-hot-toast';
import { useVoiceAssistant } from '../../hooks/useVoiceAssistant';
import { useKiosco } from '../../hooks/useKiosco';
import { useAuth } from '../../hooks/useAuth';
import { orderService } from '../../api/orderService';
import { primerNombre } from '../../utils/nombreTiqui';
import MascotaAsistente from './MascotaAsistente';
import { foto, ANCHO } from '../../utils/fotos';
import { useIdioma } from '../../hooks/useIdioma';
import { animoDeFrase, caraDeAnimo } from '../../utils/animoTiqui';

// AsistenteVoz — pantalla grande (kiosco) del asistente por voz. Solo pinta; la lógica vive en
// useVoiceAssistant. Animaciones con la vara de Emil (ease-out fuerte, <300ms, respeta
// prefers-reduced-motion). SE LE HABLA A LA MASCOTA.
const EASE_OUT = [0.23, 1, 0.32, 1];

// La luz azul detrás de la mascota y el negro del resto, como en la landing.
const FONDO =
  'radial-gradient(900px 620px at 50% 26%, rgba(0, 92, 138, 0.38), transparent 62%), #000';

// El botón del micrófono va SIEMPRE en el azul de la casa, no en --marca-600: en diciembre esa
// variable es verde y en Halloween naranja, y un botón naranja encima de esta luz azul se ve como
// un error. La temporada ya se nota en la tienda.
const ORBE = 'radial-gradient(circle at 34% 28%, #29a3e6, #003049 68%)';

// Botones de vidrio de las esquinas.
const VIDRIO = {
  backgroundColor: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.14)',
  backdropFilter: 'blur(10px)',
  WebkitBackdropFilter: 'blur(10px)',
};

const AsistenteVoz = ({
  onClose, productos, carrito, totalCarrito,
  agregarAlCarrito, eliminarDelCarrito, actualizarCantidad, limpiarCarrito,
  categorias, irAProducto, irACategoria, irARuta, irAPromociones,
  // Abrir el pago cuando la persona confirma la compra. Lo pone la tienda en línea; sin él (o con
  // una cuenta vinculada por QR en el kiosco) se sigue pagando en caja. Ver cerrarCompra.
  irAPagar,
}) => {
  const reduce = useReducedMotion();
  const [minimizado, setMinimizado] = useState(false); // asistente en segundo plano
  const { esCliente, user } = useAuth();
  const { t } = useIdioma();

  // El nombre, para que Tiqui lo use de vez en cuando (ver nombreTiqui.js). El saludo escrito lo
  // lleva más o menos la mitad de las veces que se abre el asistente: siempre igual se vuelve
  // fórmula.
  const nombreCliente = esCliente ? primerNombre(user?.fullName) : '';
  const [saludaConNombre] = useState(() => Math.random() < 0.5);
  // Lo que dice la mascota antes de que le hablen. Va escrito y NO hablado: al abrir, el asistente
  // espera a que la persona toque (ver más abajo). En inglés avisa que por ahora entiende y habla
  // español, y deja los ejemplos en español: son justo lo que hay que decirle.
  const saludo = saludaConNombre && nombreCliente
    ? t('¡Hola, {nombre}! Soy Tiqui. Toca el botón y dime qué necesitas. Por ejemplo: “quiero dos manzanas y una leche” o “¿qué ofertas hay?”.', { nombre: nombreCliente })
    : t('¡Hola! Soy Tiqui. Toca el botón y dime qué necesitas. Por ejemplo: “quiero dos manzanas y una leche” o “¿qué ofertas hay?”.');

  // "Ya confirmó, falta abrir el pago". Se espera a que Tiqui termine la frase: abrir el pago cierra
  // el asistente, y cerrarlo a media frase la cortaba en seco.
  const [yendoAPagar, setYendoAPagar] = useState(false);
  const irAPagarRef = useRef(irAPagar);
  useEffect(() => { irAPagarRef.current = irAPagar; });

  // Hablar por referencia: cerrarCompra necesita hablar, pero se define ANTES de que exista el hook,
  // porque el hook la recibe como parámetro. El ref rompe ese huevo y gallina sin tener que partir
  // el componente en dos. Y va declarado ACÁ ARRIBA, antes del hook, no después.
  const hablarRef = useRef(null);

  const {
    activo, escuchando, muteado, transcripcion, historial, pensando, hablando,
    iniciar, detener, toggleMute, hablar, soportado, interrumpir,
    voces, vozActual, cambiarVoz, vozTiqui, sonandoTiqui, esperandoVoz,
  } = useVoiceAssistant({
    productos, carrito, totalCarrito,
    agregarAlCarrito, eliminarDelCarrito, actualizarCantidad, limpiarCarrito,
    categorias,
    nombreCliente,
    // Antes de llevar a la persona a otra pantalla, el asistente se hace a un lado (sin el fondo
    // oscuro encima), pero sigue escuchando en segundo plano.
    irAProducto: (p) => { setMinimizado(true); irAProducto?.(p); },
    irACategoria: (c) => { setMinimizado(true); irACategoria?.(c); },
    irARuta: (r) => { setMinimizado(true); irARuta?.(r); },
    irAPromociones: irAPromociones ? () => { setMinimizado(true); irAPromociones(); } : undefined,
    alConfirmarCompra: () => cerrarCompra(),
  });

  useLayoutEffect(() => { hablarRef.current = hablar; });

  // Abre el pago apenas Tiqui termina de decir que lo va a abrir (o de una, si la voz está
  // silenciada). Con tope de 8 s: si el audio se trabara, el pago se abre igual y la persona no
  // queda esperando algo que no llega.
  useEffect(() => {
    if (!yendoAPagar) return undefined;
    const reloj = setTimeout(() => irAPagarRef.current?.(), hablando ? 8000 : 0);
    return () => clearTimeout(reloj);
  }, [yendoAPagar, hablando]);

  // La cuenta del cliente, si escaneó el QR con su teléfono.
  const kiosco = useKiosco();

  // Cerrar la compra del kiosco. Con cuenta vinculada, el pedido se crea A SU NOMBRE: es lo que hace
  // que los puntos le caigan solos, porque el backend los calcula al crear el pedido. El pago sigue
  // siendo en caja, con efectivo o tarjeta — el kiosco no cobra, solo deja el pedido listo.
  const cerrarCompra = async () => {
    const cliente = kiosco.cliente;

    // En la tienda en línea, confirmar es ir a pagar: Tiqui abre el pago con la dirección y la forma
    // de pago por elegir. Sin sesión, primero lo lleva a iniciar sesión y de ahí vuelve directo al
    // pago (ver irAPagar en Store).
    if (!cliente && irAPagar) {
      setYendoAPagar(true);
      hablarRef.current?.(esCliente
        ? '¡Listo! Te abro el pago para que elijas cómo recibirlo y cómo pagar.'
        : '¡Listo! Para pagar, primero inicia sesión. Te llevo, y tu carrito te espera.');
      return;
    }

    if (!cliente) {
      hablarRef.current?.('¡Listo! Lleva tu carrito a caja y alguien de la tienda te ayuda a pagar. ¡Gracias!');
      return;
    }

    try {
      await orderService.createOrder({
        // El código es lo que le PRUEBA al servidor de quién es este pedido. El kiosco no tiene sesión —ni
        // debe tenerla: esa es toda la gracia de que el cliente escanee con su teléfono y la contraseña
        // nunca pase por la pantalla pública—.
        codigoKiosco: kiosco.codigo,
        items: carrito.map((i) => ({
          productId: i.id,
          name: i.nombre,
          price: i.precio,
          amount: i.cantidad,
        })),
        total: totalCarrito,
        paymentMethod: 'efectivo', // se define en caja; el kiosco no cobra
        paymentStatus: 'pendiente',
        deliveryType: 'retiro',
        channel: 'kiosco',
      });

      hablarRef.current?.(
        `¡Listo, ${cliente.nombre}! Tu pedido quedó a tu nombre y tus puntos ya están sumados. Pasa a caja a pagar.`
      );
      limpiarCarrito?.();
    } catch {
      // El pedido no se pudo crear: se lo decimos, no se lo inventamos.
      hablarRef.current?.('No pude registrar tu pedido. Pasa a caja y alguien de la tienda te ayuda.');
    } finally {
      // El código muere aquí, con pedido o sin él.
      kiosco.cerrar();
    }
  };

  const carritoRef = useRef(null);

  // Al abrir, el asistente NO habla solo: espera a que la persona toque el micrófono. La instrucción
  // de qué hacer ya está escrita grande en la pantalla.
  // Despertar el servidor (y preguntar si hay voz de Tiqui) lo hace el hook al abrir.
  useEffect(() => {
    toast.dismiss();
  }, []);

  // Lo último que entró al carrito queda a la vista.
  useEffect(() => {
    if (carritoRef.current) carritoRef.current.scrollTop = carritoRef.current.scrollHeight;
  }, [carrito.length]);

  const items = carrito.reduce((a, i) => a + i.cantidad, 0);

  // "Pensando" mientras la IA descifra la frase y mientras llega su voz, así el texto y la boca
  // arrancan junto con el sonido.
  const piensa = pensando || esperandoVoz;

  const estadoTexto = piensa
    ? t('Pensando…')
    : hablando ? t('Toca para interrumpirme')
    : !activo ? t('Toca para hablarme')
    : escuchando ? t('Te escucho…') : t('Un momento…');

  // Qué hace la mascota, con el mismo orden que el texto de arriba.
  const estadoMascota = piensa ? 'pensando'
    : hablando ? 'hablando'
    : escuchando ? 'escuchando' : 'reposo';

  // El último intercambio: lo que dijo la mascota y lo que dijo la persona.
  const ultimoBot = [...historial].reverse().find((m) => m.tipo !== 'user');
  const ultimoUser = [...historial].reverse().find((m) => m.tipo === 'user');

  // La cara va con el ánimo con que habló (el mismo de su voz, ver utils/animoTiqui.js). Mientras la
  // escucha o piensa, neutra: la de antes era de otra frase.
  const animo = escuchando || piensa ? 'normal' : caraDeAnimo(ultimoBot?.animo || animoDeFrase(ultimoBot?.texto));

  // Lo de la persona: en vivo mientras habla, y si no, lo último que dijo.
  const enVivo = escuchando && !!transcripcion;
  const textoPersona = enVivo ? transcripcion : ultimoUser?.texto;

  // Tocar a la mascota o al botón hace lo mismo que el orbe de antes. Si está hablando, el toque la
  // INTERRUMPE y se pone a escuchar: ya no hay que aguantarse la frase completa aunque uno ya sepa
  // qué decir.
  const alTocar = hablando ? interrumpir : activo ? detener : iniciar;
  const etiquetaToque = hablando ? t('Interrumpir y hablar') : activo ? t('Detener') : t('Empezar a hablar');

  const brilloOrbe = escuchando
    ? 'inset 0 0 0 1px rgba(255,255,255,0.35), 0 0 0 10px rgba(0,154,235,0.18), 0 24px 90px 0 rgba(0,154,235,0.75)'
    : 'inset 0 0 0 1px rgba(255,255,255,0.2), 0 24px 70px -10px rgba(0,154,235,0.6)';

  // ── Modo SEGUNDO PLANO: solo una píldora flotante; la sesión sigue viva ──
  if (minimizado) {
    return (
      <motion.button
        onClick={() => setMinimizado(false)}
        aria-label={t('Volver a la pantalla del asistente')}
        className="fixed bottom-6 right-6 flex items-center gap-3 pl-3 pr-5 py-2.5 rounded-full text-white"
        style={{
          background: 'rgba(6, 18, 26, 0.92)',
          border: '1px solid rgba(255,255,255,0.12)',
          boxShadow: '0 20px 50px -12px rgba(0, 154, 235, 0.45)',
          zIndex: 9998,
        }}
        initial={{ opacity: 0, y: reduce ? 0 : 12, scale: reduce ? 1 : 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.2, ease: EASE_OUT }}
      >
        {/* La misma mascota, en chico: sigue escuchando con su cara. */}
        <span className="grid place-items-center w-9 h-11 flex-none">
          <MascotaAsistente compacta estado={estadoMascota} animo={animo} latido={transcripcion} vozReal={sonandoTiqui} className="h-11 w-auto" />
        </span>
        <span className="text-sm font-semibold whitespace-nowrap">
          {escuchando ? t('Tiqui te escucha…') : t('Tiqui está contigo')}
        </span>
        {items > 0 && (
          <span className="min-w-[24px] h-6 px-1.5 rounded-full text-xs font-bold flex items-center justify-center" style={{ backgroundColor: '#8ecbe8', color: '#001a29' }}>
            {items}
          </span>
        )}
      </motion.button>
    );
  }

  return (
    <motion.div
      className="fixed inset-0 flex flex-col text-white"
      style={{ background: FONDO, zIndex: 10000 }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.14, ease: EASE_OUT }}
    >
      {/* Silenciar / activar la voz */}
      <button
        onClick={toggleMute}
        aria-label={muteado ? t('Activar voz') : t('Silenciar voz')}
        className="absolute top-5 left-5 z-[60] flex items-center gap-2 px-4 py-2.5 rounded-full font-medium text-sm md:text-base transition-colors hover:bg-white/10"
        style={VIDRIO}
      >
        {muteado ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
        {muteado ? t('Sin voz') : t('Con voz')}
      </button>

      {/* Segundo plano + Salir */}
      <div className="absolute top-5 right-5 z-[60] flex items-center gap-2">
        <button
          onClick={() => setMinimizado(true)}
          aria-label={t('Poner el asistente en segundo plano')}
          className="flex items-center gap-2 px-4 py-2.5 rounded-full font-medium text-sm md:text-base transition-colors hover:bg-white/10"
          style={VIDRIO}
        >
          <Minimize2 className="w-5 h-5" /> <span className="hidden sm:inline">{t('Segundo plano')}</span>
        </button>
        <button
          onClick={onClose}
          className="flex items-center gap-2 px-5 py-2.5 rounded-full font-semibold text-sm md:text-base bg-white transition-transform active:scale-95"
          style={{ color: '#001a29' }}
        >
          {/* "Cerrar" y no "Salir": en el menú, "Salir" es cerrar la sesión (Sign out). */}
          <X className="w-5 h-5" /> {t('Cerrar')}
        </button>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto">
        <motion.div
          className="mx-auto w-full max-w-2xl px-5 pt-24 md:pt-20 pb-24 flex flex-col items-center text-center"
          initial={{ opacity: 0, y: reduce ? 0 : 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22, ease: EASE_OUT }}
        >
          <p className="text-xs font-semibold tracking-[0.14em] uppercase" style={{ color: '#6fb3d9' }}>
            {t('Asistente de voz')}
          </p>

          {/* Todo va directo sobre el fondo, sin un recuadro que lo encierre: la mascota, lo que se dicen y
             el carrito se separan con aire y una línea fina, no con cajas. */}
          <div className="relative w-full mt-6 flex flex-col items-center">
            {/* ── La mascota y lo que dice ── */}
            <div className="w-full flex flex-col md:flex-row items-center justify-center gap-5 md:gap-6">
              {/* La mascota también se toca, como el orbe de antes. Para el teclado queda solo el botón del
                 micrófono: dos controles que hacen lo mismo serían un tab de más. */}
              <button
                type="button"
                onClick={alTocar}
                tabIndex={-1}
                aria-hidden="true"
                className="flex-none w-[170px] md:w-[210px] outline-none"
              >
                <MascotaAsistente
                  estado={estadoMascota}
                  animo={animo}
                  latido={transcripcion}
                  vozReal={sonandoTiqui}
                  className="w-full h-auto block"
                />
              </button>

              <motion.div
                key={piensa ? 'pensando' : (ultimoBot?.id ?? 'saludo')}
                className="masc-globo relative w-full max-w-[420px] md:w-auto md:flex-1 md:max-w-[340px] px-[22px] py-[18px] rounded-3xl text-left text-lg md:text-xl font-medium leading-snug"
                style={{ backgroundColor: '#fff', color: '#001a29' }}
                initial={{ opacity: 0, scale: reduce ? 1 : 0.96 }}
                // Mientras la persona habla, el globo se apaga: ahora le toca a ella.
                animate={{ opacity: escuchando ? 0.38 : 1, scale: 1 }}
                transition={{ duration: 0.2, ease: EASE_OUT }}
              >
                {piensa
                  ? <span className="masc-puntos" aria-label={t('Tiqui está pensando')}><i /><i /><i /></span>
                  : (ultimoBot?.texto || saludo)}
              </motion.div>
            </div>

            {/* ── Lo que dice la persona: en vivo, con cursor, mientras habla ── */}
            <div className="w-full flex justify-end mt-4 min-h-[52px]">
              {textoPersona && (
                <div
                  className={`max-w-[85%] px-[18px] py-3 text-base md:text-[17px] leading-snug text-left ${enVivo ? 'italic' : ''}`}
                  style={{
                    backgroundColor: 'rgba(111,179,217,0.14)',
                    border: '1px solid rgba(111,179,217,0.3)',
                    color: '#e3f1f9',
                    borderRadius: '22px 22px 6px 22px',
                    opacity: hablando ? 0.45 : 1,
                    transition: 'opacity 250ms ease-out',
                  }}
                >
                  “{textoPersona}{enVivo ? <span className="masc-cursor" /> : '”'}
                </div>
              )}
            </div>

            {/* ── El botón para hablarle ── */}
            <motion.button
              onClick={alTocar}
              className={`relative mt-4 w-[76px] h-[76px] rounded-full grid place-items-center flex-none ${escuchando ? 'masc-mic-escuchando' : ''}`}
              style={{
                background: ORBE,
                boxShadow: brilloOrbe,
                transition: 'box-shadow 300ms ease-out',
              }}
              whileHover={reduce ? undefined : { scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              transition={{ duration: 0.16, ease: EASE_OUT }}
              aria-label={etiquetaToque}
            >
              <span className="masc-mic-onda" />
              <Mic className="w-8 h-8 text-white" />
            </motion.button>

            <p className="mt-2.5 text-sm md:text-base" style={{ color: 'rgba(255,255,255,0.62)' }} aria-live="polite">
              {estadoTexto}
            </p>

            {/* Quién habla cuando NO está la voz de Tiqui (el servidor no la tiene o falló): la del sistema.
               Solo aparece si hay más de una voz en español: con una sola, un selector de un elemento es un
               botón que no hace nada. */}
            {!vozTiqui && voces.length > 1 && (
              <label className="mt-3 flex items-center gap-2 px-4 py-2 rounded-full text-sm cursor-pointer" style={VIDRIO}>
                <Volume2 className="w-4 h-4" style={{ color: '#6fb3d9' }} />
                <span className="sr-only">{t('Voz del asistente')}</span>
                <select
                  value={vozActual}
                  onChange={(e) => cambiarVoz(e.target.value)}
                  className="bg-transparent text-white text-sm outline-none cursor-pointer"
                  style={{ maxWidth: 190 }}
                >
                  {voces.map((v) => (
                    <option key={v.nombre} value={v.nombre} style={{ color: '#111' }}>
                      {v.etiqueta}{v.pais ? ` · ${v.pais}` : ''}
                    </option>
                  ))}
                </select>
              </label>
            )}

            {!soportado && (
              <p className="mt-3 text-sm" style={{ color: '#fca5a5' }}>
                {t('Tu navegador no reconoce la voz. Usa Chrome o Edge.')}
              </p>
            )}

            {/* ── El carrito ── */}
            <div
              className="w-full mt-6 pt-5 text-left"
              style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="flex items-center gap-2 text-sm md:text-base" style={{ color: 'rgba(255,255,255,0.75)' }}>
                  <ShoppingCart className="w-5 h-5" /> {t('Tu carrito ({n})', { n: items })}
                </span>
                <span className="text-xl font-bold tabular-nums" style={{ color: '#8ecbe8' }}>
                  ${totalCarrito.toFixed(2)}
                </span>
              </div>

              {carrito.length === 0 ? (
                <p className="text-sm py-2" style={{ color: 'rgba(255,255,255,0.4)' }}>
                  {t('Todavía no hay nada. Dime qué quieres llevar.')}
                </p>
              ) : (
                <div ref={carritoRef} className="flex flex-col max-h-48 overflow-y-auto">
                  <AnimatePresence initial={false}>
                    {carrito.map((item) => (
                      <motion.div
                        key={item.id}
                        layout
                        initial={{ opacity: 0, x: reduce ? 0 : -24, backgroundColor: 'rgba(0,154,235,0.25)' }}
                        animate={{ opacity: 1, x: 0, backgroundColor: 'rgba(0,154,235,0)' }}
                        exit={{ opacity: 0, x: reduce ? 0 : 24 }}
                        transition={{ duration: 0.45, ease: EASE_OUT }}
                        className="grid items-center gap-3 py-2 rounded-lg"
                        style={{ gridTemplateColumns: '40px 1fr auto', borderTop: '1px solid rgba(255,255,255,0.06)' }}
                      >
                        <span className="w-10 h-10 rounded-[10px] bg-white grid place-items-center overflow-hidden">
                          {item.imagen
                            ? <img src={foto(item.imagen, ANCHO.miniatura)} alt="" className="w-[78%] h-[78%] object-contain" />
                            : <Package className="w-5 h-5" style={{ color: '#9C9691' }} />}
                        </span>
                        <span className="text-sm min-w-0 truncate">
                          {item.nombre}
                          <span className="ml-1.5" style={{ color: 'rgba(255,255,255,0.5)' }}>×{item.cantidad}</span>
                        </span>
                        <span className="text-sm font-semibold tabular-nums">${(item.precio * item.cantidad).toFixed(2)}</span>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}

              <p className="text-xs mt-2" style={{ color: 'rgba(255,255,255,0.45)' }}>
                {t('Di')} <span className="text-white font-semibold">“comprar”</span> {t('cuando termines — alguien de la tienda te ayuda a pagar.')}
              </p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* ── Vincular la compra con su cuenta ── El kiosco no sabe quién está enfrente, así que sin esto
         ninguna compra de aquí suma puntos. */}
      <div className="absolute bottom-5 left-5 z-[60] hidden sm:block">
        {kiosco.cliente ? (
          <div
            className="flex items-center gap-3 px-4 py-3 rounded-2xl text-white shadow-lg"
            style={{ background: 'rgba(20,102,58,0.92)' }}
          >
            <UserCheck className="w-5 h-5 flex-none" />
            <div className="text-left">
              <div className="text-sm font-bold">{kiosco.cliente.nombre}</div>
              <div className="text-xs opacity-80">
                {t('Tus puntos se suman solos · {n} pts', { n: kiosco.cliente.puntos })}
              </div>
            </div>
            <button
              onClick={kiosco.desvincular}
              className="ml-1 text-xs underline opacity-80"
              aria-label={t('Quitar la cuenta de esta compra')}
            >
              {t('Quitar')}
            </button>
          </div>
        ) : kiosco.imagenQR ? (
          <div className="p-3 rounded-2xl bg-white shadow-lg text-center" style={{ width: 190 }}>
            <img src={kiosco.imagenQR} alt={t('Código {codigo}', { codigo: kiosco.codigo })} className="w-full rounded-lg" />
            <p className="text-[11px] mt-1.5 font-semibold" style={{ color: '#1C1614' }}>
              {t('Escanea para sumar tus puntos')}
            </p>
            {/* El código escrito es el plan B: si la cámara no agarra, se
                puede teclear en el teléfono. */}
            <p className="text-[13px] font-black tracking-[3px]" style={{ color: 'var(--marca-texto)' }}>
              {kiosco.codigo}
            </p>
          </div>
        ) : (
          <button
            onClick={kiosco.abrir}
            disabled={kiosco.abriendo}
            className="flex items-center gap-2 px-4 py-2.5 rounded-full text-white font-medium text-sm md:text-base disabled:opacity-60 transition-colors hover:bg-white/10"
            style={VIDRIO}
          >
            <QrCode className="w-5 h-5" style={{ color: '#6fb3d9' }} />
            {kiosco.abriendo ? t('Generando…') : t('¿Tienes cuenta? Suma tus puntos')}
          </button>
        )}
      </div>
    </motion.div>
  );
};

export default AsistenteVoz;

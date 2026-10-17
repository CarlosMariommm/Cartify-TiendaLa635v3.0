import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { Check, X, Heart, HeartCrack, Play, ArrowRight, Candy } from 'lucide-react';
import MascotaAsistente from '../components/Store/MascotaAsistente';
import RuletaTiqui from '../components/Juego/RuletaTiqui';
import PanelOperador from '../components/Juego/PanelOperador';
import { useJuegoTiqui } from '../hooks/useJuegoTiqui';
import { caraDeAnimo } from '../utils/animoTiqui';
import { ACIERTOS_PARA_GANAR, ERRORES_PARA_PERDER } from '../utils/juegoTiqui';
import { despertarAudio, sonarPasar } from '../utils/sonidosJuego';

// EL RETO DE TIQUI — JuegoTiqui.jsx (ruta /juego)
// La dinámica del stand de la Expo, en la laptop y a pantalla completa: Tiqui hace preguntas sobre
// el proyecto; con 3 aciertos antes de 2 errores se gira la ruleta, que da dulce o premio mayor.

const TIENDA = 'https://cartify-tienda-la635.vercel.app';

const FONDO =
  'radial-gradient(1100px 720px at 28% 30%, rgba(0, 92, 138, 0.42), transparent 62%),' +
  'radial-gradient(800px 600px at 88% 80%, rgba(255, 194, 61, 0.09), transparent 60%), #000';

const LETRAS = ['A', 'B', 'C'];
const TECLAS = [['1', 'a'], ['2', 'b'], ['3', 'c']];

const COLOR_TEMA = {
  'La tienda': '#8ECBE8',
  Tiqui: '#FFC23D',
  'Tu cuenta': '#4ADE80',
  'El negocio': '#C4B5FD',
};

const SUAVE = 'rgba(255,255,255,0.68)';

// El confeti del premio. Las posiciones salen de un azar con semilla, fijo: se calculan una vez al
// cargar, no en cada pintado.
const PAPELITOS = (() => {
  let s = 20261008;
  const azar = () => (s = (s * 16807) % 2147483647) / 2147483647;
  const colores = ['#009AEB', '#FFC23D', '#F0707F', '#8ECBE8', '#FFFFFF'];
  return Array.from({ length: 80 }, (_, i) => ({
    x: azar() * 100,
    espera: -azar() * 4,
    dura: 2.6 + azar() * 2.2,
    ancho: 7 + azar() * 7,
    giro: Math.round(azar() * 360),
    color: colores[i % colores.length],
  }));
})();

const Confeti = ({ cuantos = 80 }) => (
  <div className="juego-confeti" aria-hidden="true">
    {PAPELITOS.slice(0, cuantos).map((p, i) => (
      <i
        key={i}
        style={{
          left: `${p.x}%`,
          width: p.ancho,
          height: p.ancho * 1.8,
          background: p.color,
          animationDelay: `${p.espera}s`,
          animationDuration: `${p.dura}s`,
          '--giro': `${p.giro}deg`,
        }}
      />
    ))}
  </div>
);

// Lo que dice Tiqui, en su globo. `lado`: la cola apunta a la izquierda (ella a un lado).
const Globo = ({ texto, lado = false, className = '' }) => (texto ? (
  <div
    className={`juego-globo ${lado ? 'juego-globo-lado' : ''} px-6 py-4 text-left font-medium leading-snug ${className}`}
    style={{ fontSize: 'clamp(17px, 1.55vw, 24px)' }}
  >
    {texto}
  </div>
) : null);

const Marcador = ({ marcador }) => (
  <div className="flex items-center gap-5 md:gap-8">
    <div className="flex items-center gap-2" aria-label={`${marcador.aciertos} de ${ACIERTOS_PARA_GANAR} aciertos`}>
      {Array.from({ length: ACIERTOS_PARA_GANAR }, (_, i) => {
        const llena = i < marcador.aciertos;
        return (
          <span
            key={`${i}-${llena}`}
            className={`w-9 h-9 md:w-11 md:h-11 rounded-full grid place-items-center ${llena ? 'juego-ficha' : ''}`}
            style={llena
              ? { background: '#22C55E', boxShadow: '0 0 26px rgba(34,197,94,0.55)' }
              : { border: '2px dashed rgba(255,255,255,0.3)' }}
          >
            {llena && <Check className="w-5 h-5 md:w-6 md:h-6" strokeWidth={3} />}
          </span>
        );
      })}
    </div>
    <div className="flex items-center gap-1" aria-label={`Te quedan ${ERRORES_PARA_PERDER - marcador.errores} oportunidades`}>
      {Array.from({ length: ERRORES_PARA_PERDER }, (_, i) => {
        const rota = i >= ERRORES_PARA_PERDER - marcador.errores;
        return rota
          ? <HeartCrack key={`${i}-rota`} className="juego-ficha w-8 h-8 md:w-9 md:h-9" style={{ color: 'rgba(255,255,255,0.3)' }} />
          : <Heart key={i} className="w-8 h-8 md:w-9 md:h-9" style={{ color: '#F0707F' }} fill="#F0707F" />;
      })}
    </div>
  </div>
);

// El botón de seguir. Cuando el juego va a avanzar solo, se va llenando: así se ve cuánto falta, y
// quien quiera se adelanta.
const BotonSeguir = ({ texto, onClick, espera, clave, className = '' }) => (
  <button
    type="button"
    onClick={onClick}
    className={`relative overflow-hidden inline-flex items-center gap-3 whitespace-nowrap rounded-full bg-white px-7 py-3.5 md:py-4 text-lg md:text-xl font-bold transition-transform active:scale-95 ${className}`}
    style={{ color: '#001a29' }}
  >
    {espera > 0 && <span key={clave} className="juego-seguir-relleno" style={{ animationDuration: `${espera}ms` }} aria-hidden="true" />}
    <span className="relative">{texto}</span>
    <ArrowRight className="relative w-5 h-5" />
  </button>
);

const QRTienda = ({ qr }) => (qr ? (
  <div className="flex items-center gap-4">
    <img src={qr} alt="Código QR de Tienda la 635" className="flex-none w-20 h-20 md:w-24 md:h-24 rounded-xl" />
    <div className="text-left text-sm md:text-base leading-snug">
      <p className="font-semibold">Tienda la 635</p>
      <p style={{ color: SUAVE }}>El súper de la esquina, a un toque.</p>
      <p style={{ color: SUAVE }}>Escanéalo con tu cámara.</p>
    </div>
  </div>
) : null);

// ── Las pantallas ──

const Inicio = ({ juego, tiqui }) => {
  const { ruleta, contadores, ajustes, empezar } = juego;
  const quedanSecretos = ajustes.secretos > 0;
  return (
    <div className="min-h-full grid md:grid-cols-[1.05fr_1fr] items-center gap-8 px-6 md:px-14 pt-24 pb-10">
      <div className="order-2 md:order-1 flex flex-col items-center md:items-start text-center md:text-left juego-entra">
        <p className="text-sm md:text-base font-semibold tracking-[0.16em] uppercase" style={{ color: '#6fb3d9' }}>Juega y gana</p>
        <h1 className="mt-2 font-extrabold leading-[1.02]" style={{ fontSize: 'clamp(44px, 6vw, 96px)' }}>
          ¿Le ganas<br />a Tiqui?
        </h1>
        <p className="mt-5 max-w-xl leading-snug" style={{ fontSize: 'clamp(18px, 1.8vw, 28px)', color: SUAVE }}>
          Tiqui te pregunta sobre su tienda. Acierta <b className="text-white">3</b> antes de fallar 2 y gira la ruleta.{' '}
          {quedanSecretos
            ? <>Puedes ganar un dulce… o el <b style={{ color: '#FFC23D' }}>premio mayor</b>.</>
            : <>¡Puedes ganar un dulce!</>}
        </p>
        <button
          type="button"
          onClick={empezar}
          className="juego-latido mt-8 inline-flex items-center gap-3 rounded-full px-10 py-5 text-2xl md:text-3xl font-extrabold transition-transform active:scale-95"
          style={{ background: 'radial-gradient(circle at 34% 28%, #29a3e6, #005c8a 70%)' }}
        >
          <Play className="w-7 h-7" fill="currentColor" /> ¡Jugar!
        </button>
        <p className="mt-3 text-sm" style={{ color: 'rgba(255,255,255,0.45)' }}>o presiona Enter</p>
        {contadores.jugaron > 0 && (
          <p className="mt-6 text-base md:text-lg" style={{ color: SUAVE }}>
            Hoy ya {contadores.jugaron === 1 ? 'jugó 1 persona' : `jugaron ${contadores.jugaron} personas`}
            {contadores.ruleta > 0 && ` · ${contadores.ruleta} llegaron a la ruleta`}
          </p>
        )}
      </div>
      <div className="order-1 md:order-2 relative mx-auto" style={{ width: 'min(44vw, 62vh, 560px)', minWidth: 240 }}>
        <RuletaTiqui porciones={ruleta} lento className="w-full h-auto block" />
        <div className="absolute -left-[16%] -bottom-[8%] w-[40%]">
          <MascotaAsistente {...tiqui} className="w-full h-auto block" />
        </div>
      </div>
    </div>
  );
};

const Reglas = ({ juego, tiqui }) => {
  const { voz, avanzar, espera } = juego;
  return (
    <div className="min-h-full flex flex-col items-center justify-center gap-10 px-6 pt-24 pb-10 text-center">
      <div className="flex flex-col md:flex-row items-center gap-6 md:gap-8 juego-entra">
        <div className="order-2 md:order-1" style={{ width: 'clamp(170px, 20vw, 280px)' }}>
          <MascotaAsistente {...tiqui} className="w-full h-auto block" />
        </div>
        <Globo texto={voz.texto} lado className="order-1 md:order-2 max-w-md" />
      </div>
      <div className="flex flex-wrap items-start justify-center gap-10 md:gap-16 juego-entra" style={{ animationDelay: '120ms' }}>
        <div className="flex flex-col items-center gap-3">
          <div className="flex gap-2">
            {Array.from({ length: ACIERTOS_PARA_GANAR }, (_, i) => (
              <span key={i} className="w-12 h-12 rounded-full grid place-items-center" style={{ background: '#22C55E' }}><Check className="w-7 h-7" strokeWidth={3} /></span>
            ))}
          </div>
          <p className="text-lg md:text-xl font-semibold">3 aciertos: ¡a la ruleta!</p>
        </div>
        <div className="flex flex-col items-center gap-3">
          <div className="flex gap-2">
            {Array.from({ length: ERRORES_PARA_PERDER }, (_, i) => (
              <span key={i} className="w-12 h-12 rounded-full grid place-items-center" style={{ background: '#EF4444' }}><X className="w-7 h-7" strokeWidth={3} /></span>
            ))}
          </div>
          <p className="text-lg md:text-xl font-semibold">2 errores: se acaba</p>
        </div>
      </div>
      <BotonSeguir texto="¡Listo, a jugar!" onClick={avanzar} espera={espera} clave="reglas" />
    </div>
  );
};

const Opcion = ({ letra, texto, estado, onClick, demora }) => {
  const estilos = {
    normal: { background: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.18)' },
    correcta: { background: 'rgba(34,197,94,0.22)', borderColor: '#4ADE80' },
    incorrecta: { background: 'rgba(239,68,68,0.2)', borderColor: '#F87171' },
    apagada: { background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.08)', opacity: 0.4 },
  };
  const circulo = {
    normal: { background: '#009AEB' },
    correcta: { background: '#22C55E' },
    incorrecta: { background: '#EF4444' },
    apagada: { background: 'rgba(255,255,255,0.12)' },
  };
  const animacion = estado === 'correcta' ? 'juego-bien' : estado === 'incorrecta' ? 'juego-mal' : '';
  return (
    <div className="juego-entra" style={{ animationDelay: `${demora}ms` }}>
      <button
        type="button"
        onClick={onClick}
        onMouseEnter={estado === 'normal' ? sonarPasar : undefined}
        disabled={estado !== 'normal'}
        className={`juego-opcion ${animacion} w-full flex items-center gap-4 text-left rounded-2xl border-2 px-4 py-3 md:px-5 md:py-4`}
        style={estilos[estado]}
      >
        <span className="flex-none w-11 h-11 md:w-12 md:h-12 rounded-full grid place-items-center text-lg md:text-xl font-extrabold" style={circulo[estado]}>
          {estado === 'correcta' ? <Check className="w-6 h-6" strokeWidth={3} /> : estado === 'incorrecta' ? <X className="w-6 h-6" strokeWidth={3} /> : letra}
        </span>
        <span className="font-semibold leading-tight" style={{ fontSize: 'clamp(18px, 1.9vw, 30px)' }}>{texto}</span>
      </button>
    </div>
  );
};

const Pregunta = ({ juego, tiqui }) => {
  const { fase, pregunta, numero, respuesta, apurado, ajustes, voz, responder, avanzar, espera, marcador } = juego;
  if (!pregunta) return null;
  const respondida = fase === 'respuesta';

  const estadoDe = (o, i) => {
    if (!respondida) return 'normal';
    if (o.correcta) return 'correcta';
    if (i === respuesta?.elegida) return 'incorrecta';
    return 'apagada';
  };

  const final = respondida ? (marcador.aciertos >= ACIERTOS_PARA_GANAR ? 'gano' : marcador.errores >= ERRORES_PARA_PERDER ? 'perdio' : 'sigue') : null;
  const textoSeguir = final === 'gano' ? '¡A la ruleta!' : final === 'perdio' ? 'Ver resultado' : 'Siguiente pregunta';

  return (
    <div className="min-h-full grid md:grid-cols-[minmax(190px,0.75fr)_2fr] items-center gap-6 md:gap-12 px-6 md:px-14 pt-24 pb-8">
      <div className="hidden md:flex flex-col items-center gap-6">
        {respondida && <Globo key={voz.texto} texto={voz.texto} className="juego-entra max-w-[300px]" />}
        <div style={{ width: 'clamp(170px, 18vw, 260px)' }}>
          <MascotaAsistente {...tiqui} className="w-full h-auto block" />
        </div>
      </div>

      <div key={pregunta.id} className="min-w-0">
        <div className="flex items-center gap-3 text-sm md:text-base font-semibold tracking-[0.14em] uppercase juego-entra">
          <span style={{ color: COLOR_TEMA[pregunta.tema] || '#8ECBE8' }}>{pregunta.tema}</span>
          <span style={{ color: 'rgba(255,255,255,0.3)' }}>·</span>
          <span style={{ color: SUAVE }}>Pregunta {numero}</span>
        </div>
        <h2 className="mt-3 font-bold leading-[1.15] juego-entra" style={{ fontSize: 'clamp(26px, 3vw, 50px)', animationDelay: '60ms' }}>
          {pregunta.pregunta}
        </h2>

        {ajustes.segundos > 0 && (
          <div className={`juego-tiempo mt-5 ${apurado ? 'juego-tiempo-apurado' : ''} ${respondida ? 'juego-tiempo-quieto' : ''}`} aria-hidden="true">
            <i style={{ animationDuration: `${ajustes.segundos}s` }} />
          </div>
        )}

        <div className="mt-6 flex flex-col gap-3">
          {pregunta.opciones.map((o, i) => (
            <Opcion
              key={o.texto}
              letra={LETRAS[i]}
              texto={o.texto}
              estado={estadoDe(o, i)}
              onClick={() => responder(i)}
              demora={140 + i * 70}
            />
          ))}
        </div>

        {respondida && (
          <div className="mt-6 flex flex-col md:flex-row md:items-center gap-5 juego-entra">
            <p className="flex-1 leading-snug" style={{ fontSize: 'clamp(16px, 1.45vw, 22px)', color: SUAVE }}>
              <b style={{ color: respuesta?.acerto ? '#4ADE80' : '#F87171' }}>
                {respuesta?.acerto ? '¡Correcto! ' : respuesta?.porTiempo ? 'Se acabó el tiempo. ' : 'No era esa. '}
              </b>
              {pregunta.dato}
            </p>
            <BotonSeguir texto={textoSeguir} onClick={avanzar} espera={espera} clave={`r-${numero}`} className="self-start md:self-auto flex-none" />
          </div>
        )}
      </div>
    </div>
  );
};

const Ruleta = ({ juego, tiqui, qr }) => {
  const { fase, ruleta, premio, prueba, voz, girar, alParar, volverAlInicio, espera } = juego;
  const secreto = fase === 'premio' && premio?.tipo === 'secreto';
  const dulce = fase === 'premio' && premio?.tipo === 'dulce';

  return (
    <div className="min-h-full grid md:grid-cols-[1fr_1.15fr] items-center gap-6 md:gap-10 px-6 md:px-14 pt-20 pb-6">
      {secreto && <Confeti />}
      {dulce && <Confeti cuantos={30} />}

      <div className="order-2 md:order-1 flex flex-col items-center md:items-start text-center md:text-left gap-5 relative z-10">
        {fase === 'premio' ? (
          <div key="premio" className="juego-premio">
            <p className="text-sm md:text-base font-semibold tracking-[0.16em] uppercase" style={{ color: secreto ? '#FFC23D' : '#6fb3d9' }}>
              {prueba ? 'Giro de prueba · no cuenta' : secreto ? '¡No lo puedo creer!' : '¡Felicidades!'}
            </p>
            {secreto ? (
              <h2 className="mt-2 font-extrabold leading-none" style={{ fontSize: 'clamp(40px, 5vw, 80px)' }}>
                <span className="juego-dorado">¡PREMIO<br />MAYOR!</span>
              </h2>
            ) : (
              <h2 className="mt-2 font-extrabold leading-[1.02] flex items-center gap-4 justify-center md:justify-start" style={{ fontSize: 'clamp(34px, 4.2vw, 68px)' }}>
                ¡Ganaste un dulce! <Candy className="flex-none" style={{ width: '0.8em', height: '0.8em', color: '#F0707F' }} />
              </h2>
            )}
            <p className="mt-3 text-base md:text-xl" style={{ color: SUAVE }}>
              {secreto ? 'Muéstrale esta pantalla a quien atiende el stand.' : 'Pídeselo a quien atiende el stand.'}
            </p>
          </div>
        ) : (
          <div key="girar">
            <p className="text-sm md:text-base font-semibold tracking-[0.16em] uppercase" style={{ color: '#6fb3d9' }}>
              {prueba ? 'Giro de prueba · no cuenta' : '¡Lo lograste!'}
            </p>
            <h2 className="mt-2 font-extrabold leading-[1.02]" style={{ fontSize: 'clamp(40px, 5vw, 80px)' }}>Gira la ruleta</h2>
          </div>
        )}

        <div className="flex items-center gap-4">
          <div className="flex-none" style={{ width: fase === 'premio' ? 'clamp(96px, 9vw, 140px)' : 'clamp(120px, 12vw, 180px)' }}>
            <MascotaAsistente {...tiqui} className="w-full h-auto block" />
          </div>
          {fase !== 'ruleta' && <Globo key={voz.texto} texto={voz.texto} lado className="juego-entra max-w-[300px]" />}
        </div>

        {fase === 'ruleta' && (
          <button
            type="button"
            onClick={girar}
            className="juego-latido inline-flex items-center gap-3 rounded-full px-10 py-5 text-2xl md:text-3xl font-extrabold transition-transform active:scale-95"
            style={{ background: 'radial-gradient(circle at 34% 28%, #ffd36e, #e09a00 72%)', color: '#1a1200' }}
          >
            ¡Girar!
          </button>
        )}
        {fase === 'premio' && (
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-x-8 gap-y-4">
            <BotonSeguir texto="Siguiente jugador" onClick={volverAlInicio} espera={espera} clave="premio" />
            <QRTienda qr={qr} />
          </div>
        )}
      </div>

      <div className="order-1 md:order-2 mx-auto relative z-10" style={{ width: 'min(46vw, 72vh, 620px)', minWidth: 260 }}>
        <RuletaTiqui porciones={ruleta} girando={fase === 'girando'} premio={premio} alParar={alParar} className="w-full h-auto block" />
      </div>
    </div>
  );
};

const Fin = ({ juego, tiqui, qr }) => {
  const { marcador, volverAlInicio, espera } = juego;
  const cerca = marcador.aciertos === ACIERTOS_PARA_GANAR - 1;
  return (
    <div className="min-h-full flex flex-col md:flex-row items-center justify-center gap-8 md:gap-14 px-6 md:px-14 pt-24 pb-10">
      <div className="flex-none juego-entra" style={{ width: 'clamp(180px, 22vw, 320px)' }}>
        <MascotaAsistente {...tiqui} className="w-full h-auto block" />
      </div>
      <div className="max-w-xl flex flex-col items-center md:items-start text-center md:text-left gap-6 juego-entra" style={{ animationDelay: '100ms' }}>
        <div>
          <p className="text-sm md:text-base font-semibold tracking-[0.16em] uppercase" style={{ color: '#6fb3d9' }}>Gracias por jugar</p>
          <h2 className="mt-2 font-extrabold leading-[1.02]" style={{ fontSize: 'clamp(44px, 5.6vw, 88px)' }}>
            {cerca ? '¡Casi lo logras!' : '¡Estuvo difícil!'}
          </h2>
          <p className="mt-4 text-lg md:text-2xl" style={{ color: SUAVE }}>
            Acertaste {marcador.aciertos} de {ACIERTOS_PARA_GANAR}. Vuelve a intentarlo cuando quieras: las preguntas cambian.
          </p>
        </div>
        <BotonSeguir texto="Siguiente jugador" onClick={volverAlInicio} espera={espera} clave="fin" />
        <QRTienda qr={qr} />
      </div>
    </div>
  );
};

// ── La página ──

const JuegoTiqui = () => {
  const juego = useJuegoTiqui();
  const { fase, marcador, premio, voz, apurado } = juego;
  const { empezar, avanzar, responder, girar, volverAlInicio } = juego;
  const [panel, setPanel] = useState(false);
  const [qr, setQr] = useState('');
  const toques = useRef([]);
  // Cuándo cambió la pantalla por última vez (ver el teclado, abajo).
  const cambioDePantalla = useRef(0);
  useEffect(() => { cambioDePantalla.current = performance.now(); }, [fase]);

  useEffect(() => {
    const previo = document.title;
    document.title = 'El reto de Tiqui · Tienda la 635';
    return () => { document.title = previo; };
  }, []);

  // El QR de la tienda, hecho aquí mismo: sin internet también sale.
  useEffect(() => {
    QRCode.toDataURL(TIENDA, {
      margin: 1,
      width: 360,
      errorCorrectionLevel: 'M',
      color: { dark: '#003049', light: '#FFFFFF' },
    }).then(setQr).catch(() => {});
  }, []);

  // El navegador no deja sonar nada hasta que alguien toca: el primer toque o tecla despierta el
  // audio, y desde ahí la música del inicio suena sola entre jugador y jugador.
  useEffect(() => {
    window.addEventListener('pointerdown', despertarAudio);
    window.addEventListener('keydown', despertarAudio);
    return () => {
      window.removeEventListener('pointerdown', despertarAudio);
      window.removeEventListener('keydown', despertarAudio);
    };
  }, []);

  // La laptop no se apaga ni se bloquea en medio de la Expo.
  useEffect(() => {
    let candado = null;
    const pedir = async () => {
      if (document.visibilityState !== 'visible' || !navigator.wakeLock) return;
      try { candado = await navigator.wakeLock.request('screen'); } catch { /* el navegador no quiso */ }
    };
    pedir();
    document.addEventListener('visibilitychange', pedir);
    return () => {
      document.removeEventListener('visibilitychange', pedir);
      candado?.release?.().catch(() => {});
    };
  }, []);

  // El teclado: 1/2/3 o A/B/C para responder, Enter o espacio para seguir.
  useEffect(() => {
    const alTeclear = (e) => {
      if (panel || e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
      const k = e.key.toLowerCase();
      if (k === 'escape') {
        if (fase !== 'inicio') volverAlInicio();
        return;
      }
      if (fase === 'pregunta') {
        const i = TECLAS.findIndex((t) => t.includes(k));
        if (i >= 0) {
          e.preventDefault();
          responder(i);
        }
        return;
      }
      if (k !== 'enter' && k !== ' ') return;
      // Que el botón enfocado no se active también: una sola acción por tecla.
      e.preventDefault();
      // Un Enter de más justo después de cambiar de pantalla no cuenta: en el stand la gente lo pulsa
      // dos veces seguidas, y el segundo se saltaba una pantalla (del premio pasaba directo a otra
      // partida).
      if (performance.now() - cambioDePantalla.current < 700) return;
      if (fase === 'inicio') empezar();
      else if (fase === 'reglas' || fase === 'respuesta') avanzar();
      else if (fase === 'ruleta') girar();
      else if (fase === 'premio' || fase === 'fin') volverAlInicio();
    };
    const sinEspacio = (e) => { if (e.key === ' ' && !panel) e.preventDefault(); };
    window.addEventListener('keydown', alTeclear);
    window.addEventListener('keyup', sinEspacio);
    return () => {
      window.removeEventListener('keydown', alTeclear);
      window.removeEventListener('keyup', sinEspacio);
    };
  }, [panel, fase, empezar, avanzar, responder, girar, volverAlInicio]);

  // 5 toques seguidos al nombre abren el panel del operador.
  const alTocarNombre = () => {
    const ahora = Date.now();
    toques.current = [...toques.current.filter((t) => ahora - t < 2500), ahora];
    if (toques.current.length >= 5) {
      toques.current = [];
      setPanel(true);
    }
  };

  const pantallaCompleta = () => {
    document.documentElement.requestFullscreen?.().catch(() => {});
    setPanel(false);
  };

  // La cara de Tiqui: habla, mira la ruleta, se apura con el tiempo, festeja.
  const estado = voz.hablando ? 'hablando' : fase === 'girando' || apurado ? 'escuchando' : 'reposo';
  let animo = 'normal';
  if (fase === 'premio') animo = premio?.tipo === 'secreto' ? 'feliz' : 'contento';
  else if (fase === 'fin') animo = 'confundido';
  else if (fase !== 'inicio' && fase !== 'pregunta' && voz.animo) animo = caraDeAnimo(voz.animo);
  const tiqui = { estado, animo, vozReal: voz.real && voz.hablando };

  const enPartida = ['pregunta', 'respuesta'].includes(fase);

  return (
    <div className="fixed inset-0 z-[10050] text-white overflow-y-auto overflow-x-hidden select-none" style={{ background: FONDO }}>
      <header className="absolute top-0 inset-x-0 z-20 flex items-center justify-between gap-4 px-6 md:px-14 pt-5">
        <button type="button" tabIndex={-1} onClick={alTocarNombre} className="text-left outline-none">
          <span className="block text-xs font-semibold tracking-[0.18em] uppercase" style={{ color: '#6fb3d9' }}>Tienda la 635</span>
          <span className="block text-lg md:text-xl font-bold">El reto de Tiqui</span>
        </button>
        {enPartida && <Marcador marcador={marcador} />}
      </header>

      {fase === 'inicio' && <Inicio juego={juego} tiqui={tiqui} />}
      {fase === 'reglas' && <Reglas juego={juego} tiqui={tiqui} />}
      {enPartida && <Pregunta juego={juego} tiqui={tiqui} />}
      {['ruleta', 'girando', 'premio'].includes(fase) && <Ruleta juego={juego} tiqui={tiqui} qr={qr} />}
      {fase === 'fin' && <Fin juego={juego} tiqui={tiqui} qr={qr} />}

      {panel && (
        <PanelOperador
          ajustes={juego.ajustes}
          probabilidad={juego.probabilidad}
          contadores={juego.contadores}
          grabadas={juego.grabadas}
          totalDeFrases={juego.totalDeFrases}
          cambiarAjuste={juego.cambiarAjuste}
          reiniciarContadores={juego.reiniciarContadores}
          probarRuleta={() => { juego.probarRuleta(); setPanel(false); }}
          pantallaCompleta={pantallaCompleta}
          alCerrar={() => setPanel(false)}
        />
      )}
    </div>
  );
};

export default JuegoTiqui;

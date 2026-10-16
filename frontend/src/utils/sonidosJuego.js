/*
 * ============================================================
 * SONIDOS DEL RETO DE TIQUI — sonidosJuego.js
 * ============================================================
 * Todo lo que suena en el juego del stand, menos la voz de Tiqui:
 *
 *   · la MÚSICA de fondo: una alegre para llamar gente (inicio y ruleta) y
 *     una de suspenso, más quieta, mientras se piensa la respuesta. Baja sola
 *     cuando Tiqui habla, para que se le entienda;
 *   · los EFECTOS: toques, la pregunta que aparece, la moneda del acierto, el
 *     error, el reloj y la chicharra del tiempo, el redoble y el platillo de
 *     la ruleta, aplausos, fanfarrias y el trombón triste de cuando se pierde.
 *
 * Se generan aquí mismo con osciladores y ruido (Web Audio): no hay archivos
 * que bajar, funcionan sin internet y no gastan nada. La música y los efectos
 * se apagan por separado desde el panel del operador.
 *
 * El navegador no deja sonar nada hasta que alguien toca la pantalla o una
 * tecla: el primer toque despierta el audio (ver despertarAudio) y desde ahí
 * la música del inicio suena sola.
 * ============================================================
 */

let contexto = null;
let efectosEncendidos = true;
let musicaEncendida = true;
let ruido = null; // un segundo de ruido blanco, para platillos, aplausos y soplidos

const contextoAudio = () => {
  if (typeof window === 'undefined') return null;
  if (!contexto) {
    const Contexto = window.AudioContext || window.webkitAudioContext;
    if (!Contexto) return null;
    contexto = new Contexto();
  }
  return contexto;
};

// Lo llama la pantalla con el primer toque o tecla: sin eso el audio no arranca.
export const despertarAudio = () => {
  const c = contextoAudio();
  if (c?.state === 'suspended') c.resume().catch(() => {});
};

const ctx = () => (efectosEncendidos ? contextoAudio() : null);

const bufferDeRuido = (c) => {
  if (ruido?.sampleRate === c.sampleRate) return ruido;
  ruido = c.createBuffer(1, c.sampleRate, c.sampleRate);
  const datos = ruido.getChannelData(0);
  for (let i = 0; i < datos.length; i++) datos[i] = Math.random() * 2 - 1;
  return ruido;
};

const hz = (midi) => 440 * 2 ** ((midi - 69) / 12);

/*
 * Una nota que sube rápido y se apaga sola (sin el "clic" de cortar en seco).
 *   cuando: segundos desde ahora (o un instante exacto con `en`).
 *   hasta: frecuencia final, para deslizar.   ataque: cuánto tarda en sonar.
 */
const nota = (c, frecuencia, cuando, duracion, { tipo = 'sine', volumen = 0.16, hasta, ataque = 0.012, en, destino, vibrato } = {}) => {
  const t0 = en ?? c.currentTime + cuando;
  const osc = c.createOscillator();
  const gan = c.createGain();
  osc.type = tipo;
  osc.frequency.setValueAtTime(frecuencia, t0);
  if (hasta) osc.frequency.exponentialRampToValueAtTime(hasta, t0 + duracion);
  if (vibrato) {
    const lfo = c.createOscillator();
    const prof = c.createGain();
    lfo.frequency.value = vibrato.velocidad;
    prof.gain.value = vibrato.cuanto;
    lfo.connect(prof).connect(osc.frequency);
    lfo.start(t0);
    lfo.stop(t0 + duracion + 0.05);
  }
  gan.gain.setValueAtTime(0.0001, t0);
  gan.gain.exponentialRampToValueAtTime(volumen, t0 + ataque);
  gan.gain.exponentialRampToValueAtTime(0.0001, t0 + duracion);
  osc.connect(gan).connect(destino || c.destination);
  osc.start(t0);
  osc.stop(t0 + duracion + 0.05);
};

// Un golpe de ruido filtrado: platillos, caja, aplausos, el soplido de la pregunta.
const soplo = (c, cuando, duracion, { volumen = 0.1, filtro = 'highpass', frecuencia = 6000, hasta, q = 0.8, en, destino } = {}) => {
  const t0 = en ?? c.currentTime + cuando;
  const fuente = c.createBufferSource();
  fuente.buffer = bufferDeRuido(c);
  // El ruido dura un segundo: lo largo (el platillo) le da la vuelta.
  fuente.loop = duracion > 0.4;
  const f = c.createBiquadFilter();
  f.type = filtro;
  f.frequency.setValueAtTime(frecuencia, t0);
  if (hasta) f.frequency.exponentialRampToValueAtTime(hasta, t0 + duracion);
  f.Q.value = q;
  const gan = c.createGain();
  gan.gain.setValueAtTime(0.0001, t0);
  gan.gain.exponentialRampToValueAtTime(volumen, t0 + 0.005);
  gan.gain.exponentialRampToValueAtTime(0.0001, t0 + duracion);
  fuente.connect(f).connect(gan).connect(destino || c.destination);
  fuente.start(t0, Math.random() * 0.5);
  fuente.stop(t0 + duracion + 0.05);
};

const tocar = (fn) => {
  const c = ctx();
  if (!c) return;
  if (c.state === 'suspended') c.resume().catch(() => {});
  try { fn(c); } catch { /* sin sonido no se rompe el juego */ }
};

export const activarSonidos = (si) => { efectosEncendidos = !!si; };

// ── Efectos ──

// Un "pop" al tocar un botón.
export const sonarToque = () => tocar((c) => {
  nota(c, 720, 0, 0.09, { volumen: 0.12, hasta: 380 });
});

// Un roce muy suave al pasar por una opción.
export const sonarPasar = () => tocar((c) => {
  nota(c, 1500, 0, 0.04, { volumen: 0.025 });
});

// Empieza la partida: arpegio que sube y destella.
export const sonarEmpezar = () => tocar((c) => {
  [60, 64, 67, 72, 76].forEach((m, i) => nota(c, hz(m), i * 0.07, 0.3, { tipo: 'triangle', volumen: 0.16 }));
  [88, 91].forEach((m, i) => nota(c, hz(m), 0.38 + i * 0.06, 0.4, { volumen: 0.05 }));
});

// Llega una pregunta: un soplido que sube y una campanita.
export const sonarPregunta = () => tocar((c) => {
  soplo(c, 0, 0.35, { filtro: 'bandpass', frecuencia: 500, hasta: 4000, volumen: 0.12, q: 1.2 });
  nota(c, hz(88), 0.3, 0.5, { volumen: 0.06 });
});

// Acierto: la moneda de los videojuegos, con brillo.
export const sonarAcierto = () => tocar((c) => {
  nota(c, hz(83), 0, 0.09, { tipo: 'square', volumen: 0.07 });
  nota(c, hz(88), 0.08, 0.45, { tipo: 'square', volumen: 0.07 });
  [96, 100].forEach((m, i) => nota(c, hz(m), 0.16 + i * 0.05, 0.3, { volumen: 0.035 }));
});

// Un "buu" grave que baja.
export const sonarError = () => tocar((c) => {
  nota(c, 220, 0, 0.45, { tipo: 'sawtooth', volumen: 0.07, hasta: 130 });
  nota(c, 165, 0.05, 0.45, { tipo: 'square', volumen: 0.04, hasta: 100 });
});

// El tic de cada porción que pasa bajo la flecha.
export const sonarTic = () => tocar((c) => {
  nota(c, 1800, 0, 0.035, { tipo: 'square', volumen: 0.05 });
});

// El reloj en los últimos segundos: tic, tac.
let tictac = 0;
export const sonarReloj = () => tocar((c) => {
  tictac += 1;
  nota(c, tictac % 2 ? 1250 : 940, 0, 0.06, { tipo: 'square', volumen: 0.07 });
});

// Se acabó el tiempo: chicharra.
export const sonarTiempo = () => tocar((c) => {
  nota(c, 196, 0, 0.7, { tipo: 'square', volumen: 0.06 });
  nota(c, 207, 0, 0.7, { tipo: 'square', volumen: 0.06 });
});

// Aplausos: muchas palmadas sueltas que se apagan.
const aplauso = (c, cuando, duracion, fuerza = 1) => {
  const palmadas = Math.round(26 * duracion * fuerza);
  for (let i = 0; i < palmadas; i++) {
    const t = cuando + Math.random() * duracion;
    const apagando = 1 - (t - cuando) / (duracion * 1.15);
    soplo(c, t, 0.05, {
      filtro: 'bandpass',
      frecuencia: 900 + Math.random() * 1600,
      q: 1.4,
      volumen: Math.max(0.01, 0.06 * apagando * (0.5 + Math.random())),
    });
  }
};

// Tres aciertos: fanfarria que sube y unos aplausos.
export const sonarGana = () => tocar((c) => {
  [60, 64, 67, 72].forEach((m, i) => nota(c, hz(m), i * 0.09, 0.32, { tipo: 'triangle', volumen: 0.17 }));
  nota(c, hz(76), 0.36, 0.7, { tipo: 'triangle', volumen: 0.15 });
  aplauso(c, 0.3, 1.4, 0.8);
});

// Se acabaron las oportunidades: el trombón triste (wa, wa, wa, waaa).
export const sonarPierde = ({ despues = 0 } = {}) => tocar((c) => {
  const notas = [[58, 0, 0.42], [57, 0.45, 0.42], [56, 0.9, 0.42], [55, 1.35, 1.2]];
  notas.forEach(([m, t, d], i) => nota(c, hz(m), despues + t, d, {
    tipo: 'sawtooth',
    volumen: 0.07,
    ataque: 0.05,
    vibrato: i === notas.length - 1 ? { velocidad: 6, cuanto: 5 } : undefined,
  }));
});

// El platillo cuando la ruleta se detiene.
export const sonarPlatillo = () => tocar((c) => {
  soplo(c, 0, 1.4, { frecuencia: 5000, volumen: 0.1 });
  nota(c, 120, 0, 0.25, { volumen: 0.18, hasta: 50 }); // y un bombo
});

// Dulce: tonada alegre y aplausos.
export const sonarDulce = () => tocar((c) => {
  [72, 76, 79, 84].forEach((m, i) => nota(c, hz(m), 0.15 + i * 0.08, 0.3, { tipo: 'triangle', volumen: 0.16 }));
  aplauso(c, 0.2, 1.6);
});

// El premio mayor: fanfarria larga, brillo arriba y aplausos fuertes.
export const sonarSecreto = () => tocar((c) => {
  [60, 64, 67, 72, 67, 72, 76].forEach((m, i) => nota(c, hz(m), 0.15 + i * 0.1, 0.4, { tipo: 'triangle', volumen: 0.18 }));
  nota(c, hz(79), 0.9, 1.1, { tipo: 'triangle', volumen: 0.16 });
  [96, 100, 103].forEach((m, i) => nota(c, hz(m), 0.95 + i * 0.07, 0.6, { volumen: 0.05 }));
  aplauso(c, 0.4, 3, 1.4);
});

/*
 * El redoble mientras gira la ruleta: ruido de caja con un temblor rápido que
 * va creciendo. Se detiene con pararRedoble (o solo, a los `segundos`).
 */
let redoble = null;

export const pararRedoble = () => {
  if (!redoble) return;
  const { c, fuente, lfo, gan } = redoble;
  redoble = null;
  const t = c.currentTime;
  gan.gain.cancelScheduledValues(t);
  gan.gain.setTargetAtTime(0.0001, t, 0.03);
  fuente.stop(t + 0.2);
  lfo.stop(t + 0.2);
};

export const empezarRedoble = (segundos = 8) => tocar((c) => {
  pararRedoble();
  const t = c.currentTime;
  const fuente = c.createBufferSource();
  fuente.buffer = bufferDeRuido(c);
  fuente.loop = true;
  const f = c.createBiquadFilter();
  f.type = 'bandpass';
  f.frequency.value = 1800;
  f.Q.value = 0.7;
  // El temblor: el volumen sube y baja 22 veces por segundo, como palillos.
  const temblor = c.createGain();
  temblor.gain.value = 0.5;
  const lfo = c.createOscillator();
  lfo.type = 'square';
  lfo.frequency.value = 22;
  const prof = c.createGain();
  prof.gain.value = 0.5;
  lfo.connect(prof).connect(temblor.gain);
  const gan = c.createGain();
  gan.gain.setValueAtTime(0.0001, t);
  gan.gain.exponentialRampToValueAtTime(0.05, t + 0.3);
  gan.gain.exponentialRampToValueAtTime(0.11, t + segundos * 0.9);
  fuente.connect(f).connect(temblor).connect(gan).connect(c.destination);
  fuente.start(t);
  lfo.start(t);
  fuente.stop(t + segundos);
  lfo.stop(t + segundos);
  redoble = { c, fuente, lfo, gan };
});

// ── La música ──

/*
 * Cada pista es un bucle de semicorcheas: `tocar` recibe el paso del bucle y
 * el instante exacto en que suena, y programa lo que toca en ese paso.
 */
const bombo = (c, d, t, v = 0.2) => nota(c, 140, 0, 0.16, { en: t, volumen: v, hasta: 45, destino: d });
const caja = (c, d, t, v = 0.05) => soplo(c, 0, 0.12, { en: t, frecuencia: 1800, volumen: v, destino: d });
const platillito = (c, d, t, v = 0.02) => soplo(c, 0, 0.04, { en: t, frecuencia: 8000, volumen: v, destino: d });

// Alegre: Do – Sol – La menor – Fa, 8 compases, con melodía de corcheas.
const ACORDES_ALEGRE = [[60, 64, 67], [59, 62, 67], [57, 60, 64], [57, 60, 65]];
const BAJO_ALEGRE = [36, 43, 45, 41];
const MELODIA_ALEGRE = [
  [76, 79, 84, 79, 76, 79, 81, 79],
  [74, 79, 83, 79, 74, 79, 81, 79],
  [72, 76, 81, 76, 72, 76, 79, 76],
  [77, 76, 74, 72, 74, null, 67, null],
  [84, 83, 81, 79, 76, 79, 81, 84],
  [83, 81, 79, 74, 79, 81, 83, 86],
  [84, 81, 76, 72, 76, 81, 84, 81],
  [77, 79, 81, 79, 77, 76, 74, 72],
];

// Suspenso: La menor – La menor – Fa – Mi, lento, con un reloj de fondo.
const BAJO_TENSION = [33, 33, 29, 28];
const COLCHON_TENSION = [[57, 60, 64], [57, 60, 64], [53, 57, 60], [52, 56, 59]];

const PISTAS = {
  alegre: {
    bpm: 116,
    pasos: 128,
    tocar(c, d, paso, t, s) {
      const compas = Math.floor(paso / 16);
      const p = paso % 16;
      const acorde = compas % 4;
      if (p % 8 === 0) bombo(c, d, t);
      if (p % 8 === 4) caja(c, d, t);
      if (p % 4 === 2) platillito(c, d, t);
      if (p % 2 === 0) {
        nota(c, hz(BAJO_ALEGRE[acorde] + (p % 8 === 6 ? 12 : 0)), 0, s * 1.6, { en: t, tipo: 'triangle', volumen: 0.12, destino: d });
        const m = MELODIA_ALEGRE[compas][p / 2];
        if (m) nota(c, hz(m), 0, s * 1.7, { en: t, tipo: 'triangle', volumen: 0.06, destino: d });
      }
      if (p === 4 || p === 10 || p === 12) {
        for (const n of ACORDES_ALEGRE[acorde]) nota(c, hz(n), 0, s * 1.4, { en: t, tipo: 'square', volumen: 0.016, destino: d });
      }
    },
  },
  tension: {
    bpm: 96,
    pasos: 64,
    tocar(c, d, paso, t, s) {
      const compas = Math.floor(paso / 16);
      const p = paso % 16;
      if (p % 2 === 0) nota(c, hz(BAJO_TENSION[compas]), 0, s * 1.3, { en: t, tipo: 'triangle', volumen: 0.13, destino: d });
      if (p === 0) {
        for (const n of COLCHON_TENSION[compas]) nota(c, hz(n), 0, s * 16, { en: t, volumen: 0.022, ataque: 0.6, destino: d });
      }
      if (p % 4 === 0) nota(c, 2100, 0, 0.03, { en: t, volumen: 0.018, destino: d });
      if (p % 4 === 2) nota(c, 1600, 0, 0.03, { en: t, volumen: 0.012, destino: d });
      if (p === 12 && compas === 3) caja(c, d, t, 0.03);
    },
  },
};

const NIVEL = 0.55;          // volumen de la música
const NIVEL_BAJO = 0.16;     // mientras Tiqui habla
const ADELANTO = 0.15;       // cuánto se programa por adelantado (s)

const musica = { pista: null, deseada: null, paso: 0, siguiente: 0, gan: null, reloj: null, cambio: null, baja: false };

const programar = () => {
  const c = contexto;
  if (!c || !musica.pista) return;
  const pista = PISTAS[musica.pista];
  const s = 60 / pista.bpm / 4;
  // Si la pestaña estuvo dormida, no se tocan de golpe las notas atrasadas.
  if (musica.siguiente < c.currentTime - 0.05) musica.siguiente = c.currentTime + 0.05;
  while (musica.siguiente < c.currentTime + ADELANTO) {
    try { pista.tocar(c, musica.gan, musica.paso % pista.pasos, musica.siguiente, s); } catch { /* una nota menos */ }
    musica.siguiente += s;
    musica.paso += 1;
  }
};

const nivelActual = () => (musica.baja ? NIVEL_BAJO : NIVEL);

const arrancar = (pista) => {
  const c = contextoAudio();
  if (!c) return;
  if (!musica.gan) {
    musica.gan = c.createGain();
    musica.gan.gain.value = 0.0001;
    musica.gan.connect(c.destination);
  }
  musica.pista = pista;
  musica.paso = 0;
  musica.siguiente = c.currentTime + 0.05;
  musica.gan.gain.cancelScheduledValues(c.currentTime);
  musica.gan.gain.setTargetAtTime(nivelActual(), c.currentTime, 0.15);
  if (!musica.reloj) musica.reloj = setInterval(programar, 25);
};

const callarMusica = (luego) => {
  const c = contexto;
  clearTimeout(musica.cambio);
  if (!c || !musica.gan || !musica.pista) {
    musica.pista = null;
    luego?.();
    return;
  }
  musica.gan.gain.cancelScheduledValues(c.currentTime);
  musica.gan.gain.setTargetAtTime(0.0001, c.currentTime, 0.08);
  musica.cambio = setTimeout(() => {
    musica.pista = null;
    if (!luego) {
      clearInterval(musica.reloj);
      musica.reloj = null;
    }
    luego?.();
  }, 350);
};

/*
 * Pone la pista ('alegre', 'tension') o la calla (null). Si ya suena esa,
 * no la reinicia: pasar de una pregunta a otra no corta la música.
 */
export const tocarMusica = (pista) => {
  const quiere = musicaEncendida ? pista : null;
  if (quiere === musica.deseada) return;
  musica.deseada = quiere;
  if (!quiere) return callarMusica();
  if (!musica.pista) return arrancar(quiere);
  return callarMusica(() => arrancar(quiere));
};

// Baja la música mientras Tiqui habla, y la sube cuando termina.
export const bajarMusica = (si) => {
  musica.baja = !!si;
  const c = contexto;
  if (c && musica.gan && musica.pista) musica.gan.gain.setTargetAtTime(nivelActual(), c.currentTime, 0.2);
};

export const activarMusica = (si) => {
  musicaEncendida = !!si;
  if (!musicaEncendida) tocarMusica(null);
};

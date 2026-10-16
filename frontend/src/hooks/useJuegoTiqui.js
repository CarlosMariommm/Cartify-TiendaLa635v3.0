import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FRASES, MARCADOR_INICIAL, CONTADORES_VACIOS,
  anotar, estadoDelJuego, grupoDeReaccion, alguna,
  sacarDelMazo, armarPregunta, clipDePregunta, clipsDeVoz,
  armarRuleta, elegirPremio, leerGuardado, hoy, probabilidadSecreta,
} from '../utils/juegoTiqui';
import { cargarVozGrabada, decir, callar } from '../utils/vozJuego';
import {
  activarSonidos, activarMusica, tocarMusica, bajarMusica,
  sonarToque, sonarEmpezar, sonarPregunta, sonarAcierto, sonarError, sonarTiempo,
  sonarGana, sonarPierde, sonarReloj, sonarPlatillo, sonarDulce, sonarSecreto,
  empezarRedoble, pararRedoble,
} from '../utils/sonidosJuego';

/*
 * ============================================================
 * EL RETO DE TIQUI — useJuegoTiqui.js
 * ============================================================
 * Todo lo que pasa en el juego del stand; la pantalla (pages/JuegoTiqui.jsx)
 * solo pinta. Las reglas viven en utils/juegoTiqui.js.
 *
 * Las fases, en orden:
 *   inicio     la pantalla que invita a jugar (con la ruleta girando lento)
 *   reglas     Tiqui saluda y explica; al terminar sale la primera pregunta
 *   pregunta   Tiqui la lee; corre el tiempo
 *   respuesta  se marca la buena, Tiqui reacciona y sale el dato
 *   ruleta     ganó: a girar
 *   girando    la ruleta da vueltas
 *   premio     dulce o premio mayor
 *   fin        no llegó a la ruleta
 *
 * Lo que tiene que sobrevivir a recargar la página (cuántos premios mayores
 * quedan, los contadores del día, el mazo) se guarda en esta laptop.
 * ============================================================
 */

const LLAVE = 'reto-tiqui';

const leerLocal = () => {
  try {
    return JSON.parse(localStorage.getItem(LLAVE) || 'null');
  } catch {
    return null;
  }
};

// Cuánto se queda cada pantalla antes de seguir sola (en ms), con la voz ya terminada.
export const ESPERA = {
  reglas: 500,
  siguiente: 5500,   // tiempo de leer el dato
  aRuleta: 1800,
  aFin: 5500,
  premio: 25000,     // y vuelve al inicio para el siguiente
  fin: 20000,
};

const PARA_APURAR = 5; // los últimos segundos suenan y se ponen naranja

// Qué música suena en cada pantalla (ver sonidosJuego.js).
const PISTA_DE = {
  inicio: 'alegre',
  reglas: 'alegre',
  pregunta: 'tension',
  respuesta: 'tension',
  ruleta: 'alegre',
  girando: null,
};

export const useJuegoTiqui = () => {
  const [guardado, setGuardado] = useState(() => leerGuardado(leerLocal()));
  const { ajustes, contadores, mazo } = guardado;

  useEffect(() => {
    try {
      localStorage.setItem(LLAVE, JSON.stringify(guardado));
    } catch {
      // Sin almacenamiento el juego sigue; solo no recuerda al recargar.
    }
  }, [guardado]);

  useEffect(() => { activarSonidos(ajustes.sonidos); }, [ajustes.sonidos]);
  useEffect(() => { activarMusica(ajustes.musica); }, [ajustes.musica]);

  const [fase, setFase] = useState('inicio');
  const [marcador, setMarcador] = useState(MARCADOR_INICIAL);
  const [pregunta, setPregunta] = useState(null);
  const [numero, setNumero] = useState(0);
  const [salieron, setSalieron] = useState([]);
  const [respuesta, setRespuesta] = useState(null); // { elegida, acerto, porTiempo }
  const [premio, setPremio] = useState(null);       // { tipo, angulo }
  const [ruletaFija, setRuletaFija] = useState(null);
  const [prueba, setPrueba] = useState(false);      // giro de prueba del operador: no cuenta
  const [apurado, setApurado] = useState(false);
  const [voz, setVoz] = useState({ hablando: false, real: false, animo: '', termino: true });
  const [grabadas, setGrabadas] = useState(null);   // cuántas frases tienen su voz grabada

  const totalDeFrases = useMemo(() => clipsDeVoz().length, []);

  // Los audios grabados, a memoria una sola vez.
  useEffect(() => {
    let vivo = true;
    cargarVozGrabada(clipsDeVoz()).then((n) => { if (vivo) setGrabadas(n); });
    // La lista de voces del navegador llega tarde: se pide de una vez.
    window.speechSynthesis?.getVoices?.();
    return () => { vivo = false; callar(); };
  }, []);

  // ── La voz ──

  const turnoVoz = useRef(0);

  const hablar = useCallback((clip) => {
    const mio = ++turnoVoz.current;
    const vigente = () => mio === turnoVoz.current;
    const { animo, texto } = clip;
    setVoz({ hablando: false, real: false, animo, texto, termino: false });
    if (!ajustes.voz) {
      callar();
      // Sin voz, el juego sigue igual: lo dicho queda escrito en pantalla.
      setTimeout(() => vigente() && setVoz((v) => ({ ...v, termino: true })), 900);
      return;
    }
    decir(clip, {
      alEmpezar: (real) => vigente() && setVoz({ hablando: true, real, animo, texto, termino: false }),
      alTerminar: () => vigente() && setVoz({ hablando: false, real: false, animo, texto, termino: true }),
    });
  }, [ajustes.voz]);

  const silenciar = useCallback(() => {
    turnoVoz.current += 1;
    callar();
    setVoz((v) => ({ ...v, hablando: false, real: false, termino: true }));
  }, []);

  // ── Lo guardado ──

  const contar = useCallback((clave) => {
    setGuardado((g) => {
      const dia = hoy();
      const base = g.dia === dia ? g.contadores : CONTADORES_VACIOS;
      return { ...g, dia, contadores: { ...base, [clave]: base[clave] + 1 } };
    });
  }, []);

  const cambiarAjuste = useCallback((clave, valor) => {
    setGuardado((g) => ({ ...g, ajustes: { ...g.ajustes, [clave]: valor } }));
  }, []);

  const reiniciarContadores = useCallback(() => {
    setGuardado((g) => ({ ...g, dia: hoy(), contadores: { ...CONTADORES_VACIOS } }));
  }, []);

  // ── El juego ──

  const siguientePregunta = useCallback(() => {
    const { id, mazo: resto } = sacarDelMazo(mazo, { yaSalieron: salieron });
    setGuardado((g) => ({ ...g, mazo: resto }));
    const p = armarPregunta(id);
    setPregunta(p);
    setSalieron((s) => [...s, id]);
    setNumero((n) => n + 1);
    setRespuesta(null);
    setApurado(false);
    setFase('pregunta');
    sonarPregunta();
    hablar(clipDePregunta(p));
  }, [mazo, salieron, hablar]);

  const empezar = useCallback(() => {
    setMarcador(MARCADOR_INICIAL);
    setNumero(0);
    setSalieron([]);
    setRespuesta(null);
    setPremio(null);
    setRuletaFija(null);
    setPrueba(false);
    contar('jugaron');
    setFase('reglas');
    sonarEmpezar();
    hablar(FRASES.bienvenida[0]);
  }, [contar, hablar]);

  // `i` es la opción elegida; -1, que se acabó el tiempo.
  const responder = useCallback((i) => {
    if (fase !== 'pregunta' || !pregunta) return;
    const porTiempo = i < 0;
    const acerto = !porTiempo && !!pregunta.opciones[i]?.correcta;
    const nuevo = anotar(marcador, acerto);
    const estado = estadoDelJuego(nuevo);
    setMarcador(nuevo);
    setRespuesta({ elegida: i, acerto, porTiempo });
    setApurado(false);
    setFase('respuesta');
    if (acerto) (estado === 'gano' ? sonarGana : sonarAcierto)();
    else (porTiempo ? sonarTiempo : sonarError)();
    // Si con eso se acabó la partida, después del error suena el trombón triste.
    if (estado === 'perdio') sonarPierde({ despues: 0.6 });
    hablar(alguna(FRASES[grupoDeReaccion(nuevo, acerto, porTiempo)]));
  }, [fase, pregunta, marcador, hablar]);

  const avanzar = useCallback(() => {
    if (fase === 'reglas') {
      siguientePregunta();
      return;
    }
    if (fase !== 'respuesta') return;
    const estado = estadoDelJuego(marcador);
    if (estado === 'gano') {
      silenciar();
      sonarToque();
      contar('ruleta');
      setRuletaFija(null);
      setFase('ruleta');
    } else if (estado === 'perdio') {
      setFase('fin');
    } else {
      siguientePregunta();
    }
  }, [fase, marcador, siguientePregunta, silenciar, contar]);

  const volverAlInicio = useCallback(() => {
    silenciar();
    pararRedoble();
    sonarToque();
    setPrueba(false);
    setRuletaFija(null);
    setPremio(null);
    setFase('inicio');
  }, [silenciar]);

  /*
   * La ruleta: la que se ve en todo momento, salvo mientras gira y muestra el
   * premio. Con la probabilidad automática, su porción secreta cambia de
   * tamaño con cada premio que se entrega (ver probabilidadSecreta).
   */
  const probabilidad = probabilidadSecreta(ajustes);
  const ruletaActual = useMemo(
    () => armarRuleta({ porcentajeSecreto: probabilidad, quedanSecretos: ajustes.secretos }),
    [probabilidad, ajustes.secretos],
  );
  const ruleta = ruletaFija || ruletaActual;

  const girar = useCallback(() => {
    if (fase !== 'ruleta') return;
    // La de este giro queda fija: si se gana el último secreto, su porción
    // no se vuelve "Agotado" en el mismo instante en que se ganó.
    const porciones = ruletaActual;
    setRuletaFija(porciones);
    setPremio(elegirPremio(porciones));
    setFase('girando');
    // El redoble dura lo que gira la ruleta: lo corta el platillo al parar.
    empezarRedoble(8);
    hablar(FRASES.girar[0]);
  }, [fase, ruletaActual, hablar]);

  // La ruleta avisa cuando se detiene.
  const alParar = useCallback(() => {
    if (fase !== 'girando' || !premio) return;
    const secreto = premio.tipo === 'secreto';
    if (!prueba) {
      contar(secreto ? 'secretos' : 'dulces');
      // El premio sale de la bolsa: baja lo que queda de ese tipo.
      if (secreto) cambiarAjuste('secretos', Math.max(0, ajustes.secretos - 1));
      else cambiarAjuste('dulces', Math.max(0, ajustes.dulces - 1));
    }
    pararRedoble();
    sonarPlatillo();
    (secreto ? sonarSecreto : sonarDulce)();
    setFase('premio');
    hablar(alguna(FRASES[premio.tipo]));
  }, [fase, premio, prueba, contar, cambiarAjuste, ajustes.secretos, ajustes.dulces, hablar]);

  // El operador prueba la ruleta sin jugar: no cuenta ni gasta premios.
  const probarRuleta = useCallback(() => {
    silenciar();
    setPrueba(true);
    setPremio(null);
    setRuletaFija(null);
    setFase('ruleta');
  }, [silenciar]);

  // ── Lo que pasa solo ──

  // El tiempo de cada pregunta, y el reloj que suena al final.
  useEffect(() => {
    if (fase !== 'pregunta' || !ajustes.segundos) return undefined;
    const relojes = [setTimeout(() => responder(-1), ajustes.segundos * 1000)];
    const apurar = (ajustes.segundos - PARA_APURAR) * 1000;
    relojes.push(setTimeout(() => setApurado(true), apurar));
    for (let s = 0; s < PARA_APURAR; s++) relojes.push(setTimeout(sonarReloj, apurar + s * 1000));
    return () => relojes.forEach(clearTimeout);
    // Solo al cambiar de pregunta: `responder` cambia con ella.
  }, [fase, pregunta?.id, ajustes.segundos, responder]);

  /*
   * Seguir sola cuando Tiqui terminó de hablar: así el stand avanza aunque
   * nadie toque nada, y quien juega puede adelantarse con el botón.
   */
  const espera = useMemo(() => {
    if (!voz.termino) return 0;
    if (fase === 'reglas') return ESPERA.reglas;
    if (fase === 'respuesta') {
      const estado = estadoDelJuego(marcador);
      return estado === 'gano' ? ESPERA.aRuleta : estado === 'perdio' ? ESPERA.aFin : ESPERA.siguiente;
    }
    if (fase === 'premio') return ESPERA.premio;
    if (fase === 'fin') return ESPERA.fin;
    return 0;
  }, [fase, voz.termino, marcador]);

  useEffect(() => {
    if (!espera) return undefined;
    const seguir = fase === 'premio' || fase === 'fin' ? volverAlInicio : avanzar;
    const reloj = setTimeout(seguir, espera);
    return () => clearTimeout(reloj);
  }, [espera, fase, avanzar, volverAlInicio]);

  /*
   * La música de cada pantalla: alegre para llamar gente y en la ruleta, de
   * suspenso mientras se piensa. Calla mientras gira (suena el redoble) y en
   * el final deja sonar la fanfarria o el trombón antes de volver.
   */
  useEffect(() => {
    if (fase === 'premio' || fase === 'fin') {
      tocarMusica(null);
      const reloj = setTimeout(() => tocarMusica('alegre'), 4000);
      return () => clearTimeout(reloj);
    }
    tocarMusica(PISTA_DE[fase] ?? null);
    return undefined;
  }, [fase, ajustes.musica]);

  // Mientras Tiqui habla, la música baja para que se le entienda.
  useEffect(() => { bajarMusica(voz.hablando); }, [voz.hablando]);

  // Al salir de la pantalla del juego, silencio.
  useEffect(() => () => {
    tocarMusica(null);
    pararRedoble();
  }, []);

  return {
    fase, marcador, pregunta, numero, respuesta, premio, prueba, apurado,
    ruleta, probabilidad, voz, grabadas, totalDeFrases, espera,
    ajustes, contadores,
    empezar, responder, avanzar, girar, alParar, volverAlInicio, probarRuleta,
    cambiarAjuste, reiniciarContadores,
  };
};

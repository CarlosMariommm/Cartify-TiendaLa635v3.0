import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { tiquiPanelService } from '../api/tiquiPanelService';
import { decirConTiqui, callarTiqui, paraDecir, desbloquearAudio } from '../utils/vozTiqui';
import { avisarCambioDeTiqui } from '../utils/cambiosDeTiqui';

// TIQUI DEL PANEL — la conversación (useTiquiPanel.js)
// La asistente del equipo, la que flota en la esquina del panel.

const SILENCIOS_ANTES_DE_DESCANSAR = 2;
const REINTENTO_SILENCIO_MS = 900;
const LLAVE_SILENCIO = 'kartify:tiqui-panel-sin-voz';
// El último consejo de ventas que se omitió: ese no vuelve a salir; uno nuevo, sí.
const LLAVE_CONSEJO = 'kartify:tiqui-panel-consejo-omitido';

// Lo que dice cuando no pudo contestar, según por qué.
const SIN_RESPUESTA = {
  'sin-ia': 'Ahorita no tengo con qué pensar: falta configurar la IA en el servidor.',
  tope: 'Me hiciste muchas preguntas seguidas. Dame un minuto y seguimos.',
  lento: 'El servidor se estaba despertando y tardó mucho. Pregúntame otra vez, ahora ya contesto rápido.',
  'sin-red': 'No me pude conectar con el servidor. Revisa la conexión y me vuelves a preguntar.',
};
const NO_ENTENDI = 'No te entendí bien. ¿Me lo repites?';

// Cuando Tiqui propuso un cambio ("¿Lo hago?"), un "sí" o un "no" cortos lo contestan sin pasar
// por la IA. Cortos a propósito: "sí, pero ponlo a $8" no es un sí a lo de antes, es otro pedido,
// y va a la IA como cualquier frase.
const plano = (t) => String(t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
  .replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
const ES_SI = /^(si|sip|dale|hazlo|confirmo|confirmado|confirma|ok|okay|va|claro|adelante|de acuerdo|correcto|asi es|simon|sale|por favor)( .*)?$/;
const ES_NO = /^(no|nel|cancela|cancelalo|mejor no|olvidalo|dejalo|espera|todavia no)( .*)?$/;
const respuestaCorta = (frase, patron) => {
  const t = plano(frase);
  return t.split(' ').length <= 4 && patron.test(t);
};

// La voz del sistema (respaldo de la de Tiqui): una latinoamericana si hay.
const ACENTOS = ['es-SV', 'es-MX', 'es-US', 'es-419', 'es-GT', 'es-CO'];
const vozDelSistema = () => {
  const voces = (window.speechSynthesis?.getVoices?.() || []).filter((v) => (v.lang || '').toLowerCase().startsWith('es'));
  // Primero las del equipo (suenan al instante); las "en línea" tardan en arrancar.
  return ACENTOS.map((a) => voces.find((v) => v.lang === a && v.localService)).find(Boolean)
    || voces.find((v) => v.localService)
    || ACENTOS.map((a) => voces.find((v) => v.lang === a)).find(Boolean)
    || voces[0] || null;
};

export const useTiquiPanel = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [abierta, setAbierta] = useState(false);   // se ve la charla
  const [activo, setActivo] = useState(false);     // charla por voz en curso
  const [escuchando, setEscuchando] = useState(false);
  const [pensando, setPensando] = useState(false);
  const [hablando, setHablando] = useState(false);
  const [transcripcion, setTranscripcion] = useState('');
  const [mensajes, setMensajes] = useState([]);    // [{ id, quien: 'tiqui'|'persona', texto }]
  const [confundida, setConfundida] = useState(false);
  // El cambio que Tiqui propuso y espera un sí: { token, resumen } (firmado por el servidor).
  const [pendiente, setPendiente] = useState(null);
  const pendienteRef = useRef(null);
  const [vozTiqui, setVozTiqui] = useState(false);
  const [sonandoTiqui, setSonandoTiqui] = useState(false);
  const [muteada, setMuteada] = useState(() => {
    try { return localStorage.getItem(LLAVE_SILENCIO) === '1'; } catch { return false; }
  });

  const soportado = typeof window !== 'undefined' && !!(window.SpeechRecognition || window.webkitSpeechRecognition);

  const recRef = useRef(null);
  const activoRef = useRef(false);
  const muteRef = useRef(muteada);
  const vozTiquiRef = useRef(false);
  const fallasVozRef = useRef(0);
  const silencioRef = useRef(0);
  const despiertaRef = useRef(false);
  const idRef = useRef(0);
  // La charla al día en el mismo instante (el estado llega un render tarde).
  const memoriaRef = useRef([]);
  const pantallaRef = useRef(location.pathname);
  // Las funciones que se llaman desde callbacks del micrófono (que se arman
  // antes de que existan): se leen por ref, siempre la última.
  const procesarRef = useRef(null);
  const escucharRef = useRef(null);

  // Lo que los callbacks leen al momento, al día después de cada render.
  useEffect(() => { muteRef.current = muteada; }, [muteada]);
  useEffect(() => { pantallaRef.current = `${location.pathname}${location.search}`; }, [location.pathname, location.search]);

  // `extra`: marcas del mensaje para la pantalla (`consejo`); a la IA solo viaja quién y qué.
  const registrar = (quien, texto, extra = {}) => {
    memoriaRef.current = [...memoriaRef.current.slice(-7), { quien, texto }];
    setMensajes((m) => [...m.slice(-7), { id: idRef.current++, quien, texto, ...extra }]);
  };

  const callarTodo = () => {
    callarTiqui();
    setSonandoTiqui(false);
    window.speechSynthesis?.cancel();
  };

  const pararEscucha = () => {
    const rec = recRef.current;
    recRef.current = null;
    if (rec) {
      rec.onend = null;
      try { rec.abort(); } catch { /* ya estaba parado */ }
    }
    setEscuchando(false);
  };

  const escuchar = useCallback(() => {
    if (!soportado || !activoRef.current) return;
    callarTodo();
    pararEscucha();
    setTranscripcion('');

    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const rec = new SR();
    rec.lang = 'es-SV';
    rec.continuous = false;
    rec.interimResults = true;
    let dicho = '';

    rec.onstart = () => setEscuchando(true);
    rec.onresult = (e) => {
      let enVivo = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) dicho += t;
        else enVivo += t;
      }
      setTranscripcion(dicho || enVivo);
    };
    rec.onerror = () => setEscuchando(false);
    rec.onend = () => {
      recRef.current = null;
      setEscuchando(false);
      if (dicho.trim()) {
        silencioRef.current = 0;
        procesarRef.current?.(dicho.trim());
        return;
      }
      if (!activoRef.current) return;
      // Silencio: vuelve a escuchar una vez más, y si nada, descansa.
      silencioRef.current += 1;
      if (silencioRef.current >= SILENCIOS_ANTES_DE_DESCANSAR) {
        silencioRef.current = 0;
        activoRef.current = false;
        setActivo(false);
      } else {
        setTimeout(() => escucharRef.current?.(), REINTENTO_SILENCIO_MS);
      }
    };

    recRef.current = rec;
    try { rec.start(); } catch { /* ya estaba escuchando */ }
  }, [soportado]);

  const decirConElSistema = (texto, continuar) => {
    const sintesis = window.speechSynthesis;
    if (!sintesis) { continuar(); return; }
    sintesis.cancel();
    const u = new SpeechSynthesisUtterance(paraDecir(texto));
    const voz = vozDelSistema();
    if (voz) { u.voice = voz; u.lang = voz.lang; } else { u.lang = 'es-SV'; }
    // Si el navegador no avisa que terminó (pasa en el teléfono), sigue igual al acabarse el tiempo.
    let listo = false;
    const una = () => {
      if (listo) return;
      listo = true;
      clearTimeout(plazo);
      continuar();
    };
    const plazo = setTimeout(una, 2500 + paraDecir(texto).length * 90);
    u.onend = una;
    u.onerror = una;
    sintesis.speak(u);
  };

  const hablar = useCallback((texto) => {
    registrar('tiqui', texto);

    const continuar = () => {
      setHablando(false);
      if (activoRef.current) setTimeout(() => escuchar(), 350);
    };

    if (muteRef.current) { continuar(); return; }

    callarTodo();
    setHablando(true);

    if (vozTiquiRef.current) {
      decirConTiqui(tiquiPanelService.urlVoz(texto), {
        alEmpezar: () => setSonandoTiqui(true),
        alTerminar: () => {
          fallasVozRef.current = 0;
          setSonandoTiqui(false);
          continuar();
        },
        alFallar: () => {
          setSonandoTiqui(false);
          // Dos fallas seguidas: en esta charla ya no se intenta, para no
          // hacer esperar cuatro segundos cada vez.
          fallasVozRef.current += 1;
          if (fallasVozRef.current >= 2) {
            vozTiquiRef.current = false;
            setVozTiqui(false);
          }
          decirConElSistema(texto, continuar);
        },
      });
      return;
    }
    decirConElSistema(texto, continuar);
  }, [escuchar]);

  const guardarPendiente = (p) => {
    pendienteRef.current = p;
    setPendiente(p);
  };

  // Hace el cambio que la persona confirmó (tocando "Sí, hazlo" o diciendo que sí).
  const aplicar = useCallback(async () => {
    const p = pendienteRef.current;
    if (!p) return;
    guardarPendiente(null);
    setConfundida(false);
    setPensando(true);
    const r = await tiquiPanelService.confirmar(p.token);
    setPensando(false);
    if (r?.ok) avisarCambioDeTiqui(r.tipo);
    else setConfundida(true);
    hablar(r?.respuesta || 'No pude hacerlo. Inténtalo desde la pantalla.');
  }, [hablar]);

  const descartar = useCallback(() => {
    if (!pendienteRef.current) return;
    guardarPendiente(null);
    hablar('Listo, no cambio nada.');
  }, [hablar]);

  const procesar = useCallback(async (frase) => {
    // Lo de antes de esta frase: la frase misma viaja aparte.
    const historial = memoriaRef.current.slice(-6);
    registrar('persona', frase);
    setTranscripcion('');
    setConfundida(false);

    // ¿Contesta al "¿Lo hago?" de un cambio propuesto?
    if (pendienteRef.current) {
      if (respuestaCorta(frase, ES_SI)) { aplicar(); return; }
      if (respuestaCorta(frase, ES_NO)) { descartar(); return; }
      // Pidió otra cosa: lo propuesto queda sin hacer.
      guardarPendiente(null);
    }

    setPensando(true);
    const r = await tiquiPanelService.conversar({ frase, historial, pantalla: pantallaRef.current });
    setPensando(false);
    if (r?.confirmar?.token) guardarPendiente({ token: r.confirmar.token, resumen: r.confirmar.resumen });

    const ruta = r?.acciones?.find((a) => a.tipo === 'ir')?.ruta;
    if (ruta) navigate(ruta);

    const texto = r?.entendido && r.respuesta ? r.respuesta : SIN_RESPUESTA[r?.origen] || NO_ENTENDI;
    if (!r?.entendido) setConfundida(true);
    hablar(texto);
  }, [navigate, hablar, aplicar, descartar]);

  useEffect(() => {
    procesarRef.current = procesar;
    escucharRef.current = escuchar;
  }, [procesar, escuchar]);

  // La primera vez que se despierta: el servidor (Render lo duerme) y la voz.
  const prepararServidor = () => {
    if (despiertaRef.current) return;
    despiertaRef.current = true;
    tiquiPanelService.despertar().then(({ voz, consejo }) => {
      vozTiquiRef.current = voz;
      setVozTiqui(voz);
      // El consejo de ventas (solo al administrador, y solo si hay algo que lo amerite: una promo que
      // deja pérdida, algo que caduca). Va como lo primero que dice Tiqui, en lugar del saludo, y queda
      // en la charla para que un "sí, ajústala" sepa de qué se habla.
      let omitido = '';
      try { omitido = localStorage.getItem(LLAVE_CONSEJO) || ''; } catch { /* modo privado */ }
      if (consejo && consejo !== omitido && !memoriaRef.current.length) {
        memoriaRef.current = [{ quien: 'tiqui', texto: consejo }];
        setMensajes([{ id: idRef.current++, quien: 'tiqui', texto: consejo, consejo: true }]);
      }
    });
  };

  // Tocarla: la despierta y escucha; si está hablando, la interrumpe.
  const tocar = useCallback(() => {
    setAbierta(true);
    prepararServidor();
    // En el toque: el teléfono solo deja sonar la voz si el primer sonido sale de un toque.
    desbloquearAudio();
    if (!soportado) return; // sin micrófono, se le escribe
    if (pensando) return;   // ya va a contestar: otra frase se le encimaría
    if (escuchando && !hablando) {
      activoRef.current = false;
      setActivo(false);
      pararEscucha();
      return;
    }
    callarTodo();
    setHablando(false);
    silencioRef.current = 0;
    activoRef.current = true;
    setActivo(true);
    escuchar();
  }, [soportado, pensando, escuchando, hablando, escuchar]);

  // Escribirle: para de escuchar (quien escribe quiere seguir escribiendo).
  const escribir = useCallback((texto) => {
    const frase = String(texto || '').trim();
    if (!frase || pensando) return;
    setAbierta(true);
    prepararServidor();
    desbloquearAudio();
    activoRef.current = false;
    setActivo(false);
    pararEscucha();
    callarTodo();
    setHablando(false);
    procesar(frase);
  }, [pensando, procesar]);

  const cerrar = useCallback(() => {
    activoRef.current = false;
    setActivo(false);
    pararEscucha();
    callarTodo();
    setHablando(false);
    setAbierta(false);
  }, []);

  // Quita el consejo de ventas y no lo vuelve a mostrar (hasta que haya otro distinto).
  const omitirConsejo = useCallback(() => {
    const consejo = memoriaRef.current.find((m, i) => i === 0 && m.quien === 'tiqui')?.texto || '';
    try { localStorage.setItem(LLAVE_CONSEJO, consejo); } catch { /* modo privado */ }
    memoriaRef.current = memoriaRef.current.filter((m) => m.texto !== consejo);
    setMensajes((lista) => lista.filter((m) => !m.consejo));
    callarTodo();
    setHablando(false);
  }, []);

  // Borra la charla y empieza de cero (lo propuesto sin confirmar queda sin hacer).
  const nuevaCharla = useCallback(() => {
    activoRef.current = false;
    setActivo(false);
    pararEscucha();
    callarTodo();
    setHablando(false);
    guardarPendiente(null);
    setConfundida(false);
    memoriaRef.current = [];
    setMensajes([]);
  }, []);

  const alternarVoz = useCallback(() => {
    setMuteada((m) => {
      try { localStorage.setItem(LLAVE_SILENCIO, m ? '0' : '1'); } catch { /* modo privado */ }
      return !m;
    });
    callarTodo();
    setHablando(false);
  }, []);

  // Al salir del panel: nada sigue escuchando ni hablando.
  useEffect(() => () => {
    activoRef.current = false;
    pararEscucha();
    callarTiqui();
    window.speechSynthesis?.cancel();
  }, []);

  return {
    abierta, activo, escuchando, pensando, hablando, transcripcion, mensajes, confundida,
    muteada, vozTiqui, sonandoTiqui, soportado,
    tocar, escribir, cerrar, alternarVoz, omitirConsejo, nuevaCharla,
    // Un cambio propuesto esperando respuesta, y cómo contestarle con botones.
    pendiente, confirmar: aplicar, descartar,
  };
};

export default useTiquiPanel;

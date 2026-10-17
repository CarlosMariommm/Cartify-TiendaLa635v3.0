import { describe, it, expect } from 'vitest';
import {
  PREGUNTAS, FRASES, clipsDeVoz, archivoDeVoz, huella,
  MARCADOR_INICIAL, anotar, estadoDelJuego, grupoDeReaccion,
  mezclar, sacarDelMazo, armarPregunta,
  armarRuleta, elegirPremio, giroHasta, porcionEnLaFlecha, probabilidadSecreta,
  leerGuardado, AJUSTES_INICIALES,
} from './juegoTiqui';

// El reto de Tiqui del stand: lo que no se puede probar a ojo en la Expo. Sobre todo la ruleta:
// que el premio mayor salga con la probabilidad que se ve, y que nunca salga si ya no queda.

// Un azar que se repite, para que las pruebas den siempre lo mismo.
const azarFijo = (semilla = 7) => {
  let s = semilla;
  return () => {
    s = (s * 1664525 + 1013904223) % 2 ** 32;
    return s / 2 ** 32;
  };
};

describe('las preguntas', () => {
  it('tienen id único, tres opciones distintas y su dato', () => {
    const ids = PREGUNTAS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const p of PREGUNTAS) {
      expect(p.opciones).toHaveLength(3);
      expect(new Set(p.opciones).size).toBe(3);
      expect(p.dato?.length).toBeGreaterThan(10);
    }
  });

  it('alcanzan para varios jugadores seguidos sin repetir', () => {
    // Una partida usa como mucho 4 preguntas (3 aciertos y 1 error).
    expect(PREGUNTAS.length).toBeGreaterThanOrEqual(32);
  });

  it('al mezclar, la correcta sigue siendo la misma', () => {
    const p = armarPregunta('codigo-entrega', azarFijo());
    expect(p.opciones).toHaveLength(3);
    expect(p.opciones.filter((o) => o.correcta).map((o) => o.texto)).toEqual(['4']);
  });
});

describe('la voz grabada', () => {
  it('cada frase tiene su archivo, sin choques de nombre', () => {
    const clips = clipsDeVoz();
    const archivos = clips.map(archivoDeVoz);
    expect(new Set(archivos).size).toBe(clips.length);
    expect(archivos.every((a) => /^[a-z0-9-]+-[0-9a-f]{8}\.mp3$/.test(a))).toBe(true);
  });

  it('si cambia el texto, cambia el archivo', () => {
    expect(huella('¡Hola!')).not.toBe(huella('¡Hola'));
    expect(huella('¡Hola!')).toBe(huella('¡Hola!'));
  });

  it('las frases van con un ánimo que el servidor conoce', () => {
    const conocidos = ['alegre', 'emocionada', 'asombrada', 'rie', 'apenada', 'dudosa', 'despertando'];
    for (const f of Object.values(FRASES).flat()) expect(conocidos).toContain(f.animo);
  });
});

describe('el marcador', () => {
  it('3 aciertos antes de 2 errores gana; perdona un error', () => {
    let m = MARCADOR_INICIAL;
    m = anotar(m, true);
    m = anotar(m, false);
    expect(estadoDelJuego(m)).toBe('jugando');
    m = anotar(m, true);
    m = anotar(m, true);
    expect(estadoDelJuego(m)).toBe('gano');
  });

  it('con 2 errores se acaba', () => {
    const m = anotar(anotar(MARCADOR_INICIAL, false), false);
    expect(estadoDelJuego(m)).toBe('perdio');
  });

  it('Tiqui dice cómo va el juego', () => {
    expect(grupoDeReaccion({ aciertos: 1, errores: 0 }, true)).toBe('acierto');
    expect(grupoDeReaccion({ aciertos: 2, errores: 1 }, true)).toBe('aciertoCasi');
    expect(grupoDeReaccion({ aciertos: 3, errores: 1 }, true)).toBe('gana');
    expect(grupoDeReaccion({ aciertos: 1, errores: 1 }, false)).toBe('error');
    expect(grupoDeReaccion({ aciertos: 1, errores: 2 }, false)).toBe('pierde');
    expect(grupoDeReaccion({ aciertos: 0, errores: 1 }, false, true)).toBe('tiempo');
    expect(grupoDeReaccion({ aciertos: 0, errores: 2 }, false, true)).toBe('tiempoPierde');
  });
});

describe('el mazo', () => {
  it('no repite hasta acabarse', () => {
    const ids = ['a', 'b', 'c', 'd'];
    let mazo = [];
    const salieron = [];
    for (let i = 0; i < 4; i++) {
      const r = sacarDelMazo(mazo, { ids, azar: azarFijo(i + 1) });
      salieron.push(r.id);
      mazo = r.mazo;
    }
    expect([...salieron].sort()).toEqual(ids);
  });

  it('al barajar a media partida, las que ya salieron van al fondo', () => {
    const ids = ['a', 'b', 'c', 'd'];
    const r = sacarDelMazo([], { ids, yaSalieron: ['a', 'b', 'c'], azar: azarFijo() });
    expect(r.id).toBe('d');
  });

  it('se olvida de preguntas que ya no existen', () => {
    const r = sacarDelMazo(['vieja', 'b'], { ids: ['a', 'b'] });
    expect(r.id).toBe('b');
  });

  it('mezclar no pierde ni duplica', () => {
    expect(mezclar([1, 2, 3, 4, 5], azarFijo()).sort()).toEqual([1, 2, 3, 4, 5]);
  });
});

describe('la ruleta', () => {
  it('cada porción mide lo que vale: 15 % secreto son 54°', () => {
    const r = armarRuleta({ porcentajeSecreto: 15, quedanSecretos: 5 });
    const secreto = r.find((p) => p.tipo === 'secreto');
    expect(secreto.hasta - secreto.desde).toBeCloseTo(54);
    const dulces = r.filter((p) => p.tipo === 'dulce');
    expect(dulces).toHaveLength(6);
    for (const d of dulces) expect(d.hasta - d.desde).toBeCloseTo(51);
    expect(r[r.length - 1].hasta).toBeCloseTo(360);
  });

  it('el secreto sale más o menos el 15 % de las veces', () => {
    const r = armarRuleta({ porcentajeSecreto: 15, quedanSecretos: 5 });
    const azar = azarFijo(42);
    let secretos = 0;
    const veces = 20000;
    for (let i = 0; i < veces; i++) if (elegirPremio(r, azar).tipo === 'secreto') secretos++;
    expect(secretos / veces).toBeGreaterThan(0.13);
    expect(secretos / veces).toBeLessThan(0.17);
  });

  it('sin premios mayores, nunca cae en el secreto', () => {
    const r = armarRuleta({ porcentajeSecreto: 15, quedanSecretos: 0 });
    expect(r.find((p) => p.tipo === 'secreto').agotado).toBe(true);
    const azar = azarFijo(3);
    for (let i = 0; i < 5000; i++) expect(elegirPremio(r, azar).tipo).toBe('dulce');
  });

  it('el ángulo elegido cae dentro de su porción, lejos de las rayas', () => {
    const r = armarRuleta();
    const azar = azarFijo(9);
    for (let i = 0; i < 2000; i++) {
      const { tipo, angulo } = elegirPremio(r, azar);
      const p = r.find((x) => angulo >= x.desde && angulo < x.hasta);
      expect(p.tipo).toBe(tipo);
      expect(angulo - p.desde).toBeGreaterThanOrEqual(1);
      expect(p.hasta - angulo).toBeGreaterThanOrEqual(1);
    }
  });

  it('el giro deja el premio bajo la flecha y da vueltas completas', () => {
    const r = armarRuleta();
    for (const [actual, angulo] of [[0, 10], [123, 200], [-40, 359], [1800.5, 180]]) {
      const giro = giroHasta(actual, angulo, 6);
      expect(giro - actual).toBeGreaterThanOrEqual(6 * 360);
      expect(giro - actual).toBeLessThan(7 * 360);
      const i = porcionEnLaFlecha(r, giro);
      expect(angulo >= r[i].desde && angulo < r[i].hasta).toBe(true);
    }
  });
});

describe('la probabilidad según los premios', () => {
  it('es la de sacar un secreto de la bolsa de premios', () => {
    expect(probabilidadSecreta({ modo: 'auto', secretos: 10, dulces: 60 })).toBeCloseTo(100 / 7);
    expect(probabilidadSecreta({ modo: 'auto', secretos: 15, dulces: 85 })).toBeCloseTo(15);
  });

  it('se mueve con cada premio que se entrega', () => {
    const antes = probabilidadSecreta({ modo: 'auto', secretos: 10, dulces: 60 });
    expect(probabilidadSecreta({ modo: 'auto', secretos: 10, dulces: 59 })).toBeGreaterThan(antes);
    expect(probabilidadSecreta({ modo: 'auto', secretos: 9, dulces: 60 })).toBeLessThan(antes);
  });

  it('se queda entre 1 % y 50 %', () => {
    expect(probabilidadSecreta({ modo: 'auto', secretos: 1, dulces: 500 })).toBe(1);
    expect(probabilidadSecreta({ modo: 'auto', secretos: 30, dulces: 10 })).toBe(50);
    expect(probabilidadSecreta({ modo: 'auto', secretos: 5, dulces: 0 })).toBe(50);
  });

  it('fija, no le importan los premios', () => {
    expect(probabilidadSecreta({ modo: 'fija', porcentaje: 20, secretos: 1, dulces: 500 })).toBe(20);
  });

  it('la porción de la ruleta mide lo que da la cuenta', () => {
    const pct = probabilidadSecreta({ modo: 'auto', secretos: 10, dulces: 60 });
    const secreto = armarRuleta({ porcentajeSecreto: pct, quedanSecretos: 10 }).find((p) => p.tipo === 'secreto');
    expect(secreto.hasta - secreto.desde).toBeCloseTo(360 / 7);
  });
});

describe('lo guardado en la laptop', () => {
  it('sin nada guardado, arranca de fábrica', () => {
    const g = leerGuardado(null, '2026-10-20');
    expect(g.ajustes).toEqual(AJUSTES_INICIALES);
    expect(g.contadores.jugaron).toBe(0);
  });

  it('los contadores se reinician al cambiar de día, los premios no', () => {
    const ayer = { dia: '2026-10-19', ajustes: { secretos: 4 }, contadores: { jugaron: 30 } };
    const g = leerGuardado(ayer, '2026-10-20');
    expect(g.contadores.jugaron).toBe(0);
    expect(g.ajustes.secretos).toBe(4);
    expect(leerGuardado(ayer, '2026-10-19').contadores.jugaron).toBe(30);
  });

  it('un valor raro vuelve al de fábrica', () => {
    const g = leerGuardado({ ajustes: { porcentaje: 300, segundos: 7, secretos: -2, dulces: 'muchos', modo: 'magia' } });
    expect(g.ajustes.porcentaje).toBe(15);
    expect(g.ajustes.segundos).toBe(30);
    expect(g.ajustes.secretos).toBe(10);
    expect(g.ajustes.dulces).toBe(60);
    expect(g.ajustes.modo).toBe('auto');
  });

  it('los dulces y el modo se recuerdan', () => {
    const g = leerGuardado({ ajustes: { dulces: 35, modo: 'fija' } });
    expect(g.ajustes.dulces).toBe(35);
    expect(g.ajustes.modo).toBe('fija');
  });
});

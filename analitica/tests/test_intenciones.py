"""La IA propia de Tiqui: que aprenda bien, que no haga acciones que nadie pidió y que el modelo
que usa el servidor esté al día con estos ejemplos."""

import json
from pathlib import Path

import pytest

from intenciones import entrenar
from intenciones.ejemplos import DIRECTAS, INTENCIONES, PRUEBA, generar
from intenciones.rasgos import normalizar, rasgos

MODELO_DEL_SERVIDOR = Path(__file__).resolve().parents[2] / "backend" / "src" / "datos" / "intencionesTiqui.json"


def test_normaliza_como_llega_de_la_voz():
    assert normalizar("¿Cuánto llevo?") == "cuanto llevo"
    assert normalizar("  Muéstrame la PIÑA!! ") == "muestrame la pina"
    assert normalizar(None) == ""


def test_rasgos_de_palabras_pares_y_letras():
    r = rasgos("mis puntos")
    assert {"p:mis", "p:puntos", "b:mis_puntos", "c: pu", "c:tos ", "c: mis "} <= set(r)
    assert rasgos("") == []


def test_los_ejemplos_salen_siempre_iguales_y_alcanzan():
    frases, intenciones = generar()
    assert (frases, intenciones) == generar()
    for intencion in INTENCIONES:
        assert intenciones.count(intencion) >= 80, intencion
    # Las frases de prueba no están entre las de entrenamiento: miden de verdad.
    vistas = set(frases)
    assert not [f for lista in PRUEBA.values() for f in lista if f in vistas]


def test_los_rasgos_se_eligen_igual_en_cualquier_maquina():
    # Empates de frecuencia: se desempata por orden alfabético, no por cómo ordene numpy.
    # "uno" y "dos" no comparten letras: todos sus rasgos aparecen igual de seguido.
    frases = ["uno", "uno", "dos", "dos"]
    assert entrenar.elegir_rasgos(frases, cuantos=2) == ["c: do", "c: dos"]
    # Lo más frecuente gana aunque vaya después en el alfabeto.
    assert entrenar.elegir_rasgos(["uno", "uno", "uno", "dos", "dos"], cuantos=1) == ["c: un"]
    assert entrenar.elegir_rasgos(frases) == entrenar.elegir_rasgos(list(reversed(frases)))


@pytest.fixture(scope="module")
def resultado():
    return entrenar.principal(exportar_archivos=False)


def test_entiende_lo_que_no_vio_y_no_hace_acciones_que_nadie_pidio(resultado):
    metricas = resultado["metricas"]
    assert metricas["prueba_aparte"] >= 0.95
    con_70 = metricas["por_umbral"]["0.7"]
    assert con_70["acciones_equivocadas"] == 0
    assert con_70["cobertura"] >= 0.85


def test_el_modelo_exportado_acierta_igual(resultado):
    exportado = resultado["exportado"]
    prueba = [(f, i) for i, lista in PRUEBA.items() for f in lista]
    aciertos = sum(1 for f, i in prueba if max(entrenar.predecir(exportado, f).items(), key=lambda kv: kv[1])[0] == i)
    assert aciertos / len(prueba) >= 0.95
    assert exportado["directas"] == DIRECTAS


def test_el_modelo_del_servidor_esta_al_dia(resultado):
    """Si se cambian los ejemplos o los rasgos, hay que volver a exportar: python -m intenciones.entrenar"""
    del_servidor = json.loads(MODELO_DEL_SERVIDOR.read_text(encoding="utf-8"))
    nuevo = resultado["exportado"]
    assert del_servidor["clases"] == nuevo["clases"]
    assert del_servidor["rasgos"] == nuevo["rasgos"]
    for frase in [f for lista in PRUEBA.values() for f in lista]:
        a = entrenar.predecir(del_servidor, frase)
        b = entrenar.predecir(nuevo, frase)
        assert max(abs(a[c] - b[c]) for c in a) < 0.02, frase
        # La misma intención cuando hay una clara; en las dudosas (dos casi
        # empatadas) los decimales de otra máquina pueden voltearlas.
        primera, segunda = sorted(a.values(), reverse=True)[:2]
        if primera - segunda > 0.05:
            assert max(a, key=a.get) == max(b, key=b.get), frase

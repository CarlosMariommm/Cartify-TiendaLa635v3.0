"""
Entrena la IA propia de Tiqui y la deja lista para el servidor.

    cd analitica
    .venv/Scripts/python.exe -m intenciones.entrenar

El modelo:
  - TF-IDF sobre los rasgos de rasgos.py (palabras, pares y pedazos de
    letras), con la frecuencia amortiguada (1 + log) y cada frase de largo 1;
  - una regresión logística multinomial: un peso por rasgo y por intención,
    y la probabilidad de cada intención con softmax.

Es pequeño a propósito: se entrena en segundos, contesta en menos de un
milisegundo y cabe en un JSON que Node usa sin Python (ver
backend/src/utils/intencionesTiqui.js). No reemplaza a Gemini: le quita lo
sencillo y frecuente, y lo cubre cuando Gemini está saturado.

Exporta dos archivos en backend/src/datos/:
  intencionesTiqui.json          el modelo (rasgos, idf, pesos, sesgos)
  intencionesTiqui.paridad.json  frases con las probabilidades que da ESTE
                                 modelo exportado: la prueba del servidor
                                 comprueba que Node calcula lo mismo.
"""

import json
import math
import sys
from collections import Counter
from datetime import date
from pathlib import Path

import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import StratifiedKFold, cross_val_score

from .ejemplos import A_GEMINI, DIRECTAS, PRUEBA, generar
from .rasgos import rasgos

DESTINO = Path(__file__).resolve().parents[2] / "backend" / "src" / "datos"
DECIMALES = 3


def entrenar(frases: list[str], intenciones: list[str]):
    vectorizador = TfidfVectorizer(analyzer=rasgos, sublinear_tf=True, min_df=2, max_features=4000)
    x = vectorizador.fit_transform(frases)
    modelo = LogisticRegression(C=8.0, max_iter=4000, class_weight="balanced")
    modelo.fit(x, intenciones)
    return vectorizador, modelo


def exportar(vectorizador, modelo) -> dict:
    """El modelo como datos: lo que Node necesita para calcular igual."""
    nombres = vectorizador.get_feature_names_out()
    coef = modelo.coef_  # (intenciones, rasgos)
    return {
        "version": 1,
        "entrenado": date.today().isoformat(),
        "clases": [str(c) for c in modelo.classes_],
        "directas": DIRECTAS,
        "rasgos": [str(n) for n in nombres],
        "idf": [round(float(v), DECIMALES) for v in vectorizador.idf_],
        # Por rasgo, su peso en cada intención (así se suma solo lo que trae la frase).
        "pesos": [[round(float(v), DECIMALES) for v in coef[:, j]] for j in range(coef.shape[1])],
        "sesgos": [round(float(v), DECIMALES) for v in modelo.intercept_],
    }


def predecir(exportado: dict, frase: str) -> dict:
    """La misma cuenta que hace Node con el JSON (la de referencia para la paridad)."""
    indice = {r: i for i, r in enumerate(exportado["rasgos"])}
    conteo = Counter(indice[r] for r in rasgos(frase) if r in indice)
    x = {i: (1 + math.log(c)) * exportado["idf"][i] for i, c in conteo.items()}
    largo = math.sqrt(sum(v * v for v in x.values())) or 1.0
    logits = list(exportado["sesgos"])
    for i, v in x.items():
        for k, peso in enumerate(exportado["pesos"][i]):
            logits[k] += peso * v / largo
    tope = max(logits)
    exps = [math.exp(z - tope) for z in logits]
    total = sum(exps)
    return {c: e / total for c, e in zip(exportado["clases"], exps)}


def medir(vectorizador, modelo, frases, intenciones) -> dict:
    validacion = cross_val_score(
        LogisticRegression(C=8.0, max_iter=4000, class_weight="balanced"),
        vectorizador.transform(frases), intenciones,
        cv=StratifiedKFold(n_splits=5, shuffle=True, random_state=635),
    )
    prueba = [(f, i) for i, lista in PRUEBA.items() for f in lista]
    probabilidades = modelo.predict_proba(vectorizador.transform([f for f, _ in prueba]))
    clases = list(modelo.classes_)
    predichas = [(clases[int(np.argmax(fila))], float(np.max(fila))) for fila in probabilidades]
    errores = [(f, i, p, c) for (f, i), (p, c) in zip(prueba, predichas) if p != i]

    # Lo que importa en la tienda: con cuánta confianza se contesta sin Gemini.
    # "Cobertura": de las frases directas, cuántas se contestan solas y bien.
    # "Acciones equivocadas": cuántas frases harían algo que no se pidió.
    directas_verdaderas = sum(1 for _, i in prueba if i in DIRECTAS)
    por_umbral = {}
    for umbral in (0.5, 0.6, 0.7, 0.8, 0.9):
        bien = sum(1 for (_, i), (p, c) in zip(prueba, predichas) if p in DIRECTAS and c >= umbral and p == i)
        mal = sum(1 for (_, i), (p, c) in zip(prueba, predichas) if p in DIRECTAS and c >= umbral and p != i)
        por_umbral[str(umbral)] = {"cobertura": round(bien / directas_verdaderas, 4), "acciones_equivocadas": mal}
    return {
        "validacion_cruzada": round(float(np.mean(validacion)), 4),
        "prueba_aparte": round(1 - len(errores) / len(prueba), 4),
        "frases_de_prueba": len(prueba),
        "por_umbral": por_umbral,
        "errores": errores,
    }


def principal(exportar_archivos: bool = True) -> dict:
    frases, intenciones = generar()
    vectorizador, modelo = entrenar(frases, intenciones)
    metricas = medir(vectorizador, modelo, frases, intenciones)
    exportado = exportar(vectorizador, modelo)
    exportado["metricas"] = {k: v for k, v in metricas.items() if k != "errores"}
    exportado["metricas"]["frases_de_entrenamiento"] = len(frases)

    print(f"Entrenado con {len(frases)} frases, {len(exportado['clases'])} intenciones, {len(exportado['rasgos'])} rasgos.")
    print(f"Validación cruzada (5 partes): {metricas['validacion_cruzada']:.1%}")
    print(f"Frases de prueba aparte: {metricas['prueba_aparte']:.1%} de {metricas['frases_de_prueba']}")
    for frase, esperada, dijo, confianza in metricas["errores"]:
        print(f"   x \"{frase}\": era {esperada}, dijo {dijo} ({confianza:.0%})")
    for umbral, m in metricas["por_umbral"].items():
        print(f"   con {float(umbral):.0%} de confianza: contesta sola {m['cobertura']:.0%} de las directas, {m['acciones_equivocadas']} acciones equivocadas")

    if exportar_archivos:
        DESTINO.mkdir(parents=True, exist_ok=True)
        (DESTINO / "intencionesTiqui.json").write_text(json.dumps(exportado, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
        frases_paridad = [f for lista in PRUEBA.values() for f in lista] + ["", "¿Cuánto llevo?", "PAGAR YA!!!", "carito", "a"]
        paridad = [
            {"frase": f, "probabilidades": {c: round(p, 6) for c, p in predecir(exportado, f).items()}}
            for f in frases_paridad
        ]
        (DESTINO / "intencionesTiqui.paridad.json").write_text(json.dumps(paridad, ensure_ascii=False, indent=1), encoding="utf-8")
        peso = (DESTINO / "intencionesTiqui.json").stat().st_size / 1024
        print(f"Exportado a {DESTINO} ({peso:.0f} KB).")
    return {"exportado": exportado, "metricas": metricas, "a_gemini": A_GEMINI}


if __name__ == "__main__":
    principal(exportar_archivos="--sin-exportar" not in sys.argv)

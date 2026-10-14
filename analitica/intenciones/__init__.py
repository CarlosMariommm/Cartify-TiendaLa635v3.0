"""
La IA propia de Tiqui: un clasificador de intenciones entrenado aquí y
exportado a backend/src/datos/intencionesTiqui.json, donde el servidor de
Node lo usa sin llamar a Python (ver backend/src/utils/intencionesTiqui.js).

    rasgos.py     cómo se convierte una frase en números (igual que en Node)
    ejemplos.py   las frases de entrenamiento y las de prueba, por intención
    entrenar.py   entrena, mide y exporta:  python -m intenciones.entrenar
"""

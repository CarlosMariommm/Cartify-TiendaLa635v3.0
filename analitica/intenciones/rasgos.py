"""
De una frase a sus "rasgos": las pistas con las que el modelo decide.

    p:pagar        cada palabra
    b:mis_puntos   cada par de palabras seguidas (el orden importa: "mis
                   pedidos" no es lo mismo que "pedidos de pan")
    c: pag         pedazos de 3 a 5 letras de cada palabra, con sus bordes.
                   Aguantan lo que el reconocimiento de voz escribe mal
                   ("pagár", "pagarr", "carito") y las formas de una misma
                   palabra ("pagar", "pago", "pagamos").

⚠️  Esto está ESPEJADO en backend/src/utils/intencionesTiqui.js: el servidor
    calcula los mismos rasgos para usar el modelo. Si cambia una regla aquí,
    hay que cambiarla allá (la prueba de paridad del servidor lo detecta).
"""

import re
import unicodedata

TAMANOS = (3, 4, 5)


def normalizar(texto: str) -> str:
    """Minúsculas, sin tildes ni signos: "¿Cuánto llevo?" → "cuanto llevo"."""
    t = unicodedata.normalize("NFD", str(texto or "").lower())
    t = re.sub("[̀-ͯ]", "", t)
    t = re.sub(r"[^a-z0-9]+", " ", t)
    return t.strip()


def rasgos(texto: str) -> list[str]:
    palabras = normalizar(texto).split()
    salida = [f"p:{w}" for w in palabras]
    salida += [f"b:{a}_{b}" for a, b in zip(palabras, palabras[1:])]
    for w in palabras:
        envuelta = f" {w} "
        for n in TAMANOS:
            salida += [f"c:{envuelta[i:i + n]}" for i in range(len(envuelta) - n + 1)]
    return salida

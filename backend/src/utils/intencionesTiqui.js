// LA IA PROPIA DE TIQUI — intencionesTiqui.js
// Un clasificador de intenciones entrenado en Python (analitica/intenciones, TF-IDF + regresión
// logística con scikit-learn) y exportado a datos/intencionesTiqui.json.

import { readFileSync } from "node:fs";

const MODELO = JSON.parse(readFileSync(new URL("../datos/intencionesTiqui.json", import.meta.url), "utf8"));
const INDICE = new Map(MODELO.rasgos.map((r, i) => [r, i]));
const TAMANOS = [3, 4, 5];

export const CLASES = MODELO.clases;
export const DIRECTAS = new Set(MODELO.directas);

// Minúsculas, sin tildes ni signos: "¿Cuánto llevo?" → "cuanto llevo".
export const normalizar = (texto) => String(texto ?? "")
  .toLowerCase()
  .normalize("NFD")
  .replace(/[̀-ͯ]/g, "")
  .replace(/[^a-z0-9]+/g, " ")
  .trim();

// Palabras, pares de palabras y pedazos de 3 a 5 letras (ver rasgos.py).
export const rasgos = (texto) => {
  const palabras = normalizar(texto).split(" ").filter(Boolean);
  const salida = palabras.map((w) => `p:${w}`);
  for (let i = 0; i + 1 < palabras.length; i++) salida.push(`b:${palabras[i]}_${palabras[i + 1]}`);
  for (const w of palabras) {
    const envuelta = ` ${w} `;
    for (const n of TAMANOS) {
      for (let i = 0; i + n <= envuelta.length; i++) salida.push(`c:${envuelta.slice(i, i + n)}`);
    }
  }
  return salida;
};

// { intencion, confianza, probabilidades } de una frase. La cuenta es la de scikit-learn:
// frecuencia amortiguada (1 + log) por idf, largo 1, pesos de cada intención más su sesgo, y
// softmax.
export const clasificarIntencion = (frase) => {
  const conteo = new Map();
  for (const r of rasgos(frase)) {
    const i = INDICE.get(r);
    if (i !== undefined) conteo.set(i, (conteo.get(i) || 0) + 1);
  }
  const x = [...conteo].map(([i, c]) => [i, (1 + Math.log(c)) * MODELO.idf[i]]);
  const largo = Math.sqrt(x.reduce((s, [, v]) => s + v * v, 0)) || 1;
  const logits = [...MODELO.sesgos];
  for (const [i, v] of x) {
    const pesos = MODELO.pesos[i];
    for (let k = 0; k < logits.length; k++) logits[k] += (pesos[k] * v) / largo;
  }
  const tope = Math.max(...logits);
  const exps = logits.map((z) => Math.exp(z - tope));
  const total = exps.reduce((s, e) => s + e, 0);
  const probabilidades = Object.fromEntries(CLASES.map((c, k) => [c, exps[k] / total]));
  const mejor = exps.indexOf(Math.max(...exps));
  return { intencion: CLASES[mejor], confianza: exps[mejor] / total, probabilidades };
};

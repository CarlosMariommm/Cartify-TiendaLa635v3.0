import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// El diccionario de inglés usa la frase en español como CLAVE. Si alguien cambia un texto en el
// código y no su clave en en.js, la tienda en inglés vuelve a salir en español sin que nadie lo
// note (pasó al pasar todo a "tú"). Esta prueba lo detecta antes de publicar.

const SRC = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const DICCIONARIO = path.join(SRC, 'i18n', 'en.js');

const clavesDelDiccionario = () => {
  const claves = [];
  for (const linea of fs.readFileSync(DICCIONARIO, 'utf8').split(/\r?\n/)) {
    const m = linea.match(/^\s*('(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*")\s*:/);
    if (m) claves.push(m[1].slice(1, -1).replace(/\\'/g, "'").replace(/\\"/g, '"'));
  }
  return claves;
};

// Todos los archivos del código, menos el propio diccionario y las pruebas.
const archivos = (dir) =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const ruta = path.join(dir, e.name);
    if (e.isDirectory()) return e.name === 'i18n' ? [] : archivos(ruta);
    return /\.(js|jsx)$/.test(e.name) && !/\.test\./.test(e.name) ? [ruta] : [];
  });

// Las frases que el código manda a traducir tal cual: t('…') y tAhora('…').
const frasesTraducidas = () => {
  const frases = new Map();
  for (const archivo of archivos(SRC)) {
    // Sin comentarios: ahí hay ejemplos como t('Llevas {n} productos') que no son de verdad.
    const texto = fs.readFileSync(archivo, 'utf8')
      .split(/\r?\n/)
      .filter((l) => !/^\s*(\*|\/\/|\/\*)/.test(l))
      .join('\n');
    for (const m of texto.matchAll(/\bt(?:Ahora)?\(\s*'((?:[^'\\]|\\.)*)'/g)) {
      const frase = m[1].replace(/\\'/g, "'");
      if (!frases.has(frase)) frases.set(frase, path.relative(SRC, archivo));
    }
  }
  return frases;
};

describe('diccionario de inglés', () => {
  it('no repite claves (la segunda pisaría a la primera)', () => {
    const claves = clavesDelDiccionario();
    const repetidas = claves.filter((c, i) => claves.indexOf(c) !== i);
    expect(repetidas).toEqual([]);
  });

  it('tiene la traducción de cada frase que la tienda manda a traducir', () => {
    const claves = new Set(clavesDelDiccionario());
    const faltan = [...frasesTraducidas()]
      .filter(([frase]) => !claves.has(frase))
      .map(([frase, archivo]) => `${archivo}: "${frase}"`);
    expect(faltan).toEqual([]);
  });
});

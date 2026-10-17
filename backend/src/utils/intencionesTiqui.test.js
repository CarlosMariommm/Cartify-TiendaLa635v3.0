import { readFileSync } from "node:fs";
import { describe, it, expect } from "vitest";
import { clasificarIntencion, normalizar, rasgos } from "./intencionesTiqui.js";

// La IA propia de Tiqui en Node tiene que dar EXACTAMENTE lo que calculó Python con el mismo
// modelo (datos/intencionesTiqui.paridad.json).

const PARIDAD = JSON.parse(readFileSync(new URL("../datos/intencionesTiqui.paridad.json", import.meta.url), "utf8"));

describe("la IA propia de Tiqui", () => {
  it("normaliza y saca los rasgos como Python", () => {
    expect(normalizar("¿Cuánto llevo?")).toBe("cuanto llevo");
    expect(normalizar("Muéstrame la piña")).toBe("muestrame la pina");
    expect(rasgos("mis puntos")).toEqual(expect.arrayContaining(["p:mis", "b:mis_puntos", "c: pu", "c:tos ", "c: mis "]));
  });

  it("da las mismas probabilidades que Python, frase por frase", () => {
    for (const { frase, probabilidades } of PARIDAD) {
      const { probabilidades: aqui } = clasificarIntencion(frase);
      for (const [clase, p] of Object.entries(probabilidades)) {
        expect(Math.abs(aqui[clase] - p), `${frase} · ${clase}`).toBeLessThan(1e-5);
      }
    }
  });

  it("entiende lo de todos los días", () => {
    expect(clasificarIntencion("¿cuánto llevo?").intencion).toBe("total");
    expect(clasificarIntencion("ya quiero pagar").intencion).toBe("pagar");
    expect(clasificarIntencion("dónde está mi pedido").intencion).toBe("pedidos");
    expect(clasificarIntencion("dame dos coca colas").intencion).toBe("pedir");
  });
});

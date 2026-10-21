import { describe, it, expect, vi } from "vitest";

// Lo que Tiqui recomienda primero: lo que vence, lo quieto y lo que sobra. La base es de mentira.
vi.mock("../models/order.js", () => ({ default: { aggregate: async () => [] } }));
vi.mock("../models/product.js", () => ({ default: { find: () => ({ lean: async () => [] }) } }));

const { elegirParaRecomendar, sortearTanda, MOTIVOS } = await import("./paraRecomendar.js");

const AHORA = new Date("2026-10-20T12:00:00Z");
const hace = (dias) => new Date(AHORA.getTime() - dias * 86400000);
const en = (dias) => new Date(AHORA.getTime() + dias * 86400000);
const producto = (id, extra = {}) => ({ id, nombre: id, stock: 10, stockMaximo: 40, creado: hace(60), ...extra });

describe("qué conviene recomendar", () => {
  const vendidos = new Map([["pan", 40], ["leche", 30], ["atun", 2], ["yogur", 20]]);
  const catalogo = [
    producto("pan"),
    producto("leche"),
    producto("atun"),
    producto("yogur", { vence: en(3) }),
    producto("jabon", { stock: 38 }),
    producto("nuevo", { creado: hace(3) }),
    producto("agotado", { stock: 0 }),
  ];
  const lista = elegirParaRecomendar(catalogo, vendidos, { ahora: AHORA });
  const de = (id) => lista.find((p) => p.id === id);

  it("lo que vence esta semana va primero", () => {
    expect(lista[0].id).toBe("yogur");
    expect(de("yogur").motivos).toContain(MOTIVOS.vence);
  });

  it("lo que casi no se vende entra, y lo que sobra suma", () => {
    expect(de("atun").motivos).toEqual([MOTIVOS.quieto]);
    expect(de("jabon").motivos).toEqual([MOTIVOS.quieto, MOTIVOS.sobra]);
  });

  it("no empuja lo que se vende bien, lo recién llegado ni lo agotado", () => {
    expect(de("pan")).toBeUndefined();
    expect(de("nuevo")).toBeUndefined();
    expect(de("agotado")).toBeUndefined();
  });
});

describe("la tanda de cada respuesta", () => {
  const lista = ["a", "b", "c", "d", "e", "f"].map((id, i) => ({ id, peso: 6 - i, motivos: [] }));

  it("saca los que se pidieron, sin repetir", () => {
    const tanda = sortearTanda(lista, 4, () => 0.5);
    expect(tanda).toHaveLength(4);
    expect(new Set(tanda.map((p) => p.id)).size).toBe(4);
  });

  it("cambia según el sorteo", () => {
    const primera = sortearTanda(lista, 2, () => 0).map((p) => p.id);
    const otra = sortearTanda(lista, 2, () => 0.99).map((p) => p.id);
    expect(primera).not.toEqual(otra);
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";

/*
 * Quien compra esto también lleva: qué se recomienda con cada producto, sacado
 * de los pedidos. La base es de mentira.
 */

const pedidosDeLaBase = vi.fn(() => []);
const productosDeLaBase = vi.fn(() => []);
const conLean = (datos) => ({ select: () => ({ lean: async () => datos }) });
vi.mock("../models/order.js", () => ({ default: { find: (...a) => conLean(pedidosDeLaBase(...a)) } }));
vi.mock("../models/product.js", () => ({ default: { find: (...a) => conLean(productosDeLaBase(...a)) } }));

const { calcularTambienLlevan, confianzaPesimista, obtenerTambienLlevan, olvidarTambienLlevan } = await import("./tambienLlevan.js");

const pedido = (cliente, ...productos) => ({ clientId: cliente, items: productos.map((productId) => ({ productId })) });

// Pan y leche van juntos; la soda va en casi todo, con lo que sea (también con los chips, pero eso no dice nada).
const PEDIDOS = [
  pedido("ana", "pan", "leche", "soda"),
  pedido("beto", "pan", "leche"),
  pedido("caro", "pan", "leche", "soda"),
  pedido("dani", "soda", "chips"),
  pedido("eli", "soda", "chips"),
  pedido("fer", "soda"),
  pedido("gabi", "soda", "chips"),
  pedido("hugo", "jabon"),
];

describe("quien compra esto también lleva", () => {
  it("recomienda lo que va junto más de lo que tocaría por azar", () => {
    const r = calcularTambienLlevan(PEDIDOS);
    expect(r.pan).toEqual(["leche"]);
    expect(r.leche).toEqual(["pan"]);
    // La soda va con el pan en 2 de 3 pedidos, pero la soda va en 6 de 8: con el pan va MENOS que con cualquier cosa.
    expect(r.pan).not.toContain("soda");
    // Con los chips va en 3 de 3, pero con la soda en 6 de 8 pedidos, 3 no alcanzan para decir que van juntos.
    expect(r.chips).toBeUndefined();
  });

  it("la cuenta pesimista: 2 de 3 no es lo mismo que 40 de 60", () => {
    expect(confianzaPesimista(2, 3)).toBeLessThan(confianzaPesimista(40, 60));
    expect(confianzaPesimista(40, 60)).toBeLessThan(40 / 60);
    expect(confianzaPesimista(0, 5)).toBe(0);
    expect(confianzaPesimista(0, 0)).toBe(0);
  });

  it("con una sola persona no recomienda nada, aunque lo haya pedido muchas veces", () => {
    const r = calcularTambienLlevan([
      pedido("ana", "vino", "queso"), pedido("ana", "vino", "queso"), pedido("ana", "vino", "queso"),
      pedido("beto", "pan"), pedido("caro", "leche"),
    ]);
    expect(r.vino).toBeUndefined();
  });

  it("con un solo pedido juntos tampoco: puede ser casualidad", () => {
    const r = calcularTambienLlevan([pedido("ana", "a", "b"), pedido("beto", "c"), pedido("caro", "d")]);
    expect(r).toEqual({});
  });

  it("solo productos activos, y lo repetido en un pedido cuenta una vez", () => {
    const pedidos = [
      pedido("ana", "pan", "leche", "leche"), pedido("beto", "pan", "leche"),
      pedido("caro", "jabon"), pedido("dani", "soda"), pedido("eli", "jugo"), pedido("fer", "agua"), pedido("gabi", "sal"),
    ];
    expect(calcularTambienLlevan(pedidos)).toMatchObject({ pan: ["leche"], leche: ["pan"] });
    expect(calcularTambienLlevan(pedidos, { activos: new Set(["pan"]) })).toEqual({});
  });

  it("aguanta pedidos sin productos (impresiones) y líneas sin id", () => {
    expect(() => calcularTambienLlevan([{ clientId: "x", items: [] }, { clientId: "y" }, { items: [{}] }])).not.toThrow();
  });
});

describe("de la base, guardado una hora", () => {
  beforeEach(() => {
    olvidarTambienLlevan();
    pedidosDeLaBase.mockClear().mockReturnValue(PEDIDOS);
    productosDeLaBase.mockClear().mockReturnValue(["pan", "leche", "soda", "chips"].map((_id) => ({ _id })));
  });

  it("pide los pedidos de los últimos 180 días sin cancelados, y solo cuenta los activos", async () => {
    const ahora = new Date("2026-10-14T12:00:00Z");
    expect(await obtenerTambienLlevan({ ahora })).toEqual({ pan: ["leche"], leche: ["pan"] });
    const filtro = pedidosDeLaBase.mock.calls[0][0];
    expect(filtro.status).toEqual({ $ne: "cancelado" });
    expect(filtro.createdAt.$gte.toISOString()).toBe("2026-04-17T12:00:00.000Z");
    expect(productosDeLaBase.mock.calls[0][0]).toEqual({ isActive: { $ne: false } });
  });

  it("no vuelve a la base durante la hora, y después sí", async () => {
    const ahora = new Date("2026-10-14T12:00:00Z");
    await obtenerTambienLlevan({ ahora });
    await obtenerTambienLlevan({ ahora: new Date(ahora.getTime() + 59 * 60_000) });
    expect(pedidosDeLaBase).toHaveBeenCalledTimes(1);
    await obtenerTambienLlevan({ ahora: new Date(ahora.getTime() + 61 * 60_000) });
    expect(pedidosDeLaBase).toHaveBeenCalledTimes(2);
  });
});

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

/*
 * El puente con el servicio de analítica: qué le manda, con qué clave, y qué
 * hace si no está. La base y el servicio son de mentira.
 */

const config = { analitica: { url: "http://analitica.test", clave: "clave-de-prueba" } };
vi.mock("../../config.js", () => ({ config }));

const aggregate = vi.fn();
const conLean = (datos) => ({ select: () => ({ lean: async () => datos }) });
vi.mock("../models/order.js", () => ({ default: { aggregate: (...a) => aggregate(...a) } }));
vi.mock("../models/product.js", () => ({
  default: {
    find: () => conLean([
      { _id: "p1", name: "Coca-Cola", stock: "12", unidadVenta: "unidad", salePrice: 1, priceCost: 0.6, supplierId: "s1", createdAt: new Date("2026-08-01T12:00:00Z") },
      { _id: "p2", name: "Queso", stock: 3.5, unidadVenta: "libra", salePrice: 4, priceCost: 3 },
    ]),
  },
}));
vi.mock("../models/supplier.js", () => ({ default: { find: () => conLean([{ _id: "s1", name: "Distribuidora" }]) } }));
vi.mock("../models/shoppings.js", () => ({
  default: { find: () => conLean([{ supplierId: "s1", date: new Date("2026-10-05T18:00:00Z") }]) },
}));

const { armarSolicitud, obtenerPronostico, olvidarPronostico, diaLocal } = await import("./pronostico.js");

// Lunes 12 de octubre de 2026, 9 de la mañana en El Salvador.
const AHORA = new Date("2026-10-12T15:00:00Z");

const conVentas = () => {
  aggregate.mockReset();
  aggregate
    .mockResolvedValueOnce([{ _id: "2026-10-10", total: 30.5, pedidos: 3 }, { _id: "2026-09-20", total: 12, pedidos: 1 }])
    .mockResolvedValueOnce([
      { _id: { dia: "2026-10-10", producto: "p1" }, unidades: 4 },
      { _id: { dia: "2026-10-10", producto: "p2" }, unidades: 0 },
    ]);
};

describe("el pronóstico, del lado de la tienda", () => {
  beforeEach(() => {
    olvidarPronostico();
    config.analitica.url = "http://analitica.test";
    conVentas();
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, json: async () => ({ productos: [] }) })));
  });
  afterEach(() => vi.unstubAllGlobals());

  it("la fecha es la de El Salvador, no la de Londres", () => {
    expect(diaLocal(new Date("2026-10-12T03:00:00Z"))).toBe("2026-10-11"); // las 9 de la noche del 11
  });

  it("manda lo vendido hasta ayer, desde la primera venta, y los productos con su existencia", async () => {
    const solicitud = await armarSolicitud(AHORA);
    expect(solicitud.desde).toBe("2026-09-20");
    expect(solicitud.hasta).toBe("2026-10-11");
    expect(solicitud.ventas).toEqual([{ dia: "2026-10-10", producto: "p1", unidades: 4 }]);
    expect(solicitud.productos[0]).toMatchObject({ id: "p1", stock: 12, unidad: "unidad", proveedor: "s1", creado: "2026-08-01" });
    expect(solicitud.productos[1]).toMatchObject({ unidad: "libra", proveedor: null, creado: null });
    expect(solicitud.compras).toEqual([{ proveedor: "s1", dia: "2026-10-05" }]);

    // Solo pedidos de antes de hoy a medianoche (hora de El Salvador) y que no se cancelaron.
    const { $match } = aggregate.mock.calls[0][0][0];
    expect($match.status).toEqual({ $ne: "cancelado" });
    expect($match.createdAt.$lt.toISOString()).toBe("2026-10-12T06:00:00.000Z");
  });

  it("le manda la clave al servicio y guarda la respuesta un rato", async () => {
    const datos = await obtenerPronostico({ ahora: AHORA });
    expect(datos.generado).toBe(AHORA.toISOString());
    const [url, opciones] = fetch.mock.calls[0];
    expect(url).toBe("http://analitica.test/pronostico");
    expect(opciones.headers["x-clave-analitica"]).toBe("clave-de-prueba");

    await obtenerPronostico({ ahora: new Date(AHORA.getTime() + 60_000) });
    expect(fetch).toHaveBeenCalledTimes(1);

    conVentas();
    await obtenerPronostico({ ahora: AHORA, forzar: true });
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("sin ventas todavía no le pregunta nada al servicio", async () => {
    aggregate.mockReset();
    aggregate.mockResolvedValue([]);
    expect(await obtenerPronostico({ ahora: AHORA })).toMatchObject({ vacio: true });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("dice qué pasó: sin configurar, sin conexión o con error", async () => {
    config.analitica.url = "";
    await expect(obtenerPronostico({ ahora: AHORA })).rejects.toMatchObject({ codigo: "sin-servicio" });

    config.analitica.url = "http://analitica.test";
    fetch.mockRejectedValueOnce(Object.assign(new Error("tardó"), { name: "TimeoutError" }));
    await expect(obtenerPronostico({ ahora: AHORA })).rejects.toMatchObject({ codigo: "lento" });

    conVentas();
    fetch.mockResolvedValueOnce({ ok: false, status: 401 });
    await expect(obtenerPronostico({ ahora: AHORA })).rejects.toMatchObject({ codigo: "fallo" });
  });
});

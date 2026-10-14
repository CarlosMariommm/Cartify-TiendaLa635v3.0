import { readFileSync } from "node:fs";
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
const proveedoresDeLaBase = vi.fn(() => [{ _id: "s1", name: "Distribuidora" }]);
vi.mock("../models/supplier.js", () => ({ default: { find: (...a) => conLean(proveedoresDeLaBase(...a)) } }));
vi.mock("../models/shoppings.js", () => ({
  default: { find: () => conLean([{ supplierId: "s1", date: new Date("2026-10-05T18:00:00Z") }]) },
}));

const { armarSolicitud, obtenerPronostico, olvidarPronostico, diaLocal, textoDelPronostico, pronosticoParaTiqui, solicitudDeDemostracion, hayDemostracion, conCanalesDePedido } = await import("./pronostico.js");

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

/* ── Lo que se le cuenta a Tiqui del panel ── */

const PRONOSTICO = {
  historial: { dias: 34, pedidos: 51 },
  tienda: {
    dias: Array.from({ length: 28 }, () => ({})),
    semanas: [{ desde: "2026-10-13", hasta: "2026-10-19", esperado: 281.08, bajo: 182.46, alto: 383.56 }],
    periodo: { esperado: 1094.4, bajo: 894.06, alto: 1297.54 },
    periodo_anterior: 1139.15,
  },
  productos: [
    { nombre: "Lays Barbacoa", unidad: "unidad", se_acaba: { agotado: true }, pedir: 12, semana: { esperado: 4.5 } },
    { nombre: "Queso Crema", unidad: "unidad", se_acaba: { agotado: false, probable: "2026-10-17", pronto: "2026-10-15" }, pedir: 6, semana: { esperado: 3.8 } },
    { nombre: "Agua", unidad: "unidad", se_acaba: { agotado: false, probable: null }, pedir: null, semana: { esperado: 9.8 } },
  ],
  proveedores: [{
    nombre: "Distribuidora La Constancia", ciclo_dias: 7, costo_total: 16.5,
    productos: [{ nombre: "Lays Barbacoa", unidad: "unidad", pedir: 12 }, { nombre: "Queso Crema", unidad: "unidad", pedir: 6 }],
  }],
  precision: { probado: true, semanas: 1, tienda: { error: 0.9, error_ingenuo: 0.66 } },
};

describe("el pronóstico contado a Tiqui", () => {
  beforeEach(() => {
    olvidarPronostico();
    config.analitica.url = "http://analitica.test";
    conVentas();
  });
  afterEach(() => vi.unstubAllGlobals());

  it("van las cuentas hechas, con su rango, y dice si es preliminar", () => {
    const texto = textoDelPronostico(PRONOSTICO, AHORA.getTime() - 3 * 60_000, AHORA.getTime());
    expect(texto).toContain("Calculado hace 3 min con 34 días de ventas (51 pedidos). Es PRELIMINAR");
    expect(texto).toContain("Venta esperada las próximas 4 semanas: $1,094.40 (entre $894.06 y $1,297.54); las 4 semanas anteriores fueron $1,139.15.");
    expect(texto).toContain("Próxima semana (13 de octubre al 19 de octubre): $281.08");
    expect(texto).toContain("Ya agotados, y se venden: Lays Barbacoa.");
    expect(texto).toContain("Queso Crema hacia el 17 de octubre (tan pronto como el 15 de octubre)");
    expect(texto).toContain("Compra sugerida a Distribuidora La Constancia (se le compra cada 7 días): Lays Barbacoa 12, Queso Crema 6 = $16.50.");
    expect(texto).toContain("Con muy pocas ventas para sugerir cuánto pedir: Agua.");
    expect(texto).toContain("Lo que más se va a vender la próxima semana: Agua (9.8), Lays Barbacoa (4.5), Queso Crema (3.8).");
  });

  it("si ya está calculado, va siempre; si no, solo se espera cuando preguntan por eso", async () => {
    // El servicio "dormido": contesta después de 10 s.
    let contestar;
    vi.stubGlobal("fetch", vi.fn(() => new Promise((r) => { contestar = r; })));
    vi.useFakeTimers();
    try {
      // Una pregunta de otra cosa no espera: manda a calcular y sigue.
      expect(await pronosticoParaTiqui("¿cómo vamos hoy?", AHORA)).toBe("");
      await vi.advanceTimersByTimeAsync(0); // lee la base y recién ahí le pide al servicio
      expect(fetch).toHaveBeenCalledTimes(1);

      // "¿Qué tengo que pedir?" espera unos segundos y, si no llega, lo dice; no lanza otro cálculo.
      const pendiente = pronosticoParaTiqui("¿Qué tengo que pedir esta semana?", AHORA);
      await vi.advanceTimersByTimeAsync(5000);
      expect(await pendiente).toMatch(/^Se está calculando en este momento/);
      expect(fetch).toHaveBeenCalledTimes(1);

      // Llega el cálculo: desde ahí va en cada pregunta, sin volver a pedirlo.
      contestar({ ok: true, json: async () => PRONOSTICO });
      await vi.advanceTimersByTimeAsync(0);
      expect(await pronosticoParaTiqui("buenos días", AHORA)).toContain("Venta esperada");
      expect(fetch).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it("sin el servicio configurado, Tiqui no recibe nada del pronóstico", async () => {
    config.analitica.url = "";
    expect(await pronosticoParaTiqui("¿qué tengo que pedir?", AHORA)).toBe("");
  });
});

/* ── La demostración (datos/pronosticoDemo.json) ── */

describe("la demostración del pronóstico", () => {
  beforeEach(() => {
    olvidarPronostico();
    config.analitica.url = "http://analitica.test";
    aggregate.mockReset();
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, json: async () => ({ productos: [] }) })));
  });
  afterEach(() => vi.unstubAllGlobals());

  it("corre todas sus fechas para que la historia termine ayer", () => {
    const demo = {
      desde: "2026-06-30", hasta: "2026-10-12", horizonte: 28,
      tienda: [{ dia: "2026-06-30", total: 10, pedidos: 1 }, { dia: "2026-10-12", total: 20, pedidos: 2 }],
      ventas: [{ dia: "2026-10-12", producto: "p1", unidades: 3 }],
      productos: [{ id: "p1", creado: "2026-06-01" }, { id: "p2", creado: null }],
      proveedores: [],
      compras: [{ proveedor: "s1", dia: "2026-10-10" }],
    };
    // Abierta el 1 de diciembre: la historia tiene que llegar al 30 de noviembre.
    const s = solicitudDeDemostracion(new Date("2026-12-01T15:00:00Z"), demo);
    expect(s.hasta).toBe("2026-11-30");
    expect(s.desde).toBe("2026-08-18");
    expect(s.tienda.map((t) => t.dia)).toEqual(["2026-08-18", "2026-11-30"]);
    expect(s.ventas[0].dia).toBe("2026-11-30");
    expect(s.compras[0].dia).toBe("2026-11-28");
    expect(s.productos.map((p) => p.creado)).toEqual(["2026-07-20", null]);
    expect(demo.hasta).toBe("2026-10-12"); // la original no se toca
  });

  it("no toca la base, va marcada como demostración y se guarda aparte de la real", async () => {
    expect(hayDemostracion()).toBe(true);
    const datos = await obtenerPronostico({ ahora: AHORA, demo: true });
    expect(datos.demo).toBe(true);
    expect(aggregate).not.toHaveBeenCalled();
    const enviada = JSON.parse(fetch.mock.calls[0][1].body);
    expect(enviada.hasta).toBe("2026-10-11"); // el día antes de AHORA
    expect(enviada.tienda.length).toBeGreaterThan(90);

    // La real sigue siendo otra cuenta: pide a la base y al servicio otra vez.
    conVentas();
    const real = await obtenerPronostico({ ahora: AHORA });
    expect(real.demo).toBeUndefined();
    expect(fetch).toHaveBeenCalledTimes(2);
  });
});

/* ── Por dónde se le pide a cada proveedor (el botón "Pedir" del panel) ── */

describe("la compra sugerida con el canal de cada proveedor", () => {
  const demoGuardada = JSON.parse(readFileSync(new URL("../datos/pronosticoDemo.json", import.meta.url), "utf8"));

  it("de la tienda: lo lee de cada proveedor, con su teléfono; sin proveedor, nada", async () => {
    proveedoresDeLaBase.mockReturnValueOnce([
      { _id: "s1", phoneNumber: "7777-1234", pedidos: { canal: "whatsapp", whatsapp: "70001111", app: "", enlace: "" } },
    ]);
    const datos = await conCanalesDePedido({ proveedores: [{ id: "s1", productos: [] }, { id: null, productos: [] }] });
    expect(datos.proveedores[0].pedido).toEqual({ canal: "whatsapp", whatsapp: "70001111", app: "", enlace: "", telefono: "7777-1234" });
    expect(datos.proveedores[1].pedido).toBeNull();
    expect(proveedoresDeLaBase.mock.lastCall[0]).toEqual({ _id: { $in: ["s1"] } });
  });

  it("de la demostración: sale del archivo, sin tocar la base", async () => {
    proveedoresDeLaBase.mockClear();
    const conCanal = demoGuardada.proveedores.find((p) => p.pedido);
    const datos = await conCanalesDePedido({ proveedores: [{ id: conCanal.id, productos: [] }] }, { demo: true });
    expect(datos.proveedores[0].pedido).toEqual(conCanal.pedido);
    expect(proveedoresDeLaBase).not.toHaveBeenCalled();
  });

  it("sin compra sugerida no busca nada", async () => {
    proveedoresDeLaBase.mockClear();
    expect(await conCanalesDePedido({ vacio: true })).toEqual({ vacio: true });
    expect(proveedoresDeLaBase).not.toHaveBeenCalled();
  });
});

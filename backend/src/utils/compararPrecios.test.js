import { describe, it, expect, vi } from "vitest";

// Comparar precios con otros súper. Los buscadores y la IA son de mentira.
vi.mock("./iaClient.js", () => ({ getIA: () => null, generarConIA: vi.fn() }));

const { terminoDeBusqueda, buscarEnTienda, parecidoSinIA, compararPrecio, TIENDAS } = await import("./compararPrecios.js");

const vtex = (productos) => async () => ({
  ok: true,
  json: async () => productos.map(([nombre, precio]) => ({
    productName: nombre,
    items: [{ sellers: [{ commertialOffer: { Price: precio, AvailableQuantity: 5 } }] }],
  })),
});

describe("comparar precios con otras tiendas", () => {
  it("limpia el nombre para el buscador", () => {
    expect(terminoDeBusqueda("Coca-Cola Lata 354 ml")).toBe("coca cola lata 354 ml");
  });

  it("lee nombre y precio del buscador de la tienda", async () => {
    const r = await buscarEnTienda(TIENDAS[0], "coca", { pedir: vtex([["Coca Cola Lata 354 ml", 0.78]]) });
    expect(r).toEqual([{ nombre: "Coca Cola Lata 354 ml", precio: 0.78, hay: true }]);
  });

  it("si la tienda no contesta, no rompe", async () => {
    const r = await buscarEnTienda(TIENDAS[0], "coca", { pedir: async () => { throw new Error("red"); } });
    expect(r).toEqual([]);
  });

  it("sin IA elige el más parecido", () => {
    const igual = parecidoSinIA("Coca-Cola Lata 354 ml", [
      { nombre: "Gaseosa Pepsi 2 L", precio: 1.5 },
      { nombre: "Gaseosa Coca Cola Regular Lata - 354 ml", precio: 0.78 },
    ]);
    expect(igual.precio).toBe(0.78);
  });

  it("arma la frase con los precios encontrados", async () => {
    const texto = await compararPrecio(
      { nombre: "Coca-Cola Lata 354 ml", precio: 1.25 },
      { pedir: vtex([["Gaseosa Coca Cola Regular Lata - 354 ml", 0.78]]) }
    );
    expect(texto).toContain("$1.25");
    expect(texto).toContain("$0.78 en Walmart");
  });
});

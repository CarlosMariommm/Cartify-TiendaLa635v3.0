import { describe, it, expect } from "vitest";
import { textoPedidoNuevo } from "./avisosPersonal.js";

/*
 * Lo que le dice el teléfono al personal cuando entra un pedido.
 */

describe("el aviso de pedido nuevo al personal", () => {
  it("a domicilio: total arriba; quién, entrega y cuántos productos abajo", () => {
    const pedido = { total: 12.5, deliveryType: "delivery", items: [{}, {}, {}] };
    expect(textoPedidoNuevo(pedido, "María López")).toEqual({
      titulo: "Pedido nuevo · $12.50",
      cuerpo: "María López · A domicilio · 3 productos",
    });
  });

  it("para recoger, y en singular cuando es un solo producto", () => {
    const pedido = { total: 3, deliveryType: "retiro", items: [{}] };
    expect(textoPedidoNuevo(pedido, "Ana").cuerpo).toBe("Ana · Para recoger en la tienda · 1 producto");
  });

  it("del kiosco lo dice", () => {
    const pedido = { total: 3, deliveryType: "retiro", channel: "kiosco", items: [{}, {}] };
    expect(textoPedidoNuevo(pedido, "Ana").cuerpo).toBe("Ana · Desde el kiosco · 2 productos");
  });

  it("una impresión dice qué hay que imprimir", () => {
    const pedido = { total: 1.5, channel: "impresion", items: [{ name: "Impresión Carta B/N x2" }] };
    expect(textoPedidoNuevo(pedido, "Luis")).toEqual({
      titulo: "Impresión nueva · $1.50",
      cuerpo: "Luis · Impresión Carta B/N x2",
    });
  });

  it("sin nombre no deja un separador colgando, y un nombre larguísimo se corta", () => {
    const pedido = { total: 2, deliveryType: "retiro", items: [{}] };
    expect(textoPedidoNuevo(pedido, "").cuerpo).toBe("Para recoger en la tienda · 1 producto");
    const largo = textoPedidoNuevo(pedido, "Nombre ".repeat(10)).cuerpo.split(" · ")[0];
    expect(largo.length).toBeLessThanOrEqual(32);
    expect(largo.endsWith("…")).toBe(true);
  });
});

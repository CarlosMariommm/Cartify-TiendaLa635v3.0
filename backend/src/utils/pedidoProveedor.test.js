import { describe, it, expect } from "vitest";
import { limpiarPedidos } from "./pedidoProveedor.js";

/*
 * Lo que se guarda de "Cómo se le hacen los pedidos" de cada proveedor: lo
 * que sirve se guarda limpio, lo que no se dice con palabras.
 */

describe("por dónde se le pide a un proveedor", () => {
  it("si el formulario no lo manda, no se toca lo guardado", () => {
    expect(limpiarPedidos(undefined)).toEqual({ pedidos: undefined });
  });

  it("WhatsApp: guarda solo los dígitos", () => {
    expect(limpiarPedidos({ canal: "whatsapp", whatsapp: "7000-1111" }))
      .toEqual({ pedidos: { canal: "whatsapp", whatsapp: "70001111", app: "", enlace: "" } });
    // Sin número también vale: se usa el teléfono del proveedor o se elige el contacto.
    expect(limpiarPedidos({ canal: "whatsapp" }).pedidos.whatsapp).toBe("");
    expect(limpiarPedidos({ canal: "whatsapp", whatsapp: "7000" }))
      .toEqual({ error: "El número de WhatsApp está incompleto" });
  });

  it("app: pide el enlace y solo acepta direcciones web", () => {
    expect(limpiarPedidos({ canal: "app", app: " BEES ", enlace: "https://www.bees.com/" }))
      .toEqual({ pedidos: { canal: "app", whatsapp: "", app: "BEES", enlace: "https://www.bees.com/" } });
    expect(limpiarPedidos({ canal: "app", app: "BEES" }))
      .toEqual({ error: "Falta el enlace de la app o sitio donde se le pide" });
    for (const enlace of ["javascript:alert(1)", "data:text/html,hola", "bees", "ftp://bees.com"]) {
      expect(limpiarPedidos({ canal: "app", enlace })).toHaveProperty("error");
    }
  });

  it("lo que quedó escrito de otro canal no frena el guardado", () => {
    expect(limpiarPedidos({ canal: "llamada", whatsapp: "70", enlace: "no es enlace" }))
      .toEqual({ pedidos: { canal: "llamada", whatsapp: "", app: "", enlace: "" } });
  });

  it("un canal que no existe queda sin definir", () => {
    expect(limpiarPedidos({ canal: "telegrama" }).pedidos.canal).toBe("");
    expect(limpiarPedidos(null)).toEqual({ pedidos: { canal: "", whatsapp: "", app: "", enlace: "" } });
  });
});

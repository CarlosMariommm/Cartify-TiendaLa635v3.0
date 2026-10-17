import { describe, it, expect } from "vitest";
import { ofertaDicha, respuestaDirecta } from "./respuestasTiqui.js";

// Lo que Tiqui contesta sola: con los datos que hay, y sin inventar los que no hay.

const siempreLaPrimera = () => 0;

describe("lo que Tiqui contesta sola", () => {
  it("saluda, se despide y dice qué sabe hacer", () => {
    expect(respuestaDirecta("saludo", { azar: siempreLaPrimera })).toEqual({ acciones: [], respuesta: "¡Hola! Soy Tiqui. ¿Qué te traigo hoy?", animo: "alegre" });
    expect(respuestaDirecta("despedida", { azar: siempreLaPrimera }).respuesta).toBe("¡Con gusto! Aquí estoy cuando me necesites.");
    expect(respuestaDirecta("ayuda").respuesta.length).toBeLessThanOrEqual(160);
  });

  it("el total y el carrito los dice la tienda con la cuenta exacta; pagar lleva a pagar", () => {
    expect(respuestaDirecta("total").acciones).toEqual([{ tipo: "total" }]);
    expect(respuestaDirecta("carrito").acciones).toEqual([{ tipo: "total" }]);
    expect(respuestaDirecta("pagar")).toMatchObject({ acciones: [{ tipo: "comprar" }], animo: "emocionada" });
  });

  it("las secciones de la cuenta, con y sin sesión", () => {
    expect(respuestaDirecta("metodos_pago", { nombre: "Ana" })).toEqual({ acciones: [{ tipo: "seccion", seccion: "pagos" }], respuesta: "Te abro tus métodos de pago.", animo: "normal" });
    expect(respuestaDirecta("puntos").respuesta).toBe("Para ver tus puntos, primero entra con tu cuenta.");
  });

  it("ofertas: una o dos, con su precio; sin ofertas, lo dice", () => {
    const ofertas = [
      { nombre: "Coca-Cola", oferta: "oferta $1.13 (10% menos)" },
      { nombre: "Churritos Diana", oferta: "lleva 2 y paga 1" },
      { nombre: "Pan", oferta: "oferta $0.20" },
    ];
    expect(respuestaDirecta("ofertas", { ofertas }).respuesta)
      .toBe("Hoy tengo en oferta Coca-Cola a $1.13 y Churritos Diana, lleva 2 y paga 1. Hay más en las promociones de la tienda. ¿Te agrego alguna?");
    expect(respuestaDirecta("ofertas").respuesta).toBe("Hoy no tengo promociones, pero si quieres te recomiendo algo.");
    expect(ofertaDicha({ nombre: "Leche" })).toBe("Leche");
  });

  it("los datos de la tienda: los que hay; los que no, dónde averiguarlos", () => {
    const tienda = { direccion: "Calle Sevilla 635", whatsapp: "7000-1111", telefono: "2222-3333", envioBase: null };
    expect(respuestaDirecta("ubicacion", { tienda }).respuesta).toBe("Estamos en Calle Sevilla 635.");
    expect(respuestaDirecta("contacto", { tienda }).respuesta).toBe("Nuestro WhatsApp es 7000-1111. El teléfono es 2222-3333.");
    expect(respuestaDirecta("horario", { tienda }).respuesta).toMatch(/^Eso no lo tengo a la mano/);
    expect(respuestaDirecta("envio", { tienda }).respuesta).toMatch(/te sale al pagar/);
    expect(respuestaDirecta("contacto").respuesta).toMatch(/botón verde/);
  });

  it("el nombre, solo si entró con su cuenta; y lo que no es directo no se contesta aquí", () => {
    expect(respuestaDirecta("nombre", { nombre: "Ana" }).respuesta).toBe("Te llamas Ana.");
    expect(respuestaDirecta("nombre").respuesta).toMatch(/Todavía no sé tu nombre/);
    expect(respuestaDirecta("pedir")).toBeNull();
    expect(respuestaDirecta("otro")).toBeNull();
  });
});

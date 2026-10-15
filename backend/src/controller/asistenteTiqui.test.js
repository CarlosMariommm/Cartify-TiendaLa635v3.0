import { describe, it, expect, vi, beforeEach } from "vitest";
import jsonwebtoken from "jsonwebtoken";

/*
 * Tiqui de la tienda con su IA propia: lo sencillo lo contesta sola, al
 * instante; lo demás sigue yendo a Gemini. La base y Gemini son de mentira.
 */

// La IA propia viene apagada; estas pruebas la encienden, y la última la apaga.
const config = { JWT: { secret: "secreto-de-prueba" }, tiqui: { iaPropia: true } };
vi.mock("../../config.js", () => ({ config }));

const cadena = (datos) => {
  const c = { populate: () => c, sort: () => c, select: () => c, lean: async () => datos };
  return c;
};
const PRODUCTOS = [
  { _id: "p1", name: "Coca-Cola", salePrice: 1.25, stock: 10, typeId: { type: "Bebidas" }, brandId: { name: "Coca-Cola" }, unidadVenta: "unidad" },
  { _id: "p2", name: "Churritos Diana", salePrice: 0.75, stock: 0, typeId: { type: "Snacks" }, brandId: { name: "Diana" }, unidadVenta: "unidad" },
];
vi.mock("../models/product.js", () => ({ default: { find: () => cadena(PRODUCTOS) } }));
vi.mock("../models/promotion.js", () => ({
  default: {
    find: () => cadena([
      { title: "Refrescante", type: "descuento", items: [{ productId: { _id: "p1", name: "Coca-Cola", salePrice: 1.25 }, discount: 10 }] },
      { title: "2x1", type: "nxm", buyQty: 2, payQty: 1, items: [{ productId: { _id: "p2", name: "Churritos Diana", salePrice: 0.75 } }] },
    ]),
  },
}));
vi.mock("../models/storeSettings.js", () => ({
  default: { findOne: () => cadena({ nombreLinea1: "Tienda", nombreLinea2: "la 635", direccion: "Calle Sevilla 635", envioBase: 1, envioPorKm: 0.25, negocio: { horario: "de lunes a sábado, de 7 a 8" } }) },
}));
vi.mock("../models/client.js", () => ({ default: { findById: () => cadena({ fullName: "Ana López" }) } }));
vi.mock("../models/productType.js", () => ({ default: {} }));
vi.mock("../models/brand.js", () => ({ default: {} }));

const gemini = { activa: true, contestar: vi.fn() };
vi.mock("../utils/iaClient.js", () => ({
  getIA: () => (gemini.activa ? {} : null),
  generarConIA: vi.fn(),
  generarConCobertura: (...a) => gemini.contestar(...a),
}));

const { default: aiController } = await import("./aiController.js");

const preguntar = async (frase, { historial = [], token } = {}) => {
  let cuerpo = null;
  const res = { status: () => res, json: (c) => { cuerpo = c; return res; }, setHeader: () => {} };
  await aiController.asistente({ body: { frase, carrito: [], historial }, headers: token ? { authorization: `Bearer ${token}` } : {}, cookies: {} }, res);
  return cuerpo;
};

describe("Tiqui con su IA propia", () => {
  beforeEach(() => {
    config.tiqui.iaPropia = true;
    gemini.activa = true;
    gemini.contestar.mockReset().mockResolvedValue({
      functionCalls: [
        { name: "agregar_producto", args: { producto: "Coca-Cola", cantidad: 2 } },
        { name: "responder", args: { texto: "Te agregué 2 Coca-Cola. ¿Algo más?", animo: "alegre" } },
      ],
    });
  });

  it("lo sencillo lo contesta sola, sin Gemini: el total", async () => {
    const r = await preguntar("¿cuánto llevo?");
    expect(r).toMatchObject({ origen: "tiqui", intencion: "total", entendido: true, acciones: [{ tipo: "total" }] });
    expect(gemini.contestar).not.toHaveBeenCalled();
  });

  it("abre los pedidos; sin sesión, dice que entre con su cuenta", async () => {
    expect(await preguntar("dónde está mi pedido")).toMatchObject({
      acciones: [{ tipo: "seccion", seccion: "pedidos" }],
      respuesta: "Para ver tus pedidos, primero entra con tu cuenta.",
    });
    const token = jsonwebtoken.sign({ id: "c1", userType: "Client" }, "secreto-de-prueba");
    expect((await preguntar("dónde está mi pedido", { token })).respuesta).toBe("Te abro tus pedidos: ahí ves en qué va cada uno.");
    expect((await preguntar("cómo me llamo", { token })).respuesta).toBe("Te llamas Ana.");
  });

  it("las ofertas, solo de lo que tiene existencias y con su precio", async () => {
    const r = await preguntar("qué ofertas hay");
    expect(r.respuesta).toBe("Hoy tengo en oferta Coca-Cola a $1.13. ¿Te agrego alguna?");
    expect(r.animo).toBe("asombrada");
  });

  it("los datos de la tienda salen de Personalización", async () => {
    expect((await preguntar("a qué hora abren")).respuesta).toBe("Atendemos de lunes a sábado, de 7 a 8.");
    expect((await preguntar("hacen envíos a domicilio")).respuesta).toMatch(/^Sí, llevamos a domicilio: \$1\.00 de base más \$0\.25 por kilómetro/);
  });

  it("lo que nombra un producto, y la respuesta corta a una pregunta, van a Gemini", async () => {
    const r = await preguntar("dame dos coca colas");
    expect(r).toMatchObject({ origen: "ia", acciones: [{ tipo: "agregar", producto: "Coca-Cola", cantidad: 2 }] });
    expect(gemini.contestar).toHaveBeenCalledTimes(1);

    await preguntar("hay ofertas de coca cola");
    expect(gemini.contestar).toHaveBeenCalledTimes(2);

    await preguntar("gracias", { historial: [{ quien: "asistente", texto: "Te agregué 2 Coca-Cola. ¿Algo más?" }] });
    expect(gemini.contestar).toHaveBeenCalledTimes(3);
  });

  it("sin Gemini configurado, lo sencillo igual funciona", async () => {
    gemini.activa = false;
    expect(await preguntar("quiero pagar")).toMatchObject({ origen: "tiqui", acciones: [{ tipo: "comprar" }] });
    expect(await preguntar("dame dos coca colas")).toMatchObject({ entendido: false, origen: "sin-ia" });
  });

  it("si Gemini falla con algo que no es sencillo, se dice que falló", async () => {
    gemini.contestar.mockRejectedValue(new Error("503"));
    expect(await preguntar("dame dos coca colas")).toMatchObject({ entendido: false, origen: "error" });
  });

  it("apagada (como viene), todo va a Gemini, también lo sencillo", async () => {
    config.tiqui.iaPropia = false;
    const r = await preguntar("¿cuánto llevo?");
    expect(r.origen).toBe("ia");
    expect(gemini.contestar).toHaveBeenCalledTimes(1);

    // Y si Gemini falla, ya no contesta ella: se dice que falló.
    gemini.contestar.mockRejectedValue(new Error("503"));
    expect(await preguntar("quiero pagar")).toMatchObject({ entendido: false, origen: "error" });
  });
});

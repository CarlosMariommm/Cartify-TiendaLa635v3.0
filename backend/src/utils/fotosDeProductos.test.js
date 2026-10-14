import { describe, it, expect, vi, afterEach } from "vitest";
import { buscarFoto, enParalelo, fotoGrande, palabras, parecido, porCodigo, porNombre } from "./fotosDeProductos.js";

/*
 * Las fotos de Open Food Facts al importar: por código, exacta; por nombre,
 * solo si de verdad coincide. Open Food Facts es de mentira.
 */

const conRespuesta = (porUrl) => vi.stubGlobal("fetch", vi.fn(async (url) => {
  const datos = porUrl(String(url));
  return datos ? { ok: true, json: async () => datos } : { ok: false, status: 404 };
}));

describe("cómo se comparan los nombres", () => {
  it("palabras que dicen qué producto es", () => {
    expect(palabras("Coca-Cola 600 ml")).toEqual(["coca", "cola", "600"]);
    expect(palabras("Jugo de Naranja sabor original")).toEqual(["jugo", "naranja"]);
  });

  it("se mide desde lo que se busca", () => {
    expect(parecido("Lays Barbacoa", "Lay's Barbacoa 150 g Sabritas")).toBe(1);
    expect(parecido("Pilsener", "Kindom Pilsener")).toBe(1);
    expect(parecido("Leche Entera Salud", "Leche limpiadora")).toBeCloseTo(1 / 3);
  });

  it("la foto grande del empaque", () => {
    expect(fotoGrande("https://images.openfoodfacts.org/images/products/741/front_es.12.400.jpg"))
      .toBe("https://images.openfoodfacts.org/images/products/741/front_es.12.full.jpg");
  });
});

describe("buscar la foto", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("por código de barras: la del empaque", async () => {
    conRespuesta((url) => url.includes("/product/7411001800231.json")
      ? { status: 1, product: { image_front_url: "https://images.openfoodfacts.org/x/front_es.3.400.jpg" } }
      : null);
    expect(await porCodigo("7411001800231")).toEqual({ url: "https://images.openfoodfacts.org/x/front_es.3.full.jpg", fuente: "Open Food Facts", por: "codigo" });
    expect(await porCodigo("123")).toBeNull(); // eso no es un código de barras
    expect(fetch).toHaveBeenCalledTimes(1);
    // Se identifica, como pide Open Food Facts.
    expect(fetch.mock.calls[0][1].headers["User-Agent"]).toMatch(/^CartifyTiendaLa635/);
  });

  it("por nombre: solo si coincide casi entero, y con la marca si el Excel la trae", async () => {
    conRespuesta(() => ({
      hits: [
        { product_name: "Pilsener", brands: ["Hansa"], image_front_url: "https://img/sudafrica.400.jpg" },
        { product_name: "Churritos picantes", brands: ["Diana"], image_front_url: "https://img/diana.400.jpg" },
      ],
    }));
    // Pilsener de El Salvador: la que hay es de otra marca, así que no.
    expect(await porNombre("Pilsener", "Industrias La Constancia")).toBeNull();
    expect(await porNombre("Churritos picantes", "Diana")).toEqual({ url: "https://img/diana.full.jpg", fuente: "Open Food Facts", por: "nombre" });
    // Una sola palabra no identifica nada: ni se pregunta.
    fetch.mockClear();
    expect(await porNombre("Pan")).toBeNull();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("sin código que sirva, prueba por nombre; si Open Food Facts falla, sin foto", async () => {
    conRespuesta((url) => (url.includes("search") ? { hits: [{ product_name: "Takis Fuego", brands: "Barcel", image_front_url: "https://img/takis.400.jpg" }] } : { status: 0 }));
    expect((await buscarFoto({ codigo: "7500810012345", nombre: "Takis Fuego", marca: "Barcel" }))?.por).toBe("nombre");
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("sin red"); }));
    expect(await buscarFoto({ codigo: "7500810012345", nombre: "Takis Fuego", marca: "Barcel" })).toBeNull();
  });

  it("lo que se vende suelto no se busca por nombre: la fruta no tiene empaque", async () => {
    conRespuesta(() => ({ hits: [{ product_name: "Plátanos maduros", brands: "", image_front_url: "https://img/platanos-fritos.400.jpg" }] }));
    expect(await buscarFoto({ nombre: "Plátano maduro", empacado: false })).toBeNull();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("de a pocas a la vez, y en orden", async () => {
    let activas = 0;
    let maximo = 0;
    const r = await enParalelo([1, 2, 3, 4, 5, 6], 2, async (n) => {
      activas += 1;
      maximo = Math.max(maximo, activas);
      await new Promise((ok) => setTimeout(ok, 5));
      activas -= 1;
      return n * 10;
    });
    expect(r).toEqual([10, 20, 30, 40, 50, 60]);
    expect(maximo).toBe(2);
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";

// Importar el inventario desde Excel: la vista previa (con y sin IA) y el guardado. La base, la
// IA, Cloudinary y Open Food Facts son de mentira.

const db = { productos: [], pasillos: [], categorias: [], marcas: [], proveedores: [] };
let siguienteId = 1;
const nuevoId = () => `id${siguienteId++}`;
const modelo = (coleccion, campos = {}) => ({
  find: (filtro = {}) => ({
    select: () => ({
      lean: async () => db[coleccion].filter((d) => Object.entries(filtro).every(([k, v]) => (k === "isActive" ? true : String(d[k]) === String(v)))),
    }),
  }),
  create: vi.fn(async (doc) => {
    // Un pequeño respiro: así dos filas a la vez sí se cruzan, como en la base de verdad.
    await new Promise((ok) => setTimeout(ok, 2));
    const nuevo = { _id: nuevoId(), ...campos, ...doc };
    db[coleccion].push(nuevo);
    return nuevo;
  }),
});
const productos = modelo("productos");
const pasillos = modelo("pasillos");
const categorias = modelo("categorias");
const marcas = modelo("marcas");
const proveedores = modelo("proveedores");
vi.mock("../models/product.js", () => ({ default: productos }));
vi.mock("../models/module.js", () => ({ default: pasillos }));
vi.mock("../models/productType.js", () => ({ default: categorias }));
vi.mock("../models/brand.js", () => ({ default: marcas }));
vi.mock("../models/supplier.js", () => ({ default: proveedores }));
vi.mock("./cloudinaryConfig.js", () => ({ default: {} }));
const subir = vi.fn(async () => ({ secure_url: "https://res.cloudinary.com/x/image/upload/v1/foto.jpg", public_id: "grupo1B/foto" }));
vi.mock("cloudinary", () => ({ v2: { uploader: { upload: (...a) => subir(...a) } } }));

const ia = { activa: false, respuesta: null };
vi.mock("./iaClient.js", () => ({
  getIA: () => (ia.activa ? {} : null),
  generarConIA: vi.fn(async () => ({ text: JSON.stringify(ia.respuesta) })),
}));
const buscarFoto = vi.fn(async () => null);
vi.mock("./fotosDeProductos.js", async (original) => ({ ...(await original()), buscarFoto: (...a) => buscarFoto(...a) }));

const { analizarLote, importarLote, limpiarFila, pareceDeAdultos, pareceDeLibra } = await import("./importarProductos.js");

beforeEach(() => {
  Object.keys(db).forEach((k) => { db[k] = []; });
  ia.activa = false;
  ia.respuesta = null;
  buscarFoto.mockReset().mockResolvedValue(null);
  subir.mockClear();
  [productos, pasillos, categorias, marcas, proveedores].forEach((m) => m.create.mockClear());
});

describe("lo que no hace falta preguntarle a la IA", () => {
  it("+18 por palabras enteras: la cerveza sí, el ginger ale no", () => {
    expect(pareceDeAdultos("Cerveza Pilsener 355 ml")).toBe(true);
    expect(pareceDeAdultos("Ron Flor de Caña")).toBe(true);
    expect(pareceDeAdultos("Ginger Ale Canada Dry")).toBe(false);
    expect(pareceDeAdultos("Vinagre de manzana")).toBe(false);
  });

  it("por libra si la unidad lo dice", () => {
    expect(pareceDeLibra("lb.")).toBe(true);
    expect(pareceDeLibra("Libras")).toBe(true);
    expect(pareceDeLibra("unidad")).toBe(false);
  });

  it("cada fila llega limpia", () => {
    expect(limpiarFila({ fila: 3, nombre: "  Leche   Entera ", precio: 1.256, existencia: -2, codigo: "741 100-18<x>", vence: "2026-12-01" }))
      .toMatchObject({ fila: 3, nombre: "Leche Entera", precio: 1.26, existencia: null, codigo: "741100-18x", vence: "2026-12-01" });
  });
});

describe("la vista previa", () => {
  it("sin IA: lo que trae el Excel y General donde falte, con su foto y lo que ya existe", async () => {
    db.productos.push({ _id: "p1", name: "Coca-Cola 600 ml", barCode: "7411001800231" });
    buscarFoto.mockImplementation(async ({ nombre }) => (nombre === "Pan dulce" ? null : { url: "https://img/x.jpg", fuente: "Open Food Facts", por: "codigo" }));
    const r = await analizarLote([
      { fila: 2, nombre: "Coca Cola botella", precio: 1, codigo: "7411001800231" },
      { fila: 3, nombre: "Pan dulce", precio: 0.25, unidad: "lb" },
      { fila: 4, nombre: "Cerveza Pilsener", categoria: "Cervezas" },
    ]);
    expect(r.ia).toBe(false);
    const [coca, pan, cerveza] = r.filas;
    expect(coca.duplicado).toEqual({ id: "p1", nombre: "Coca-Cola 600 ml" });
    expect(coca.foto?.fuente).toBe("Open Food Facts");
    expect(pan).toMatchObject({ pasillo: "General", categoria: "General", unidadVenta: "libra", foto: null, avisos: [] });
    expect(cerveza).toMatchObject({ categoria: "Cervezas", soloAdultos: true, avisos: ["Sin precio de venta"] });
  });

  it("con IA: completa, pero lo que trae el Excel manda", async () => {
    ia.activa = true;
    ia.respuesta = [
      { i: 0, nombre: "Lays Barbacoa 150 g", marca: "Lays", pasillo: "Snacks", categoria: "Snacks › Papas", unidadVenta: "unidad", soloAdultos: false, empacado: true, descripcion: "Papas fritas sabor barbacoa." },
      { i: 1, nombre: "Queso Duro", marca: "", pasillo: "Lácteos", categoria: "Quesos", unidadVenta: "unidad", soloAdultos: false, descripcion: "Queso duro salvadoreño." },
      { i: 7, nombre: "inventado" },
    ];
    const r = await analizarLote([
      { fila: 2, nombre: "LAYS BBQ 150G", precio: 1.1, marca: "Sabritas" },
      { fila: 3, nombre: "Queso duro", precio: 3.5, unidad: "libra" },
    ]);
    expect(r.ia).toBe(true);
    expect(r.filas[0]).toMatchObject({ nombre: "Lays Barbacoa 150 g", marca: "Sabritas", pasillo: "Snacks", categoria: "Papas", ia: true });
    // A la foto le llega si es empacado: lo suelto no se busca por nombre.
    expect(buscarFoto.mock.calls.map(([f]) => f.empacado)).toEqual([true, false]);
    // La unidad del Excel le gana a la IA.
    expect(r.filas[1]).toMatchObject({ nombre: "Queso Duro", unidadVenta: "libra", pasillo: "Lácteos" });
  });
});

describe("guardar lo aprobado", () => {
  it("crea los pasillos, categorías, marcas y proveedores que faltan UNA vez, y sube la foto", async () => {
    db.pasillos.push({ _id: "m1", name: "Bebidas" });
    const r = await importarLote([
      { fila: 2, nombre: "Pepsi 2 L", precio: 1.75, costo: 1.2, existencia: 12, codigo: "7401", pasillo: "bebidas", categoria: "Gaseosas", marca: "Pepsi", proveedor: "Distribuidora Central", unidadVenta: "unidad", foto: { url: "https://img/pepsi.jpg", fuente: "Open Food Facts" } },
      { fila: 3, nombre: "Lays Clásicas", precio: 0.75, pasillo: "Snacks", categoria: "Papas", marca: "Lays" },
      { fila: 4, nombre: "Doritos", precio: 0.75, pasillo: "Snacks", categoria: "Papas", marca: "Sabritas" },
      { fila: 5, nombre: "Cheetos", precio: 0.75, pasillo: "Snacks", categoria: "Papas", marca: "Sabritas" },
    ]);
    expect(r.map((x) => x.estado)).toEqual(["creado", "creado", "creado", "creado"]);
    expect(db.pasillos.map((p) => p.name)).toEqual(["Bebidas", "Snacks"]); // "bebidas" reusó la que había
    expect(db.categorias.map((c) => c.type).sort()).toEqual(["Gaseosas", "Papas"]);
    expect(db.marcas.map((m) => m.name).sort()).toEqual(["Lays", "Pepsi", "Sabritas"]);
    expect(db.proveedores).toHaveLength(1);

    const pepsi = db.productos.find((p) => p.name === "Pepsi 2 L");
    expect(pepsi).toMatchObject({
      salePrice: 1.75, priceCost: 1.2, stock: 12, maxQuantity: 12, barCode: "7401", moduleId: "m1",
      image: ["https://res.cloudinary.com/x/image/upload/v1/foto.jpg"], public_id: "grupo1B/foto", fotoFuente: "Open Food Facts", importadoDe: "excel",
    });
    expect(subir).toHaveBeenCalledTimes(1);
    const lays = db.productos.find((p) => p.name === "Lays Clásicas");
    expect(lays.image).toBeUndefined();
    expect(lays.stock).toBe(0);
  });

  it("lo que ya existe o se repite se omite, y lo que no tiene precio no entra", async () => {
    db.productos.push({ _id: "p1", name: "Agua Cristal", barCode: "111" });
    const r = await importarLote([
      { fila: 2, nombre: "agua cristal", precio: 0.5 },
      { fila: 3, nombre: "Otra agua", precio: 0.5, codigo: "111" },
      { fila: 4, nombre: "Jugo", precio: 0.8 },
      { fila: 5, nombre: "Jugo", precio: 0.8 },
      { fila: 6, nombre: "Sin precio" },
    ]);
    expect(r.map((x) => x.estado)).toEqual(["omitido", "omitido", "creado", "omitido", "error"]);
    expect(r[4].motivo).toBe("Sin precio de venta");
    expect(db.productos.filter((p) => p.name === "Jugo")).toHaveLength(1);
  });

  it("la marca que ya existe se reusa aunque esté escrita distinto", async () => {
    db.marcas.push({ _id: "b1", name: "Coca-Cola" });
    const [r] = await importarLote([{ fila: 2, nombre: "Coca Cola 3 L", precio: 2.75, marca: "coca cola" }]);
    expect(r.estado).toBe("creado");
    expect(db.marcas).toHaveLength(1);
    expect(db.productos[0].brandId).toBe("b1");
  });

  it("si la foto no se puede subir, el producto entra igual, sin foto", async () => {
    subir.mockRejectedValueOnce(new Error("Cloudinary caído"));
    const [r] = await importarLote([{ fila: 2, nombre: "Sprite", precio: 1, foto: { url: "https://img/sprite.jpg", fuente: "Open Food Facts" } }]);
    expect(r).toMatchObject({ estado: "creado", conFoto: false });
    expect(db.productos[0].fotoFuente).toBeUndefined();
  });
});

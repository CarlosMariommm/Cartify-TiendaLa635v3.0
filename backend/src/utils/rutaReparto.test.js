import { describe, it, expect, vi } from "vitest";
import {
  recortarRuta,
  rutaDelRepartidor,
  estimadoDesdeLaTienda,
  olvidarRuta,
  DESVIO_MAXIMO_M,
  ESPERA_ENTRE_CONSULTAS_MS,
  VIGENCIA_MS,
} from "./rutaReparto.js";

/*
 * La ruta por las calles que ve el cliente mientras le llevan su pedido.
 */

// Una ruta en L: de la tienda hacia el este y luego hacia el norte (~1.1 km por tramo).
const RUTA = [[-89.2, 13.68], [-89.19, 13.68], [-89.19, 13.69]];
const CASA = { lat: 13.69, lng: -89.19 };
const servicio = () => vi.fn(async () => ({ puntos: RUTA, metros: 2200, segundos: 440 }));

describe("recortar la ruta conforme avanza", () => {
  it("la línea arranca donde va el repartidor y se salta lo ya recorrido", () => {
    const r = recortarRuta(RUTA, { lat: 13.68, lng: -89.191 });
    expect(r.puntos[0]).toEqual([-89.191, 13.68]);
    expect(r.puntos.slice(1)).toEqual([[-89.19, 13.68], [-89.19, 13.69]]);
    expect(r.desvioM).toBeLessThan(1);
    expect(r.metrosRestantes).toBeGreaterThan(1100);
    expect(r.metrosRestantes).toBeLessThan(1250);
  });

  it("sabe cuándo el repartidor se salió de la ruta", () => {
    const r = recortarRuta(RUTA, { lat: 13.6835, lng: -89.198 });
    expect(r.desvioM).toBeGreaterThan(DESVIO_MAXIMO_M);
  });
});

describe("la ruta del repartidor", () => {
  it("sin llave no hay ruta, y no se consulta a nadie", async () => {
    const pedir = servicio();
    expect(await rutaDelRepartidor({ pedidoId: "a", desde: { lat: 13.68, lng: -89.2 }, hacia: CASA, llave: "", pedir })).toBeNull();
    expect(pedir).not.toHaveBeenCalled();
  });

  it("mientras va sobre la ruta, no la vuelve a pedir: solo la recorta", async () => {
    const pedir = servicio();
    const ahora = 1_000_000;
    olvidarRuta("b");
    const primera = await rutaDelRepartidor({ pedidoId: "b", desde: { lat: 13.68, lng: -89.2 }, hacia: CASA, llave: "x", pedir, ahora });
    expect(primera.metros).toBeGreaterThan(2000);
    // Recién pedida, el tiempo es el del servicio (la línea mide casi lo mismo que dijo).
    expect(primera.segundos).toBeGreaterThan(430);
    expect(primera.segundos).toBeLessThanOrEqual(440);

    const despues = await rutaDelRepartidor({ pedidoId: "b", desde: { lat: 13.68, lng: -89.19 }, hacia: CASA, llave: "x", pedir, ahora: ahora + 60_000 });
    expect(pedir).toHaveBeenCalledTimes(1);
    expect(despues.metros).toBeLessThan(primera.metros);
    // El tiempo baja en proporción a lo que falta.
    expect(despues.segundos).toBeLessThan(primera.segundos);
  });

  it("si se desvía, pide otra; pero nunca dos veces en medio minuto", async () => {
    const pedir = servicio();
    const ahora = 2_000_000;
    olvidarRuta("c");
    await rutaDelRepartidor({ pedidoId: "c", desde: { lat: 13.68, lng: -89.2 }, hacia: CASA, llave: "x", pedir, ahora });
    const lejos = { lat: 13.6835, lng: -89.198 };
    await rutaDelRepartidor({ pedidoId: "c", desde: lejos, hacia: CASA, llave: "x", pedir, ahora: ahora + 10_000 });
    expect(pedir).toHaveBeenCalledTimes(1);
    await rutaDelRepartidor({ pedidoId: "c", desde: lejos, hacia: CASA, llave: "x", pedir, ahora: ahora + ESPERA_ENTRE_CONSULTAS_MS + 1 });
    expect(pedir).toHaveBeenCalledTimes(2);
  });

  it("aunque vaya bien, la renueva cada tanto", async () => {
    const pedir = servicio();
    const ahora = 3_000_000;
    olvidarRuta("d");
    await rutaDelRepartidor({ pedidoId: "d", desde: { lat: 13.68, lng: -89.2 }, hacia: CASA, llave: "x", pedir, ahora });
    await rutaDelRepartidor({ pedidoId: "d", desde: { lat: 13.68, lng: -89.195 }, hacia: CASA, llave: "x", pedir, ahora: ahora + VIGENCIA_MS + 1 });
    expect(pedir).toHaveBeenCalledTimes(2);
  });

  it("si el servicio falla, el mapa se queda como antes y no insiste enseguida", async () => {
    const pedir = vi.fn(async () => { throw new Error("caído"); });
    const ahora = 4_000_000;
    olvidarRuta("e");
    expect(await rutaDelRepartidor({ pedidoId: "e", desde: { lat: 13.68, lng: -89.2 }, hacia: CASA, llave: "x", pedir, ahora })).toBeNull();
    expect(await rutaDelRepartidor({ pedidoId: "e", desde: { lat: 13.68, lng: -89.2 }, hacia: CASA, llave: "x", pedir, ahora: ahora + 10_000 })).toBeNull();
    expect(pedir).toHaveBeenCalledTimes(1);
  });
});

describe("sin GPS del repartidor: la ruta desde la tienda", () => {
  const TIENDA = { lat: 13.68, lng: -89.2 };
  const SALIO = 5_000_000;

  it("la ruta de la tienda a la casa y lo que falta desde que salió; se pide una sola vez", async () => {
    const pedir = servicio();
    olvidarRuta("t1");
    const recien = await estimadoDesdeLaTienda({ pedidoId: "t1", tienda: TIENDA, hacia: CASA, salio: SALIO, llave: "x", pedir, ahora: SALIO });
    expect(recien.desde).toEqual(TIENDA);
    expect(recien.puntos[0]).toEqual([-89.2, 13.68]);
    expect(recien.puntos.length).toBe(RUTA.length + 1);
    expect(recien.segundos).toBe(440);

    // Dos minutos después faltan dos minutos menos, sin volver a preguntar.
    const despues = await estimadoDesdeLaTienda({ pedidoId: "t1", tienda: TIENDA, hacia: CASA, salio: SALIO, llave: "x", pedir, ahora: SALIO + 120_000 });
    expect(despues.segundos).toBe(320);
    expect(pedir).toHaveBeenCalledTimes(1);

    // Ya pasó el tiempo de la ruta: no baja de cero.
    const tarde = await estimadoDesdeLaTienda({ pedidoId: "t1", tienda: TIENDA, hacia: CASA, salio: SALIO, llave: "x", pedir, ahora: SALIO + 900_000 });
    expect(tarde.segundos).toBe(0);
  });

  it("sin llave no hay línea, pero sí un tiempo por la línea recta", async () => {
    const pedir = servicio();
    olvidarRuta("t2");
    const r = await estimadoDesdeLaTienda({ pedidoId: "t2", tienda: TIENDA, hacia: CASA, salio: SALIO, llave: "", pedir, ahora: SALIO });
    expect(pedir).not.toHaveBeenCalled();
    expect(r.puntos).toBeNull();
    // ~1.56 km en recta × 1.35 de rodeo a 18 km/h: unos 7 minutos.
    expect(r.segundos).toBeGreaterThan(380);
    expect(r.segundos).toBeLessThan(470);
  });

  it("sin la ubicación de la tienda no hay nada que estimar", async () => {
    const pedir = servicio();
    expect(await estimadoDesdeLaTienda({ pedidoId: "t3", tienda: { lat: null, lng: null }, hacia: CASA, salio: SALIO, llave: "x", pedir })).toBeNull();
    expect(pedir).not.toHaveBeenCalled();
  });

  it("si el servicio falla, igual da el tiempo y no insiste enseguida", async () => {
    const pedir = vi.fn(async () => { throw new Error("caído"); });
    olvidarRuta("t4");
    const r = await estimadoDesdeLaTienda({ pedidoId: "t4", tienda: TIENDA, hacia: CASA, salio: SALIO, llave: "x", pedir, ahora: SALIO });
    expect(r.puntos).toBeNull();
    expect(r.segundos).toBeGreaterThan(0);
    await estimadoDesdeLaTienda({ pedidoId: "t4", tienda: TIENDA, hacia: CASA, salio: SALIO, llave: "x", pedir, ahora: SALIO + 10_000 });
    expect(pedir).toHaveBeenCalledTimes(1);
  });
});

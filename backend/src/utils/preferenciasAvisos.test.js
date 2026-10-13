import { describe, it, expect, vi } from "vitest";
import { cambiosDePreferencias, quiereEnLaApp, AVISO_DEL_ESTADO } from "./preferenciasAvisos.js";
import { repartirPushDeLaPromo, textoDeFavoritos, textoDelPush } from "./avisoPromo.js";

/*
 * El correo, de mentira. avisoPromo.js lo trae, y el de verdad arma el
 * cliente de Mailjet al cargarse: sin las llaves del .env (en GitHub no hay)
 * revienta antes de correr una sola prueba. Aquí no se manda nada.
 */
vi.mock("./sendMailMailjet.js", () => ({ sendEmail: vi.fn() }));

/*
 * Correo y app, cada uno por su lado: apagar uno no toca al otro.
 */

describe("las preferencias de avisos por canal", () => {
  it("el correo y la app se guardan en campos distintos", () => {
    expect(cambiosDePreferencias({ correo: { promociones: false } })).toEqual({
      "notificationPrefs.promociones": false,
    });
    expect(cambiosDePreferencias({ app: { promociones: false } })).toEqual({
      "avisosApp.promociones": false,
    });
  });

  it("las versiones viejas mandaban la clave suelta, y era el correo", () => {
    expect(cambiosDePreferencias({ pedidoCerca: true })).toEqual({ "notificationPrefs.pedidoCerca": true });
  });

  it("solo pasan claves conocidas y valores true/false", () => {
    expect(cambiosDePreferencias({
      app: { promociones: "no", isActive: false, favoritosEnOferta: false },
      correo: { favoritosEnOferta: false, balance: 1000 },
      "avisosApp.promociones": false,
    })).toEqual({ "avisosApp.favoritosEnOferta": false });
  });

  it("sin el campo, el aviso de la app está encendido", () => {
    expect(quiereEnLaApp({}, "promociones")).toBe(true);
    expect(quiereEnLaApp({ notificationPrefs: { promociones: false } }, "promociones")).toBe(true);
    expect(quiereEnLaApp({ avisosApp: { promociones: false } }, "promociones")).toBe(false);
  });

  it("cada paso del pedido tiene su interruptor", () => {
    expect(AVISO_DEL_ESTADO.en_camino).toBe(AVISO_DEL_ESTADO.listo);
    expect(Object.keys(AVISO_DEL_ESTADO)).toEqual(["preparando", "en_camino", "listo", "entregado", "cancelado"]);
  });
});

describe("el aviso de una promo en el teléfono", () => {
  const items = [
    { id: "p1", nombre: "Coca-Cola 600 ml", descuento: 20 },
    { id: "p2", nombre: "Pan dulce", descuento: 20 },
  ];
  const tk = (n) => `ExponentPushToken[t${n}]`;

  it("apagar el correo de promociones NO apaga el aviso de la app", () => {
    const clientes = [{ notificationPrefs: { promociones: false }, pushTokens: [tk(1)] }];
    expect(repartirPushDeLaPromo(clientes, items).generales).toEqual([tk(1)]);
  });

  it("apagarlo en la app sí, y quien tiene un favorito en la promo recibe el suyo", () => {
    const clientes = [
      { avisosApp: { promociones: false }, pushTokens: [tk(1)] },
      { favorites: ["p2"], pushTokens: [tk(2)] },
      { favorites: ["p2"], avisosApp: { favoritosEnOferta: false }, pushTokens: [tk(3)] },
      { favorites: ["otro"], pushTokens: [tk(4)] },
    ];
    const { generales, favoritos } = repartirPushDeLaPromo(clientes, items);
    expect(generales).toEqual([tk(3), tk(4)]);
    expect(favoritos).toEqual([{ nombres: ["Pan dulce"], tokens: [tk(2)] }]);
  });

  it("el de favoritos llega aunque las promociones estén apagadas en la app", () => {
    const clientes = [{ favorites: ["p1"], avisosApp: { promociones: false }, pushTokens: [tk(1)] }];
    const { generales, favoritos } = repartirPushDeLaPromo(clientes, items);
    expect(generales).toEqual([]);
    expect(favoritos[0].tokens).toEqual([tk(1)]);
  });

  it("los textos caben en la vista previa y van de tú", () => {
    expect(textoDeFavoritos(["Pan dulce"])).toEqual({
      titulo: "Uno de tus favoritos está en oferta",
      cuerpo: "Pan dulce. Toca para verlo.",
    });
    const varios = textoDeFavoritos(["Coca-Cola 600 ml", "Pan dulce", "Queso duro blando por libra"]);
    expect(varios.titulo).toBe("3 de tus favoritos están en oferta");
    expect(varios.cuerpo.length).toBeLessThanOrEqual(45);

    const general = textoDelPush({ _id: "x", type: "nxm", buyQty: 2, payQty: 1 }, items);
    expect(`${general.titulo} ${general.cuerpo}`).not.toMatch(/usted|Toque/);
  });
});

import { describe, it, expect } from 'vitest';
import { calcularEnvio, distanciaKm } from './envio';
import { calcularEnvio as envioDelServidor } from '../../../backend/src/utils/envio.js';
import { calcularServicio } from './servicio';
import { ajustarCantidad, cantidadConUnidad, esPorLibra, pasoDe, precioConUnidad } from './unidades';

// Lo que toca plata. Un error aquí no se ve como un botón chueco: se ve en la cuenta del cliente o
// en la caja de la tienda.

// La tienda: Calle Sevilla, Col. Providencia, San Salvador.
const TIENDA = { lat: 13.7063, lng: -89.2183 };
const AJUSTES = { envioBase: 1, envioPorKm: 0.5, ubicacionTienda: TIENDA };

describe('envío', () => {
  it('sin la ubicación del cliente cobra solo la base', () => {
    expect(calcularEnvio(AJUSTES, {})).toMatchObject({ costo: 1, metodo: 'base' });
  });

  it('cobra base más los kilómetros, en dólares con dos decimales', () => {
    const destino = { lat: 13.7163, lng: -89.2183 }; // ~1.1 km al norte
    const r = calcularEnvio(AJUSTES, destino);
    expect(r.metodo).toBe('km');
    expect(r.distanciaKm).toBeCloseTo(1.1, 1);
    expect(r.costo).toBe(Number((1 + 0.5 * distanciaKm(TIENDA.lat, TIENDA.lng, destino.lat, destino.lng)).toFixed(2)));
  });

  it('una zona con precio fijo manda sobre la fórmula, y gana la más chica', () => {
    const ajustes = {
      ...AJUSTES,
      zonasEnvio: [
        { nombre: 'San Salvador', lat: 13.70, lng: -89.20, radioKm: 10, precio: 2.5 },
        { nombre: 'Providencia', lat: 13.7063, lng: -89.2183, radioKm: 2, precio: 1.25 },
      ],
    };
    expect(calcularEnvio(ajustes, { lat: 13.7070, lng: -89.2190 })).toMatchObject({ costo: 1.25, zona: 'Providencia' });
  });

  it('marca fuera de cobertura lo que queda lejísimos (el emulador en California)', () => {
    const r = calcularEnvio(AJUSTES, { lat: 37.42, lng: -122.08 });
    expect(r.fueraDeCobertura).toBe(true);
  });

  it('la web cobra exactamente lo mismo que el servidor', () => {
    const casos = [
      [AJUSTES, {}],
      [AJUSTES, { lat: 13.6929, lng: -89.2182 }],
      [AJUSTES, { lat: 13.7942, lng: -89.1830 }],
      [{ ...AJUSTES, envioBase: 0, envioPorKm: 0.35 }, { lat: 13.67, lng: -89.28 }],
      [{ envioBase: 2 }, { lat: 13.67, lng: -89.28 }],
      [{ ...AJUSTES, zonasEnvio: [{ nombre: 'Centro', lat: 13.6989, lng: -89.1914, radioKm: 3, precio: 1.5 }] }, { lat: 13.70, lng: -89.19 }],
    ];
    for (const [ajustes, destino] of casos) {
      const web = calcularEnvio(ajustes, destino);
      const servidor = envioDelServidor(ajustes, destino);
      expect(web.costo).toBe(servidor.costo);
      expect(web.metodo).toBe(servidor.metodo);
    }
  });
});

describe('tarifa de servicio', () => {
  it('apagada no cobra nada', () => {
    expect(calcularServicio({ servicioActivo: false, servicioValor: 1 }, 20)).toBe(0);
  });
  it('fija cobra el monto tal cual', () => {
    expect(calcularServicio({ servicioActivo: true, servicioTipo: 'fijo', servicioValor: 0.5 }, 20)).toBe(0.5);
  });
  it('por porcentaje se redondea a centavos', () => {
    expect(calcularServicio({ servicioActivo: true, servicioTipo: 'porcentaje', servicioValor: 3 }, 12.99)).toBe(0.39);
  });
});

describe('unidades y cantidades', () => {
  const fresas = { nombre: 'Fresas', unidadVenta: 'libra', salePrice: 4.65 };
  const coca = { nombre: 'Coca-Cola', unidadVenta: 'unidad', salePrice: 0.8 };

  it('por libra va de media en media; por unidad, de una en una', () => {
    expect(esPorLibra(fresas)).toBe(true);
    expect(pasoDe(fresas)).toBe(0.5);
    expect(pasoDe(coca)).toBe(1);
    expect(pasoDe({})).toBe(1);
  });

  it('redondea sin arrastrar errores de coma flotante (0.5 + 0.5 + 0.1)', () => {
    expect(ajustarCantidad(fresas, 0.5 + 0.5 + 0.1)).toBe(1);
    expect(ajustarCantidad(fresas, 1.3)).toBe(1.5);
    expect(ajustarCantidad(coca, 2.4)).toBe(2);
    expect(ajustarCantidad(coca, -3)).toBe(0);
  });

  it('dice la cantidad y el precio como se cobran', () => {
    expect(cantidadConUnidad(fresas, 1.5)).toBe('1.5 lb');
    expect(cantidadConUnidad(coca, 3)).toBe('3 u');
    expect(precioConUnidad(fresas)).toBe('$4.65/lb');
    expect(precioConUnidad(coca)).toBe('$0.80');
  });
});

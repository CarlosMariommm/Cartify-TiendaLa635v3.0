import { readFileSync } from 'node:fs';
import { describe, it, expect } from 'vitest';
import { RUTAS_DEL_PANEL, areaDeRuta } from './sesion';

/*
 * Qué rutas son del panel. Si una pantalla nueva del panel no está en la
 * lista, la web la toma por de la tienda y manda al personal al login (pasó
 * con /pronostico).
 */

// Las rutas que App.jsx pone dentro del armazón del panel (AdminLayout).
const rutasDelPanelEnApp = () => {
  const app = readFileSync(new URL('../App.jsx', import.meta.url), 'utf8');
  const desde = app.indexOf('<Route element={<AdminLayout />}>');
  // Hasta donde empieza el área "Mi Cuenta" del cliente.
  const hasta = app.indexOf('Mi Cuenta', desde);
  expect(desde).toBeGreaterThan(-1);
  expect(hasta).toBeGreaterThan(desde);
  return [...app.slice(desde, hasta).matchAll(/path="([^"]+)"/g)].map((m) => m[1]);
};

describe('las rutas del panel', () => {
  it('toda pantalla del panel en App.jsx está en la lista', () => {
    const rutas = rutasDelPanelEnApp();
    expect(rutas).toContain('/pronostico');
    for (const ruta of rutas) expect(areaDeRuta(ruta), ruta).toBe('personal');
  });

  it('la tienda y Mi Cuenta son del cliente', () => {
    for (const ruta of ['/', '/producto/123', '/mi-cuenta', '/iniciar-sesion', '/juego']) {
      expect(areaDeRuta(ruta), ruta).toBe('cliente');
    }
    expect(areaDeRuta('/pronosticos-raros')).toBe('cliente');
    expect(RUTAS_DEL_PANEL).toContain('/admin');
  });
});

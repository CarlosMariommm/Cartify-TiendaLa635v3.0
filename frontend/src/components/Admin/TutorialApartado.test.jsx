// @vitest-environment jsdom
import { useEffect } from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, act } from '@testing-library/react';
import { MemoryRouter, useNavigate } from 'react-router-dom';
import TutorialApartado from './TutorialApartado';
import InvitacionProveedores from './InvitacionProveedores';
import { TEMAS_AYUDA } from '../../utils/ayudaPanel';
import { diapositivasDe } from '../../utils/tutorialesPanel';
import { supplierService } from '../../api/supplierService';

/*
 * El tutorial que sale la primera vez que el administrador entra a cada
 * apartado del panel. El contenido es el de la ayuda (ayudaPanel.js).
 */

/*
 * Sin animaciones: con los relojes de mentira, la salida de una ventana podía
 * quedar a medias de una prueba a la siguiente. Aquí se prueba qué se
 * muestra y cuándo, no cómo se anima.
 */
vi.mock('framer-motion', async () => {
  const { createElement } = await import('react');
  const sinAnimar = ({ initial, animate, exit, transition, ...props }) => createElement('div', props);
  return { AnimatePresence: ({ children }) => children, motion: { div: sinAnimar } };
});
vi.mock('../../api/supplierService', () => ({ supplierService: { getSuppliers: vi.fn() } }));
const sesion = { user: { type: 'admin', id: 'a1' } };
vi.mock('../../hooks/useAuth', () => ({ useAuth: () => sesion }));

const PEDIDOS = TEMAS_AYUDA.find((t) => t.id === 'pedidos');

// Para cambiar de apartado desde la prueba, como lo haría el menú.
let navegar;
const Navegador = () => {
  const ir = useNavigate();
  useEffect(() => { navegar = ir; }, [ir]);
  return null;
};

const esperar = (ms) => act(async () => { await vi.advanceTimersByTimeAsync(ms); });

const abrir = async (ruta, { conInvitacion = false } = {}) => {
  render(
    <MemoryRouter initialEntries={[ruta]}>
      <Navegador />
      <TutorialApartado />
      {conInvitacion && <InvitacionProveedores />}
    </MemoryRouter>
  );
  await esperar(800);
};

describe('el tutorial de cada apartado', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
    sessionStorage.clear();
    sesion.user = { type: 'admin', id: 'a1' };
    supplierService.getSuppliers.mockResolvedValue([]);
  });
  afterEach(() => { cleanup(); vi.useRealTimers(); vi.clearAllMocks(); });

  it('la primera vez recorre para qué sirve, los pasos y un consejo', async () => {
    await abrir('/pedidos');
    const dialogo = screen.getByRole('dialog', { name: 'Pedidos' });
    expect(dialogo).toBeTruthy();
    expect(screen.getByText('Para qué sirve')).toBeTruthy();
    expect(screen.getByText(PEDIDOS.resumen)).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }));
    expect(screen.getByText(`Paso 1 de ${PEDIDOS.pasos.length}`)).toBeTruthy();
    expect(screen.getByText(PEDIDOS.pasos[0])).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Anterior' }));
    expect(screen.getByText('Para qué sirve')).toBeTruthy();

    // Hasta el final: el consejo, y "Entendido" lo cierra.
    const total = diapositivasDe(PEDIDOS).length;
    for (let i = 1; i < total; i++) fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }));
    expect(screen.getByText('Un consejo')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Saltar' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Entendido' }));
    await esperar(500);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('cada apartado sale una sola vez, aunque se haya saltado', async () => {
    await abrir('/pedidos');
    fireEvent.click(screen.getByRole('button', { name: 'Saltar' }));
    await esperar(500);
    cleanup();

    await abrir('/pedidos');
    expect(screen.queryByRole('dialog')).toBeNull();

    // Otro apartado sí tiene el suyo.
    act(() => navegar('/inventario'));
    await esperar(800);
    expect(screen.getByRole('dialog', { name: 'Inventario' })).toBeTruthy();
  });

  it('las flechas recorren los pasos y Esc lo cierra', async () => {
    await abrir('/pedidos');
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    expect(screen.getByText(`Paso 1 de ${PEDIDOS.pasos.length}`)).toBeTruthy();
    fireEvent.keyDown(window, { key: 'Escape' });
    await esperar(1500);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('"No mostrar más tutoriales" apaga todos', async () => {
    await abrir('/pedidos');
    fireEvent.click(screen.getByRole('button', { name: 'No mostrar más tutoriales' }));
    await esperar(1500);
    act(() => navegar('/promociones'));
    await esperar(800);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('quien solo pasa por un apartado camino a otro no recibe su tutorial', async () => {
    render(
      <MemoryRouter initialEntries={['/pedidos']}>
        <Navegador />
        <TutorialApartado />
      </MemoryRouter>
    );
    await esperar(200);
    act(() => navegar('/clientes'));
    await esperar(800);
    expect(screen.getByRole('dialog', { name: 'Clientes' })).toBeTruthy();
    expect(screen.queryByRole('dialog', { name: 'Pedidos' })).toBeNull();
  });

  it('cada administrador tiene los suyos, y al empleado no le sale', async () => {
    await abrir('/pedidos');
    fireEvent.click(screen.getByRole('button', { name: 'Saltar' }));
    await esperar(500);
    cleanup();

    sesion.user = { type: 'admin', id: 'a2' };
    await abrir('/pedidos');
    expect(screen.getByRole('dialog', { name: 'Pedidos' })).toBeTruthy();
    cleanup();

    sesion.user = { type: 'employee', id: 'e1' };
    await abrir('/dashboard');
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('sin tema de ayuda (la propia Ayuda) no sale nada', async () => {
    await abrir('/ayuda');
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('con la invitación de proveedores, sale primero el tutorial y la invitación después', async () => {
    supplierService.getSuppliers.mockResolvedValue([{ _id: '2', name: 'Bebidas del Pacífico', isActive: true }]);
    await abrir('/pedidos', { conInvitacion: true });
    await esperar(1500);
    expect(screen.getAllByRole('dialog')).toHaveLength(1);
    expect(screen.getByRole('dialog', { name: 'Pedidos' })).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Saltar' }));
    await esperar(500);
    expect(screen.getByRole('dialog', { name: 'Enlace sus proveedores' })).toBeTruthy();
  });
});

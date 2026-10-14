// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, act } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import InvitacionProveedores, { CLAVE_AHORA_NO, CLAVE_NO_MOSTRAR } from './InvitacionProveedores';
import { supplierService } from '../../api/supplierService';

/*
 * La invitación a decir por dónde se le pide a cada proveedor: solo al
 * administrador, solo si falta alguno, y respetando "Ahora no" y "No volver
 * a mostrar".
 */

vi.mock('../../api/supplierService', () => ({ supplierService: { getSuppliers: vi.fn() } }));
const sesion = { user: { type: 'admin' } };
vi.mock('../../hooks/useAuth', () => ({ useAuth: () => sesion }));

const PROVEEDORES = [
  { _id: '1', name: 'Lácteos del Valle', isActive: true, pedidos: { canal: 'whatsapp' } },
  { _id: '2', name: 'Bebidas del Pacífico', isActive: true },
  { _id: '3', name: 'Panificadora San José', isActive: true, pedidos: { canal: '' } },
  { _id: '4', name: 'Uno que ya no se usa', isActive: false },
];

const abrir = async (ruta = '/dashboard') => {
  render(
    <MemoryRouter initialEntries={[ruta]}>
      <InvitacionProveedores />
      <Routes>
        <Route path="/dashboard" element={<p>Tablero</p>} />
        <Route path="/proveedores" element={<p>Pantalla de proveedores</p>} />
      </Routes>
    </MemoryRouter>
  );
  // La invitación espera un momento después de entrar.
  await act(async () => { await vi.advanceTimersByTimeAsync(2000); });
};

describe('la invitación a enlazar los proveedores', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
    sessionStorage.clear();
    sesion.user = { type: 'admin' };
    supplierService.getSuppliers.mockResolvedValue(PROVEEDORES);
  });
  afterEach(() => { cleanup(); vi.useRealTimers(); vi.clearAllMocks(); });

  it('dice cuáles faltan (solo los activos) y lleva a Proveedores', async () => {
    await abrir();
    expect(screen.getByRole('dialog', { name: 'Enlace sus proveedores' })).toBeTruthy();
    expect(screen.getByText(/Faltan 2 proveedores: Bebidas del Pacífico, Panificadora San José\./)).toBeTruthy();
    expect(screen.getByText(/BEES no reciben pedidos de otros sistemas/)).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Enlazar mis proveedores' }));
    expect(screen.getByText('Pantalla de proveedores')).toBeTruthy();
    await act(async () => { await vi.advanceTimersByTimeAsync(500); });
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('"Ahora no" la guarda por esta sesión; "No volver a mostrar", para siempre', async () => {
    await abrir();
    fireEvent.click(screen.getByRole('button', { name: 'Ahora no' }));
    expect(sessionStorage.getItem(CLAVE_AHORA_NO)).toBe('1');
    cleanup();
    supplierService.getSuppliers.mockClear();
    await abrir();
    expect(supplierService.getSuppliers).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).toBeNull();
    cleanup();

    sessionStorage.clear();
    await abrir();
    fireEvent.click(screen.getByRole('button', { name: 'No volver a mostrar' }));
    expect(localStorage.getItem(CLAVE_NO_MOSTRAR)).toBe('1');
  });

  it('no sale al empleado, ni si ya están todos, ni estando en Proveedores', async () => {
    sesion.user = { type: 'employee' };
    await abrir();
    expect(supplierService.getSuppliers).not.toHaveBeenCalled();
    cleanup();

    sesion.user = { type: 'admin' };
    supplierService.getSuppliers.mockResolvedValue([PROVEEDORES[0], PROVEEDORES[3]]);
    await abrir();
    expect(screen.queryByRole('dialog')).toBeNull();
    cleanup();

    supplierService.getSuppliers.mockResolvedValue(PROVEEDORES);
    await abrir('/proveedores');
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});

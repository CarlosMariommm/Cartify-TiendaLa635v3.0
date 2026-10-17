// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import Notificaciones from './Notificaciones';
import { clientService } from '../../api/clientService';

// Mi cuenta › Notificaciones: cada aviso con su interruptor en la app y, si sale por correo, el
// suyo por correo. Apagar uno manda SOLO ese canal. El servidor y la sesión son de mentira.

vi.mock('../../api/clientService', () => ({
  clientService: { getClientById: vi.fn(), updateNotifications: vi.fn() },
}));
vi.mock('../../hooks/useAuth', () => ({ useAuth: () => ({ user: { id: 'c1' }, esCliente: true }) }));
vi.mock('../../hooks/useClientTheme', () => ({
  useTheme: () => ({ palette: { colors: { primary: '#003049', cardBorder: '#ddd', textPrimary: '#111', textSecondary: '#666' } } }),
}));
vi.mock('../../hooks/useIdioma', () => ({
  useIdioma: () => ({ t: (texto, vars) => texto.replace(/\{(\w+)\}/g, (_, k) => vars?.[k] ?? '') }),
}));
vi.mock('../../components/UI/Mascota', () => ({ CargandoMascota: () => null }));

describe('notificaciones por canal', () => {
  beforeEach(() => {
    clientService.getClientById.mockResolvedValue({
      notificationPrefs: { promociones: false, nuevosProductos: true, pedidoCerca: false },
      avisosApp: { pedidoEntregado: false },
    });
    clientService.updateNotifications.mockResolvedValue({});
  });
  afterEach(() => { cleanup(); vi.clearAllMocks(); });

  it('cada aviso tiene su interruptor de la app; los que salen por correo, también el del correo', async () => {
    render(<Notificaciones />);
    const app = await screen.findAllByRole('switch', { name: /, en la app$/ });
    const correo = screen.getAllByRole('switch', { name: /, por correo$/ });
    expect(app).toHaveLength(7);
    expect(correo).toHaveLength(3);
  });

  it('el correo apagado no apaga la app, y lo que no se guardó nace encendido', async () => {
    render(<Notificaciones />);
    const promoApp = await screen.findByRole('switch', { name: 'Promociones nuevas, en la app' });
    const promoCorreo = screen.getByRole('switch', { name: 'Promociones nuevas, por correo' });
    expect(promoApp.getAttribute('aria-checked')).toBe('true');
    expect(promoCorreo.getAttribute('aria-checked')).toBe('false');
    expect(screen.getByRole('switch', { name: 'Mis favoritos en oferta, en la app' }).getAttribute('aria-checked')).toBe('true');
    expect(screen.getByRole('switch', { name: 'Cuando te llega, en la app' }).getAttribute('aria-checked')).toBe('false');
  });

  it('tocar uno manda solo ese canal', async () => {
    render(<Notificaciones />);
    fireEvent.click(await screen.findByRole('switch', { name: 'Promociones nuevas, en la app' }));
    await waitFor(() => expect(clientService.updateNotifications).toHaveBeenCalledWith('c1', { app: { promociones: false } }));
    fireEvent.click(screen.getByRole('switch', { name: 'Sale o está listo para recoger, por correo' }));
    await waitFor(() => expect(clientService.updateNotifications).toHaveBeenCalledWith('c1', { correo: { pedidoCerca: true } }));
  });
});

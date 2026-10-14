// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import ConsejoImportar, { CLAVE_CONSEJO } from './ConsejoImportar';

/*
 * El consejo de Inventario: invita a importar el Excel y, con la equis, no
 * vuelve a salir en este equipo.
 */

describe('el consejo de importar desde Excel', () => {
  afterEach(() => { cleanup(); localStorage.clear(); });

  it('lleva a importar, y la equis lo quita para siempre', () => {
    const alImportar = vi.fn();
    render(<ConsejoImportar onImportar={alImportar} />);
    expect(screen.getByRole('note').textContent).toMatch(/la IA se encarga/);
    fireEvent.click(screen.getByRole('button', { name: /Importar desde Excel/ }));
    expect(alImportar).toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'No volver a mostrar el consejo' }));
    expect(screen.queryByRole('note')).toBeNull();
    expect(localStorage.getItem(CLAVE_CONSEJO)).toBe('1');
    cleanup();
    render(<ConsejoImportar onImportar={alImportar} />);
    expect(screen.queryByRole('note')).toBeNull();
  });
});

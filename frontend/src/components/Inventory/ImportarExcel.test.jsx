// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup, within } from '@testing-library/react';
import ImportarExcel from './ImportarExcel';
import { productService } from '../../api/productService';

// La ventana "Importar desde Excel" de punta a punta: el archivo, las columnas, la revisión y el
// guardado. El servidor es de mentira.

vi.mock('../../api/productService', () => ({
  productService: { importarColumnas: vi.fn(), analizarImportacion: vi.fn(), importarProductos: vi.fn() },
}));
vi.mock('../../utils/descargar', () => ({ descargarArchivo: vi.fn(async () => {}) }));

const CSV = 'Código;Producto;Precio de venta;Existencia\n7411001800231;Coca Cola 3 L;2,75;12\n;Fresas;2,00;8\n;Sin precio;;3\n';

const subir = (texto, nombre = 'inventario.csv') => {
  const entrada = document.querySelector('input[type=file]');
  fireEvent.change(entrada, { target: { files: [new File([texto], nombre, { type: 'text/csv' })] } });
};

const revisada = (f, extra = {}) => ({
  ...f, pasillo: 'Bebidas', categoria: 'Gaseosas', marca: '', unidadVenta: 'unidad', soloAdultos: false,
  descripcion: f.nombre, foto: null, duplicado: null, avisos: [], ia: true, ...extra,
});

describe('importar desde Excel', () => {
  beforeEach(() => {
    productService.analizarImportacion.mockImplementation(async (filas) => ({
      ia: true,
      filas: filas.map((f) => {
        if (f.nombre === 'Coca Cola 3 L') return revisada(f, { marca: 'Coca-Cola', foto: { url: 'https://images.openfoodfacts.org/x/front.4.full.jpg', fuente: 'Open Food Facts', por: 'codigo' } });
        if (f.nombre === 'Fresas') return revisada(f, { duplicado: { id: 'p1', nombre: 'Fresas' } });
        return revisada(f, { avisos: ['Sin precio de venta'] });
      }),
    }));
    productService.importarProductos.mockImplementation(async (productos) => ({
      resultados: productos.map((p) => ({ fila: p.fila, nombre: p.nombre, estado: 'creado', conFoto: Boolean(p.foto) })),
    }));
  });
  afterEach(() => { cleanup(); vi.clearAllMocks(); });

  it('lee las columnas, revisa con la IA y guarda solo lo que puede entrar', async () => {
    const alImportar = vi.fn();
    render(<ImportarExcel isOpen onClose={() => {}} onImportado={alImportar} />);
    subir(CSV);

    expect(await screen.findByText(/hay/)).toBeTruthy();
    expect(screen.getByText('3 productos')).toBeTruthy();
    expect(productService.importarColumnas).not.toHaveBeenCalled(); // los títulos se reconocieron solos

    fireEvent.click(screen.getByRole('button', { name: /Completar con IA/ }));
    expect(await screen.findByText(/listos para importar/)).toBeTruthy();
    expect(productService.analizarImportacion.mock.calls[0][0][0]).toMatchObject({ fila: 2, nombre: 'Coca Cola 3 L', precio: 2.75, existencia: 12, codigo: '7411001800231' });

    const filas = screen.getAllByRole('checkbox');
    expect(filas.map((c) => c.checked)).toEqual([true, false, false]); // la que ya existe y la sin precio no
    expect(screen.getByText('Ya existe: Fresas')).toBeTruthy();
    // La vista previa usa la foto chica de Open Food Facts.
    expect(document.querySelector('li img').getAttribute('src')).toBe('https://images.openfoodfacts.org/x/front.4.200.jpg');

    fireEvent.click(screen.getByRole('button', { name: 'Importar 1 producto' }));
    expect(await screen.findByText(/Se agregó 1 producto/)).toBeTruthy();
    expect(productService.importarProductos.mock.calls[0][0]).toEqual([
      expect.objectContaining({ fila: 2, nombre: 'Coca Cola 3 L', marca: 'Coca-Cola', foto: expect.objectContaining({ fuente: 'Open Food Facts' }) }),
    ]);
    expect(alImportar).toHaveBeenCalled();
  });

  it('quitar la foto la deja fuera del guardado', async () => {
    render(<ImportarExcel isOpen onClose={() => {}} />);
    subir(CSV);
    fireEvent.click(await screen.findByRole('button', { name: /Completar con IA/ }));
    await screen.findByText(/listos para importar/);
    fireEvent.click(screen.getByRole('button', { name: 'Quitar' }));
    fireEvent.click(screen.getByRole('button', { name: 'Importar 1 producto' }));
    await screen.findByText(/Se agregó 1 producto/);
    expect(productService.importarProductos.mock.calls[0][0][0].foto).toBeNull();
  });

  it('con títulos que no se reconocen, le pregunta a la IA qué columna es cuál', async () => {
    productService.importarColumnas.mockResolvedValue({ mapa: { nombre: 0, costo: 1, precio: 2 } });
    render(<ImportarExcel isOpen onClose={() => {}} />);
    subir('Dato 1;Dato 2;Dato 3\nLeche Salud 1 L;0,95;1,25\n');
    expect(await screen.findByText(/la IA eligió las columnas/)).toBeTruthy();
    expect(productService.importarColumnas).toHaveBeenCalledWith(['Dato 1', 'Dato 2', 'Dato 3'], [['Leche Salud 1 L', '0,95', '1,25']]);
    const precio = within(screen.getByText('Precio de venta').closest('label')).getByRole('combobox');
    expect(precio.value).toBe('2');
  });

  it('un .xls viejo se explica', async () => {
    render(<ImportarExcel isOpen onClose={() => {}} />);
    subir('x', 'viejo.xls');
    expect((await screen.findByRole('alert')).textContent).toMatch(/guárdelo como \.xlsx/);
  });

  it('si una tanda no se pudo revisar, sigue con lo que trae el Excel', async () => {
    productService.analizarImportacion.mockRejectedValueOnce(new Error('503'));
    render(<ImportarExcel isOpen onClose={() => {}} />);
    subir(CSV);
    fireEvent.click(await screen.findByRole('button', { name: /Completar con IA/ }));
    expect(await screen.findByText(/La IA no respondió/)).toBeTruthy();
    await waitFor(() => expect(screen.getAllByRole('checkbox').map((c) => c.checked)).toEqual([true, true, false]));
  });
});

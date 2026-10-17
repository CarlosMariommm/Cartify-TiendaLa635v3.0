import { useState } from 'react';
import { FileSpreadsheet, Sparkles, X } from 'lucide-react';

// EL CONSEJO DE INVENTARIO — ConsejoImportar.jsx
// Al entrar a Inventario, un consejo: si ya lleva sus productos en un Excel, que lo suba y la IA
// arme el inventario con fotos (ver ImportarExcel.jsx).

export const CLAVE_CONSEJO = 'cartify:consejo-importar-excel';

const leerOculto = () => {
  try { return localStorage.getItem(CLAVE_CONSEJO) === '1'; } catch { return false; }
};

const ConsejoImportar = ({ onImportar }) => {
  const [oculto, setOculto] = useState(leerOculto);
  if (oculto) return null;

  const ocultar = () => {
    try { localStorage.setItem(CLAVE_CONSEJO, '1'); } catch { /* sin almacenamiento: vuelve a salir, nada más */ }
    setOculto(true);
  };

  return (
    <div className="flex items-start gap-3 text-sm" role="note" aria-label="Consejo">
      <Sparkles className="w-5 h-5 text-[#066494] flex-none mt-0.5" aria-hidden="true" />
      <p className="flex-1 text-gray-700">
        <span className="font-semibold text-gray-900">Consejo:</span> si ya lleva sus productos en un Excel, súbalo y la IA se encarga
        del resto: reconoce las columnas, completa la marca, el pasillo y la categoría, y busca la foto de cada producto. Usted revisa antes de guardar.{' '}
        <button type="button" onClick={onImportar} className="inline-flex items-center gap-1 font-semibold text-[#066494] hover:underline">
          <FileSpreadsheet className="w-4 h-4" /> Importar desde Excel
        </button>
      </p>
      <button type="button" onClick={ocultar} aria-label="No volver a mostrar el consejo" title="No volver a mostrar" className="p-1 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

export default ConsejoImportar;

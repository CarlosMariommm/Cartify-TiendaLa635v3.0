import { useState, useEffect, useCallback, useMemo } from 'react';
import toast from 'react-hot-toast';
import { printMaterialService } from '../api/printMaterialService';
import { numeroEnRango } from '../utils/validaciones';
import { tAhora } from '../utils/idioma';

// MATERIALES DE IMPRESIÓN — useMaterialesImpresion.js
// Toda la lógica del papel y la tinta: cargarlos, editarlos, ajustar cuánto queda, y —lo que de
// verdad importa— decidir si un formato se puede ofrecer hoy o no.

// Un material da abasto si está activo y queda algo. La existencia en 0 es la
// única línea que apaga un formato; el mínimo solo sirve para avisar.
export const hayMaterial = (material) =>
  !!material && material.isActive !== false && Number(material.existencia) > 0;

export const vaQuedandoPoco = (material) =>
  hayMaterial(material) &&
  Number(material.minimo) > 0 &&
  Number(material.existencia) <= Number(material.minimo);

export const useMaterialesImpresion = () => {
  const [materiales, setMateriales] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);

  const cargar = useCallback(async () => {
    try {
      setCargando(true);
      const datos = await printMaterialService.getMaterials();
      setMateriales(Array.isArray(datos) ? datos : []);
    } catch (error) {
      // El interceptor de Axios ya avisó; aquí solo evitamos quedar con basura.
      console.error('Error cargando materiales:', error);
      setMateriales([]);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const porId = useMemo(
    () => new Map(materiales.map((m) => [String(m._id), m])),
    [materiales]
  );

  const papeles = useMemo(() => materiales.filter((m) => m.tipo !== 'tinta'), [materiales]);
  const tintas = useMemo(() => materiales.filter((m) => m.tipo === 'tinta'), [materiales]);

  // ¿Se puede imprimir a color hoy? Basta con que quede UN tóner de color. Si la tienda no cargó
  // ninguna tinta todavía, se responde que sí: mientras nadie diga lo contrario, asumimos que la
  // impresora funciona como siempre.
  const hayTintaDeColor = useMemo(() => {
    const deColor = tintas.filter((t) => t.esColor);
    if (deColor.length === 0) return true;
    return deColor.some(hayMaterial);
  }, [tintas]);

  // Si un formato se puede ofrecer, y si no, por qué no. Devuelve siempre el motivo en palabras:
  // "agotado" a secas no le dice a nadie qué pasó ni cuándo volver.
  const disponibilidadDeFormato = useCallback((servicio) => {
    if (!servicio?.materialId) {
      // Formato sin material declarado: se comporta como antes de que esto
      // existiera. Es lo que mantiene vivos los formatos ya cargados.
      return { disponible: true, motivo: '', poco: false };
    }

    const id = typeof servicio.materialId === 'object' ? servicio.materialId?._id : servicio.materialId;
    const material = porId.get(String(id));

    // El material fue borrado del panel pero el formato lo sigue apuntando. No
    // se apaga el formato por eso: el papel probablemente sigue existiendo en
    // la tienda, lo que falta es el registro.
    if (!material) return { disponible: true, motivo: '', poco: false };

    if (!hayMaterial(material)) {
      return { disponible: false, motivo: tAhora('Sin {material}', { material: material.name.toLowerCase() }), poco: false };
    }
    return { disponible: true, motivo: '', poco: vaQuedandoPoco(material) };
  }, [porId]);

  /* ── Administración (solo la usa el panel) ───────────────── */

  const guardar = async (datos, id) => {
    if (!String(datos?.name || '').trim()) {
      toast.error('El material necesita un nombre');
      return false;
    }
    const existencia = numeroEnRango(datos.existencia, { min: 0, entero: true });
    if (existencia === null) {
      toast.error('La existencia debe ser un número entero de 0 o más');
      return false;
    }
    const minimo = numeroEnRango(datos.minimo, { min: 0, entero: true });
    if (minimo === null) {
      toast.error('El aviso de "queda poco" debe ser un número entero de 0 o más');
      return false;
    }

    try {
      setGuardando(true);
      const carga = { ...datos, existencia, minimo };
      if (id) {
        await printMaterialService.updateMaterial(id, carga);
        toast.success('Material actualizado');
      } else {
        await printMaterialService.createMaterial(carga);
        toast.success('Material creado');
      }
      await cargar();
      return true;
    } catch (error) {
      console.error('Error guardando material:', error);
      return false;
    } finally {
      setGuardando(false);
    }
  };

  // Ajuste rápido: llegó el papel, se acabó un cartucho. Se pinta el cambio ANTES de que conteste el
  // servidor y se revierte si falla — es un número que se toca muchas veces seguidas y esperar en
  // cada toque se siente roto.
  const ajustar = async (id, existencia) => {
    const n = numeroEnRango(existencia, { min: 0, entero: true });
    if (n === null) {
      toast.error('La existencia debe ser un número entero de 0 o más');
      return false;
    }

    const previos = materiales;
    setMateriales((lista) =>
      lista.map((m) => (String(m._id) === String(id) ? { ...m, existencia: n } : m))
    );

    try {
      await printMaterialService.ajustarExistencia(id, n);
      return true;
    } catch (error) {
      console.error('Error ajustando existencia:', error);
      setMateriales(previos);
      return false;
    }
  };

  const eliminar = async (id) => {
    try {
      await printMaterialService.deleteMaterial(id);
      toast.success('Material eliminado');
      await cargar();
      return true;
    } catch (error) {
      console.error('Error eliminando material:', error);
      return false;
    }
  };

  return {
    materiales, papeles, tintas,
    cargando, guardando,
    hayTintaDeColor,
    disponibilidadDeFormato,
    guardar, ajustar, eliminar, recargar: cargar,
  };
};

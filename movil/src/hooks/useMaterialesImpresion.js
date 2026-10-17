import { useState, useEffect, useCallback, useMemo } from 'react';
import { getMaterialesImpresion } from '../api/impresionesApi';
import { tAhora } from '../utils/idioma';

// MATERIALES DE IMPRESIÓN — useMaterialesImpresion.js
// Puerto de `frontend/src/hooks/useMaterialesImpresion.js`, pero solo la mitad que usa el CLIENTE:
// preguntar qué papel/tinta hay para decidir si un formato se puede ofrecer hoy.

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

  const cargar = useCallback(async () => {
    try {
      setCargando(true);
      const datos = await getMaterialesImpresion();
      setMateriales(Array.isArray(datos) ? datos : []);
    } catch {
      // Sin materiales, se asume "todo disponible" (ver disponibilidadDeFormato
      // más abajo) — mejor eso que dejar el pasillo entero sin ofrecer nada.
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

  const tintas = useMemo(() => materiales.filter((m) => m.tipo === 'tinta'), [materiales]);

  // ¿Se puede imprimir a color hoy? Basta con que quede UN tóner de color. Si la tienda no cargó
  // ninguna tinta todavía, se responde que sí: mientras nadie diga lo contrario, se asume que la
  // impresora funciona como siempre.
  const hayTintaDeColor = useMemo(() => {
    const deColor = tintas.filter((t) => t.esColor);
    if (deColor.length === 0) return true;
    return deColor.some(hayMaterial);
  }, [tintas]);

  // Si un formato se puede ofrecer, y si no, por qué no. Devuelve siempre el motivo en palabras:
  // "agotado" a secas no le dice a nadie qué pasó.
  const disponibilidadDeFormato = useCallback((servicio) => {
    if (!servicio?.materialId) {
      return { disponible: true, motivo: '', poco: false };
    }

    const id = typeof servicio.materialId === 'object' ? servicio.materialId?._id : servicio.materialId;
    const material = porId.get(String(id));

    // El material fue borrado del panel pero el formato lo sigue apuntando:
    // no se apaga el formato por eso, lo que falta es el registro.
    if (!material) return { disponible: true, motivo: '', poco: false };

    if (!hayMaterial(material)) {
      return { disponible: false, motivo: tAhora('Sin {material}', { material: material.name.toLowerCase() }), poco: false };
    }
    return { disponible: true, motivo: '', poco: vaQuedandoPoco(material) };
  }, [porId]);

  return { cargando, hayTintaDeColor, disponibilidadDeFormato };
};

export default useMaterialesImpresion;

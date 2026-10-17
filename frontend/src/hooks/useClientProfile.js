import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { tAhora } from '../utils/idioma';
import { clientService } from '../api/clientService';
import { useAuth } from './useAuth';

// useClientProfile — carga y guarda el perfil del cliente logueado. Toda la lógica (fetch +
// update) vive aquí; la página DetallesCuenta solo pinta el formulario y llama a guardar().
export const useClientProfile = () => {
  const { user, esCliente, actualizarUsuario } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [subiendoFoto, setSubiendoFoto] = useState(false);

  const cargar = useCallback(async () => {
    // Solo los clientes tienen perfil de cliente: con sesión de personal esto
    // daría 404 y un aviso rojo. Ver el porqué completo en useAuth.
    if (!esCliente) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const data = await clientService.getClientById(user.id);
      setProfile(data);
    } catch (error) {
      console.error('Error cargando perfil:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.id, esCliente]);

  useEffect(() => { cargar(); }, [cargar]);

  const guardar = async (campos) => {
    if (!esCliente) return;
    try {
      setSaving(true);
      const res = await clientService.updateProfile(user.id, campos);
      setProfile(res.client || { ...profile, ...campos });
      toast.success(tAhora('Datos actualizados'));
    } catch (error) {
      console.error('Error guardando perfil:', error);
    } finally {
      setSaving(false);
    }
  };

  // Subir/reemplazar la foto de perfil. El endpoint multipart exige también los datos básicos, así
  // que se mandan los que ya están guardados en `profile` (no los del formulario sin guardar): la
  // foto no debe arrastrar cambios de texto a medio escribir.
  const subirFoto = async (archivo) => {
    if (!esCliente || !profile || !archivo) return;

    if (!archivo.type?.startsWith('image/')) {
      toast.error(tAhora('Ese archivo no es una imagen. Usa JPG, PNG o WEBP.'));
      return;
    }
    if (archivo.size > 8 * 1024 * 1024) {
      toast.error(tAhora('La imagen pesa demasiado. Usa una de menos de 8 MB.'));
      return;
    }

    const fd = new FormData();
    fd.append('fullName', profile.fullName || '');
    fd.append('phoneNumber', profile.phoneNumber || '');
    fd.append('email', profile.email || '');
    fd.append('userName', profile.userName || '');
    fd.append('image', archivo);

    try {
      setSubiendoFoto(true);
      const res = await clientService.actualizarConFoto(user.id, fd);
      if (res.client) setProfile(res.client);
      // El avatar del encabezado del cliente lee de la sesión: se refresca aquí.
      actualizarUsuario({ image: res.client?.image });
      toast.success(tAhora('Foto de perfil actualizada'));
    } catch (error) {
      toast.error(tAhora(error?.response?.data?.message || 'No se pudo subir la foto'));
    } finally {
      setSubiendoFoto(false);
    }
  };

  return { profile, loading, saving, subiendoFoto, guardar, subirFoto };
};

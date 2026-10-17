import { useState, useRef } from 'react';
import { useTheme } from '../context/ThemeContext';
import { Check, Palette, User, CheckCircle2, LogOut, Camera, Loader2, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../hooks/useAuth';
import { perfilService } from '../api/perfilService';
import { BotonOjo } from '../components/UI/CampoContrasena';
import { formatearDui, formatearTelefono, LARGO_DUI, LARGO_TELEFONO } from '../utils/mascaras';
import OpcionesLectura from '../components/Layout/OpcionesLectura';

const AccountSettings = () => {
  // Las paletas del contexto, no las del módulo: esas no traen "Mi marca" (la arma el contexto), y
  // quien se cambiaba de paleta aquí no tenía cómo volver a la de siempre.
  const { paletteId, setPaletteId, palettes } = useTheme();
  const [activeTab, setActiveTab] = useState('profile');
  const [verPass, setVerPass] = useState(false);
  const { user, logoutTodo, actualizarUsuario } = useAuth();
  const navigate = useNavigate();

  // Foto de perfil: el input real vive escondido y lo dispara el avatar.
  const fotoInputRef = useRef(null);
  const [subiendoFoto, setSubiendoFoto] = useState(false);

  const subirFoto = async (e) => {
    const archivo = e.target.files?.[0];
    // Se limpia el input para poder volver a elegir la MISMA foto si hace falta.
    e.target.value = '';
    if (!archivo) return;

    if (!archivo.type.startsWith('image/')) {
      toast.error('Ese archivo no es una imagen. Use JPG, PNG o WEBP.');
      return;
    }
    if (archivo.size > 8 * 1024 * 1024) {
      toast.error('La imagen pesa demasiado. Use una de menos de 8 MB.');
      return;
    }

    const fd = new FormData();
    fd.append('image', archivo);

    setSubiendoFoto(true);
    try {
      const res = await perfilService.actualizarFoto(fd);
      // Se refleja de una en el avatar y queda guardado en la sesión.
      actualizarUsuario({ image: res.image });
      toast.success('Foto de perfil actualizada');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'No se pudo subir la foto');
    } finally {
      setSubiendoFoto(false);
    }
  };

  const quitarFoto = async () => {
    setSubiendoFoto(true);
    try {
      await perfilService.quitarFoto();
      actualizarUsuario({ image: null });
      toast.success('Foto de perfil quitada');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'No se pudo quitar la foto');
    } finally {
      setSubiendoFoto(false);
    }
  };

  const userType = user?.type || 'employee';

  // El botón del PANEL cierra las dos sesiones (ver logoutTodo en AuthContext) — mismo criterio que
  // TopBar.jsx.
  const handleLogout = () => {
    logoutTodo();
    navigate('/admin');
  };

  const [formData, setFormData] = useState({
    fullnName: user?.fullnName || '',
    userName: user?.userName || '',
    email: user?.email || '',
    phone: user?.phoneNumber || '',
    dui: user?.dui || '',
    password: ''
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const tabs = [
    { id: 'profile', label: 'Mi Perfil', icon: User },
    { id: 'theme', label: 'Colores y lectura', icon: Palette },
  ];

  return (
    <div className="flex-1 w-full max-w-5xl pb-10" style={{ backgroundColor: 'var(--theme-main-bg)' }}>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-4xl font-extrabold" style={{ color: 'var(--theme-accent-text)' }}>Cuenta</h1>
        <div className="flex items-center gap-4">
          <div className="text-xs px-3 py-1 rounded-full font-medium capitalize" 
               style={{ backgroundColor: 'var(--theme-card-border)', color: 'var(--theme-text-primary)' }}>
            Vista: {userType === 'admin' ? 'Administrador' : 'Empleado'}
          </div>
          <button 
            onClick={handleLogout}
            className="flex items-center gap-2 text-sm font-bold px-4 py-2 rounded-full transition-colors border border-red-200 text-red-600 hover:bg-red-50 hover:border-red-600"
          >
            <LogOut size={16} /> Cerrar Sesión
          </button>
        </div>
      </div>

      {/* Tabs Header */}
      <div className="flex gap-2 mb-8 border-b pb-0" style={{ borderColor: 'var(--theme-card-border)' }}>
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="flex items-center gap-2 px-5 py-3 text-sm font-medium rounded-t-lg transition-colors border-b-2"
              style={{
                borderColor: isActive ? 'var(--theme-primary)' : 'transparent',
                color: isActive ? 'var(--theme-primary)' : 'var(--theme-text-secondary)',
                backgroundColor: isActive ? 'var(--theme-primary-light)' : 'transparent',
              }}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* === TAB: Mi Perfil === */}
      {activeTab === 'profile' && (
        <div className="flex flex-col md:flex-row gap-10">
          <div className="flex-1 max-w-2xl">
            <form className="space-y-6">
              {userType === 'employee' && (
                <div className="space-y-2">
                  <label className="block text-sm font-bold" style={{ color: 'var(--theme-text-primary)' }}>Nombre Completo</label>
                  <input type="text" name="fullnName" value={formData.fullnName} onChange={handleChange}
                    className="w-full px-5 py-2.5 rounded-full border focus:outline-none transition-colors"
                    style={{ backgroundColor: 'var(--theme-card-bg)', borderColor: 'var(--theme-card-border)', color: 'var(--theme-text-primary)' }} />
                </div>
              )}

              <div className="space-y-2">
                <label className="block text-sm font-bold" style={{ color: 'var(--theme-text-primary)' }}>Nombre de usuario</label>
                <input type="text" name="userName" value={formData.userName} onChange={handleChange}
                    className="w-full px-5 py-2.5 rounded-full border focus:outline-none transition-colors"
                    style={{ backgroundColor: 'var(--theme-card-bg)', borderColor: 'var(--theme-card-border)', color: 'var(--theme-text-primary)' }} />
              </div>

              <div className="space-y-2 relative">
                <label className="block text-sm font-bold" style={{ color: 'var(--theme-text-primary)' }}>Correo electrónico</label>
                <div className="relative">
                  <input type="email" name="email" value={formData.email} onChange={handleChange}
                    className="w-full px-5 py-2.5 rounded-full border focus:outline-none pr-12 transition-colors"
                    style={{ backgroundColor: 'var(--theme-card-bg)', borderColor: 'var(--theme-card-border)', color: 'var(--theme-text-primary)' }} />
                  <CheckCircle2 className="w-5 h-5 text-green-500 absolute right-4 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              {userType === 'employee' && (
                <>
                  <div className="space-y-2">
                    <label className="block text-sm font-bold" style={{ color: 'var(--theme-text-primary)' }}>Teléfono</label>
                    <input type="text" name="phone" inputMode="numeric" maxLength={LARGO_TELEFONO}
                        value={formatearTelefono(formData.phone)}
                        onChange={(e) => handleChange({ target: { name: 'phone', value: formatearTelefono(e.target.value) } })}
                        className="w-full px-5 py-2.5 rounded-full border focus:outline-none transition-colors"
                        style={{ backgroundColor: 'var(--theme-card-bg)', borderColor: 'var(--theme-card-border)', color: 'var(--theme-text-primary)' }} />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-bold" style={{ color: 'var(--theme-text-primary)' }}>DUI</label>
                    <input type="text" name="dui" inputMode="numeric" maxLength={LARGO_DUI}
                      value={formatearDui(formData.dui)}
                      onChange={(e) => handleChange({ target: { name: 'dui', value: formatearDui(e.target.value) } })}
                      className="w-full px-5 py-2.5 rounded-full border focus:outline-none transition-colors"
                      style={{ backgroundColor: 'var(--theme-card-bg)', borderColor: 'var(--theme-card-border)', color: 'var(--theme-text-primary)' }} />
                  </div>
                </>
              )}

              <div className="space-y-2 relative">
                <label className="block text-sm font-bold" style={{ color: 'var(--theme-text-primary)' }}>Contraseña</label>
                {/* El ojo reemplaza al chulito verde que había: aquel estaba siempre encendido, sin comprobar nada,
                   así que decía "todo bien" incluso con el campo vacío. */}
                <div className="relative">
                  <input type={verPass ? 'text' : 'password'} name="password" value={formData.password} onChange={handleChange} placeholder="••••••••"
                    className="w-full px-5 py-2.5 rounded-full border focus:outline-none pr-12 tracking-wider transition-colors"
                    style={{ backgroundColor: 'var(--theme-card-bg)', borderColor: 'var(--theme-card-border)', color: 'var(--theme-text-primary)' }} />
                  <BotonOjo visible={verPass} onToggle={() => setVerPass((v) => !v)} derecha={16} />
                </div>
              </div>

              <div className="flex items-center justify-between pt-6">
                <button type="button"
                  className="px-8 py-2 rounded-full border-2 font-medium transition-colors"
                  style={{ borderColor: 'var(--theme-primary)', color: 'var(--theme-primary)' }}>
                  Cambiar datos
                </button>
                <button type="button"
                  className="px-10 py-2.5 rounded-full font-bold shadow-sm transition-colors"
                  style={{ backgroundColor: 'var(--theme-primary)', color: 'var(--theme-button-text)' }}>
                  Guardar
                </button>
              </div>
            </form>
          </div>

          {/* Foto de perfil: se toca el avatar y se elige la imagen. */}
          <div className="flex-none pt-8">
            {/* El input real, escondido: lo abre el avatar de abajo. */}
            <input
              ref={fotoInputRef}
              type="file"
              accept="image/*"
              onChange={subirFoto}
              className="hidden"
            />

            <button
              type="button"
              onClick={() => !subiendoFoto && fotoInputRef.current?.click()}
              disabled={subiendoFoto}
              aria-label={user?.image ? 'Cambiar la foto de perfil' : 'Subir una foto de perfil'}
              className="group relative w-32 h-32 md:w-40 md:h-40 rounded-full shadow-md mx-auto overflow-hidden flex items-center justify-center transition-transform hover:scale-[1.02]"
              style={{ backgroundColor: 'var(--theme-card-border)', color: 'var(--theme-text-primary)' }}
            >
              {user?.image ? (
                <img src={user.image} alt="Foto de perfil" className="w-full h-full object-cover" />
              ) : (
                <span className="text-3xl font-bold uppercase opacity-50">
                  {formData.userName ? formData.userName.substring(0, 2) : 'U'}
                </span>
              )}

              {/* Velo con la cámara: aparece al pasar el mouse, o fijo mientras sube. */}
              <span
                className={`absolute inset-0 flex items-center justify-center bg-black/45 text-white transition-opacity ${
                  subiendoFoto ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                }`}
              >
                {subiendoFoto ? <Loader2 className="w-7 h-7 animate-spin" /> : <Camera className="w-7 h-7" />}
              </span>
            </button>

            <p className="text-center text-xs mt-4" style={{ color: 'var(--theme-text-secondary)' }}>
              {user?.image ? 'Toca la foto para cambiarla' : 'Toca para subir tu foto'}
            </p>

            {user?.image && (
              <button
                type="button"
                onClick={quitarFoto}
                disabled={subiendoFoto}
                className="mx-auto mt-2 flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors disabled:opacity-60"
                style={{ borderColor: 'var(--theme-card-border)', color: 'var(--theme-text-secondary)' }}
              >
                <Trash2 className="w-3.5 h-3.5" /> Quitar foto
              </button>
            )}
          </div>
        </div>
      )}

      {/* === TAB: Paleta de Colores === */}
      {activeTab === 'theme' && (
        <div className="p-6 rounded-2xl shadow-sm border" style={{ backgroundColor: 'var(--theme-card-bg)', borderColor: 'var(--theme-card-border)' }}>
          <p className="text-sm mb-6" style={{ color: 'var(--theme-text-secondary)' }}>
            Selecciona una paleta de colores para personalizar la interfaz del panel de administración. 
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {palettes.map((p) => {
              const isActive = paletteId === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => setPaletteId(p.id)}
                  className="relative p-5 rounded-2xl border-2 text-left cursor-pointer hover-scale"
                  style={{
                    borderColor: isActive ? p.colors.primary : 'var(--theme-card-border)',
                    backgroundColor: isActive ? p.colors.primaryLight : 'transparent',
                    boxShadow: isActive ? `0 0 0 1px ${p.colors.primary}` : 'none',
                  }}
                >
                  {isActive && (
                    <div className="absolute top-3 right-3 w-6 h-6 rounded-full flex items-center justify-center"
                         style={{ backgroundColor: p.colors.primary }}>
                      <Check className="w-4 h-4" style={{ color: p.colors.buttonText }} />
                    </div>
                  )}

                  {/* Swatches */}
                  <div className="flex gap-2 mb-4">
                    {p.swatches.map((color, i) => (
                      <div key={i} className="w-8 h-8 rounded-full shadow-sm" style={{ backgroundColor: color }} />
                    ))}
                  </div>

                  <h3 className="text-sm font-bold mb-1" style={{ color: 'var(--theme-text-primary)' }}>{p.name}</h3>
                  <p className="text-xs" style={{ color: 'var(--theme-text-secondary)' }}>{p.description}</p>
                </button>
              );
            })}
          </div>

          {/* Texto más grande y demás: se combinan con cualquier paleta. */}
          <div className="mt-8 pt-6 border-t max-w-lg" style={{ borderColor: 'var(--theme-card-border)' }}>
            <h3 className="text-base font-bold mb-1" style={{ color: 'var(--theme-text-primary)' }}>Lectura</h3>
            <p className="text-sm mb-4" style={{ color: 'var(--theme-text-secondary)' }}>
              Agrande el texto y ajuste cómo se lee el panel. Se guarda en este equipo.
            </p>
            <OpcionesLectura />
          </div>
        </div>
      )}
    </div>
  );
};

export default AccountSettings;

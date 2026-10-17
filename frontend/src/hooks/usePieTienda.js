import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './useAuth';
import { useModulos } from './useModulos';
import { useAjustesCtx } from '../context/AjustesContext';
import { flujoDeModulo } from '../utils/modulos';
import { enlaceWhatsApp } from '../utils/tienda';
import { DOCUMENTOS_LEGALES } from '../utils/legales';
import { useIdioma } from './useIdioma';

// usePieTienda — qué se puede ofrecer en el pie de página, y a dónde lleva cada cosa. El pie es
// donde la gente busca lo que no encontró arriba: cómo contactar, qué más vende la tienda, dónde
// quedó su pedido.

// Lo de "Mi Cuenta" que de verdad se usa desde el pie. No están las nueve
// pantallas: el pie no es el mapa del sitio, es un atajo a lo que la gente
// busca cuando ya se cansó de buscar arriba.
const ENLACES_CUENTA = [
  { texto: 'Mis pedidos', ruta: '/mi-cuenta/pedidos' },
  { texto: 'Mis favoritos', ruta: '/mi-cuenta/favoritos' },
  { texto: 'Mis puntos', ruta: '/mi-cuenta/puntos' },
  { texto: 'Mis direcciones', ruta: '/mi-cuenta/direcciones' },
  { texto: 'Centro de ayuda', ruta: '/mi-cuenta/ayuda' },
];

const ENLACES_SIN_SESION = [
  { texto: 'Iniciar sesión', ruta: '/iniciar-sesion' },
  { texto: 'Crear una cuenta', ruta: '/register' },
];

// Lo legal va en el renglón de cierre, junto al copyright, y no como una columna propia: una
// columna entera titulada "Legal" con un solo enlace pesa en la página lo mismo que los pasillos,
// y no es ni de lejos igual de importante para quien vino a comprar.
const ENLACES_LEGALES = DOCUMENTOS_LEGALES.map((d) => ({ texto: d.titulo, ruta: d.ruta }));

const SALUDO_WHATSAPP =
  'Hola, vengo de la tienda en linea y quisiera hacer una consulta.';

export const usePieTienda = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { modulos } = useModulos();
  // El nombre, el lema y la dirección salen de los ajustes de la tienda. Si el servidor no contestó,
  // el hook de ajustes ya devuelve los mismos valores que antes estaban escritos en utils/tienda.js,
  // así que el pie se pinta igual y nadie se entera.
  const { ajustes } = useAjustesCtx();
  const { t } = useIdioma();

  // Los pasillos que se recorren dentro de la tienda llevan a la portada con ese pasillo puesto
  // (?modulo=...). Impresiones tiene pantalla propia, así que lleva a la suya.
  const pasillos = useMemo(
    () =>
      (modulos || []).map((m) => ({
        id: m._id,
        texto: m.name,
        ruta:
          flujoDeModulo(m) === 'impresiones'
            ? '/impresiones'
            : `/?modulo=${encodeURIComponent(m._id)}`,
      })),
    [modulos]
  );

  const enlacesCuenta = isAuthenticated ? ENLACES_CUENTA : ENLACES_SIN_SESION;

  // Navegar Y subir hasta arriba. Sin el scroll, tocar un enlace del pie deja al cliente en la
  // pantalla nueva pero a la altura donde venía —o sea, mirando el pie otra vez—. Parece que el
  // enlace no hizo nada.
  const ir = (ruta) => {
    navigate(ruta);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return {
    pasillos,
    enlacesCuenta,
    enlacesLegales: ENLACES_LEGALES,
    ir,
    whatsapp: enlaceWhatsApp(t(SALUDO_WHATSAPP), ajustes.negocio?.whatsapp),
    direccion: ajustes.direccion,
    // Los datos del negocio que puso el dueño (Personalización → Identidad).
    // Lo que esté vacío no se pinta.
    negocio: ajustes.negocio || {},
    nombre: `${ajustes.nombreLinea1} ${ajustes.nombreLinea2}`.trim(),
    // Las dos líneas por separado: en el pie se apilan igual que en el
    // encabezado, con el mismo peso y color.
    nombreLinea1: ajustes.nombreLinea1,
    nombreLinea2: ajustes.nombreLinea2,
    logoUrl: ajustes.logoUrl,
    lema: ajustes.lema,
    // El año se calcula, no se escribe: un "© 2026" clavado en el código
    // envejece solo y delata que a la tienda nadie la cuida.
    anio: new Date().getFullYear(),
  };
};

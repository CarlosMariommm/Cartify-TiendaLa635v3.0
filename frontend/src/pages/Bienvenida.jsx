import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import styled from 'styled-components';
import { LocateFixed, MapPin, Loader2, Home, Signpost } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../hooks/useAuth';
import { useUbicacion, CENTRO_POR_DEFECTO } from '../hooks/useUbicacion';
import { clientService } from '../api/clientService';
import { useAjustesCtx } from '../context/AjustesContext';
import Mapa from '../components/Mapa/Mapa';
import { useIdioma } from '../hooks/useIdioma';

// BIENVENIDA — la primera pantalla después de entrar
// Un saludo sobre el mapa, para que el cliente deje su dirección de entrega antes de empezar a
// comprar.

const BROWN = 'var(--marca-600)';
const BROWN_DARK = 'var(--marca-700)';

const Pantalla = styled.div`
  position: relative;
  min-height: 100vh;
  width: 100%;
  overflow: hidden;

`;

/* El mapa ocupa todo el fondo */
const FondoMapa = styled.div`
  position: absolute;
  inset: 0;
  z-index: 0;
`;

// Velo sobre el mapa: sin él, el texto blanco de la tarjeta compite con las calles y no se lee. Es
// más oscuro arriba, donde va el saludo.
const Velo = styled.div`
  position: absolute;
  inset: 0;
  z-index: 1;
  pointer-events: none;
  background: linear-gradient(
    180deg,
    rgba(28,18,10,0.86) 0%,
    rgba(28,18,10,0.66) 22%,
    rgba(28,18,10,0.28) 48%,
    rgba(28,18,10,0.72) 100%
  );
`;

const Contenido = styled.div`
  position: relative;
  z-index: 2;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
  padding: 40px 20px 28px;
  pointer-events: none;

  /* Solo la tarjeta y los botones reciben el click; el mapa sigue vivo detrás */
  > * { pointer-events: auto; }
`;

const Saludo = styled.div`
  text-align: center;
  color: #fff;
  max-width: 560px;
`;

const Marca = styled.div`
  font-size: 13px;
  letter-spacing: 3px;
  text-transform: uppercase;
  opacity: 0.75;
  margin-bottom: 10px;
`;

const Titulo = styled.h1`
  font-size: clamp(30px, 5vw, 46px);
  font-weight: 800;
  letter-spacing: -0.02em;
  line-height: 1.1;
  margin: 0 0 12px;
  text-shadow: 0 2px 24px rgba(0,0,0,0.35);
`;

const Bajada = styled.p`
  font-size: 15px;
  line-height: 1.55;
  opacity: 0.92;
  margin: 0;
`;

const Tarjeta = styled.div`
  width: 100%;
  max-width: 520px;
  background: color-mix(in srgb, var(--papel) 97%, transparent);
  backdrop-filter: blur(10px);
  border-radius: 24px;
  padding: 22px;
  box-shadow: 0 24px 60px rgba(0,0,0,0.35);
`;

const Etiqueta = styled.label`
  display: block;
  font-size: 12px;
  font-weight: 700;
  color: var(--tinta-suave);
  margin-bottom: 7px;
`;

const Campo = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  border: 1px solid var(--linea);
  border-radius: 14px;
  padding: 0 12px;
  background: var(--papel);

  input {
    flex: 1;
    border: none;
    outline: none;
    padding: 13px 0;
    font-size: 14px;
    font-family: inherit;
    color: var(--tinta);
    background: transparent;
  }
`;

/* Nombre y referencia lado a lado; apilados en pantalla angosta. */
const Dos = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-top: 14px;

  @media (max-width: 520px) { grid-template-columns: 1fr; }
`;

const Fila = styled.div`
  display: flex;
  gap: 10px;
  margin-top: 14px;

  @media (max-width: 480px) { flex-direction: column-reverse; }
`;

const Boton = styled.button`
  flex: 1;
  padding: 13px 18px;
  border-radius: 999px;
  font-size: 14px;
  font-weight: 700;
  font-family: inherit;
  border: 1px solid ${(p) => (p.$primario ? BROWN : 'var(--linea-fuerte)')};
  background: ${(p) => (p.$primario ? BROWN : 'var(--papel)')};
  color: ${(p) => (p.$primario ? '#fff' : 'var(--tinta-suave)')};
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: background-color var(--dur-press) var(--ease-out);

  &:hover:not(:disabled) { background: ${(p) => (p.$primario ? BROWN_DARK : 'var(--papel-suave)')}; }
  &:disabled { opacity: 0.6; }
`;

const Ubicarme = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 7px;
  margin-top: 12px;
  padding: 9px 14px;
  border-radius: 999px;
  border: 1px dashed ${BROWN};
  background: var(--marca-50);
  color: var(--marca-texto-fuerte);
  font-size: 13px;
  font-weight: 600;
  font-family: inherit;
`;

const Ayuda = styled.p`
  font-size: 12px;
  color: var(--tinta-tenue);
  margin: 10px 0 0;
  line-height: 1.5;
`;


const Bienvenida = () => {
  const navigate = useNavigate();
  const { ajustes } = useAjustesCtx();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { posicion, direccion, setDireccion, buscando, localizando, marcarEn, localizarme } = useUbicacion();
  const [nombre, setNombre] = useState('');
  const [referencia, setReferencia] = useState('');
  const [guardando, setGuardando] = useState(false);
  const { t } = useIdioma();

  const primerNombre = (user?.fullName || '').split(' ')[0];

  // La misma pantalla sirve para dos cosas: el saludo de entrada y agregar otra dirección desde Mi
  // Cuenta. Cuando viene con ?volver=, es lo segundo: cambia el texto y regresa a donde estaba en
  // lugar de ir a servicios.
  const volverA = searchParams.get('volver');
  const esAgregar = !!volverA;
  const destinoAlSalir = volverA || '/tienda-dashboard';

  const alOmitir = () => navigate(destinoAlSalir);

  const alGuardar = async () => {
    const limpia = direccion.trim();
    if (!limpia) {
      toast(t('Escribe tu dirección o toca el mapa para marcarla'));
      return;
    }

    setGuardando(true);
    try {
      // Se agrega a las que ya tenga en vez de reemplazarlas: alguien puede entrar por segunda vez desde
      // otro lugar, y perder la dirección de la casa por eso sería un desastre.
      const cliente = await clientService.getClientById(user.id);
      const previas = Array.isArray(cliente?.clientAddress) ? cliente.clientAddress : [];
      const nueva = {
        // Sin nombre puesto, se usa uno según cuántas lleve: "Dirección 2".
        // Va en español, como todo lo que se guarda: lo lee también el repartidor.
        nombre: nombre.trim() || `Dirección ${previas.length + 1}`,
        direccion: limpia,
        referencia: referencia.trim(),
        lat: posicion?.lat ?? null,
        lng: posicion?.lng ?? null,
      };
      await clientService.updateAddresses(user.id, [...previas, nueva]);
      toast.success(t('Dirección guardada'));
      navigate(destinoAlSalir);
    } catch {
      // El interceptor ya avisa del error; aquí solo se deja seguir.
      setGuardando(false);
    }
  };

  const centro = posicion || CENTRO_POR_DEFECTO;

  return (
    <Pantalla>
      {/* Tocar el mapa mueve el pin, el pin se arrastra, y cuando aparece una posición nueva (el GPS, por
         ejemplo) el mapa vuela hasta ella. */}
      <FondoMapa>
        <Mapa
          centro={centro}
          zoom={posicion ? 17 : 13}
          onTocar={marcarEn}
          seguir={{ punto: posicion, zoomMinimo: 17, volar: true }}
          pines={posicion ? [{
            id: 'direccion', lat: posicion.lat, lng: posicion.lng,
            tipo: 'gota', tamano: 34, arrastrable: true, onSoltar: marcarEn,
          }] : []}
        />
      </FondoMapa>

      <Velo />

      <Contenido>
        {/* "Bienvenido" tiene género y la mitad de la clientela es mujer. "Hola" y "te damos la bienvenida"
           saludan igual de bien sin dejar a nadie fuera, y de paso funcionan si el nombre no está cargado. */}
        <Saludo>
          {/* El nombre sale de los ajustes, no del codigo. Aqui NO se usa MarcaTienda: esto no es una barra
             superior sino un rotulo pequeno en versalitas sobre el saludo, y meterle la marca grande le
             comeria el protagonismo al "!Hola, Fulano!". */}
          <Marca>{[ajustes.nombreLinea1, ajustes.nombreLinea2].filter(Boolean).join(" ")}</Marca>
          <Titulo>
            {esAgregar
              ? t('Nueva dirección')
              : primerNombre ? t('¡Hola, {nombre}!', { nombre: primerNombre }) : t('¡Hola!')}
          </Titulo>
          <Bajada>
            {esAgregar
              ? t('Marca el punto en el mapa y ponle un nombre para reconocerla después.')
              : t('Te damos la bienvenida. Dinos dónde te dejamos tus pedidos: toca el mapa para marcar el punto o usa tu ubicación.')}
          </Bajada>
        </Saludo>

        <Tarjeta>
          <Etiqueta htmlFor="direccion">{t('Tu dirección de entrega')}</Etiqueta>
          <Campo>
            <MapPin size={17} color={BROWN} />
            <input
              id="direccion"
              value={direccion}
              onChange={(e) => setDireccion(e.target.value)}
              placeholder={buscando ? t('Buscando la dirección…') : t('Ej. Calle Los Almendros #12, San Salvador')}
            />
            {buscando && <Loader2 size={16} className="animate-spin" color={BROWN} />}
          </Campo>

          <Ubicarme type="button" onClick={localizarme} disabled={localizando}>
            {localizando ? <Loader2 size={15} className="animate-spin" /> : <LocateFixed size={15} />}
            {localizando ? t('Ubicándote…') : t('Usar mi ubicación')}
          </Ubicarme>

          {/* Nombre y referencia. El nombre es para el cliente —para elegir rápido entre "Casa" y "Trabajo"
             al pagar—; la referencia es para el repartidor, que en el barrio se guía por el portón verde y
             no por el número de casa. */}
          <Dos>
            <div>
              <Etiqueta htmlFor="nombre">{t('Nombre de la dirección')}</Etiqueta>
              <Campo>
                <Home size={16} color={BROWN} />
                <input
                  id="nombre"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  maxLength={30}
                  placeholder={t('Casa, Trabajo…')}
                />
              </Campo>
            </div>
            <div>
              <Etiqueta htmlFor="referencia">{t('Punto de referencia')}</Etiqueta>
              <Campo>
                <Signpost size={16} color={BROWN} />
                <input
                  id="referencia"
                  value={referencia}
                  onChange={(e) => setReferencia(e.target.value)}
                  maxLength={80}
                  placeholder={t('Frente a la cancha, portón verde…')}
                />
              </Campo>
            </div>
          </Dos>

          <Fila>
            <Boton type="button" onClick={alOmitir}>
              {esAgregar ? t('Cancelar') : t('Omitir por ahora')}
            </Boton>
            <Boton type="button" $primario onClick={alGuardar} disabled={guardando || buscando}>
              {guardando ? t('Guardando…') : esAgregar ? t('Guardar dirección') : t('Guardar y entrar')}
            </Boton>
          </Fila>

          {!esAgregar && (
            <Ayuda>
              {t('Si la omites, puedes agregarla después desde')} <b>{t('Mi Cuenta')} → {t('Direcciones')}</b>.
            </Ayuda>
          )}
        </Tarjeta>
      </Contenido>
    </Pantalla>
  );
};

export default Bienvenida;

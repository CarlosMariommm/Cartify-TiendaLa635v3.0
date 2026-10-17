import styled from 'styled-components';
import { MessageCircle, MapPin, ArrowUpRight, Clock, Phone, Mail } from 'lucide-react';
import { usePieTienda } from '../../hooks/usePieTienda';
import { abrirAvisoCookies } from '../../utils/consentimiento';
import { LANDING_URL } from '../../utils/tienda';
import { useIdioma } from '../../hooks/useIdioma';
import SelectorIdioma from './SelectorIdioma';

// PIE DE LA TIENDA — PieTienda.jsx
// El final de la página, que hasta ahora no existía: se acababan los productos y quedaba el
// blanco. Un pie sirve para dos cosas concretas, y este hace esas dos: 1. Cerrar.

const Banda = styled.footer`
  background: var(--marca-50);
  border-top: 1px solid var(--linea);
  margin-top: 64px;
  padding: 48px 0 0;
`;

// Mismo ancho y mismo margen lateral que el <Content> de la tienda (1400 + 28). El relleno va AQUÍ
// y no en la banda, porque la banda tiene que llegar de orilla a orilla: si el color se corta a
// 28px del borde, deja de leerse como el piso de la página y parece una tarjeta más.
const Interior = styled.div`
  max-width: 1400px;
  margin: 0 auto;
  padding: 0 28px;

  @media (max-width: 560px) { padding: 0 16px; }
`;

// auto-fit en vez de un número fijo de columnas: en el teléfono cae a una sola, en tablet a dos, y
// en pantalla grande a cuatro, sin escribir tres media queries que después haya que mantener en
// paralelo.
const Columnas = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
  gap: 36px 28px;
  padding-bottom: 40px;
`;

const Marca = styled.div`
  /* La marca pide más aire que una columna de enlaces. */
  grid-column: span 1;
  @media (min-width: 900px) { min-width: 250px; }
`;

// Las dos líneas del nombre, con el MISMO peso y color que en el encabezado:
// "Tienda" no es una etiqueta que acompaña, es parte del nombre del negocio.
const Nombre = styled.p`
  font-size: 21px;
  font-weight: 800;
  letter-spacing: -0.5px;
  line-height: 1.05;
  color: var(--tinta);
  margin: 0 0 12px;
`;

// El logo en el pie va un poco más grande que en el encabezado: aquí hay aire
// de sobra y es donde la marca se despide.
const LogoPie = styled.img`
  height: 46px;
  width: auto;
  max-width: 200px;
  object-fit: contain;
  display: block;
  margin: 0 0 12px;
`;

const Frase = styled.p`
  font-size: 13.5px;
  line-height: 1.55;
  color: var(--tinta-suave);
  margin: 0 0 18px;
  max-width: 34ch;
`;

// El enlace a la página de presentación. Va pegado a la frase de la marca porque es eso: "así es
// la tienda", contado largo. En el color de acción y con la flechita hacia afuera, que avisa que
// se abre en otra pestaña.
const EnlaceLanding = styled.a`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin: -8px 0 18px;
  font-size: 13.5px;
  font-weight: 600;
  color: var(--marca-texto);
  text-decoration: none;

  @media (hover: hover) and (pointer: fine) {
    &:hover { color: var(--marca-texto-fuerte); text-decoration: underline; }
  }
`;

const Dato = styled.p`
  display: flex;
  align-items: flex-start;
  gap: 8px;
  font-size: 13px;
  line-height: 1.5;
  color: var(--tinta-suave);
  margin: 0 0 14px;

  svg { flex-shrink: 0; margin-top: 1px; color: var(--tinta-tenue); }
  /* Teléfono y correo se tocan para llamar o escribir: se ven como enlace. */
  a { color: inherit; text-decoration: underline; text-underline-offset: 3px; }
  a:hover { color: var(--marca-texto-fuerte); }
`;

const BotonWhats = styled.a`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  border-radius: var(--radio-pill);
  border: 1px solid var(--linea);
  background: var(--papel);
  color: var(--tinta);
  font-size: 13px;
  font-weight: 600;
  text-decoration: none;
  transition: border-color var(--dur-press) var(--ease-out),
              color var(--dur-press) var(--ease-out),
              transform var(--dur-press) var(--ease-out);

  @media (hover: hover) and (pointer: fine) {
    &:hover { border-color: var(--marca-600); color: var(--marca-texto-fuerte); }
  }
  &:active { transform: scale(0.97); }
`;

const TituloColumna = styled.h3`
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.6px;
  color: var(--tinta-tenue);
  margin: 0 0 14px;
`;

const Lista = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

// Enlaces que solo cambian de COLOR al pasar el cursor, sin moverse. Un pie es una lista que se
// recorre con la vista de arriba abajo; si cada renglón se corre al pasarle por encima, la columna
// entera parece temblar mientras uno la lee.
const Enlace = styled.button`
  background: none;
  border: none;
  padding: 0;
  font-family: inherit;
  font-size: 13.5px;
  text-align: left;
  color: var(--tinta-suave);
  cursor: pointer;
  transition: color var(--dur-press) var(--ease-out);

  @media (hover: hover) and (pointer: fine) {
    &:hover { color: var(--marca-texto-fuerte); }
  }
`;

const Cierre = styled.div`
  border-top: 1px solid var(--linea);
  padding: 18px 0 24px;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  font-size: 12.5px;
  color: var(--tinta-tenue);
`;

// El enlace de lo legal. Va del tamaño del copyright que tiene al lado, porque eso es lo que es:
// la letra pequeña del final. Pero subrayable y con color al pasarle encima, para que se note que
// es un enlace y no un adorno.
const EnlaceCierre = styled.button`
  background: none;
  border: none;
  padding: 0;
  font-family: inherit;
  font-size: 12.5px;
  color: var(--tinta-tenue);
  cursor: pointer;
  transition: color var(--dur-press) var(--ease-out);

  @media (hover: hover) and (pointer: fine) {
    &:hover { color: var(--marca-texto-fuerte); text-decoration: underline; }
  }
`;

const PieTienda = () => {
  const {
    pasillos, enlacesCuenta, enlacesLegales, ir, whatsapp, direccion, nombre, anio,
    nombreLinea1, nombreLinea2, logoUrl, lema, negocio,
  } = usePieTienda();
  const { t } = useIdioma();

  return (
    <Banda>
      <Interior>
        <Columnas>
          <Marca>
            {/* Con logo, el logo; sin logo, el nombre en dos líneas. Igual que
                en el encabezado, para que la tienda se llame igual arriba y
                abajo. */}
            {logoUrl ? (
              <LogoPie src={logoUrl} alt={nombre} />
            ) : (
              <Nombre>{nombreLinea1}<br />{nombreLinea2}</Nombre>
            )}
            <Frase>{lema}</Frase>
            {/* Aparte y en otra pestaña: es su propia página, y así quien la
                abre no pierde el carrito ni el lugar donde iba en la tienda. */}
            <EnlaceLanding href={LANDING_URL} target="_blank" rel="noopener noreferrer">
              {t('Así funciona la tienda')} <ArrowUpRight size={14} strokeWidth={2.4} />
            </EnlaceLanding>
            <Dato>
              <MapPin size={15} strokeWidth={2} aria-hidden="true" />
              {direccion}
            </Dato>
            {/* Los datos del negocio (Personalización → Identidad). Lo que el
                dueño dejó vacío no se pinta. */}
            {negocio.horario && (
              <Dato>
                <Clock size={15} strokeWidth={2} aria-hidden="true" />
                {negocio.horario}
              </Dato>
            )}
            {negocio.telefono && (
              <Dato>
                <Phone size={15} strokeWidth={2} aria-hidden="true" />
                <a href={`tel:${negocio.telefono.replace(/[^\d+]/g, '')}`}>{negocio.telefono}</a>
              </Dato>
            )}
            {negocio.correo && (
              <Dato>
                <Mail size={15} strokeWidth={2} aria-hidden="true" />
                <a href={`mailto:${negocio.correo}`}>{negocio.correo}</a>
              </Dato>
            )}
            {/* Sin número configurado no se pinta el botón: uno que no lleva a
                ningún lado es peor que no tener botón. */}
            {whatsapp && (
              <BotonWhats href={whatsapp} target="_blank" rel="noopener noreferrer">
                <MessageCircle size={15} strokeWidth={2.2} />
                {t('Escríbenos por WhatsApp')}
              </BotonWhats>
            )}
          </Marca>

          {/* Los pasillos salen de la base: el día que abran la panadería,
              aparece sola aquí abajo sin que nadie venga a agregarla. */}
          {pasillos.length > 0 && (
            <div>
              <TituloColumna>{t('Pasillos')}</TituloColumna>
              <Lista>
                {pasillos.map((p) => (
                  <li key={p.id}>
                    <Enlace onClick={() => ir(p.ruta)}>{p.texto}</Enlace>
                  </li>
                ))}
              </Lista>
            </div>
          )}

          <div>
            <TituloColumna>{t('Mi cuenta')}</TituloColumna>
            <Lista>
              {enlacesCuenta.map((e) => (
                <li key={e.ruta}>
                  <Enlace onClick={() => ir(e.ruta)}>{t(e.texto)}</Enlace>
                </li>
              ))}
            </Lista>
          </div>
        </Columnas>

        <Cierre>
          <span>© {anio} {nombre}{negocio.titular ? ` · ${negocio.titular}` : ''}</span>
          <nav aria-label={t('Documentos legales')} style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 16px' }}>
            {enlacesLegales.map((e) => (
              <EnlaceCierre key={e.ruta} onClick={() => ir(e.ruta)}>{t(e.texto)}</EnlaceCierre>
            ))}
            {/* Para cambiar lo que eligió en el aviso de cookies, cuando quiera. */}
            <EnlaceCierre onClick={abrirAvisoCookies}>{t('Configurar cookies')}</EnlaceCierre>
          </nav>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
            <SelectorIdioma />
            {t('Hecho en El Salvador')}
          </span>
        </Cierre>
      </Interior>
    </Banda>
  );
};

export default PieTienda;

import { useSyncExternalStore } from 'react';
import { Analytics } from '@vercel/analytics/react';
import { areaDeRuta } from '../../utils/sesion';
import { aceptoAnaliticas, leerConsentimiento, suscribirConsentimiento } from '../../utils/consentimiento';

// ANALÍTICAS — AnaliticasTienda.jsx
// Vercel Web Analytics: cuántas visitas tiene cada página, sin cookies y sin saber quién es nadie.

const RUTAS_CON_ID = [
  [/^\/mi-cuenta\/pedido\/[^/]+/, '/mi-cuenta/pedido/[id]'],
  [/^\/vincular\/[^/]+/, '/vincular/[codigo]'],
];

const limpiar = (evento) => {
  if (!aceptoAnaliticas()) return null;
  try {
    const url = new URL(evento.url);
    if (areaDeRuta(url.pathname) === 'personal') return null;
    let ruta = url.pathname;
    for (const [patron, comodin] of RUTAS_CON_ID) ruta = ruta.replace(patron, comodin);
    return { ...evento, url: `${url.origin}${ruta}` };
  } catch {
    return null;
  }
};

const AnaliticasTienda = () => {
  const consentimiento = useSyncExternalStore(suscribirConsentimiento, leerConsentimiento, () => null);
  if (!consentimiento?.analiticas) return null;
  return <Analytics beforeSend={limpiar} />;
};

export default AnaliticasTienda;

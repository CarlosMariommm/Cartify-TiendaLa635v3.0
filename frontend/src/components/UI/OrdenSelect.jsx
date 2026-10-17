import { ArrowDownUp } from 'lucide-react';
import FilterSelect from './FilterSelect';
import { ORDEN_INICIAL } from '../../utils/listasPanel';

// El selector de orden de las listas del panel. De entrada, "Más recientes": lo que se acaba de
// agregar arriba. `extras`: órdenes propios de la pantalla ([{ value, label }]), que van después
// de los de siempre. Ver utils/listasPanel.js.
const OrdenSelect = ({ value, onChange, extras = [], conNombre = true }) => (
  <FilterSelect
    value={value}
    onChange={onChange}
    defaultValue={ORDEN_INICIAL}
    defaultLabel="Ordenar: Más recientes"
    icon={ArrowDownUp}
    options={[
      { value: 'antiguos', label: 'Ordenar: Más antiguos' },
      ...(conNombre ? [{ value: 'nombre', label: 'Ordenar: Nombre (A-Z)' }] : []),
      ...extras,
    ]}
  />
);

export default OrdenSelect;

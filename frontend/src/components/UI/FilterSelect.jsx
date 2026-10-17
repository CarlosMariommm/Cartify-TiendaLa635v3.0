import { ListFilter, ChevronDown } from 'lucide-react';

// FilterSelect — looks like "⊽ Filtros" when at default, and shows the active value when something
// is selected.
const FilterSelect = ({
  value,
  onChange,
  defaultValue = 'Todos',
  defaultLabel = 'Todos',
  options = [],
  icon: Icono = ListFilter,
}) => {
  return (
    <div className="relative inline-flex items-center">
      <div className="pointer-events-none absolute left-3 flex items-center">
        <Icono className="w-4 h-4 text-gray-500" />
      </div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="appearance-none pl-8 pr-8 py-2 bg-white border border-gray-300 rounded-full text-gray-700 hover:bg-gray-50 text-sm font-medium transition-colors shadow-sm outline-none cursor-pointer focus:border-[#003049]"
      >
        <option value={defaultValue}>{defaultLabel}</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <div className="pointer-events-none absolute right-3 flex items-center">
        <ChevronDown className="w-4 h-4 text-gray-500" />
      </div>
    </div>
  );
};

export default FilterSelect;

import { ChevronDown } from "lucide-react";
export function CategorySelect({
  value,
  onChange,
  categories,
  allLabel = "Todas as categorias",
}) {
  return (
    <div className="select-wrap">
      <select
        aria-label="Filtrar categoria"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="all">{allLabel}</option>
        {categories.map((c) => (
          <option key={c}>{c}</option>
        ))}
      </select>
      <ChevronDown size={16} />
    </div>
  );
}

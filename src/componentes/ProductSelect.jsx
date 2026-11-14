import { number } from "../services/inventory";
export function ProductSelect({
  data,
  value,
  onChange,
  placeholder = "Selecione um produto",
  excluded = [],
}) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} required>
      <option value="">{placeholder}</option>
      {data.products
        .filter((p) => p.active && !excluded.includes(p.id))
        .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"))
        .map((p) => (
          <option key={p.id} value={p.id}>
            {p.name} · {number(p.stock, 2)} {p.unit}
          </option>
        ))}
    </select>
  );
}

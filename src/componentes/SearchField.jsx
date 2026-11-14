import { Search } from "lucide-react";
export function SearchField({
  value,
  onChange,
  placeholder = "Pesquisar produtos...",
}) {
  return (
    <div className="search-wrap">
      <Search size={17} />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label="Pesquisar"
      />
    </div>
  );
}

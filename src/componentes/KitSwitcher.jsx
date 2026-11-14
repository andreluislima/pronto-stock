export function KitSwitcher({ kits, selected, onChange }) {
  return (
    <div className="kit-switcher">
      {kits.map((k, i) => (
        <button
          key={k.id}
          onClick={() => onChange(k.id)}
          className={selected === k.id ? "active" : ""}
        >
          <span className="kit-switch-index">0{i + 1}</span>
          {k.name}
        </button>
      ))}
    </div>
  );
}

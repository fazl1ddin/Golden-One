import { Icon, type IconName } from "./icons";

export interface RailItem {
  id: string;
  label: string;
  icon: IconName;
  badge?: number;
}

export function Rail({ brand = "G1", items, active, onSelect, footer }: {
  brand?: string;
  items: RailItem[];
  active: string;
  onSelect: (id: string) => void;
  footer?: React.ReactNode;
}) {
  return (
    <aside className="go-rail">
      <div className="go-rail__mk">{brand}</div>
      <nav style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "center" }}>
        {items.map((it) => (
          <button
            key={it.id}
            className={`go-rail__i${active === it.id ? " go-rail__i--on" : ""}`}
            onClick={() => onSelect(it.id)}
          >
            <Icon name={it.icon} />
            <span>{it.label}</span>
            {it.badge ? <span className="go-rail__bg">{it.badge}</span> : null}
          </button>
        ))}
      </nav>
      {footer && <div style={{ marginTop: "auto" }}>{footer}</div>}
    </aside>
  );
}

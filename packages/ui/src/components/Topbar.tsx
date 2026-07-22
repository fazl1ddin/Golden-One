import type { ReactNode } from "react";
import { Icon } from "./icons";

export function Topbar({ title, crumb, search, live, right }: {
  title: ReactNode;
  crumb?: ReactNode;
  search?: ReactNode;
  live?: ReactNode;
  right?: ReactNode;
}) {
  return (
    <header className="go-top">
      <div>
        <div className="go-top__t">{title}</div>
        {crumb && <div className="go-top__c">{crumb}</div>}
      </div>
      {search}
      <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 14 }}>
        {live}
        {right}
      </div>
    </header>
  );
}

export function LiveIndicator({ children }: { children: ReactNode }) {
  return (
    <div className="go-live">
      <span className="go-live__b" />
      <span>{children}</span>
    </div>
  );
}

export function LangSwitch({ value, onChange, options = ["ru", "uz"] }: {
  value: string;
  onChange: (v: string) => void;
  options?: string[];
}) {
  return (
    <div className="go-seg">
      {options.map((o) => (
        <button key={o} className={value === o ? "go-seg--on" : ""} onClick={() => onChange(o)}>
          {o.toUpperCase()}
        </button>
      ))}
    </div>
  );
}

export function ThemeButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      className="go-seg"
      style={{ width: 33, height: 31, justifyContent: "center", alignItems: "center", display: "flex", cursor: "pointer" }}
      onClick={onClick}
      aria-label="Toggle theme"
    >
      <Icon name="moon" width={16} height={16} />
    </button>
  );
}

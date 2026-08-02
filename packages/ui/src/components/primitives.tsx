import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode, InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

/* ── Button ── */
export type ButtonVariant = "cy" | "red" | "ghost";
export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  block?: boolean;
}
export function Button({ variant = "ghost", block, className = "", children, ...rest }: ButtonProps) {
  return (
    <button className={`go-btn go-btn--${variant}${block ? " go-btn--block" : ""} ${className}`} {...rest}>
      {children}
    </button>
  );
}

/* ── Badge ── */
export type BadgeTone = "green" | "amber" | "red" | "steel" | "gray";
export function Badge({ tone, dot = true, children }: { tone: BadgeTone; dot?: boolean; children: ReactNode }) {
  return (
    <span className={`go-badge go-badge--${tone}`}>
      {dot && <span className="go-badge__dot" />}
      {children}
    </span>
  );
}

/* ── Chip ── */
export function Chip({ active, children, ...rest }: { active?: boolean } & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button className={`go-chip${active ? " go-chip--on" : ""}`} {...rest}>
      {children}
    </button>
  );
}

/* ── Toggle ── */
export function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return <button role="switch" aria-checked={on} className={`go-toggle${on ? " go-toggle--on" : ""}`} onClick={onToggle} />;
}

/* ── Panel ── */
export function Panel({ className = "", children, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`go-panel ${className}`} {...rest}>{children}</div>;
}
export function PanelHeader({ title, count, action }: { title: ReactNode; count?: ReactNode; action?: ReactNode }) {
  return (
    <div className="go-panel__h">
      <h3>{title}{count != null && <span>· {count}</span>}</h3>
      {action}
    </div>
  );
}

/* ── Field (label/value row) ── */
export function Field({ label, value }: { label: ReactNode; value: ReactNode }) {
  return (
    <div className="go-field">
      <span className="go-field__l">{label}</span>
      <span className="go-field__v">{value}</span>
    </div>
  );
}

/* ── Form controls ── */
export function Label({ children }: { children: ReactNode }) {
  return <label className="go-label">{children}</label>;
}
/* className is destructured out before the spread — spreading it back over the
   base class would drop `go-input`/`go-select`/`go-textarea` and leave the
   control rendering as an unstyled native box. */
export function Input({ className = "", ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`go-input ${className}`} {...rest} />;
}
export function Select({ className = "", ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={`go-select ${className}`} {...rest} />;
}
export function Textarea({ className = "", ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={`go-textarea ${className}`} {...rest} />;
}

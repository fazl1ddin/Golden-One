import type { ReactNode } from "react";
import { Icon, type IconName } from "./icons";

export type ModalTone = "cy" | "red" | "green";
const toneVar: Record<ModalTone, string> = { cy: "--go-cy", red: "--go-red", green: "--go-green" };
const toneSoft: Record<ModalTone, string> = { cy: "--go-cy-soft", red: "--go-red-soft", green: "--go-green-soft" };

export function Modal({ icon, tone = "cy", title, subtitle, children, footer, onClose }: {
  icon?: IconName;
  tone?: ModalTone;
  title: ReactNode;
  subtitle?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="go-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="go-modal" role="dialog" aria-modal="true">
        <div className="go-modal__h">
          {icon && (
            <div className="go-modal__ico" style={{ background: `var(${toneSoft[tone]})`, color: `var(${toneVar[tone]})` }}>
              <Icon name={icon} />
            </div>
          )}
          <div>
            <h3>{title}</h3>
            {subtitle && <p>{subtitle}</p>}
          </div>
        </div>
        {children && <div className="go-modal__b">{children}</div>}
        {footer && <div className="go-modal__f">{footer}</div>}
      </div>
    </div>
  );
}

export function Warn({ children }: { children: ReactNode }) {
  return (
    <div className="go-warn">
      <Icon name="warn" />
      <span>{children}</span>
    </div>
  );
}

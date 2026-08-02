import { useEffect, type CSSProperties, type ReactNode } from "react";

export interface ThemeProviderProps {
  /** Which token set to activate. Stamped on the document root so `:root[data-theme]` wins. */
  theme?: "dark" | "light";
  /** Adds a comfortable inset — useful for isolated surfaces; leave off for a full-bleed app shell. */
  padded?: boolean;
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
}

/**
 * Root wrapper for the Golden One design system. Every screen built with these
 * components must be wrapped in it — it applies the surface background, the
 * base font stack, and activates the light/dark token set. Without it,
 * components render on the browser's default white background in a serif face.
 */
export function ThemeProvider({ theme = "dark", padded = false, className = "", style, children }: ThemeProviderProps) {
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);
  return (
    <div className={`go-app${padded ? " go-app--padded" : ""} ${className}`} style={style}>
      {children}
    </div>
  );
}

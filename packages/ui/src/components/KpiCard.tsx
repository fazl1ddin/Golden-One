import type { ReactNode } from "react";

export type KpiTone = "steel" | "green" | "amber" | "red";

export function KpiCard({ label, value, sub, tone = "steel" }: { label: ReactNode; value: ReactNode; sub?: ReactNode; tone?: KpiTone }) {
  const cls = tone === "steel" ? "" : `go-kpi--${tone}`;
  return (
    <div className={`go-kpi ${cls}`}>
      <div className="go-kpi__l">{label}</div>
      <div className="go-kpi__v go-mono">{value}</div>
      {sub != null && <div className="go-kpi__d">{sub}</div>}
    </div>
  );
}

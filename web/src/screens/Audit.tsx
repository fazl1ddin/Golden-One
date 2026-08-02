import { Panel, DataTable, type Column } from "@golden-one/ui";
import type { AuditEntry } from "../types";
import type { makeT } from "../i18n";
import { fmtAgo } from "../helpers";

type T = ReturnType<typeof makeT>;

export function Audit({ t, audit }: { t: T; audit: AuditEntry[] }) {
  const cols: Column<AuditEntry & { _i: number }>[] = [
    { key: "who", header: t("thWho"), render: (a) => <span className="go-cn">{a.who}</span> },
    { key: "act", header: t("thAction"), render: (a) => t(a.act) },
    { key: "dev", header: t("thDevice"), render: (a) => a.dev },
    { key: "when", header: t("thWhen"), render: (a) => <span className="go-cm">{fmtAgo(a.t, t)}</span> },
  ];
  return (
    <Panel>
      <DataTable columns={cols} rows={audit.map((a, i) => ({ ...a, _i: i }))} rowKey={(a) => String(a._i)} />
    </Panel>
  );
}

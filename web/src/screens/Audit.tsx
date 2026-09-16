import { Panel, DataTable, type Column } from "@golden-one/ui";
import type { AuditEntry, Device } from "../types.js";
import type { makeT } from "../i18n.js";
import { actionLabel, deviceNameFor, fmtSince } from "../helpers.js";

type T = ReturnType<typeof makeT>;

export function Audit({ t, audit, devices }: { t: T; audit: AuditEntry[]; devices: Device[] }) {
  const cols: Column<AuditEntry>[] = [
    { key: "who", header: t("thWho"), render: (a) => <span className="go-cn">{a.who}</span> },
    { key: "act", header: t("thAction"), render: (a) => actionLabel(a.action, t) },
    { key: "dev", header: t("thDevice"), render: (a) => deviceNameFor(a, devices) },
    { key: "reason", header: t("lockReason"), render: (a) => <span className="go-cm">{a.reason ?? "—"}</span> },
    // The source address is part of the compliance record, not decoration.
    { key: "ip", header: "IP", render: (a) => <span className="go-cm go-mono">{a.ip ?? "—"}</span> },
    { key: "when", header: t("thWhen"), render: (a) => <span className="go-cm">{fmtSince(a.createdAt, t)}</span> },
  ];
  return (
    <Panel>
      <DataTable columns={cols} rows={audit} rowKey={(a) => a.id} />
    </Panel>
  );
}

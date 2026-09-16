import { useState } from "react";
import { Panel, DataTable, Chip, type Column } from "@golden-one/ui";
import type { Device } from "../types.js";
import type { makeT } from "../i18n.js";
import { loanBadge, mdmBadge, lockBadge } from "../helpers.js";

type T = ReturnType<typeof makeT>;
type Filter = "filterAll" | "filterOverdue" | "filterLocked" | "filterActive";

export function Devices({ t, devices, onOpenDevice }: {
  t: T; devices: Device[]; onOpenDevice: (id: string) => void;
}) {
  const [filter, setFilter] = useState<Filter>("filterAll");
  const filters: Filter[] = ["filterAll", "filterOverdue", "filterLocked", "filterActive"];

  const list = devices.filter((d) =>
    filter === "filterOverdue" ? d.loan === "overdue"
      // "Locked" includes a lock that is on its way: an operator filtering for
      // locked devices needs to see the ones still awaiting confirmation too.
      : filter === "filterLocked" ? d.lock === "locked" || d.lock === "lockPending"
      : filter === "filterActive" ? d.loan === "active"
      : true,
  );

  const cols: Column<Device>[] = [
    { key: "cust", header: t("thCustomer"), render: (d) => (
        <div><div className="go-cn">{d.name}</div><div className="go-cm">{d.phone}</div></div>) },
    { key: "model", header: t("thDevice"), render: (d) => (
        <div>{d.model}<div className="go-cm go-mono">{d.contract}</div></div>) },
    { key: "imei", header: t("thImei"), render: (d) => <span className="go-mono go-cm">{d.imei}</span> },
    { key: "loan", header: t("thLoan"), render: (d) => (
        <span style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
          {loanBadge(d.loan, t)}
          {d.daysOverdue > 0 && (
            <span className={`go-over go-mono${d.daysOverdue >= 20 ? " go-over--hi" : ""}`} style={{ fontSize: 11 }}>
              {d.daysOverdue}д
            </span>
          )}
        </span>) },
    { key: "mdm", header: t("thMdm"), render: (d) => mdmBadge(d.mdm, t) },
    { key: "lock", header: t("thLock"), render: (d) => lockBadge(d.lock, t) },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {filters.map((f) => (
          <Chip key={f} active={filter === f} onClick={() => setFilter(f)}>{t(f)}</Chip>
        ))}
      </div>
      <Panel>
        <DataTable columns={cols} rows={list} rowKey={(d) => d.id} onRowClick={(d) => onOpenDevice(d.id)} />
      </Panel>
    </div>
  );
}

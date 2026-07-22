import { KpiCard, Panel, PanelHeader, DataTable, Icon, type Column } from "@golden-one/ui";
import type { Device, AuditEntry, Stats } from "../types";
import type { makeT } from "../i18n";
import { lockBadge, fmtAgo, evColor, evIcon } from "../helpers";

type T = ReturnType<typeof makeT>;

export function Dashboard({ t, stats, devices, audit, onOpenDevice, onViewAll }: {
  t: T; stats: Stats | null; devices: Device[]; audit: AuditEntry[];
  onOpenDevice: (id: string) => void; onViewAll: () => void;
}) {
  const queue = devices.filter((d) => d.loan === "overdue");
  const cols: Column<Device>[] = [
    { key: "cust", header: t("thCustomer"), render: (d) => (<div><div className="go-cn">{d.name}</div><div className="go-cm go-mono">{d.contract}</div></div>) },
    { key: "model", header: t("thDevice"), render: (d) => d.model },
    { key: "imei", header: t("thImei"), render: (d) => <span className="go-mono go-cm">{d.imei}</span> },
    { key: "lock", header: t("thLock"), render: (d) => lockBadge(d.lock, t) },
  ];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12 }}>
        <KpiCard label={t("kTotal")} value={stats?.total ?? "—"} sub={`${t("kSup")}: ${stats?.supervised ?? "—"}`} />
        <KpiCard label={t("kActive")} value={stats?.active ?? "—"} sub={t("kSched")} tone="green" />
        <KpiCard label={t("kOverdue")} value={stats?.overdue ?? "—"} sub={t("kOver3")} tone="amber" />
        <KpiCard label={t("kLocked")} value={stats?.locked ?? "—"} sub={t("kLostOn")} tone="red" />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1.65fr 1fr", gap: 14 }}>
        <Panel>
          <PanelHeader title={t("queue")} count={queue.length} action={<button className="go-link" onClick={onViewAll}>{t("viewAll")} →</button>} />
          <DataTable columns={cols} rows={queue} rowKey={(d) => d.id} onRowClick={(d) => onOpenDevice(d.id)} />
        </Panel>
        <Panel>
          <PanelHeader title={t("eventFeed")} />
          <div className="go-feed">
            {audit.map((a, i) => (
              <div className="go-ev" key={i}>
                <div className="go-ev__ico" style={{ background: `color-mix(in srgb, var(${evColor[a.act]}) 15%, transparent)`, color: `var(${evColor[a.act]})` }}>
                  <Icon name={evIcon[a.act]} />
                </div>
                <div>
                  <div className="go-ev__t"><b>{a.who}</b> {t(a.act)}</div>
                  <div className="go-ev__time">{a.dev} · {fmtAgo(a.t, t)}</div>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}

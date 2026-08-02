import { Badge, Panel, PanelHeader, Field } from "@golden-one/ui";

/** The full tone scale, each on the status it actually carries in the console. */
export const Tones = () => (
  <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
    <Badge tone="green">Активен</Badge>
    <Badge tone="amber">ожидает</Badge>
    <Badge tone="red">Просрочка</Badge>
    <Badge tone="steel">supervised</Badge>
    <Badge tone="gray">Погашен</Badge>
  </div>
);

/** The three status axes of one contract: loan, MDM enrollment, Lost Mode. */
export const ContractStatuses = () => (
  <div style={{ display: "grid", gap: 10, maxWidth: 320 }}>
    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
      <span style={{ fontSize: 11, color: "var(--go-faint)", width: 92 }}>Договор</span>
      <Badge tone="red">Просрочка</Badge>
      <span className="go-mono" style={{ fontSize: 11, color: "var(--go-red)" }}>24д</span>
    </div>
    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
      <span style={{ fontSize: 11, color: "var(--go-faint)", width: 92 }}>MDM</span>
      <Badge tone="steel">supervised</Badge>
    </div>
    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
      <span style={{ fontSize: 11, color: "var(--go-faint)", width: 92 }}>Блокировка</span>
      <Badge tone="red">Заблокирован</Badge>
    </div>
  </div>
);

/** `dot={false}` for labels that are not a live state — protocol and plan tags in Настройки. */
export const WithoutDot = () => (
  <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
    <Badge tone="gray" dot={false}>API</Badge>
    <Badge tone="steel" dot={false}>Mosyle Business</Badge>
    <Badge tone="gray" dot={false}>APNs</Badge>
    <Badge tone="green" dot={false}>iOS 17.5</Badge>
  </div>
);

/** How badges actually land in the devices table — one status column per row. */
export const InDeviceRows = () => (
  <Panel style={{ maxWidth: 400 }}>
    <PanelHeader title="Устройства" count={3} />
    {[
      { name: "Дилшод Рахимов", contract: "GO-2024-0417", lock: <Badge tone="green">Разблокирован</Badge> },
      { name: "Нигора Юсупова", contract: "GO-2024-0389", lock: <Badge tone="red">Заблокирован</Badge> },
      { name: "Гульнора Сафарова", contract: "GO-2024-0356", lock: <Badge tone="gray">Отпущен</Badge> },
    ].map((r) => (
      <Field
        key={r.contract}
        label={<span><span className="go-cn" style={{ color: "var(--go-text)" }}>{r.name}</span><br /><span className="go-mono go-cm">{r.contract}</span></span>}
        value={r.lock}
      />
    ))}
  </Panel>
);

/** Enrollment lifecycle read left to right — the PoS operator watches a device walk this line. */
export const EnrollmentLifecycle = () => (
  <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
    <Badge tone="amber">ожидает</Badge>
    <span style={{ color: "var(--go-faint)" }}>→</span>
    <Badge tone="steel">supervised</Badge>
    <span style={{ color: "var(--go-faint)" }}>→</span>
    <Badge tone="green">Активен</Badge>
    <span style={{ color: "var(--go-faint)" }}>→</span>
    <Badge tone="gray">Отпущен</Badge>
  </div>
);

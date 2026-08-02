import { Panel, PanelHeader, Field, DataTable, Badge, Button, Icon, type Column } from "@golden-one/ui";

const noop = () => {};

/**
 * The default surface: a bordered panel with a header and Field rows.
 * Panel clips its children, so the hairlines meet the rounded corners.
 */
export const Default = () => (
  <Panel>
    <PanelHeader title="Информация об устройстве" />
    <Field label="Модель" value="iPhone 14 Pro 256GB" />
    <Field label="Серийный номер" value={<span className="go-mono">DX7QP2M4N8KL</span>} />
    <Field label="IMEI" value={<span className="go-mono">358203099142287</span>} />
    <Field label="Статус MDM" value={<Badge tone="steel">Заведён</Badge>} />
  </Panel>
);

/**
 * Panel as a table container — no padding of its own, the DataTable runs
 * edge to edge under the header. The dashboard queue panel.
 */
export const WithTable = () => {
  type Row = { id: string; name: string; contract: string; days: number; lock: "locked" | "unlocked" };
  const rows: Row[] = [
    { id: "1", name: "Сардор Алиев", contract: "GO-2023-1188", days: 34, lock: "locked" },
    { id: "2", name: "Дилшод Рахимов", contract: "GO-2024-0417", days: 27, lock: "locked" },
    { id: "3", name: "Нигора Юсупова", contract: "GO-2024-0392", days: 12, lock: "unlocked" },
    { id: "4", name: "Мадина Хакимова", contract: "GO-2024-0501", days: 5, lock: "unlocked" },
  ];
  const cols: Column<Row>[] = [
    { key: "c", header: "Клиент", render: (r) => (
      <div><div className="go-cn">{r.name}</div><div className="go-cm go-mono">{r.contract}</div></div>
    ) },
    { key: "d", header: "Просрочка", render: (r) => (
      <span className={`go-over go-mono${r.days >= 20 ? " go-over--hi" : ""}`}>{r.days} дн.</span>
    ) },
    { key: "l", header: "Блокировка", render: (r) => (
      r.lock === "locked" ? <Badge tone="red">Заблокирован</Badge> : <Badge tone="green">Разблокирован</Badge>
    ) },
  ];
  return (
    <Panel>
      <PanelHeader title="Очередь взыскания" count={rows.length} action={<button className="go-link">Смотреть все →</button>} />
      <DataTable columns={cols} rows={rows} rowKey={(r) => r.id} onRowClick={noop} />
    </Panel>
  );
};

/**
 * Free-form padded content instead of rows — the MDM action panel on the
 * device card. Padding is the composition's job, not the Panel's.
 */
export const PaddedContent = () => (
  <Panel style={{ maxWidth: 320 }}>
    <div style={{ padding: "16px 18px" }}>
      <h4 style={{ fontSize: 13, textTransform: "uppercase", letterSpacing: ".4px", marginBottom: 4 }}>Действия</h4>
      <p className="go-cm" style={{ marginBottom: 14 }}>
        Команды уходят в MDM и логируются в аудите.
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <Button variant="red" block><Icon name="lock" />Заблокировать · Lost Mode</Button>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <Button variant="ghost"><Icon name="locate" />Найти</Button>
          <Button variant="ghost"><Icon name="sound" />Звук</Button>
        </div>
      </div>
    </div>
  </Panel>
);

/**
 * A hero block above the header: device thumbnail, customer name and the
 * lock badge — the top of the device card.
 */
export const DeviceSummary = () => (
  <Panel>
    <div style={{ display: "flex", gap: 16, alignItems: "center", padding: "18px 20px" }}>
      <div style={{ width: 50, height: 78, borderRadius: 11, flexShrink: 0, border: "2px solid var(--go-border-2)", background: "var(--go-panel-2)" }} />
      <div>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <span style={{ fontSize: 17, fontWeight: 700 }}>Дилшод Рахимов</span>
          <Badge tone="red">Заблокирован</Badge>
        </div>
        <div className="go-cm" style={{ marginTop: 3 }}>iPhone 13 128GB · +998 90 123-45-67</div>
      </div>
    </div>
    <PanelHeader title="Информация об устройстве" />
    <Field label="IMEI" value={<span className="go-mono">356728111234567</span>} />
    <Field label="Supervision" value="Supervised ✓" />
    <Field label="Последняя связь" value="2 мин назад" />
  </Panel>
);

/**
 * Two panels side by side, as the device card lays them out — the panel is
 * the only grid unit in the console.
 */
export const SideBySide = () => (
  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
    <Panel>
      <PanelHeader title="Договор" action={<Badge tone="red">Просрочен</Badge>} />
      <Field label="Номер" value={<span className="go-mono">GO-2024-0417</span>} />
      <Field label="Сумма" value={<span><span className="go-mono">12 400 000</span> сум</span>} />
      <Field label="Дней просрочки" value={<span className="go-over go-mono go-over--hi">27</span>} />
    </Panel>
    <Panel>
      <PanelHeader title="MDM" action={<Badge tone="steel">Mosyle</Badge>} />
      <Field label="Enrollment" value="Apple Configurator" />
      <Field label="Activation Lock" value={<Badge tone="green">Managed</Badge>} />
      <Field label="Lost Mode" value={<Badge tone="red">Включён</Badge>} />
    </Panel>
  </div>
);

import { DataTable, Panel, PanelHeader, Badge, Button, Icon, type Column } from "@golden-one/ui";

type Device = {
  id: string;
  name: string;
  phone: string;
  contract: string;
  model: string;
  imei: string;
  loan: "active" | "overdue" | "paid";
  daysOverdue: number;
  mdm: "enrolled" | "pending" | "released";
  lock: "locked" | "unlocked";
};

const devices: Device[] = [
  { id: "d1", name: "Дилшод Рахимов", phone: "+998 90 123-45-67", contract: "GO-2024-0417", model: "iPhone 13 128GB", imei: "356728111234567", loan: "overdue", daysOverdue: 27, mdm: "enrolled", lock: "locked" },
  { id: "d2", name: "Нигора Юсупова", phone: "+998 93 887-21-05", contract: "GO-2024-0392", model: "iPhone 12 64GB", imei: "353914107765431", loan: "overdue", daysOverdue: 12, mdm: "enrolled", lock: "unlocked" },
  { id: "d3", name: "Сардор Алиев", phone: "+998 91 554-08-12", contract: "GO-2023-1188", model: "iPhone 14 Pro 256GB", imei: "358203099142287", loan: "overdue", daysOverdue: 34, mdm: "enrolled", lock: "locked" },
  { id: "d4", name: "Мадина Хакимова", phone: "+998 94 220-77-31", contract: "GO-2024-0501", model: "iPhone SE 2022 64GB", imei: "351762104488903", loan: "overdue", daysOverdue: 5, mdm: "pending", lock: "unlocked" },
  { id: "d5", name: "Жасур Тошматов", phone: "+998 99 401-63-88", contract: "GO-2024-0288", model: "iPhone 13 Pro 128GB", imei: "359128104456712", loan: "active", daysOverdue: 0, mdm: "enrolled", lock: "unlocked" },
  { id: "d6", name: "Феруза Каримова", phone: "+998 88 715-30-24", contract: "GO-2023-0954", model: "iPhone 11 128GB", imei: "354019118872365", loan: "paid", daysOverdue: 0, mdm: "released", lock: "unlocked" },
];

const lockBadge = (s: Device["lock"]) =>
  s === "locked" ? <Badge tone="red">Заблокирован</Badge> : <Badge tone="green">Разблокирован</Badge>;
const loanBadge = (s: Device["loan"]) =>
  s === "active" ? <Badge tone="green">Активен</Badge>
  : s === "overdue" ? <Badge tone="red">Просрочен</Badge>
  : <Badge tone="gray">Погашен</Badge>;
const mdmBadge = (s: Device["mdm"]) =>
  s === "enrolled" ? <Badge tone="steel">Заведён</Badge>
  : s === "pending" ? <Badge tone="amber">Ожидает</Badge>
  : <Badge tone="gray">Снят</Badge>;

const noop = () => {};

/**
 * The collections queue exactly as the dashboard renders it: customer over
 * contract number, model, monospace IMEI, lock status as a Badge cell.
 * Rows are clickable — they open the device card.
 */
export const CollectionsQueue = () => {
  const cols: Column<Device>[] = [
    { key: "cust", header: "Клиент", render: (d) => (
      <div><div className="go-cn">{d.name}</div><div className="go-cm go-mono">{d.contract}</div></div>
    ) },
    { key: "model", header: "Устройство", render: (d) => d.model },
    { key: "imei", header: "IMEI", render: (d) => <span className="go-mono go-cm">{d.imei}</span> },
    { key: "lock", header: "Блокировка", render: (d) => lockBadge(d.lock) },
  ];
  return (
    <Panel>
      <DataTable
        columns={cols}
        rows={devices.filter((d) => d.loan === "overdue")}
        rowKey={(d) => d.id}
        onRowClick={noop}
      />
    </Panel>
  );
};

/**
 * The full Devices register — six columns, three independent Badge axes
 * (договор / MDM / блокировка) plus the days-overdue accent that turns red
 * past 20 days. This is the widest table in the product.
 */
export const DeviceRegister = () => {
  const cols: Column<Device>[] = [
    { key: "cust", header: "Клиент", render: (d) => (
      <div><div className="go-cn">{d.name}</div><div className="go-cm">{d.phone}</div></div>
    ) },
    { key: "model", header: "Устройство", render: (d) => (
      <div>{d.model}<div className="go-cm go-mono">{d.contract}</div></div>
    ) },
    { key: "imei", header: "IMEI", render: (d) => <span className="go-mono go-cm">{d.imei}</span> },
    { key: "loan", header: "Договор", render: (d) => (
      <span style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
        {loanBadge(d.loan)}
        {d.daysOverdue > 0 && (
          <span className={`go-over go-mono${d.daysOverdue >= 20 ? " go-over--hi" : ""}`} style={{ fontSize: 11 }}>
            {d.daysOverdue}д
          </span>
        )}
      </span>
    ) },
    { key: "mdm", header: "MDM", render: (d) => mdmBadge(d.mdm) },
    { key: "lock", header: "Блокировка", render: (d) => lockBadge(d.lock) },
  ];
  return (
    <Panel>
      <DataTable columns={cols} rows={devices} rowKey={(d) => d.id} onRowClick={noop} />
    </Panel>
  );
};

/**
 * Inside a Panel with a PanelHeader — the canonical dashboard composition:
 * title, live count of the queue and a "смотреть все" link in the action slot.
 */
export const InPanelWithHeader = () => {
  const queue = devices.filter((d) => d.loan === "overdue");
  const cols: Column<Device>[] = [
    { key: "cust", header: "Клиент", render: (d) => (
      <div><div className="go-cn">{d.name}</div><div className="go-cm go-mono">{d.contract}</div></div>
    ) },
    { key: "over", header: "Просрочка", render: (d) => (
      <span className={`go-over go-mono${d.daysOverdue >= 20 ? " go-over--hi" : ""}`}>{d.daysOverdue} дн.</span>
    ) },
    { key: "debt", header: "Долг", render: (d) => (
      <span className="go-mono">{(d.daysOverdue * 41_000).toLocaleString("ru-RU")} сум</span>
    ) },
    { key: "lock", header: "Блокировка", render: (d) => lockBadge(d.lock) },
  ];
  return (
    <Panel>
      <PanelHeader
        title="Очередь взыскания"
        count={queue.length}
        action={<button className="go-link">Смотреть все →</button>}
      />
      <DataTable columns={cols} rows={queue} rowKey={(d) => d.id} onRowClick={noop} />
    </Panel>
  );
};

/**
 * A narrow, read-only table: the MDM command queue on the device card.
 * No onRowClick, so rows are not clickable — delivery status carries the tone.
 */
export const CommandQueue = () => {
  type Cmd = { id: string; at: string; kind: string; operator: string; state: "acknowledged" | "pending" | "error" };
  const cmds: Cmd[] = [
    { id: "c1", at: "02.08 14:12", kind: "EnableLostMode", operator: "А. Юлдашев", state: "acknowledged" },
    { id: "c2", at: "02.08 14:12", kind: "DeviceLock", operator: "А. Юлдашев", state: "acknowledged" },
    { id: "c3", at: "01.08 09:47", kind: "DeviceLocation", operator: "М. Собирова", state: "pending" },
    { id: "c4", at: "28.07 18:03", kind: "PlayLostModeSound", operator: "М. Собирова", state: "error" },
  ];
  const state = (s: Cmd["state"]) =>
    s === "acknowledged" ? <Badge tone="green">Доставлено</Badge>
    : s === "pending" ? <Badge tone="amber">В очереди</Badge>
    : <Badge tone="red">Ошибка</Badge>;
  const cols: Column<Cmd>[] = [
    { key: "at", header: "Время", render: (c) => <span className="go-mono go-cm">{c.at}</span> },
    { key: "kind", header: "Команда", render: (c) => <span className="go-mono">{c.kind}</span> },
    { key: "op", header: "Оператор", render: (c) => c.operator },
    { key: "state", header: "Статус", render: (c) => state(c.state) },
  ];
  return (
    <Panel>
      <PanelHeader
        title="История команд"
        count={cmds.length}
        action={<Button variant="ghost"><Icon name="audit" />Аудит</Button>}
      />
      <DataTable columns={cols} rows={cmds} rowKey={(c) => c.id} />
    </Panel>
  );
};

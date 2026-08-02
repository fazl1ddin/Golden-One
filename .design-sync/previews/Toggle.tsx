import { Toggle, Panel, PanelHeader, Badge } from "@golden-one/ui";

const noop = () => {};

/** The variant axis: off (neutral track) and on (cyan track, knob to the right). */
export const States = () => (
  <div style={{ display: "flex", gap: 24, alignItems: "center" }}>
    <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
      <Toggle on={false} onToggle={noop} />
      <span style={{ fontSize: 12.5, color: "var(--go-muted)" }}>Выключено</span>
    </div>
    <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
      <Toggle on onToggle={noop} />
      <span style={{ fontSize: 12.5 }}>Включено</span>
    </div>
  </div>
);

/** The settings row it was built for — title, hint, switch pinned right. */
export const InSettingsPanel = () => (
  <Panel style={{ maxWidth: 400 }}>
    <PanelHeader title="Роли и доступ" />
    {[
      ["Тёмная тема", "Dark / Light", true],
      ["2FA для операторов", "Обязательна для взыскания", true],
      ["Автотриггер блокировки", "Фаза 2 — пока выключено", false],
    ].map(([title, sub, on]) => (
      <div
        key={title as string}
        style={{
          padding: "14px 18px", borderTop: "1px solid var(--go-border)",
          display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12,
        }}
      >
        <div>
          <div style={{ fontWeight: 650, fontSize: 13 }}>{title as string}</div>
          <div className="go-cm">{sub as string}</div>
        </div>
        <Toggle on={on as boolean} onToggle={noop} />
      </div>
    ))}
  </Panel>
);

/** Warning channels before full lock — a mixed on/off column as the operator configures escalation. */
export const NotificationChannels = () => (
  <Panel style={{ maxWidth: 360 }}>
    <PanelHeader title="Уведомления о просрочке" action={<Badge tone="amber">4 просрочки</Badge>} />
    {[
      ["SMS за 3 дня до платежа", true],
      ["Push при просрочке 1 день", true],
      ["Звонок оператора на 7-й день", false],
      ["Предупреждение на экране на 14-й день", false],
    ].map(([title, on]) => (
      <div
        key={title as string}
        style={{
          padding: "12px 18px", borderTop: "1px solid var(--go-border)",
          display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, fontSize: 12.5,
        }}
      >
        <span>{title as string}</span>
        <Toggle on={on as boolean} onToggle={noop} />
      </div>
    ))}
  </Panel>
);

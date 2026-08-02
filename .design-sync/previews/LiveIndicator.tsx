import { LiveIndicator, Badge, Icon } from "@golden-one/ui";

/** The topbar heartbeat — the operator's proof that MDM commands will actually reach devices. */
export const Default = () => <LiveIndicator>MDM online · Mosyle</LiveIndicator>;

/** The label carries the meaning: the same green pulse fronts every backend channel. */
export const Channels = () => (
  <div style={{ display: "grid", gap: 10, justifyItems: "start" }}>
    <LiveIndicator>MDM online · Mosyle</LiveIndicator>
    <LiveIndicator>APNs · очередь пуста</LiveIndicator>
    <LiveIndicator>Синхронизация · 6 сек назад</LiveIndicator>
    <LiveIndicator>Кредитная система · 128 договоров</LiveIndicator>
  </div>
);

/** Uzbek copy — the indicator sits in the shared topbar, so it follows the interface language. */
export const Uzbek = () => (
  <div style={{ display: "grid", gap: 10, justifyItems: "start" }}>
    <LiveIndicator>MDM ulangan · Mosyle</LiveIndicator>
    <LiveIndicator>Sinxronizatsiya · 6 soniya oldin</LiveIndicator>
  </div>
);

/** As composed in the topbar: screen title, live channel, then the session badge. */
export const InTopbar = () => (
  <div
    style={{
      display: "flex", alignItems: "center", gap: 14, padding: "14px 18px",
      borderBottom: "1px solid var(--go-border)", background: "var(--go-bg)", width: "100%", maxWidth: 560,
    }}
  >
    <div style={{ flexShrink: 0 }}>
      <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: ".2px" }}>Устройства</div>
      <div style={{ fontSize: 11.5, color: "var(--go-faint)" }}>6 договоров · 4 просрочки</div>
    </div>
    <div style={{ flex: 1 }} />
    <LiveIndicator>MDM online · Mosyle</LiveIndicator>
    <Badge tone="steel" dot={false}>Азиз Каримов</Badge>
    <Icon name="settings" width={16} height={16} style={{ color: "var(--go-faint)", flexShrink: 0 }} />
  </div>
);

import {
  ThemeProvider,
  Rail,
  Topbar,
  LiveIndicator,
  LangSwitch,
  ThemeButton,
  KpiCard,
  Panel,
  PanelHeader,
  Badge,
  Icon,
  type RailItem,
} from "@golden-one/ui";

const noop = () => {};

const nav: RailItem[] = [
  { id: "dashboard", label: "Дашборд", icon: "dash" },
  { id: "devices", label: "Устройства", icon: "devices", badge: 7 },
  { id: "enroll", label: "Заведение", icon: "enroll" },
  { id: "audit", label: "Аудит", icon: "audit" },
  { id: "settings", label: "Настройки", icon: "settings" },
];

/** Реальный фрагмент дашборда — то, что провайдер должен уметь одеть целиком. */
const ConsoleFragment = () => (
  <div style={{ display: "grid", gridTemplateColumns: "78px 1fr", minHeight: 360 }}>
    <Rail items={nav} active="dashboard" onSelect={noop} />
    <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
      <Topbar
        title="Дашборд"
        crumb="Взыскание · Оператор: Азиз Каримов"
        live={<LiveIndicator>MDM online · Mosyle</LiveIndicator>}
        right={
          <>
            <LangSwitch value="ru" onChange={noop} />
            <ThemeButton onClick={noop} />
          </>
        }
      />
      <div style={{ padding: "16px 22px", display: "grid", gap: 14 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12 }}>
          <KpiCard label="Устройств" value="1 248" sub="supervised" tone="steel" />
          <KpiCard label="Просрочка" value="7" sub="> 3 дней" tone="amber" />
          <KpiCard label="Заблокировано" value="3" sub="Lost Mode активен" tone="red" />
        </div>
        <Panel>
          <PanelHeader title="Очередь взыскания" count={7} />
          <div style={{ padding: "10px 14px", display: "grid", gap: 10, fontSize: 12.5 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Icon name="devices" style={{ width: 15, height: 15, color: "var(--go-faint)" }} />
              <span style={{ flex: 1 }}>Дилшод Рахимов · GO-2024-0318</span>
              <span className="go-mono" style={{ color: "var(--go-muted)" }}>
                12 400 000 сум
              </span>
              <Badge tone="red">14 дн. просрочки</Badge>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Icon name="devices" style={{ width: 15, height: 15, color: "var(--go-faint)" }} />
              <span style={{ flex: 1 }}>Нигора Юсупова · GO-2024-0451</span>
              <span className="go-mono" style={{ color: "var(--go-muted)" }}>
                8 900 000 сум
              </span>
              <Badge tone="amber">5 дн. просрочки</Badge>
            </div>
          </div>
        </Panel>
      </div>
    </div>
  </div>
);

/** Канонический корень приложения: полноэкранная консоль без внутреннего отступа. */
export const AppShell = () => (
  <ThemeProvider theme="dark">
    <ConsoleFragment />
  </ThemeProvider>
);

/** `padded` — тот же провайдер как изолированная поверхность внутри чужой страницы. */
export const PaddedSurface = () => (
  <ThemeProvider theme="dark" padded>
    <Panel>
      <PanelHeader title="Подключение MDM" action={<Badge tone="green" dot>Подключено</Badge>} />
      <div style={{ padding: "12px 14px", display: "grid", gap: 8, fontSize: 12.5 }}>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ color: "var(--go-faint)" }}>Провайдер</span>
          <span>Mosyle Business</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ color: "var(--go-faint)" }}>Устройств на связи</span>
          <span className="go-mono">1 241 / 1 248</span>
        </div>
      </div>
    </Panel>
  </ThemeProvider>
);

/**
 * Оба набора токенов рядом. `theme` штампуется на корне документа, поэтому
 * для честного сравнения на одной странице светлая половина дополнительно
 * несёт свой набор переменных на себе — сравнение композиционное, API не трогаем.
 * Стоит последней среди историй провайдера: светлая тема влияет на весь лист.
 */
export const DarkAndLight = () => (
  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
    <ThemeProvider theme="dark" padded style={{ borderRadius: 12, border: "1px solid var(--go-border)" }}>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".06em", color: "var(--go-faint)", marginBottom: 10 }}>
        ТЁМНАЯ · ОПЕРАТОРСКАЯ
      </div>
      <ThemeCardBody />
    </ThemeProvider>
    <ThemeProvider
      theme="light"
      padded
      style={{
        borderRadius: 12,
        border: "1px solid #dfe4ec",
        ["--go-bg" as string]: "#eef1f5",
        ["--go-panel" as string]: "#fff",
        ["--go-panel-2" as string]: "#f5f7fa",
        ["--go-panel-3" as string]: "#eaeef3",
        ["--go-border" as string]: "#dfe4ec",
        ["--go-border-2" as string]: "#cfd6e1",
        ["--go-text" as string]: "#141a24",
        ["--go-muted" as string]: "#586274",
        ["--go-faint" as string]: "#8b95a6",
        ["--go-cy" as string]: "#0e9c8f",
        ["--go-cy-dim" as string]: "#0b7c72",
        ["--go-cy-soft" as string]: "rgba(14,156,143,.12)",
        ["--go-steel" as string]: "#2f74c4",
        ["--go-steel-soft" as string]: "rgba(47,116,196,.1)",
        ["--go-shadow" as string]: "0 12px 40px rgba(20,25,40,.14)",
      }}
    >
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".06em", color: "var(--go-faint)", marginBottom: 10 }}>
        СВЕТЛАЯ · ДНЕВНАЯ СМЕНА
      </div>
      <ThemeCardBody />
    </ThemeProvider>
  </div>
);

/** Одинаковое содержимое по обе стороны — различие несут только токены. */
function ThemeCardBody() {
  return (
    <div style={{ display: "grid", gap: 12 }}>
      <KpiCard label="Просрочка" value="7" sub="> 3 дней" tone="amber" />
      <Panel>
        <PanelHeader title="Последние события" />
        <div style={{ padding: "10px 14px", display: "grid", gap: 8, fontSize: 12.5 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Icon name="lock" style={{ width: 14, height: 14, color: "var(--go-red)" }} />
            <span style={{ flex: 1 }}>Азиз Каримов заблокировал устройство</span>
            <span className="go-mono" style={{ color: "var(--go-faint)" }}>12 мин</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Icon name="unlock" style={{ width: 14, height: 14, color: "var(--go-green)" }} />
            <span style={{ flex: 1 }}>Шахло Тошева разблокировала устройство</span>
            <span className="go-mono" style={{ color: "var(--go-faint)" }}>1 ч</span>
          </div>
        </div>
      </Panel>
      <div style={{ display: "flex", gap: 8 }}>
        <Badge tone="green" dot>Активен</Badge>
        <Badge tone="amber">Просрочка</Badge>
        <Badge tone="red">LOCK</Badge>
      </div>
    </div>
  );
}

import { ThemeButton, LangSwitch, LiveIndicator, Label, Toggle } from "@golden-one/ui";

const noop = () => {};

/** Переключатель темы — иконочная кнопка 33×31 в размер сегмента языка. */
export const Default = () => <ThemeButton onClick={noop} />;

/** Правый кластер топбара: индикатор MDM, язык, тема — в этом порядке. */
export const InTopbarCluster = () => (
  <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
    <LiveIndicator>MDM online · Mosyle</LiveIndicator>
    <LangSwitch value="ru" onChange={noop} />
    <ThemeButton onClick={noop} />
  </div>
);

/** Одна высота с LangSwitch — обе кнопки строятся на бордюре `.go-seg`. */
export const AlignedWithLangSwitch = () => (
  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
    <LangSwitch value="uz" onChange={noop} />
    <ThemeButton onClick={noop} />
  </div>
);

/** В «Настройках» тема дублируется тумблером; кнопка остаётся быстрым доступом. */
export const InSettingsRow = () => (
  <div style={{ maxWidth: 300, display: "flex", flexDirection: "column", gap: 8 }}>
    <Label>Тёмная тема</Label>
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <Toggle on onToggle={noop} />
      <ThemeButton onClick={noop} />
      <span style={{ fontSize: 12, color: "var(--go-faint)" }}>Тёмная</span>
    </div>
  </div>
);

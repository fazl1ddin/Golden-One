import { LangSwitch, ThemeButton, LiveIndicator, Label } from "@golden-one/ui";

const noop = () => {};

/** Русский — язык по умолчанию для операторов взыскания. */
export const Russian = () => <LangSwitch value="ru" onChange={noop} />;

/** Узбекский выбран: подсветка сегмента — единственный индикатор состояния. */
export const Uzbek = () => <LangSwitch value="uz" onChange={noop} />;

/** Три локали: сегменты растут по количеству опций, ширина не фиксирована. */
export const ThreeLocales = () => (
  <LangSwitch value="ru" onChange={noop} options={["ru", "uz", "en"]} />
);

/** Правый кластер топбара — переключатель языка всегда стоит слева от кнопки темы. */
export const InTopbarCluster = () => (
  <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
    <LiveIndicator>MDM online · Mosyle</LiveIndicator>
    <LangSwitch value="ru" onChange={noop} />
    <ThemeButton onClick={noop} />
  </div>
);

/** В «Настройках» тот же компонент подписан как обычное поле формы. */
export const InSettingsForm = () => (
  <div style={{ maxWidth: 260 }}>
    <Label>Язык интерфейса</Label>
    <LangSwitch value="uz" onChange={noop} />
  </div>
);

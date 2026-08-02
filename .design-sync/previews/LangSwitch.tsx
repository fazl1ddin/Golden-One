import { LangSwitch, ThemeButton, LiveIndicator, Label } from "@golden-one/ui";

const noop = () => {};

/**
 * `.go-seg` is `display:flex`, so as a lone block child it stretches to the full
 * width of its parent and trails an empty bordered strip. Every standalone story
 * shrink-wraps it — in the app it always sits in the topbar's flex row.
 */
const Fit = ({ children }: { children: React.ReactNode }) => (
  <div style={{ width: "max-content" }}>{children}</div>
);

/** Русский — язык по умолчанию для операторов взыскания. */
export const Russian = () => (
  <Fit>
    <LangSwitch value="ru" onChange={noop} />
  </Fit>
);

/** Узбекский выбран: подсветка сегмента — единственный индикатор состояния. */
export const Uzbek = () => (
  <Fit>
    <LangSwitch value="uz" onChange={noop} />
  </Fit>
);

/** Три локали: сегментов ровно столько, сколько опций — ширина не фиксирована. */
export const ThreeLocales = () => (
  <Fit>
    <LangSwitch value="ru" onChange={noop} options={["ru", "uz", "en"]} />
  </Fit>
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
    <Fit>
      <LangSwitch value="uz" onChange={noop} />
    </Fit>
  </div>
);

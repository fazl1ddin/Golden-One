import { Topbar, LiveIndicator, LangSwitch, ThemeButton, Icon, Badge } from "@golden-one/ui";

const noop = () => {};

/**
 * `.go-top` is a single non-wrapping flex row, so the search slot has to be
 * budgeted against the right cluster or the live indicator slides under it.
 * 260px is the widest the field can be next to a full RU/UZ + theme cluster.
 */
const SearchField = ({ placeholder, width = 260 }: { placeholder: string; width?: number }) => (
  <div style={{ marginLeft: 12, flex: `0 1 ${width}px`, maxWidth: width, position: "relative" }}>
    <Icon
      name="search"
      style={{ position: "absolute", left: 10, top: 8, width: 15, height: 15, color: "var(--go-faint)" }}
    />
    <input
      className="go-input go-mono"
      style={{ paddingLeft: 32, fontSize: 12.5 }}
      placeholder={placeholder}
      readOnly
    />
  </div>
);

/** Живой индикатор не должен переноситься — он всегда одна строка справа. */
const Live = ({ children }: { children: React.ReactNode }) => (
  <div style={{ display: "flex", flexShrink: 0, whiteSpace: "nowrap" }}>
    <LiveIndicator>{children}</LiveIndicator>
  </div>
);

/** Канонический топбар: заголовок, хлебная крошка, поиск, MDM-индикатор, язык и тема. */
export const Default = () => (
  <Topbar
    title="Дашборд"
    crumb="Взыскание · Оператор: Азиз Каримов"
    search={<SearchField placeholder="/ поиск: клиент · IMEI · договор" width={200} />}
    live={<Live>MDM online · Mosyle</Live>}
    right={
      <>
        <LangSwitch value="ru" onChange={noop} />
        <ThemeButton onClick={noop} />
      </>
    }
  />
);

/**
 * Карточка устройства: заголовок — имя клиента, крошка несёт договор и модель,
 * а справа появляется состояние блокировки. Поиска здесь нет — экран уже адресный.
 */
export const DeviceDetail = () => (
  <Topbar
    title="Дилшод Рахимов"
    crumb="Договор GO-2024-0318 · iPhone 14 Pro · 128 ГБ"
    live={<Live>MDM online · Mosyle</Live>}
    right={
      <>
        <Badge tone="red" dot>
          Lost Mode активен
        </Badge>
        <LangSwitch value="ru" onChange={noop} />
        <ThemeButton onClick={noop} />
      </>
    }
  />
);

/** Узбекская локаль: переключатель на UZ, весь заголовочный блок следует за языком. */
export const UzbekLocale = () => (
  <Topbar
    title="Qurilmalar"
    crumb="Barcha moliyalashtirilgan qurilmalar"
    search={<SearchField placeholder="/ qidiruv: mijoz · IMEI · shartnoma" />}
    live={<Live>MDM online · Mosyle</Live>}
    right={
      <>
        <LangSwitch value="uz" onChange={noop} />
        <ThemeButton onClick={noop} />
      </>
    }
  />
);

/** Минимальный вариант — только заголовок и крошка; экраны-мастера не дают поиска. */
export const TitleOnly = () => (
  <Topbar title="Заведение" crumb="Регистрация нового устройства на точке продажи" />
);

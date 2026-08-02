import { Topbar, LiveIndicator, LangSwitch, ThemeButton, Icon, Badge } from "@golden-one/ui";

const noop = () => {};

/** Поле поиска консоли — тот же слот, что и в приложении: иконка + моно-инпут. */
const SearchField = () => (
  <div style={{ marginLeft: 12, flex: 1, maxWidth: 320, position: "relative" }}>
    <Icon
      name="search"
      style={{ position: "absolute", left: 10, top: 8, width: 15, height: 15, color: "var(--go-faint)" }}
    />
    <input
      className="go-input go-mono"
      style={{ paddingLeft: 32, fontSize: 12.5 }}
      placeholder="/ поиск: клиент · IMEI · договор"
      readOnly
    />
  </div>
);

/** Канонический топбар: заголовок, хлебная крошка, поиск, MDM-индикатор, язык и тема. */
export const Default = () => (
  <Topbar
    title="Дашборд"
    crumb="Взыскание · Оператор: Азиз Каримов"
    search={<SearchField />}
    live={<LiveIndicator>MDM online · Mosyle</LiveIndicator>}
    right={
      <>
        <LangSwitch value="ru" onChange={noop} />
        <ThemeButton onClick={noop} />
      </>
    }
  />
);

/** Карточка устройства: заголовок — имя клиента, крошка несёт договор и модель. */
export const DeviceDetail = () => (
  <Topbar
    title="Дилшод Рахимов"
    crumb="Договор GO-2024-0318 · iPhone 14 Pro · 128 ГБ"
    search={<SearchField />}
    live={<LiveIndicator>MDM online · Mosyle</LiveIndicator>}
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
    search={
      <div style={{ marginLeft: 12, flex: 1, maxWidth: 320, position: "relative" }}>
        <Icon
          name="search"
          style={{ position: "absolute", left: 10, top: 8, width: 15, height: 15, color: "var(--go-faint)" }}
        />
        <input
          className="go-input go-mono"
          style={{ paddingLeft: 32, fontSize: 12.5 }}
          placeholder="/ qidiruv: mijoz · IMEI · shartnoma"
          readOnly
        />
      </div>
    }
    live={<LiveIndicator>MDM online · Mosyle</LiveIndicator>}
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

import { Panel, PanelHeader, Field, Badge, Button, Icon } from "@golden-one/ui";

/**
 * Title only — the uppercase, letter-spaced section label used above
 * Field rows on the device card.
 */
export const TitleOnly = () => (
  <Panel>
    <PanelHeader title="Информация об устройстве" />
    <Field label="Модель" value="iPhone 13 128GB" />
    <Field label="IMEI" value={<span className="go-mono">356728111234567</span>} />
  </Panel>
);

/**
 * With `count` — the queue size rendered as a muted "· N" after the title.
 */
export const WithCount = () => (
  <Panel>
    <PanelHeader title="Очередь взыскания" count={187} />
    <Field label="Просрочка более 20 дней" value={<span className="go-over go-mono go-over--hi">51</span>} />
    <Field label="Просрочка 3–20 дней" value={<span className="go-over go-mono">136</span>} />
  </Panel>
);

/**
 * The `action` slot holding the standard "смотреть все" link — right-aligned
 * on the same baseline as the title.
 */
export const WithLinkAction = () => (
  <Panel>
    <PanelHeader
      title="Просроченные договоры"
      count={187}
      action={<button className="go-link">Смотреть все →</button>}
    />
    <Field label="Дилшод Рахимов" value={<span className="go-mono">GO-2024-0417</span>} />
    <Field label="Нигора Юсупова" value={<span className="go-mono">GO-2024-0392</span>} />
    <Field label="Сардор Алиев" value={<span className="go-mono">GO-2023-1188</span>} />
  </Panel>
);

/**
 * `action` is a ReactNode, so a status Badge fits the slot too — that is how
 * the loan panel surfaces contract state without a second row.
 */
export const WithBadgeAction = () => (
  <Panel>
    <PanelHeader title="Кредитный договор" action={<Badge tone="red">Просрочен</Badge>} />
    <Field label="Номер договора" value={<span className="go-mono">GO-2024-0417</span>} />
    <Field label="Сумма" value={<span><span className="go-mono">12 400 000</span> сум</span>} />
    <Field label="Дней просрочки" value={<span className="go-over go-mono go-over--hi">27 дней</span>} />
  </Panel>
);

/**
 * A button in the action slot — the audit panel's export control. Count and
 * action coexist without crowding the title.
 */
export const WithButtonAction = () => (
  <Panel>
    <PanelHeader
      title="Журнал аудита"
      count={412}
      action={<Button variant="ghost"><Icon name="audit" />Выгрузить</Button>}
    />
    <Field label="А. Юлдашев" value="Заблокировал · 02.08 14:12" />
    <Field label="М. Собирова" value="Запросил геолокацию · 01.08 09:47" />
    <Field label="А. Юлдашев" value="Разблокировал · 29.07 11:20" />
  </Panel>
);

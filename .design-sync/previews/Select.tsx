import { Select, Label, Input, Panel, PanelHeader } from "@golden-one/ui";

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div>
    <Label>{label}</Label>
    {children}
  </div>
);

/** Model picker from the PoS enrollment form — empty (prompt option) next to a chosen model. */
export const DeviceModel = () => (
  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, maxWidth: 520 }}>
    <Field label="Модель iPhone">
      <Select defaultValue="">
        <option value="" disabled>Выберите модель…</option>
        <option>iPhone 13</option>
        <option>iPhone 14</option>
        <option>iPhone 15</option>
        <option>iPhone 15 Pro</option>
      </Select>
    </Field>
    <Field label="Модель iPhone">
      <Select defaultValue="iPhone 15 Pro">
        <option>iPhone 13</option>
        <option>iPhone 14</option>
        <option>iPhone 15</option>
        <option>iPhone 15 Pro</option>
      </Select>
    </Field>
  </div>
);

/** The lock dialog's reason picker — every Lost Mode command is logged with this value. */
export const LockReason = () => (
  <div style={{ maxWidth: 360 }}>
    <Field label="Причина блокировки">
      <Select defaultValue="Просрочка платежа 34 дня">
        <option>Просрочка платежа 34 дня</option>
        <option>Просрочка платежа более 60 дней</option>
        <option>Подозрение на мошенничество</option>
        <option>Утеря устройства по заявлению клиента</option>
        <option>Решение службы взыскания</option>
      </Select>
    </Field>
  </div>
);

/** Filter bar above the device register — three selects share one row. */
export const FilterRow = () => (
  <div style={{ maxWidth: 620 }}>
    <Panel>
      <PanelHeader title="Устройства" count={248} />
      <div style={{ padding: 16, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
        <Field label="Статус договора">
          <Select defaultValue="Просрочен">
            <option>Все</option>
            <option>Активен</option>
            <option>Просрочен</option>
            <option>Погашен</option>
            <option>Дефолт</option>
          </Select>
        </Field>
        <Field label="Статус блокировки">
          <Select defaultValue="Все">
            <option>Все</option>
            <option>Разблокировано</option>
            <option>Заблокировано (Lost Mode)</option>
          </Select>
        </Field>
        <Field label="Точка продаж">
          <Select defaultValue="Ташкент · Чиланзар">
            <option>Все точки</option>
            <option>Ташкент · Чиланзар</option>
            <option>Ташкент · Юнусабад</option>
            <option>Самарканд · Центр</option>
          </Select>
        </Field>
      </div>
    </Panel>
  </div>
);

/** Select next to Input at the same width — the two controls must align in a form grid. */
export const WithInput = () => (
  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, maxWidth: 520 }}>
    <Field label="Клиент">
      <Input defaultValue="Каримова Севара Бахтияровна" />
    </Field>
    <Field label="Модель iPhone">
      <Select defaultValue="iPhone 14">
        <option>iPhone 13</option>
        <option>iPhone 14</option>
        <option>iPhone 15</option>
      </Select>
    </Field>
    <Field label="Срок рассрочки">
      <Select defaultValue="12 месяцев">
        <option>6 месяцев</option>
        <option>12 месяцев</option>
        <option>18 месяцев</option>
        <option>24 месяца</option>
      </Select>
    </Field>
    <Field label="Ежемесячный платёж">
      <Input style={{ fontFamily: "var(--go-mono)", fontVariantNumeric: "tabular-nums" }} defaultValue="1 249 000 сўм" />
    </Field>
  </div>
);

/** Disabled — the MDM provider is fixed once devices are enrolled against it. */
export const Disabled = () => (
  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, maxWidth: 520 }}>
    <Field label="MDM-провайдер">
      <Select disabled defaultValue="Mosyle Business">
        <option>Mosyle Business</option>
        <option>Hexnode</option>
      </Select>
    </Field>
    <Field label="Тип блокировки">
      <Select disabled defaultValue="Lost Mode">
        <option>Lost Mode</option>
      </Select>
    </Field>
  </div>
);

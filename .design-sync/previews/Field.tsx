import { Field, Panel, PanelHeader, Badge } from "@golden-one/ui";

/**
 * The device-info block from the device card: label left, value right,
 * hairline between rows. Serial and IMEI use the monospace face.
 */
export const DeviceInfo = () => (
  <Panel>
    <PanelHeader title="Информация об устройстве" />
    <Field label="Модель" value="iPhone 13 128GB" />
    <Field label="Серийный номер" value={<span className="go-mono">F2LX9K3JQ1GH</span>} />
    <Field label="IMEI" value={<span className="go-mono">356728111234567</span>} />
    <Field label="iOS" value="17.5.1" />
    <Field label="Supervision" value="Supervised ✓" />
    <Field label="Статус MDM" value={<Badge tone="steel">Заведён</Badge>} />
    <Field label="Последняя связь" value="2 мин назад" />
  </Panel>
);

/**
 * Loan terms — the same Field, but every value is a formatted so'm figure.
 * The overdue row uses the red accent so it reads before anything else.
 */
export const LoanInfo = () => (
  <Panel>
    <PanelHeader title="Кредитный договор" action={<Badge tone="red">Просрочен</Badge>} />
    <Field label="Номер договора" value={<span className="go-mono">GO-2024-0417</span>} />
    <Field label="Сумма" value={<span><span className="go-mono">12 400 000</span> сум</span>} />
    <Field label="Ежемесячный платёж" value={<span><span className="go-mono">1 033 000</span> сум</span>} />
    <Field label="Оплачено" value={<span><span className="go-mono">4 132 000</span> сум</span>} />
    <Field label="Следующий платёж" value={<span className="go-mono">06.07.2024</span>} />
    <Field label="Дней просрочки" value={<span className="go-over go-mono go-over--hi">27 дней</span>} />
  </Panel>
);

/**
 * Values are ReactNode — Badges, mono text and the amber/red overdue accent
 * all sit in the value slot without any extra Field API.
 */
export const RichValues = () => (
  <Panel>
    <PanelHeader title="Статусы" />
    <Field label="Договор" value={<Badge tone="red">Просрочен</Badge>} />
    <Field label="Enrollment" value={<Badge tone="amber">Ожидает профиль</Badge>} />
    <Field label="Lost Mode" value={<Badge tone="red">Включён</Badge>} />
    <Field label="Activation Lock" value={<Badge tone="green">Managed</Badge>} />
    <Field label="Оператор блокировки" value="А. Юлдашев · взыскание" />
    <Field label="Просрочка" value={<span className="go-over go-mono">12 дней</span>} />
  </Panel>
);

/**
 * A long value wrapping opposite a short label — the lock-screen message
 * template in Settings. Field keeps the label anchored left.
 */
export const LongValue = () => (
  <Panel style={{ maxWidth: 460 }}>
    <PanelHeader title="Шаблон блокировки" />
    <Field label="Клиент" value="Нигора Юсупова" />
    <Field label="Телефон" value={<span className="go-mono">+998 71 200-00-00</span>} />
    <Field
      label="Сообщение"
      value="Устройство заблокировано в связи с просрочкой платежа. Для разблокировки обратитесь в Golden One."
    />
    <Field label="Язык" value="Русский / O‘zbekcha" />
  </Panel>
);

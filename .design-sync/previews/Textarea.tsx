import { Textarea, Label, Input, Select, Panel, PanelHeader, LostModePreview } from "@golden-one/ui";

const mono = { fontFamily: "var(--go-mono)", fontVariantNumeric: "tabular-nums" } as const;

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div>
    <Label>{label}</Label>
    {children}
  </div>
);

/** The lock-message template from Settings — the text the client sees on the locked screen. */
export const LockMessageTemplate = () => (
  <div style={{ maxWidth: 560 }}>
    <Panel>
      <PanelHeader title="Шаблон сообщения блокировки" />
      <div style={{ padding: "16px 18px", display: "flex", flexDirection: "column", gap: 12 }}>
        <Field label="Сообщение на экране блокировки">
          <Textarea defaultValue="Устройство заблокировано в связи с просрочкой платежа по договору GO-2026-0184. Для разблокировки погасите задолженность и обратитесь в Golden One." />
        </Field>
        <Field label="Телефон для связи">
          <Input style={mono} defaultValue="+998 71 200-00-00" />
        </Field>
      </div>
    </Panel>
  </div>
);

/** Empty with placeholder — the operator's mandatory note before sending a Lost Mode command. */
export const EmptyWithPlaceholder = () => (
  <div style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 420 }}>
    <Field label="Причина">
      <Select defaultValue="Просрочка платежа 34 дня">
        <option>Просрочка платежа 34 дня</option>
        <option>Подозрение на мошенничество</option>
      </Select>
    </Field>
    <Field label="Комментарий оператора">
      <Textarea placeholder="Опишите, какие меры уже приняты: звонки, SMS, договорённости о дате оплаты…" />
    </Field>
  </div>
);

/** The template beside its rendering — what the operator writes and what the client sees. */
export const WithLostModePreview = () => (
  <div style={{ display: "grid", gridTemplateColumns: "1fr 260px", gap: 16, alignItems: "start", maxWidth: 620 }}>
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <Field label="Сообщение на экране блокировки">
        <Textarea rows={5} defaultValue="Устройство заблокировано в связи с просрочкой платежа. Для разблокировки обратитесь в Golden One." />
      </Field>
      <Field label="Телефон для связи">
        <Input style={mono} defaultValue="+998 71 200-00-00" />
      </Field>
    </div>
    <div>
      <Label>Предпросмотр Lost Mode</Label>
      <LostModePreview
        title="Устройство заблокировано"
        message="Устройство заблокировано в связи с просрочкой платежа. Для разблокировки обратитесь в Golden One."
        phone="+998 71 200-00-00"
      />
    </div>
  </div>
);

/**
 * Height is driven by `rows` above the 60px floor: the default SMS draft, a
 * five-row lock message, and a ten-row contract notice that fits without scrolling.
 */
export const Sizes = () => (
  <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 460 }}>
    <Field label="SMS-предупреждение (по умолчанию)">
      <Textarea defaultValue="Golden One: по договору GO-2026-0001 просрочка 12 дней. Оплатите до 08.08." />
    </Field>
    <Field label="Сообщение блокировки (rows=5)">
      <Textarea rows={5} defaultValue="Устройство заблокировано в связи с просрочкой платежа. Для разблокировки обратитесь в Golden One по телефону +998 71 200-00-00." />
    </Field>
    <Field label="Уведомление по договору (rows=10)">
      <Textarea
        rows={10}
        defaultValue={
          "Уважаемый клиент! По договору GO-2026-0184 от 14.02.2026 образовалась просроченная задолженность 3 240 000 сўм.\n\nСогласно п. 5.4 устройство переведено в Lost Mode. Экстренные вызовы остаются доступными.\n\nПосле оплаты устройство разблокируется в течение 15 минут."
        }
      />
    </Field>
  </div>
);

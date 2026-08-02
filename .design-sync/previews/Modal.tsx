import { Modal, Warn, Button, Icon, Label, Select, Textarea, Input, LostModePreview } from "@golden-one/ui";

const noop = () => {};

/**
 * The overlay is `position: fixed`. A `transform` on an ancestor makes that
 * ancestor the containing block, so the dialog renders inside the card instead
 * of escaping to the viewport. Composition only — no component API involved.
 */
const Stage = ({ children, height = 620 }: { children: React.ReactNode; height?: number }) => (
  <div style={{ position: "relative", height, transform: "translateZ(0)", borderRadius: 12, overflow: "hidden" }}>
    {children}
  </div>
);

/** The lock confirmation — the highest-stakes dialog in the product. */
export const LockDevice = () => (
  <Stage height={760}>
  <Modal
    icon="lock"
    tone="red"
    title="Заблокировать устройство?"
    subtitle="iPhone перейдёт в Lost Mode · Дилшод Рахимов"
    onClose={noop}
    footer={<>
      <Button variant="ghost" onClick={noop}>Отмена</Button>
      <Button variant="red" onClick={noop}><Icon name="lock" />Заблокировать</Button>
    </>}
  >
    <Warn>Клиент не сможет пользоваться телефоном. Экстренные вызовы останутся доступны. Действие логируется.</Warn>
    <div style={{ marginBottom: 12 }}>
      <Label>Причина</Label>
      <Select defaultValue="Просрочка платежа">
        <option>Просрочка платежа</option>
        <option>Подозрение на мошенничество</option>
      </Select>
    </div>
    <div style={{ marginBottom: 14 }}>
      <Label>Сообщение на экране блокировки</Label>
      <Textarea defaultValue="Устройство заблокировано в связи с просрочкой платежа. Для разблокировки обратитесь в Golden One." />
    </div>
    <LostModePreview
      title="Устройство заблокировано"
      message="Устройство заблокировано в связи с просрочкой платежа."
      phone="+998 71 200-00-00"
    />
  </Modal>
  </Stage>
);

/** Unlock is deliberately gated behind an explicit payment confirmation. */
export const UnlockDevice = () => (
  <Stage height={380}>
  <Modal
    icon="unlock"
    tone="green"
    title="Разблокировать устройство?"
    subtitle="Lost Mode выключится, телефон заработает · Нигора Юсупова"
    onClose={noop}
    footer={<>
      <Button variant="ghost" onClick={noop}>Отмена</Button>
      <Button variant="cy" onClick={noop}><Icon name="unlock" />Разблокировать</Button>
    </>}
  >
    <label style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: 12, border: "1px solid var(--go-border)", borderRadius: 10, fontSize: 12.5 }}>
      <input type="checkbox" defaultChecked style={{ marginTop: 2, width: 15, height: 15, accentColor: "var(--go-cy)" }} />
      <span>Оплата получена — разблокировать</span>
    </label>
  </Modal>
  </Stage>
);

/** A plain confirmation with no tone icon — used for low-stakes edits. */
export const Simple = () => (
  <Stage height={360}>
  <Modal
    icon="check"
    tone="cy"
    title="Сохранить шаблон блокировки?"
    subtitle="Изменения применятся ко всем новым блокировкам"
    onClose={noop}
    footer={<>
      <Button variant="ghost" onClick={noop}>Отмена</Button>
      <Button variant="cy" onClick={noop}>Сохранить</Button>
    </>}
  >
    <Label>Телефон для связи</Label>
    <Input className="go-mono" defaultValue="+998 71 200-00-00" />
  </Modal>
  </Stage>
);

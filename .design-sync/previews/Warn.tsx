import { Warn, Panel, PanelHeader, Label, Select, Button, Icon } from "@golden-one/ui";

/** The canonical use: the consequence notice inside the Lost Mode confirmation. */
export const LockConfirmation = () => (
  <div style={{ maxWidth: 400 }}>
    <Warn>Клиент не сможет пользоваться телефоном. Экстренные вызовы останутся доступны. Действие логируется.</Warn>
  </div>
);

/** Uzbek copy — the same notice for an operator working in UZ. */
export const Uzbek = () => (
  <div style={{ maxWidth: 400 }}>
    <Warn>Mijoz telefondan foydalana olmaydi. Favqulodda qo‘ng‘iroqlar ishlaydi. Amal jurnalga yoziladi.</Warn>
  </div>
);

/** A short operational warning — supervision lost means Lost Mode will not reach the device. */
export const SupervisionLost = () => (
  <div style={{ maxWidth: 400, display: "grid", gap: 4 }}>
    <Warn>Устройство не выходило на связь 6 дней — команда встанет в очередь до следующего чек-ина.</Warn>
    <Warn>Supervision снят. Заблокировать iPhone нельзя — требуется повторное заведение через Apple Configurator.</Warn>
  </div>
);

/** In place: warning above the reason field, the way the lock dialog body is composed. */
export const InDialogBody = () => (
  <Panel style={{ maxWidth: 400 }}>
    <PanelHeader title="Заблокировать устройство?" />
    <div style={{ padding: "16px 18px" }}>
      <Warn>Клиент не сможет пользоваться телефоном. Экстренные вызовы останутся доступны.</Warn>
      <Label>Причина</Label>
      <Select defaultValue="Просрочка платежа">
        <option>Просрочка платежа</option>
        <option>Подозрение на мошенничество</option>
        <option>Другое</option>
      </Select>
      <div style={{ display: "flex", gap: 9, marginTop: 14, justifyContent: "flex-end" }}>
        <Button variant="ghost">Отмена</Button>
        <Button variant="red"><Icon name="lock" />Заблокировать</Button>
      </div>
    </div>
  </Panel>
);

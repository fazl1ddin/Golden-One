import { Button, Icon } from "@golden-one/ui";

/** Primary collection actions — the cyan action, the destructive lock, the quiet default. */
export const Variants = () => (
  <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
    <Button variant="cy"><Icon name="unlock" />Разблокировать</Button>
    <Button variant="red"><Icon name="lock" />Заблокировать · Lost Mode</Button>
    <Button variant="ghost">Отмена</Button>
  </div>
);

/** Device commands sit side by side under the lock action. */
export const WithIcons = () => (
  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
    <Button variant="ghost"><Icon name="locate" />Найти</Button>
    <Button variant="ghost"><Icon name="sound" />Звук</Button>
    <Button variant="ghost"><Icon name="check" />Проверить supervision</Button>
  </div>
);

/** Disabled until the operator confirms payment was received. */
export const Disabled = () => (
  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
    <Button variant="cy" disabled><Icon name="unlock" />Разблокировать</Button>
    <Button variant="red" disabled>Заблокировать</Button>
    <Button variant="ghost" disabled>Отмена</Button>
  </div>
);

/** Full-width in the device action panel. */
export const Block = () => (
  <div style={{ display: "flex", flexDirection: "column", gap: 8, maxWidth: 280 }}>
    <Button variant="red" block><Icon name="lock" />Заблокировать · Lost Mode</Button>
    <Button variant="ghost" block><Icon name="locate" />Найти устройство</Button>
  </div>
);

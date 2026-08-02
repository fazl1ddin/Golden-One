---
category: Overlays
---

# Modal

The confirmation dialog. In this product it guards the two consequential actions — locking a customer's device and unlocking it.

```tsx
<Modal icon="lock" tone="red"
  title="Заблокировать устройство?"
  subtitle="iPhone перейдёт в Lost Mode · Дилшод Рахимов"
  onClose={close}
  footer={<><Button variant="ghost" onClick={close}>Отмена</Button>
            <Button variant="red" onClick={confirm}><Icon name="lock" />Заблокировать</Button></>}>
  <Warn>Клиент не сможет пользоваться телефоном…</Warn>
</Modal>
```

`tone` colours the header icon to match the stakes (`red` destructive, `green` restorative, `cy` neutral). The overlay closes on backdrop click and scrolls when the dialog is taller than the viewport.

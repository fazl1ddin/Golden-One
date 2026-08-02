---
category: Actions
---

# Button

The system's action control, in three deliberate variants:

- `cy` — the affirmative action (unlock, save, register). Cyan gradient.
- `red` — the destructive action (lock a customer's device). Never use it for anything reversible-by-default.
- `ghost` — everything else: cancel, secondary device commands.

```tsx
<Button variant="red"><Icon name="lock" />Заблокировать · Lost Mode</Button>
<Button variant="ghost" onClick={onCancel}>Отмена</Button>
```

`block` stretches to the container — used in the device action panel where commands stack vertically.

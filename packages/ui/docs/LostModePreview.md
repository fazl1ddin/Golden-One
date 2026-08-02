---
category: Device control
---

# LostModePreview

A faithful preview of the lock screen the customer will see on the seized iPhone. Shown live inside the lock dialog while the operator edits the message, so nobody sends a message they have not read.

```tsx
<LostModePreview
  title="Устройство заблокировано"
  message="Устройство заблокировано в связи с просрочкой платежа. Для разблокировки обратитесь в Golden One."
  phone="+998 71 200-00-00"
/>
```

The phone number renders in the monospace face and accent colour — it is the one thing the customer must be able to read at a glance. Keep the message short and actionable, and localise it to the customer's language.

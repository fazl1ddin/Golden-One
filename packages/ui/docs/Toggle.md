---
category: Actions
---

# Toggle

A binary switch for settings. Controlled: pass `on` and handle `onToggle` yourself.

```tsx
<Toggle on={dark} onToggle={() => setDark(v => !v)} />
```

Exposes `role="switch"` with `aria-checked`. For anything destructive, prefer an explicit confirm dialog over a toggle.

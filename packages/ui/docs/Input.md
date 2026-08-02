---
category: Forms
---

# Input

Single-line text field. A thin wrapper over `<input>` — every native prop passes through, including `type`, `placeholder`, `defaultValue` and handlers.

```tsx
<Input placeholder="+998 __ ___-__-__" />
<Input className="go-mono" defaultValue="GO-2026-0001" />
```

Add `go-mono` for identifiers (IMEI, serial, contract number, phone) so digits align.

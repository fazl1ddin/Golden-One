---
category: Data
---

# Field

A label/value row for record detail. Stack several inside a `Panel` to form a specification block — device info, loan terms.

```tsx
<Field label="IMEI" value={<span className="go-mono">356728111234567</span>} />
```

Values are right-aligned; use it for read-only facts, not for editing.

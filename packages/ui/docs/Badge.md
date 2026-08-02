---
category: Status
---

# Badge

The system's status pill. Colour carries meaning and is **semantic, not decorative**:

- `green` — healthy: an active contract, an unlocked device.
- `amber` — needs attention soon: pending enrollment.
- `red` — overdue, or a device currently in Lost Mode.
- `steel` — informational: MDM enrollment state.
- `gray` — inactive/closed: a paid-off contract, a released device.

```tsx
<Badge tone="red">LOCK</Badge>
<Badge tone="green">Активен</Badge>
```

The leading dot is on by default; `dot={false}` for a label-only pill.

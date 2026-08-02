---
category: Actions
---

# Chip

A compact filter toggle. Used above tables to narrow a list; `active` marks the current filter.

```tsx
<Chip active={filter === "overdue"} onClick={() => setFilter("overdue")}>Просрочка</Chip>
```

Chips are for filtering a view, not for selecting data — use them in a horizontal row.

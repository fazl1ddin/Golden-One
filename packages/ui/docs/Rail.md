---
category: Layout
---

# Rail

The full-height icon navigation on the left of the shell. Each item is an icon over a short label; `badge` puts a red count on an item that needs attention (overdue devices).

```tsx
<Rail
  items={[{ id: "dashboard", label: "Дашборд", icon: "dash" },
          { id: "devices", label: "Устройства", icon: "devices", badge: 18 }]}
  active={route}
  onSelect={setRoute}
  footer={<Avatar />}
/>
```

Keep the item count small — the rail is for top-level destinations only.

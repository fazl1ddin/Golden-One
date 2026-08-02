---
category: Data
---

# KpiCard

A single headline number with a status stripe down its left edge. A row of four opens the dashboard.

```tsx
<KpiCard label="Просрочка" value={18} sub="> 3 дней" tone="amber" />
```

`tone` encodes severity (`steel` neutral, `green` healthy, `amber` attention, `red` critical) so a problem reads at a glance without reading the number. Values render in tabular figures so a row of cards stays aligned.

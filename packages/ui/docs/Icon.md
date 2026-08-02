---
category: Foundations
---

# Icon

The system's icon set, drawn as stroked 24×24 SVG paths that inherit `currentColor` and the surrounding stroke width.

Names: `dash`, `devices`, `enroll`, `audit`, `settings`, `lock`, `unlock`, `locate`, `sound`, `check`, `warn`, `search`, `moon`.

```tsx
<Icon name="lock" />
<Icon name="locate" width={16} height={16} />
```

Icons sized inside `Button` and `Badge` automatically; set `width`/`height` only when standing alone.

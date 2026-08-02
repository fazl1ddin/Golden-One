---
category: Layout
---

# Topbar

The shell's header. Five slots: `title`, `crumb` (who is acting and in what context), `search`, `live` (connection state), and `right` (language, theme).

```tsx
<Topbar
  title="Дашборд"
  crumb="Взыскание · Оператор: Азиз Каримов"
  search={<SearchInput />}
  live={<LiveIndicator>MDM online · Mosyle</LiveIndicator>}
  right={<><LangSwitch … /><ThemeButton … /></>}
/>
```

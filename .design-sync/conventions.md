## How to build with Golden One

This is the design system for **Golden One** — a credit organization that finances iPhones and remotely
locks them (Apple MDM Lost Mode) when a loan goes overdue. Screens are dense operator consoles: an icon
rail, a topbar, panels of tabular data. Dark by default.

### 1. Wrap every screen in `ThemeProvider` — nothing is styled without it

The tokens live on `:root`, but the **font stack and surface background live on `.go-app`**, which
`ThemeProvider` renders. Skip it and your screen renders on the browser's white background in a serif
face, with every component still individually coloured — a subtly broken result that is easy to miss.

```jsx
<ThemeProvider theme="dark">        {/* "light" is supported and correctly scoped */}
  <div style={{ display: "grid", gridTemplateColumns: "78px 1fr", minHeight: "100vh" }}>
    <Rail items={nav} active={route} onSelect={setRoute} />
    <div>
      <Topbar title="Дашборд" crumb="Взыскание · Оператор: Азиз Каримов"
              live={<LiveIndicator>MDM online · Mosyle</LiveIndicator>} />
      <main style={{ padding: "16px 22px" }}>…</main>
    </div>
  </div>
</ThemeProvider>
```

Add `padded` for an isolated surface; leave it off for a full-bleed shell. `Rail` sets no width of its
own — the `78px` track comes from your grid.

### 2. The styling idiom: components first, then `go-` utility classes, then tokens

There is **no utility framework here** — no Tailwind, no `sx` prop, no styled-components. Style in this order:

1. **Use a component.** 23 exist; prefer them over hand-rolled markup.
2. **Apply a `go-` utility class** for the text and number treatments the components don't own. These are
   real, load-bearing classes — use these exact names:

   | Class | Use |
   |---|---|
   | `go-mono` | any identifier or figure — IMEI, serial, contract number, phone, money. Applies the mono face and tabular figures so columns line up. |
   | `go-cn` / `go-cm` | a table row's primary text / its muted secondary line |
   | `go-over`, `go-over--hi` | the days-overdue accent (amber, red past 20 days) |
   | `go-link` | an inline text action in a panel header |
   | `go-feed`, `go-ev`, `go-ev__ico`, `go-ev__t`, `go-ev__time` | an activity/event feed row |

3. **Reach for a token** in `style` for your own layout glue — never a raw hex. Surfaces:
   `--go-bg`, `--go-panel`, `--go-panel-2`, `--go-panel-3`; lines: `--go-border`, `--go-border-2`;
   text: `--go-text`, `--go-muted`, `--go-faint`; accent: `--go-cy` (`--go-cy-dim`, `--go-cy-soft`);
   status: `--go-green`, `--go-amber`, `--go-red`, `--go-steel`, each with a `-soft` background pair;
   plus `--go-radius`, `--go-radius-sm`, `--go-shadow`, `--go-font`, `--go-mono`.

**Status colour is semantic, never decorative.** `green` = healthy (active contract, unlocked device),
`amber` = needs attention, `red` = overdue or a device in Lost Mode, `steel` = informational,
`gray` = closed/inactive. `Badge` and `KpiCard` both take these as a `tone`.

Spacing is tight — this is an operator tool, not a marketing page. Panels use `12–16px` internal padding,
grids `12–14px` gaps, page content `16px 22px`.

### 3. Where the truth is

Read `_ds/<folder>/styles.css` and its `@import` closure for the full token and class vocabulary before
inventing anything, and the per-component `<Name>.prompt.md` for that component's real API and idiom.
Those files are authoritative; this page is the summary.

### 4. A representative screen fragment

```jsx
<Panel>
  <PanelHeader title="Очередь взыскания" count={18}
               action={<button className="go-link">Все →</button>} />
  <DataTable
    rows={devices}
    rowKey={d => d.id}
    onRowClick={openDevice}
    columns={[
      { key: "cust", header: "Клиент", render: d => (
          <div><div className="go-cn">{d.name}</div>
               <div className="go-cm go-mono">{d.contract}</div></div>) },
      { key: "imei", header: "IMEI", render: d => <span className="go-mono go-cm">{d.imei}</span> },
      { key: "days", header: "Просрочка", render: d => (
          <span className={`go-over go-mono${d.days >= 20 ? " go-over--hi" : ""}`}>{d.days}д</span>) },
      { key: "lock", header: "Блок", render: d => (
          <Badge tone={d.locked ? "red" : "green"}>{d.locked ? "LOCK" : "off"}</Badge>) },
    ]}
  />
</Panel>
```

Interface copy is Russian, with Uzbek as the second locale. Write real domain content — customer names,
`GO-2024-0417` contract numbers, IMEIs, so'm amounts — never placeholder text.

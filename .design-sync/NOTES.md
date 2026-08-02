# design-sync notes — @golden-one/ui (Golden One "Console" design system)

Repo-specific gotchas for future syncs. Read this before anything else.

## Build / environment
- Monorepo with npm workspaces. `react`/`react-dom`/`@types/react` are **hoisted to the repo root**
  `node_modules` — `packages/ui/node_modules` does not exist. Always pass `--node-modules ./node_modules`
  (repo root) and `--entry ./packages/ui/dist/golden-one-ui.js`; the converter walks up from the entry to
  find `packages/ui/package.json`, so `PKG_DIR` and package-relative config paths still resolve correctly.
- Build the DS first: `cd packages/ui && npm run build` (Vite lib mode + `tsc` for types). Vite emits the
  stylesheet as `dist/style.css` (NOT `golden-one-ui.css`) — that's what `cfg.cssEntry` points at.
- Playwright is preinstalled globally (`/opt/node22/lib/node_modules/playwright`, v1.56.1) and chromium is
  cached at `/opt/pw-browsers/chromium-1194` — the versions match, so **never run `playwright install`**.
  The staged `.ds-sync/` installs its own `playwright@1.56.1` with `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1`.

## Calibration findings (first sync) — all fixed, keep them in mind
- **`cfg.provider` is mandatory for this DS.** Tokens live on `:root` so colors worked, but the base
  font stack and surface background live on `.go-app`. Without a wrapper every preview rendered on a
  **white background in a serif font**. Fixed by adding a real `ThemeProvider` component to the library
  (`packages/ui/src/components/ThemeProvider.tsx`) and setting
  `cfg.provider = {component: "ThemeProvider", props: {theme: "dark", padded: true}}`.
  Subagents authoring previews do **not** wrap anything themselves — the provider is applied globally.
- **Overlay components need a containing block in previews.** `Modal` uses `position: fixed`, which in a
  preview card either escapes the card or collapses it to zero height. The fix is *composition, not API*:
  wrap the story in a `<div style={{position:"relative", height:N, transform:"translateZ(0)"}}>` — a
  `transform` makes the ancestor the containing block for fixed descendants. See
  `.design-sync/previews/Modal.tsx` (`Stage` helper) for the canonical pattern.
- **A real CSS bug surfaced during calibration and was fixed in the library**: `.go-overlay` used
  `display:grid; place-items:center`, which clips a dialog taller than the viewport (its header becomes
  unreachable). Now `display:flex; overflow:auto` + `.go-modal { margin:auto }` — centers without clipping.
- **`[FONT_MISSING] Roboto Mono` was resolved by removing the font**, not by shipping it. It was a late
  fallback inside an otherwise system monospace stack (`'SF Mono', ui-monospace, Menlo, Consolas,
  monospace`) and was never a brand font. Nothing to source; do not re-add it.

## Conventions for authoring previews here
- Import from `"@golden-one/ui"`. Content must be **real domain content in Russian** (device financing /
  collections: customer names, IMEIs, contract numbers `GO-YYYY-NNNN`, sums in Uzbek so'm) — never
  `foo`/`test`. Uzbek copy is legitimate for i18n-facing stories.
- Icons: `<Icon name="..." />`; valid names are the `IconName` union in `dist/components/icons.d.ts`
  (dash, devices, enroll, audit, settings, lock, unlock, locate, sound, check, warn, search, moon).
- Wide components (`DataTable`, `Topbar`, `Rail`) and tall ones (`Modal`) get
  `cfg.overrides.<Name>.cardMode` — that's an **orchestrator-only** config edit; subagents report the need
  in their learnings file instead of editing config.

## Library defects the preview campaign surfaced (all fixed — do not reintroduce)
Authoring previews exercised the components outside the app's own composition, which exposed four real
bugs. Each reproduced in the shipping app, not just in the cards:
1. **`Input` / `Select` / `Textarea` dropped their base class.** Native props were spread *after*
   `className`, so any caller-supplied class replaced `go-input`/`go-select`/`go-textarea` and the control
   fell back to a native white box. Hit five real fields (contract/serial/IMEI in enrollment, phone in
   settings and in the lock dialog). Fixed by destructuring `className` out before the spread.
2. **`ThemeButton` painted white on the dark surface.** `.go-seg` reset the UA button colours only on its
   *descendants*, but `ThemeButton` renders `<button class="go-seg">` — it *is* the element. Fixed by
   putting `background:none; color:var(--go-muted)` on `.go-seg` itself (`.go-seg button` still wins for
   the segmented `LangSwitch`).
3. **`Icon` had no intrinsic size.** A bare `<svg viewBox>` with sizing only from parent selectors
   (`.go-btn svg`, `.go-warn svg`, …) renders at the 300×150 replaced-element default when used standalone.
   Fixed with `width="1em" height="1em"` presentation attributes — CSS still wins wherever a parent sizes it.
4. **`<ThemeProvider theme="light">` did nothing when nested.** Light tokens lived only under
   `:root[data-theme="light"]`, and React runs child effects before parent effects, so the outer dark
   provider always won. Fixed by also scoping the light token block (and the `.go-rail` light rule) to
   `.go-app[data-theme="light"]` and stamping `data-theme` on the provider's own element.

## Authoring conventions that worked (from the preview campaign)
- **Preview cards are ~460px of usable width** at the default row `cardMode`. Hand-rolled compositions
  need `maxWidth` ≈ 400–560 and `flexShrink:0` on title blocks, or Cyrillic headings wrap to three lines.
- **`Rail` sets no width of its own** — the 78px track comes from the app's grid. Stories must supply
  height *and* track: `<div style={{height:420, display:"grid", gridTemplateColumns:"78px"}}>`.
- **`.go-top` is a single non-wrapping flex row with no `flex-shrink:0`.** At a 900px capture viewport the
  right cluster slides under the search field. Stories budget the search slot (`flex:0 1 200–260px`) and
  wrap `LiveIndicator` in a `nowrap; flex-shrink:0` span. A future DS improvement would be to bake that
  budgeting into `.go-top` itself.
- **`.go-seg` is `display:flex`**, so a standalone `LangSwitch` stretches to its parent's full width —
  wrap it in `width:max-content` outside the topbar.
- **`Panel` supplies no padding** and is `overflow:hidden`; free-form content brings its own
  (`16px 18px` is the in-app value). Tables and `Field` stacks are meant to sit edge-to-edge.
- **`Textarea` `rows` below 3 is a no-op** under `.go-textarea { min-height:60px }` — a sizes story must
  vary from `rows={3}` upward.
- **Load-bearing utility classes that are CSS-only, not components**: `.go-cn` (row primary text),
  `.go-cm` (secondary/muted), `.go-mono`, `.go-over` / `.go-over--hi` (days-overdue accent, flips at 20
  days), `.go-link`, `.go-feed` / `.go-ev*`. Previews and product screens apply them by hand.
- **`Badge dot={false}`** is the "this is a tag, not a live state" signal (used for `API` / provider names).
- Story content is ported from `web/src/api.ts` (seed customers, contracts, IMEIs) and `web/src/i18n.ts`
  (RU + UZ label tables) so the cards show the strings the product actually ships.

## Known render warns (triaged, expected — not new)
- `[DTS_STYLE_SYSTEM] filtering @types/react props` — informational; the DS's own props are unaffected
  (verified: `ButtonProps`, `BadgeTone`, `KpiTone` etc. all extract correctly).

## Re-sync risks (what can silently go stale)
- `cfg.provider` points at `ThemeProvider`. If that export is ever renamed or removed from
  `packages/ui/src/index.ts`, **every preview silently loses its surface and font** (white + serif) and the
  build only prints a `[PROVIDER_UNEXPORTED]`/`[PROVIDER_UNVERIFIED]` line. Check that first if cards look wrong.
- `cfg.cssEntry: "dist/style.css"` depends on Vite's default CSS output name. A Vite config change
  (`build.lib.fileName`, `cssFileName`, or `cssCodeSplit`) can rename it → `[CSS_PLACEHOLDER]`.
- The `Stage` containing-block trick in `Modal.tsx` is preview-local. If `.go-overlay` stops being
  `position: fixed`, the wrapper becomes unnecessary but harmless.
- Component groups come from `packages/ui/docs/<Name>.md` frontmatter `category:`. A new component with no
  doc file lands in `general` and gets a synthesized `.prompt.md` — add a doc when adding a component.
- **`cfg.dtsPropsFor.DataTable` is a hand-written props body.** The extractor flattens the component's
  generic, emitting a `DataTableProps` that references an undefined `T` — a contract the design agent
  cannot code against. The override inlines the column shape with `any` rows. If `DataTable`'s real props
  change, this body must be updated by hand; the docs (`packages/ui/docs/DataTable.md`) carry the properly
  typed `Column<Device>[]` idiom for the agent.
- **`cfg.overrides` viewports are load-bearing, not cosmetic.** `Topbar` needs `1280x420` (at the default
  900px its right cluster overlaps the search slot) and `Modal`/`DataTable` need `cardMode: "column"`.
  Note `cardMode: "column"` alone does not change *graded* sheets — capture drives each cell through
  `?story=` at the override's viewport, so the viewport is the knob that matters.
- **`Modal` previews depend on a `Stage` containing-block helper** (`transform: translateZ(0)`), which is
  preview-local. It stays correct as long as `.go-overlay` is `position: fixed`.
- Only 3 of 23 components were graded by the orchestrator directly; the other 20 were authored and graded
  by four parallel subagents whose scope was verified with `git status` after the wave. Grades live in the
  gitignored `.cache/`; the durable proof is the uploaded `_ds_sync.json`.
- **`concepts/01-vault.html`, `02-daylight.html`, `03-console.html` in the Claude Design project are NOT
  produced by this build and must not be deleted as stale output.** They are the three hand-authored
  design directions the user reviewed before choosing "Console"; local copies live in `design-concepts/`.
  A future re-sync's diff cannot see their provenance — leave them out of `deletePaths` unless the user
  asks for them to go. The project also carries app-generated `_adherence.oxlintrc.json` and
  `_ds_manifest.json`, which the self-check regenerates on open; never upload or delete those by hand.
- This project is **pinned in `config.json`, so every future run takes the atomic upload path** (verify
  everything, then upload in one pass at the end) — not the incremental path.

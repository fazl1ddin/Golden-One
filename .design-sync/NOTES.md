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

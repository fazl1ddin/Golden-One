---
category: Foundations
---

# ThemeProvider

Root wrapper for every Golden One screen. Applies the surface background, the base font stack, and activates the light/dark token set by stamping `data-theme` on the document root.

**Every design built with this system must be wrapped in it.** Without it, components render on the browser's default white background in a serif face — the tokens live on `:root`, but the font and surface live on `.go-app`.

```tsx
<ThemeProvider theme="dark">
  <YourScreen />
</ThemeProvider>
```

Use `padded` for an isolated surface (a card, a preview); leave it off for a full-bleed app shell.

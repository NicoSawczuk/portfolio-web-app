# Visual / Theming

> Source of truth for the PortfolioWebApp visual system.
> If any other doc or legacy code contradicts this document, this document wins;
> code must be migrated toward it, not the other way around.

Base guide for the visual system in effect since commit `7277e50` ("Add improvements and theme picker").
It defines how the app looks, where each style lives, and how to add new UI without breaking the themes.

## 1. Visual system files

| File | Role |
|---|---|
| `src/app/layout.tsx` | Defines `<html data-theme="dark">`, `suppressHydrationWarning`, the pre-hydration inline script, and mounts `ThemeProvider`. |
| `src/components/ThemeProvider.tsx` | Theme state, persistence, OS fallback. Exposes `useTheme()`. |
| `src/components/ThemeToggle.tsx` | Header sun/moon button. Uses `useSyncExternalStore` to avoid hydration mismatches. |
| `src/app/globals.css` | Global tokens (`--background`, `--surface`, `--accent`, ...), header/nav/logo classes, and per-theme **Tailwind remaps** (`[data-theme="light"] ...`, `[data-theme="dark"] ...`). Imports `portfolio-ui.css`. |
| `src/app/portfolio-ui.css` | Reusable component system (`.page`, `.card`, `.button`, `.portfolio-*`, `.home-*`, `.asset-detail-*`, `.modal`, ...). New UI is composed here. |
| `src/components/SidebarNav.tsx` | The actual header: uses `.app-header`, `.header-button`, `.nav-link`, `.nav-link--active`, `.mobile-menu`, `.theme-logo--dark/light` + `ThemeToggle`. |
| `src/components/PortfolioMetricCard.tsx` | Migration example: uses `.metric-value`, `.metric-value--positive/--negative` instead of `dark:` variants. |

## 2. What changed in `7277e50`

1. **Dark "Slate & Indigo" palette** (previously blue/sky):
   - Accent `#3b82f6` / `#0ea5e9` / `sky-*` → `#6366f1` (indigo), hover `#818cf8`.
   - Backgrounds `#070d1c` / `#0e172a` / `#111c30` → `#080d1a` / `#0f172a` / `#162033`, hover `#1e293b`.
   - Borders `#334155` / `slate-700` → `#26344d`, hover `#3b4d6b`.
   - Gain `#22c55e` → `#10b981` (dark) / `#059669` (light); loss `#f87171` → `#f43f5e` (dark) / `#dc2626` (light).
   - Sky/blue focus/shadows → `rgb(129 140 248 / 0.65)` and `rgb(99 102 241 / 0.35)`.
2. **Real light/dark theme picker**:
   - The theme lives in `<html data-theme>` (`"light" | "dark"`, default `"dark"`).
   - `localStorage` key `portfolio-theme`; when empty, `prefers-color-scheme: light` is used and OS changes are followed live until the user picks a theme.
   - Inline script in `layout.tsx` applies the theme **before hydration** (prevents flash).
   - Logo no longer uses `<picture media="(prefers-color-scheme)">`; it uses two `<img>` tags with `.theme-logo--dark` / `.theme-logo--light` controlled by `data-theme`.
3. **De-hardcoded header**: `SidebarNav` drops raw hex values (`bg-[#0b1220]`, `border-slate-700`, ...) in favor of `.app-header`, `.header-button`, `.nav-link`, `.mobile-menu`.
4. **Two-layer Light Mode** (see §6):
   - Variables in `:root[data-theme="light"]` in both CSS files.
   - Remap of dark-hardcoded Tailwind utilities inside `globals.css` (`[data-theme="light"] .text-slate-100 { ... }`, etc.).
   - Second light iteration in `portfolio-ui.css`: more compact hero/home/donuts/asset-detail with fewer "gray boxes".
5. **New `asset-detail-*` layout**: asset page with no card on the header (back link + title directly on the background), summary in a single flat block with subtle separators, and transactions as the only standalone container below; `PortfolioTransactionsTable` accepts `sectionClassName` for this (`asset-tx-section`).
6. **Small fixes included**: `TransactionsImportPanel` prevents overflow (`min-w-0 max-w-full`, `break-all`); global `min-width: 0` rule on `.page-container`/`.card-*` children; `select.control { max-width: 100% }`.

## 3. How theming works (contract)

```text
layout.tsx (pre-hydration inline script)
  -> reads localStorage "portfolio-theme" or prefers-color-scheme
  -> sets <html data-theme + colorScheme>
  -> React hydrates with ThemeProvider (lazy init reads the same source)
  -> ThemeProvider applies data-theme on every change and persists it
  -> ThemeToggle calls toggleTheme()
  -> CSS reacts via :root[data-theme="..."] and [data-theme="..."] ...
```

Contract rules:

- Source of truth: `document.documentElement.dataset.theme`.
- Default: `"dark"`. Bare `:root` also renders dark (fallback).
- `color-scheme` is set together with the theme (scrollbars, native inputs).
- Never read `prefers-color-scheme` in CSS for branding decisions; use `data-theme`. The `<picture media>` logo is forbidden for this reason.

## 4. Tokens (never hardcode)

### `globals.css` — shell + header

| Token | Dark | Light | Usage |
|---|---|---|---|
| `--background` | `#080d1a` | `#f5f7fb` | page background |
| `--foreground` | `#f8fafc` | `#0f172a` | base text |
| `--surface` | `#0f172a` | `#ffffff` | header, mobile-menu |
| `--surface-strong` | `#162033` | `#f8fafc` | header buttons, one-off controls |
| `--surface-hover` | `#1e293b` | `#e2e8f0` | hover |
| `--border` | `#26344d` | `#dbe3ee` | borders |
| `--border-hover` | `#3b4d6b` | `#a5b4fc` | border hover |
| `--muted` / `--muted-strong` | `#94a3b8` / `#64748b` | `#475569` / `#64748b` | secondary text |
| `--accent` / `--accent-hover` | `#6366f1` / `#818cf8` | `#4f46e5` / `#4338ca` | primary, active nav |
| `--accent-soft` | `rgba(99,102,241,0.14)` | `rgba(79,70,229,0.1)` | sky→indigo chips |
| `--success` / `--danger` | `#10b981` / `#f43f5e` | `#059669` / `#dc2626` | gains/losses |
| `--header-bg` | `rgb(8 13 26 / 0.9)` | `rgb(255 255 255 / 0.9)` | translucent header |

### `portfolio-ui.css` — content

| Token | Dark | Light | Usage |
|---|---|---|---|
| `--portfolio-page-background` | `#080d1a` | `#f5f7fb` | `.page`, `.portfolio-page` |
| `--portfolio-surface` | `#0f172a` | `#ffffff` | `.card`, panels |
| `--portfolio-surface-strong` | `#162033` | `#f8fafc` | `.card-item`, controls |
| `--portfolio-surface-action` | `#162033` | `#ffffff` | `.modal` |
| `--portfolio-surface-hover` | `#1e293b` | `#e2e8f0` | card hover |
| `--portfolio-border` / `-hover` | `#26344d` / `#3b4d6b` | `#dbe3ee` / `#a5b4fc` | borders |
| `--portfolio-text` / `-muted` / `-subtle` | `#f8fafc` / `#cbd5e1` / `#64748b` | `#0f172a` / `#475569` / `#64748b` | text |
| `--portfolio-accent` / `-hover` | `#6366f1` / `#818cf8` | `#4f46e5` / `#4338ca` | buttons, segmented, eyebrow |
| `--gain-positive` / `--gain-negative` | `#10b981` / `#f43f5e` | `#059669` / `#dc2626` | `.metric-value--*`, `.home-value-*` |

## 5. Color and surface rules (normative)

Color semantics — no exceptions except an asset's own identity:

- **Indigo = primary interaction**: active navigation (`.nav-link--active`), primary buttons (`.button-primary`), selected tabs (`.segmented-button--active`, `.auth-mode-button--active`, `.home-currency-switch-btn--active`), links, and active states. Dark `#6366f1` / hover `#818cf8`; light `#4f46e5` / hover `#4338ca`.
- **Green = gains/success only**: `.metric-value--positive`, `.home-value-positive`, `.asset-detail-metric--up`, `.alert-success`, `--live` badges. Never as a general UI color.
- **Red = losses/error only**: `.metric-value--negative`, `.home-value-negative`, `.asset-detail-metric--down`, `.alert-error`, `.portfolio-status-error`, delete action. Never as decoration.
- **Asset's own identity**: colors with semantic value are preserved (e.g. Bitcoin orange, per-symbol `asset-detail-dot`). Do not force them into indigo/green/red.
- **Forbidden**: gain green as a general interface color; indigo as a general card background.

Surface hierarchy (in this order, outside-in):

```text
background (page) → surface (card/panel) → surface-strong/internal (card-item, controls) → hover
```

- Dark: `#080d1a` → `#0f172a` → `#162033` → `#1e293b`.
- Light: `#f5f7fb` → `#ffffff` → `#f8fafc` / `#eef2f7` (one-off controls) → `#e2e8f0`.
- Build hierarchy with **surfaces and spacing before strong colors**.
- Avoid excess borders and nested cards: prefer one container + subtle separators (`border-top: 1px solid var(--portfolio-border)`, see `.asset-detail-secondary`) over card-inside-card.

Active vs focus — independent states:

- **Active** = indigo background + white text, no borders or outlines (`.nav-link--active` carries neither `border` nor `outline`).
- **Focus** = subtle indigo `outline` only (`rgb(129 140 248 / 0.65)` on dark, `rgb(99 102 241 / 0.55)` on light) + `outline-offset: 2px`. It must also be visible on the active item.
- Focus must never produce borders that look like the active state (do not use `border-color` as a focus indicator).

## 6. The two theming layers (understand before touching)

- **Layer 1 — new components**: use variables (`var(--portfolio-*)`, `var(--accent)`, ...) or system classes (`.card`, `.button-primary`, ...). They work in both themes with no overrides.
- **Layer 2 — hardcoded legacy**: many old components carry dark-written `bg-[#111c30]`, `text-slate-300`, `text-sky-400`, `border-slate-700`, `divide-slate-800`, etc. They were not all rewritten; `globals.css` **remaps** them under `[data-theme="light"]` (and some under `[data-theme="dark"]` for the sky→indigo shift).

Consequence: adding a dark-hardcoded Tailwind utility that is not in the remap list will look broken in light. Always prefer Layer 1.

## 7. Reusable classes (use these, don't reinvent)

```text
Layout:      .page > .page-container  (or .portfolio-page > .portfolio-shell)
Card:        .card (+ .card-header / .card-content / .card-title / .card-description)
             .card--panel, .card-item, .card-content--list
Buttons:     .button .button-primary | .button-secondary  (portfolio-* aliases: .portfolio-button-*)
Controls:    .control, .segmented-control > .segmented-button(--active)
Header:      .app-header, .header-button, .nav-link(--active), .mobile-menu
             .theme-logo--dark / .theme-logo--light
Metrics:     .metric-value(--positive/--negative), .home-value-positive/negative/neutral
Home:        .home-hero-card, .home-hero-value/sub/side/mini, .home-donut-*, .home-gain-*
Assets:      .assets-* (toolbar, search, rows, badges, pagination)
Detail:      .portfolio-detail-* + .asset-detail-* (top/back/heading/summary/primary/secondary)
Modal/auth:  .modal(-backdrop/-narrow/-header/-form/-actions), .auth-*, .alert-error/success
```

asset-detail pattern (reference, see `PortfolioV3AssetDetailClient.tsx`):

```tsx
<div className="page page-container portfolio-detail-page asset-detail-page">
  <div className="asset-detail-top">
    <Link className="asset-detail-back" href={...}>← Volver</Link> {/* app UI copy is Spanish */}
    <div className="asset-detail-heading">
      <span className="asset-detail-dot" style={{ background: color }} />
      <h1 className="asset-detail-name">...</h1>
      <p className="asset-detail-symbol">...</p>
    </div>
  </div>
  <section className="card asset-detail-summary">...</section>
  <PortfolioTransactionsTable sectionClassName="asset-tx-section" ... />
</div>
```

## 8. Responsive (same system on desktop and mobile)

Light and Dark share a single color system. Responsive may change
layout, distribution, and information density, but it **never creates a
different color system**: there is no mobile palette and no color overrides
per breakpoint (except already-documented density tweaks, e.g. compact light hero/donuts).

Mobile priorities:

1. **Fewer nested cards**: one container card + inner separators
   (`asset-detail-*` pattern: header on the background, one summary, transactions
   as the single container below). Avoid card-inside-card-inside-card.
2. **Simple surfaces**: one surface level per block; hierarchy comes from
   spacing plus a subtle border, not another background.
3. **2-column grids** for secondary metrics/data where appropriate
   (see mobile `.asset-detail-primary` and `.asset-detail-secondary`: full-width
   current value + gain/return in 2 columns; secondary grid in 2 columns).
4. **Horizontal scroll** for tables that don't compress well, instead of breaking
   columns or shrinking text to illegibility.
5. **Keep the data visual hierarchy**: the primary datum (current value, gain)
   keeps its protagonist size/weight; secondary content compacts first.
6. **Stacked toolbar**: in sections with search + filters + button (e.g.
   mobile `.asset-tx-section`), search goes full-width with filters in a row
   below; the action button stays aligned with the title.

Technical rules already in force (do not remove):

- `min-width: 0` on `.page-container` / `.card-content--list` / `.card-item` / `.card-header > *` children.
- `select.control { max-width: 100% }`; long text with `overflow-wrap: anywhere` or `break-all`.
- Bottom-sheet modals on mobile with sticky actions (see `@media (max-width: 639px)` in `portfolio-ui.css`).
- `16px` inputs on mobile/modals to avoid iOS auto-zoom.

## 9. How to build visual work in future development

1. **Compose, don't invent**: build pages with `.page/.card/.button/.control` and existing `home-*/assets-*/portfolio-detail-*` sections. Only create new classes in `portfolio-ui.css` when none covers the case.
2. **Colors by variable only**: never `bg-[#...]`, `text-slate-*`, `text-sky-*`, `border-slate-*` in new code. Use variables or system classes.
3. **Metrics with `.metric-value--*`**: no `text-emerald-600 dark:text-emerald-400` or `dark:` variants (the project doesn't use `dark:` for themes; the theme is `data-theme`).
4. **Header/nav**: reuse `.app-header/.header-button/.nav-link/.nav-link--active`. Active state is indigo background + white text only, no borders.
5. **Indigo visible focus**: `outline: 2px solid rgb(129 140 248 / 0.65); outline-offset: 2px;` (light: `rgb(99 102 241 / 0.55)`).
6. **If hardcoding Tailwind is unavoidable** (legacy): add the matching remap in `globals.css` under `[data-theme="light"]` (and `[data-theme="dark"]` for the sky→indigo shift). Without the remap, light stays broken.
7. **Tailwind v4 `divide-*`**: generates `:where(& > :not(:last-child))`, not the v3 `~`. The override must be `[data-theme="light"] .divide-slate-800 > :not(:last-child) { border-color: ... }` to also cover the first row.
8. **Tables in light**: `thead` with no background band; separate with `border-bottom: 1px solid #dbe3ee` on `th`.
9. **White text on accent**: keep `#fff` explicit (exceptions exist in `globals.css` for `.bg-[#3b82f6]` / `.nav-link--active` / primary buttons).
10. **Mobile overflow**: flex/grid containers already have `min-width: 0`; don't remove it. Selects with `max-width: 100%`, filenames with `break-all`.
11. **Logo**: two `<img>` tags with `.theme-logo--dark/light`, never `<picture media="(prefers-color-scheme)">`.
12. **Toggle**: reuse `ThemeToggle` with `className="header-button ..."`; don't build another theme switch.
13. **Responsive with the same system**: changing mobile layout/density is fine;
    creating color variants per breakpoint or per inverted theme is not (§8).

## 10. Rules for future changes (tokens and consistency)

1. **Don't create new colors inside components when an equivalent token exists.**
   Before writing any `#[hex]`, `rgb(...)`, or color utility, check §4
   and reuse the existing variable.
2. **Every new color must justify its semantic purpose**: is it interaction,
   gain, loss, asset identity, or surface/text? If it doesn't fit the §5
   semantics, it probably shouldn't exist.
3. **If a color is reused in more than one component, promote it to a token**:
   define it in `:root` + `:root[data-theme="dark"]` + `[data-theme="light"]`
   (in whichever files apply, see §11) instead of repeating it.
4. **Never change Light and Dark independently**: every color, surface, or state
   change must be defined and reviewed in both themes at once.
   Verify the toggle before calling the change done.
5. **Respect §5 when modifying**: don't recycle green/red outside their semantics,
   don't use indigo as a card background, don't make active and focus look alike,
   don't nest cards to "create hierarchy".

## 11. Where tokens live and what to change

| What I want to change | File and location | Notes |
|---|---|---|
| **Shell** background/text/border/accent (body, header, nav, logo) | `src/app/globals.css`, `:root`, `:root[data-theme="dark"]`, `:root[data-theme="light"]` blocks (tokens `--background`, `--foreground`, `--surface*`, `--border*`, `--muted*`, `--accent*`, `--success`, `--danger`, `--header-bg`) | Gains specificity via `[data-theme="..."]`; never use `!important`. |
| **Content** background/text/border/accent (cards, buttons, home, assets, modals) | `src/app/portfolio-ui.css`, `:root` and `[data-theme="light"]` blocks (tokens `--portfolio-*`, `--gain-*`) | Dark lives in `:root`; light overrides it below. |
| Gain/loss metrics | `--gain-positive` / `--gain-negative` in `portfolio-ui.css` + `--success` / `--danger` in `globals.css` | Keep both pairs consistent (same semantics, §5). |
| Legacy Tailwind utility remap | `src/app/globals.css`, `[data-theme="light"] ...` and `[data-theme="dark"] ...` sections | Only for old hardcoded code; new code should never need this. |
| Theme logic (persistence, OS fallback, pre-hydration) | `src/components/ThemeProvider.tsx`, `src/components/ThemeToggle.tsx`, inline script in `src/app/layout.tsx` | Don't duplicate the `portfolio-theme` key or the fallback logic. |
| Actual header | `src/components/SidebarNav.tsx` + `.app-header/.header-button/.nav-link/.mobile-menu` classes in `globals.css` | Style changes in CSS; structural changes in the component. |
| New page patterns | `src/app/portfolio-ui.css` (new `.home-*/.assets-*/.asset-detail-*` class) | Reuse first; create only when no class covers the case. |

## 12. Common mistakes (found in this commit)

| Mistake | Light-mode symptom | Fix |
|---|---|---|
| New `text-slate-300` class without remap | nearly invisible text | use `var(--portfolio-text-muted)` or add a remap |
| Using the `dark:` variant | doesn't respond to the toggle (the theme isn't `dark:`) | use variables / `.metric-value` |
| `divide-slate-800` with the v3 `~` selector | first row without border | use `> :not(:last-child)` |
| `<picture media="prefers-color-scheme">` | logo doesn't follow the toggle | use `.theme-logo--dark/light` |
| Strong white focus / bordered active | inconsistent with indigo | indigo outline §9.5, borderless active |
| `thead` with dark background | dark band in light | transparent + `border-bottom` |
| New color hardcoded in a component | light/dark diverge, not reusable | token in §11 + rules in §10 |
| Green/red outside semantics | confuses gain/loss with decoration | §5: gains/success and losses/error only |
| Indigo as card background | loses its "interaction" meaning | surfaces in §5, indigo for interaction only |
| Different palette on mobile | two color systems | §8: responsive changes layout, not colors |

## 13. Minimum visual verification

- `npm run lint` (and `npm run build` if you touched `layout.tsx` / global CSS).
- Exercise the light/dark header toggle (desktop + mobile) with no flash or mismatch.
- Review in both themes: header, hero/home, tables (including the first row), modals, chips (type: sky/cyan/amber/violet/emerald/indigo; currency: neutral badge, same colors as `.home-currency-badge`, no per-theme overrides beyond the light text tint), live/local badges, keyboard focus.
- On mobile also: no excessive nested cards, secondary grids in 2 columns,
  horizontally scrolling tables when they don't compress, primary-datum hierarchy intact.

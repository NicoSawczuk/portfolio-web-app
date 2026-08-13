---
name: portfolio-webapp-ui
description: >
  Design and refine the PortfolioWebApp interface with a professional,
  modern dark-mode financial/SaaS aesthetic. Use this skill whenever
  modifying UI, layouts, components, responsive behavior, navigation,
  cards, forms, dashboards, typography, spacing, colors, icons, or
  mobile UX in PortfolioWebApp. Mobile-first is mandatory because the
  application is frequently used on mobile.
---

# PortfolioWebApp UI Skill

## Project-specific scope

This project is PortfolioWebApp, built with Next.js App Router and Tailwind. The UI should preserve the existing dark-mode identity and improve it systematically, not redesign it from scratch.

The main design goal is to keep the product feeling premium, financial, and trustworthy while remaining fast, clean, and mobile-first.

## Purpose

Maintain and improve the visual language of PortfolioWebApp.

The application should feel:

- modern
- professional
- financial
- clean
- coherent
- easy to scan
- premium without being flashy
- excellent on mobile
- consistent across every screen

Do not redesign the application from scratch unless explicitly requested.

The existing identity is based on:

- dark mode
- blue as the primary brand/accent color
- clean cards
- strong typography
- simple financial data presentation

The goal is to refine and systematize that identity.

---

# 1. Core design philosophy

Before making any UI change, ask:

> Does this improve hierarchy, usability, consistency, or readability?

If the answer is no and the change only adds decoration, do not add it.

Prefer:

- simplicity
- spacing
- hierarchy
- consistency
- subtle contrast
- meaningful color
- clear interaction states

Avoid:

- excessive decoration
- excessive shadows
- unnecessary gradients
- glassmorphism
- excessive borders
- nested cards
- too many badges
- too many colors
- emoji-based UI icons

The application should look designed, not decorated.

---

# 2. Mobile-first is mandatory

PortfolioWebApp is frequently used on mobile.

Do NOT design desktop first and merely shrink it for mobile.

Think about mobile layout first, then enhance the layout for larger screens.

Always consider at least these widths:

- 320px
- 375px
- 390px
- 430px

Pay special attention to 375px and 390px.

The interface must not depend on hover to communicate important information or expose essential actions.

---

# 3. Global color system

Use the project's existing design tokens if they already exist.

Do not create duplicate colors when an equivalent token already exists.

Recommended dark palette:

```text
Background:
#070D1C

Main surface:
#0E172A

Card:
#111C30

Card hover:
#162238

Border:
#24334D
```

Typography:

```text
Primary:
#F8FAFC

Secondary:
#94A3B8

Tertiary:
#64748B
```

Accent:

```text
Primary blue:
Reuse the existing PortfolioWebApp brand blue.
```

Do not replace an existing brand color without a reason.

Use blue primarily for:

- primary buttons
- active navigation
- links
- focus states
- important highlights

Do not make every secondary piece of text blue.

Status colors:

- positive → existing green
- negative → existing red
- neutral → neutral text

Status colors should be meaningful and restrained.

---

# 4. Surfaces and borders

Reduce visual nesting.

Avoid structures like:

```text
page
  -> section card
      -> item card
          -> value card
```

Prefer:

```text
page
  -> section
      -> item
```

Cards should feel integrated into the layout.

Use subtle borders:

```text
1px solid #24334D
```

Avoid strong white borders.

Use shadows sparingly.

Do not add shadows simply to make every component look elevated.

---

# 5. Border radius system

Use a small and consistent radius scale:

```text
12px → buttons, inputs, small controls
16px → cards and internal components
24px → main sections/containers
```

Do not randomly assign different radii to components.

The UI should feel like it belongs to one design system.

---

# 6. Spacing system

Prefer a 4px-based spacing scale:

```text
4
8
12
16
20
24
32
40
48
```

Avoid arbitrary spacing values unless there is a specific reason.

For mobile, default horizontal page padding should generally be around:

```text
16px
```

Do not use large desktop padding on narrow screens.

---

# 7. Typography

Reuse the project's current font if one is already established.

Do not introduce a new font purely for visual reasons.

Recommended hierarchy:

```text
Page title:
28–32px / 700

Section title:
18–20px / 600–700

Card title:
16–18px / 600–700

Financial value:
24–28px / 700

Secondary text:
14px

Metadata:
12–13px
```

On mobile, prioritize readability over fitting everything on one line.

Do not make text extremely small to solve layout problems.

---

# 8. Iconography

Use one icon system throughout the application.

If the project already uses Lucide, use Lucide.

Do not mix:

- emojis
- random SVG icons
- different icon libraries
- filled icons with unrelated line icons

Recommended icon size:

```text
18–20px
```

Recommended stroke:

```text
approximately 1.8–2
```

Examples:

```text
Home
ChartNoAxesColumn / BarChart
Tag
Upload
Eye
Pencil
Trash2
Plus
Menu
X
```

Icons must align consistently with their labels.

---

# 9. Navbar

## Desktop

Keep the existing navigation structure.

The active item should use the brand blue rather than a strong white border.

Recommended active state:

- blue background
- 10–12px radius
- clear text contrast
- subtle transition

Inactive items should have lower contrast.

Do not make inactive navigation elements visually compete with the active section.

## Mobile

Do not force the entire desktop navbar into a narrow horizontal space.

Preferred mobile approach:

```text
┌─────────────────────────────────────┐
│ Logo                            ☰  │
└─────────────────────────────────────┘
```

Opening the menu can display:

```text
Home
Portfolios
Activos
Exportar
Cerrar sesión
```

All items must have comfortable touch targets.

An alternative is bottom navigation if the application eventually has only a small number of high-frequency primary sections.

Do not implement bottom navigation automatically if the application's final navigation structure does not justify it.

---

# 10. Portfolio page header

The main portfolio header should be compact.

Recommended structure:

```text
PORTFOLIOS                                  [+]
Tus carteras
```

Reduce excessive vertical space.

The plus button should be approximately:

```text
40–48px
```

and have:

- brand blue
- 10–12px radius
- consistent Plus icon
- comfortable touch target

On mobile, preserve the same structure without making the header excessively tall.

---

# 11. Portfolio cards

Portfolio cards are one of the most important UI elements.

Avoid nested cards.

Do not put the financial value inside a second rectangular card.

Prefer:

```text
Casa                                  USD 161,50
Inversiones para construir mi casa    +USD 11,50
Creado 29 de junio de 2026             +7,67%

                                      [Edit] [Delete]
```

## Desktop

The total value can be aligned to the right.

The portfolio information should remain visually balanced.

## Mobile

Use a single-column card:

```text
┌──────────────────────────────┐
│ Casa                         │
│ Inversiones para construir   │
│ mi casa                      │
│                              │
│ USD 161,50                   │
│ +USD 11,50     +7,67%        │
│                              │
│ Creado 29 de junio de 2026   │
│                              │
│                         ✎ 🗑 │
└──────────────────────────────┘
```

The financial value should have high visual priority.

Do not force a two-column layout on narrow screens.

---

# 12. Financial information hierarchy

The user primarily needs to understand:

1. What portfolio is this?
2. How much money is in it?
3. How much did it gain/loss?
4. What is the portfolio description?
5. When was it created?

Design around this priority.

Recommended:

```text
Portfolio name
↓
Total value
↓
Performance
↓
Description
↓
Metadata
```

The amount should never be visually hidden inside a small secondary panel.

---

# 13. Performance display

Prefer separating absolute and percentage performance:

```text
+USD 11,50     +7,67%
```

rather than:

```text
+USD 11,50 (+7,67%)
```

The percentage can optionally use a subtle badge.

Positive:

```text
+USD 11,50   +7,67%
```

Negative:

```text
-USD 11,50   -7,67%
```

Neutral:

```text
USD 0,00     0,00%
```

Do not make the performance badge larger than the total portfolio value.

---

# 14. Action buttons

Edit and delete actions should be secondary.

Normal state:

- subtle border
- neutral icon
- transparent or nearly transparent background

Delete hover:

- subtle red background
- red icon
- subtle red border

Do not use strong red permanently unless the design requires it.

For mobile:

- maintain approximately 40–44px touch targets
- icons may remain 18–20px
- do not put buttons so close together that accidental taps are likely

Never rely exclusively on hover to reveal important actions.

---

# 15. Visibility controls

The Eye/visibility control should be secondary.

Use a consistent Eye icon.

Keep it compact and subtle.

Example:

```text
Portfolios  [Eye]
```

It should not look like a primary action.

---

# 16. Mobile touch targets

Interactive elements should generally have a touch area of approximately:

```text
44×44px
```

This applies even when the visual icon itself is smaller.

Examples:

- plus button
- edit
- delete
- menu
- close
- navigation items
- form controls

Do not make icons tiny just because the visual design is minimal.

---

# 17. Mobile spacing

Recommended starting point:

```text
Page horizontal padding:
16px

Card padding:
16px

Section spacing:
24–32px

Small component spacing:
8–12px
```

Adjust when needed, but keep the visual rhythm consistent.

Do not use 32px or 40px horizontal page padding on narrow mobile screens.

---

# 18. Mobile typography

Never solve an overflow problem by aggressively reducing font sizes.

Recommended minimums:

```text
Primary UI text:
16px

Secondary text:
14px

Metadata:
12–13px
```

If content does not fit:

1. reorganize the layout
2. allow wrapping
3. stack content vertically
4. reduce spacing
5. only then consider a small typography adjustment

---

# 19. Mobile navigation strategy

If there are many navigation options:

Use a hamburger/menu.

If there are only 3–5 major high-frequency sections:

A bottom navigation can be considered.

Example:

```text
┌─────────────────────────────────────┐
│                                     │
│              CONTENT                │
│                                     │
├─────────────────────────────────────┤
│ Home   Portfolios   Activos   Más  │
└─────────────────────────────────────┘
```

Do not implement both hamburger navigation and bottom navigation unless there is a strong UX reason.

---

# 20. Forms and inputs on mobile

Forms must be comfortable to use with one hand.

Requirements:

- large enough touch targets
- clear labels
- sufficient spacing between fields
- no tiny controls
- no horizontal overflow
- visible focus states
- errors close to the relevant field
- keyboard should not obscure important actions when possible

Use native mobile behavior where appropriate.

---

# 21. Modals on mobile

For desktop, modals can remain centered.

For mobile:

- use almost the full available width
- preserve safe horizontal margins
- use comfortable padding
- avoid excessively tall fixed layouts
- allow scrolling when content exceeds viewport height
- keep primary and destructive actions clearly separated

Never create a modal whose buttons become unreachable behind the mobile keyboard or viewport.

---

# 22. Tables on mobile

Avoid forcing wide desktop tables onto narrow screens.

Prefer, depending on the data:

- responsive cards
- stacked rows
- horizontally scrollable tables only when tabular structure is genuinely important

If horizontal scrolling is necessary:

- make it obvious
- avoid hiding important information
- preserve readable column widths

Do not reduce text to an unreadable size just to avoid scrolling.

---

# 23. Charts on mobile

Charts must prioritize readability.

On mobile:

- avoid excessive labels
- avoid tiny legends
- use horizontal scrolling when appropriate
- allow touch interaction when useful
- keep important values visible
- do not overload the chart with decorative elements

The chart should communicate the trend quickly.

---

# 24. Hover, focus and interaction states

Every interactive component should have:

- default
- hover where applicable
- focus
- active
- disabled

Focus must remain visible for keyboard accessibility.

Use subtle transitions:

```text
150–200ms ease
```

Avoid long animations.

Mobile should never depend on hover.

---

# 25. Accessibility

Maintain good contrast.

Do not rely exclusively on:

- color
- hover
- animation

to communicate important information.

Destructive actions should have clear labels or accessible names.

Icon-only buttons need accessible labels.

Touch targets should be comfortable.

---

# 26. Responsive breakpoints

Use the project's existing Tailwind/configuration breakpoints if they exist.

Do not create unnecessary custom breakpoints.

Think in terms of behavior rather than device names:

```text
small:
stack content

medium:
allow more horizontal organization

large:
use desktop two-column layouts where useful
```

The layout should adapt naturally rather than simply scaling everything down.

---

# 27. Component consistency

When changing one component, check whether the same visual pattern exists elsewhere.

For example:

If a new button style is introduced, determine whether all primary buttons should use the same style.

If a new card radius is introduced, use the shared card style.

If a new muted text color is introduced, use the design token rather than another arbitrary gray.

Avoid one-off styling whenever a reusable component/token can solve the problem.

---

# 28. Do not modify business logic

UI work must not unnecessarily modify:

- API behavior
- endpoints
- database queries
- models
- controllers
- services
- business rules
- calculations
- authentication logic

If a visual change requires a small structural refactor, keep it isolated and verify existing behavior.

---

# 29. Validation after UI changes

After implementing a visual change:

1. Verify desktop layout.
2. Verify 320px width.
3. Verify 375px width.
4. Verify 390px width.
5. Verify 430px width.
6. Check horizontal overflow.
7. Check touch target sizes.
8. Check text wrapping.
9. Check long portfolio names.
10. Check large financial values.
11. Check negative performance.
12. Check zero performance.
13. Check empty states.
14. Check loading states.
15. Check error states.
16. Check hover/focus states on desktop.
17. Check that no functionality was broken.

---

# 30. Visual quality checklist

Before considering the UI finished:

- [ ] Is the hierarchy obvious within 1–2 seconds?
- [ ] Is the most important financial value immediately visible?
- [ ] Are there unnecessary nested cards?
- [ ] Are borders subtle?
- [ ] Are radii consistent?
- [ ] Are spacing values consistent?
- [ ] Are icons from one icon system?
- [ ] Are emojis avoided in application UI?
- [ ] Is blue reserved for meaningful accents?
- [ ] Are secondary texts neutral rather than excessively blue?
- [ ] Are destructive actions visually restrained?
- [ ] Are all touch targets comfortable?
- [ ] Does the interface work at 320px?
- [ ] Does it work at 375px?
- [ ] Does it work at 390px?
- [ ] Does it work at 430px?
- [ ] Is there horizontal overflow?
- [ ] Does anything important depend on hover?
- [ ] Does the UI still feel coherent if content becomes longer?
- [ ] Does mobile feel like a first-class interface rather than a compressed desktop version?

---

# 31. Final design direction

The target is:

> Dark + blue + premium SaaS/financial interface + strong hierarchy + restrained surfaces + excellent mobile UX.

Do not turn the application into a flashy dashboard.

The best result should feel like a mature financial product:

- calm
- precise
- trustworthy
- modern
- easy to scan
- comfortable to use for long periods

When in doubt, prefer **less decoration and better hierarchy**.

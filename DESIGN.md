# Salamat Yar Design System

One product, four surfaces. The brand tokens below are shared by all of them. Surfaces differ only in density and layout, never in accent color, radius or font.

## 1. Principles

- **Calm and trustworthy.** Quiet surfaces, one accent, clear hierarchy. No decorative gradients.
- **Accessible first.** Patients can be elderly or unwell, and doctors read screens all day. Contrast and legibility beat style.
- **Never rely on color alone.** Status needs an icon and text as well.
- **Persian and RTL are the default**, not an add-on.

## 2. Language and direction

- `<html lang="fa" dir="rtl">`. Switch `lang`/`dir` per locale if English is also supported.
- Use logical utilities: `ms-*`, `me-*`, `ps-*`, `pe-*`, `start-*`, `end-*`, `text-start`, `text-end`. Do not use `ml-*`, `mr-*`, `left-*`, `right-*`, `text-left`, `text-right`.
- Flip directional icons (chevrons, arrows, back buttons) with `rtl:rotate-180`.
- Phone numbers, codes, IDs and email addresses stay left-to-right: wrap them in `dir="ltr"` or `<bdi>`.
- Dates are displayed in Jalali (Solar Hijri). Store and transmit ISO 8601 UTC. Format with `Intl.DateTimeFormat('fa-IR-u-ca-persian-nu-latn')` (the `nu-latn` part keeps Latin digits, because `fa-IR` defaults to Persian digits) or `date-fns-jalali`.
- Digits: Latin digits (0-9) everywhere: patient-facing text, inputs, dates, phone numbers, lab values and medical codes. Never convert to Persian digits.
- Letter-spacing is always `0`. Negative tracking breaks Persian letter joining.

## 3. Color tokens

Source of truth is this table. Convert to the format your shadcn version uses (HSL triplets for Tailwind v3, oklch for v4) in `index.css` under `:root` and `.dark`. Use semantic classes only (`bg-primary`, `text-muted-foreground`), never raw palette colors.

| Token | Light | Dark | Use |
|---|---|---|---|
| `background` | `#ffffff` | `#0b1220` | Page |
| `foreground` | `#0f172a` | `#e2e8f0` | Main text |
| `card` / `card-foreground` | `#ffffff` / `#0f172a` | `#111a2b` / `#e2e8f0` | Cards, panels, dialogs |
| `muted` | `#f1f5f9` | `#172033` | Subtle areas, table stripes |
| `muted-foreground` | `#475569` | `#94a3b8` | Secondary text |
| `accent` / `accent-foreground` | `#e6f4f1` / `#0f172a` | `#12302f` / `#e2e8f0` | Hover rows, selected items |
| `primary` / `primary-foreground` | `#0f766e` / `#ffffff` | `#2dd4bf` / `#042f2e` | Main action, links, focus |
| `secondary` / `secondary-foreground` | `#f1f5f9` / `#0f172a` | `#1e293b` / `#e2e8f0` | Secondary buttons |
| `destructive` / `destructive-foreground` | `#b91c1c` / `#ffffff` | `#f87171` / `#450a0a` | Danger actions, errors |
| `success` / `success-foreground` | `#15803d` / `#ffffff` | `#4ade80` / `#052e16` | Confirmed, normal |
| `warning` / `warning-foreground` | `#b45309` / `#ffffff` | `#fbbf24` / `#451a03` | Needs attention |
| `border` | `#e2e8f0` | `#1e293b` | Dividers, card edges |
| `input` | `#64748b` | `#64748b` | Form control borders (3:1 minimum) |
| `ring` | `#0f766e` | `#2dd4bf` | Focus ring |

Rules:
- One primary action per area of the screen.
- Text must reach 4.5:1 (3:1 for large text and UI boundaries). Verify any new pairing, since the table above is a starting point.
- Medical status (normal / warning / critical) uses color + icon + text label.

## 4. Typography

- **Font:** Vazirmatn for Persian and Latin (self-hosted). Monospace only for codes and IDs. Two families maximum.
- **Weights:** 400, 500, 600 only.
- **Scale:** `text-xs` 12px (captions only), `text-sm` 14px (dense tables, helper text), `text-base` 16px (default body), `text-lg` 18px, `text-xl` 20px, `text-2xl` 24px, `text-3xl` 30px.
- **Line height:** body at least 1.7 (`leading-7`), headings at least 1.4. Persian needs more leading than Latin.
- **Numbers:** `tabular-nums` for tables, vitals, dosages and prices.
- Never set body text below 14px. Never use all-caps for Persian.

## 5. Spacing, radius, elevation

- Tailwind's unit is 4px. Use even steps for an 8pt rhythm: `2, 4, 6, 8, 12, 16` (8px to 64px).
- Page padding `px-4` on mobile, `md:px-8` on desktop. Card padding `p-6` (`p-4` in clinical views). Gap between related items `gap-2` to `gap-4`; between groups `gap-8` or more. Group related things closely.
- `--radius: 0.5rem`. Buttons and inputs `rounded-md`, cards and dialogs `rounded-xl`, badges `rounded-full`.
- Elevation: `border` first, `shadow-sm` for cards, `shadow-lg` for dialogs and popovers. Nothing else.

## 6. Surfaces

| | Patient (default) | Clinical | Public | Report / print |
|---|---|---|---|---|
| Scope | Portal, booking, records, settings | Doctor workstation, triage, prescriptions, dense tables | Home, service pages | Printable reports, audits |
| Body text | 16px | 14px | 16-18px | 11-12pt |
| Control height | `h-11` (44px) | `h-9` desktop, 44px on touch | `h-11` / `h-12` | n/a |
| Table rows | `h-14` | `h-10` | n/a | compact, bordered |
| Layout | Generous, single column on mobile | Dense, sticky headers, split panes | Hero + banded sections | A4, single column |
| Theme | Light + dark | Light + dark, both tested for AA | Light (dark optional) | Light only, black on white |
| Motion | Normal (see section 8) | Minimal: no entrance animations | Normal | None |

Clinical extras: keyboard shortcuts with visible hints, focus never lost after actions, bulk actions by keyboard, no decorative elements.

Public extras: large clear headings (`text-4xl` to `text-5xl`, weight 600), alternating white and `muted` bands, a very soft `bg-primary/5` wash is the maximum decoration. No blur behind text. One primary call to action per section.

Report / print:
- `@media print`, A4, margins 15-20mm, fonts embedded or self-hosted.
- No shadows, no border radius, no background colors needed to understand content. It must read in grayscale.
- Header on every page with the patient identifier, the Jalali generation date, and "page x of y".
- `break-inside-avoid` on table rows and cards, repeated table headers.
- Square corners and hairline borders are fine here.

## 7. Components and states

Every data view has all four: **loading** (skeleton matching the final layout), **empty** (say what is missing and offer the next action), **error** (say what happened and offer retry; never show raw server errors or patient data), **success** (toast plus an `aria-live="polite"` message).

Forms:
- Visible label on every field (not placeholder-only). Mark required fields.
- Inline error under the field, linked with `aria-describedby`. Validate on blur and on submit. Keep user input when a submit fails.
- Set `autoComplete` and `inputMode` appropriately. Use the right input type for phone and numbers.

Tables:
- Sticky header, `aria-sort` on sortable columns, server-side pagination.
- Row actions reachable by keyboard.
- Below `md`, convert rows to stacked cards instead of horizontal scrolling that hides key columns.

Buttons and dialogs:
- Destructive actions open a confirmation dialog that states the real effect. Because records are soft-deleted, say "Remove from list" or "Archive", not "Delete permanently".
- Buttons are at least 44px tall on touch devices.

## 8. Motion

- Hover and focus transitions: `transition-colors duration-200 ease-in-out`. Press feedback: `active:scale-[0.98]` with `transition-transform`.
- Dialogs, menus and accordions fade and scale from 95% to 100%.
- Lists may stagger in (fade + 10px slide up), at most 50ms per item and only the first ~8 items.
- Skeleton loaders use `animate-pulse`. No blank screens and no lone spinners for page loads.
- Every animation has a reduced-motion fallback: `motion-reduce:transition-none motion-reduce:animate-none motion-reduce:transform-none`.
- Do not animate layout properties (width, height, top). Prefer opacity and transform.

## 9. Accessibility checklist

- WCAG 2.2 AA. Text 4.5:1, large text and UI boundaries 3:1.
- Visible focus on every interactive element: `focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2`. Never `outline-none` without a replacement.
- Everything works by keyboard. Logical tab order. Dialogs trap and restore focus.
- Semantic HTML first, ARIA only to fill gaps. Icon-only buttons have `aria-label` (in Persian).
- Works at 200% zoom with no horizontal scroll (except data tables with an alternative).
- Respect `prefers-reduced-motion` and `prefers-color-scheme`.
- Test with a screen reader at least once per new pattern.

## 10. Privacy in the UI

- No patient data in URLs, query strings, `localStorage`, `sessionStorage`, console logs, analytics or error messages.
- Mask sensitive fields by default (national ID shows only the last digits, with a reveal action that requires an authenticated user and is audit-logged).
- List views show the minimum fields needed. Details load on the detail page.
- Sessions time out. Show a warning before expiry and keep unsaved form data safe in memory only.
- Screens that show records should not be cached by the browser after logout.

## 11. What we borrow from reference designs

Reference files live outside this repository. Do not read them while working. This section is the summary.

| Surface | Borrow | Ignore |
|---|---|---|
| Patient app (Stripe) | `tabular-nums` for figures, one restrained accent, hairline borders, soft shadows | Gradient mesh, pill buttons, weight 300, negative tracking |
| Clinical (Linear) | Information density, crisp 1px borders, keyboard-first flows, stepped surfaces | Near-black default canvas, low-contrast muted text, lavender accent |
| Public (Apple) | Whitespace, large clear headings, alternating bands, a single call to action | SF Pro, negative tracking, glass blur over text, full-bleed dark tiles |
| Reports (IBM Carbon) | Square corners, hairlines, structured tables, accessibility rigor | Plex Sans (poor Persian support), weight 300 |

Vercel is not used.

## 12. Open decisions (fill in)

- Final brand name for the accent (teal is a placeholder: change the `primary` row and re-check contrast).
- Whether the UI is Persian-only or bilingual.
- Logo and illustration style.
